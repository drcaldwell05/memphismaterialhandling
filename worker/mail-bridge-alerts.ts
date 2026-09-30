// This is a private RPC entrypoint for the authorized AOL-to-Russell copier,
// not an HTTP route, and accepts no recipient, subject, body or message content.
import { WorkerEntrypoint } from 'cloudflare:workers';

interface AlertEnv {
  MICROSOFT_TENANT_ID: string;
  MICROSOFT_CLIENT_ID: string;
  MS_GRAPH_CLIENT_SECRET?: string;
  AOL_COPY_ALERTS_ENABLED?: string;
  AOL_COPY_TEST_ENABLED?: string;
  AOL_MONITOR_TEST_ENABLED?: string;
  AOL_COPY_ALERT_RECIPIENT?: string;
}

export class MailBridgeAlerts extends WorkerEntrypoint<AlertEnv> {
  async sendMonitorTest(): Promise<void> {
    if (this.env.AOL_MONITOR_TEST_ENABLED !== 'true') throw new Error('monitor_test_disabled');
    await this.#deliver({
      subject: 'TEST — Dylan’s email alert setup for Dad',
      body: { contentType: 'Text', content: 'I’m testing the alerts I set up for Dad’s AOL-to-Microsoft email connection.\n\nThis message is just a test to check that notices reach my email. No action is needed.\n\n— Dylan' },
      toRecipients: [{ emailAddress: { address: this.#recipient() } }],
      internetMessageHeaders: [{ name: 'X-MMH-AOL-Monitor-Test', value: '2026-09-30-dylan-only' }],
    });
  }

  async notifyMaintenance(input: { reason: string; expiry?: string }): Promise<void> {
    if (this.env.AOL_COPY_ALERTS_ENABLED !== 'true') throw new Error('alerts_disabled');
    const permitted = ['copy_checks_missing', 'copy_status_unavailable', 'copy_paused', 'credential_renewal_due'];
    if (!permitted.includes(input.reason)) throw new Error('invalid_notice');
    let subject = 'Automatic AOL email checks need attention';
    let content = 'The separate cloud monitor has detected that automatic AOL email copying is paused, unavailable, or has not completed a successful check recently. New AOL messages may be delayed.\n\nPlease check memphismaterial@aol.com directly until the connection is confirmed healthy. The copier does not delete or move AOL originals.\n\nSupport reference: ' + input.reason;
    if (input.reason === 'credential_renewal_due') {
      if (input.expiry !== '2027-03-26T00:00:00.000Z') throw new Error('invalid_expiration');
      subject = 'Renew the automatic AOL email connection before March 26, 2027';
      content = 'The Microsoft credentials used by automatic AOL email copying and its failure-notice sender expire March 26, 2027. Arrange renewal before that date so copying and failure notices can continue.\n\nThis is an advance maintenance notice; it does not by itself mean mail copying has stopped. No daily checks or computer left running are needed.\n\nMemphis Material Handling';
    }
    await this.#deliver({ subject, body: { contentType: 'Text', content }, toRecipients: [{ emailAddress: { address: this.#recipient() } }] });
  }

  async notify(input: { pending: number; code: string }): Promise<void> {
    if (this.env.AOL_COPY_ALERTS_ENABLED !== 'true') throw new Error('alerts_disabled');
    if (!Number.isSafeInteger(input.pending) || input.pending < 0 || input.pending > 100_000 || !/^[a-z_]{1,60}$/.test(input.code)) throw new Error('invalid_alert');
    await this.#deliver({
      subject: 'AOL email copies need attention',
      body: { contentType: 'Text', content: `Automatic copies from Dad's AOL Inbox to his Microsoft Inbox need attention. New AOL messages may be delayed.\n\nPlease check the AOL Inbox directly until the connection is fixed. The copier leaves the AOL originals alone.\n\nMessages currently waiting: ${input.pending}\nSupport reference: ${input.code}\n\nMemphis Material Handling` },
      toRecipients: [{ emailAddress: { address: this.#recipient() } }],
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

  // The single approved recipient is private deployment configuration, never RPC input.
  #recipient(): string {
    const recipient = this.env.AOL_COPY_ALERT_RECIPIENT;
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error('alert_recipient_missing');
    return recipient;
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
