// This is a private RPC entrypoint for the authorized AOL-to-Russell copier,
// not an HTTP route, and accepts no recipient, subject, body or message content.
import { WorkerEntrypoint } from 'cloudflare:workers';

interface AlertEnv {
  MICROSOFT_TENANT_ID: string;
  MICROSOFT_CLIENT_ID: string;
  MS_GRAPH_CLIENT_SECRET?: string;
  AOL_COPY_ALERTS_ENABLED?: string;
  AOL_COPY_TEST_ENABLED?: string;
}

export class MailBridgeAlerts extends WorkerEntrypoint<AlertEnv> {
  async notify(input: { pending: number; code: string }): Promise<void> {
    if (this.env.AOL_COPY_ALERTS_ENABLED !== 'true') throw new Error('alerts_disabled');
    if (!Number.isSafeInteger(input.pending) || input.pending < 0 || input.pending > 100_000 || !/^[a-z_]{1,60}$/.test(input.code)) throw new Error('invalid_alert');
    await this.#deliver({
      subject: 'AOL email copies need attention',
      body: { contentType: 'Text', content: `Automatic copies from the AOL Inbox to your Microsoft Inbox need attention. New AOL messages may be delayed.\n\nPlease check memphismaterial@aol.com directly until the connection is fixed. Your originals remain in AOL.\n\nMessages currently waiting: ${input.pending}\nSupport reference: ${input.code}\n\nMemphis Material Handling` },
      toRecipients: [{ emailAddress: { address: 'russell@memphismaterialhandling.com' } }],
    });
  }

  // The copier reserves its single authorized attempt durably before calling this.
  // This setup-only RPC is gated separately and cannot choose a recipient or content.
  async sendAcceptanceTest(): Promise<void> {
    if (this.env.AOL_COPY_TEST_ENABLED !== 'true') throw new Error('test_disabled');
    const reference = 'ed9bfea0-aa30-42f2-8fc1-2fdd6743661d';
    await this.#deliver({
      subject: 'TEST — AOL copy check',
      body: { contentType: 'Text', content: `This is the approved check of automatic AOL Inbox copies to Russell's Microsoft Inbox. No action is needed. Your original AOL messages stay in AOL.\n\nThe small text attachment checks that attachments arrive intact.\n\nCheck reference: ${reference}\n\nMemphis Material Handling` },
      toRecipients: [{ emailAddress: { address: 'memphismaterial@aol.com' } }],
      internetMessageHeaders: [{ name: 'X-MMH-AOL-Acceptance-Ref', value: reference }],
      attachments: [{ '@odata.type': '#microsoft.graph.fileAttachment', name: 'aol-copy-check.txt', contentType: 'text/plain', contentBytes: btoa(`MMH AOL copy attachment check\nReference: ${reference}\nNo customer information is included.\n`) }],
    });
  }

  // ECMAScript private method: never exposed as a callable RPC method.
  async #deliver(message: Record<string, unknown>): Promise<void> {
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${this.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: this.env.MICROSOFT_CLIENT_ID, client_secret: this.env.MS_GRAPH_CLIENT_SECRET || '', scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }),
      signal: AbortSignal.timeout(8_000),
    });
    const tokenBody = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !tokenBody.access_token) throw new Error('alert_authentication_failed');
    const result = await fetch('https://graph.microsoft.com/v1.0/users/projects@memphismaterialhandling.com/sendMail', {
      method: 'POST', headers: { Authorization: `Bearer ${tokenBody.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, saveToSentItems: true }), signal: AbortSignal.timeout(12_000),
    });
    if (result.status !== 202) throw new Error('alert_delivery_unconfirmed');
  }
}
