// This is a private RPC entrypoint for the authorized AOL-to-Russell copier,
// not an HTTP route, and accepts no recipient, subject, body or message content.
import { WorkerEntrypoint } from 'cloudflare:workers';

interface AlertEnv {
  MICROSOFT_TENANT_ID: string;
  MICROSOFT_CLIENT_ID: string;
  MS_GRAPH_CLIENT_SECRET?: string;
  AOL_COPY_ALERTS_ENABLED?: string;
}

export class MailBridgeAlerts extends WorkerEntrypoint<AlertEnv> {
  async notify(input: { pending: number; code: string }): Promise<void> {
    if (this.env.AOL_COPY_ALERTS_ENABLED !== 'true') throw new Error('alerts_disabled');
    if (!Number.isSafeInteger(input.pending) || input.pending < 0 || input.pending > 100_000 || !/^[a-z_]{1,60}$/.test(input.code)) throw new Error('invalid_alert');
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${this.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: this.env.MICROSOFT_CLIENT_ID, client_secret: this.env.MS_GRAPH_CLIENT_SECRET || '', scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }),
      signal: AbortSignal.timeout(8_000),
    });
    const tokenBody = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !tokenBody.access_token) throw new Error('alert_authentication_failed');
    const result = await fetch('https://graph.microsoft.com/v1.0/users/projects@memphismaterialhandling.com/sendMail', {
      method: 'POST', headers: { Authorization: `Bearer ${tokenBody.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject: 'AOL email copies need attention',
          body: { contentType: 'Text', content: `Automatic copies from the AOL Inbox to your Microsoft Inbox need attention. New AOL messages may be delayed.\n\nPlease check memphismaterial@aol.com directly until the connection is fixed. Your originals remain in AOL.\n\nMessages currently waiting: ${input.pending}\nSupport reference: ${input.code}\n\nMemphis Material Handling` },
          toRecipients: [{ emailAddress: { address: 'russell@memphismaterialhandling.com' } }],
        }, saveToSentItems: true,
      }), signal: AbortSignal.timeout(12_000),
    });
    if (result.status !== 202) throw new Error('alert_delivery_unconfirmed');
  }
}
