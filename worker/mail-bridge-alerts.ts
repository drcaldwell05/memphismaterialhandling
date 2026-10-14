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
      subject: 'TEST — AOL copy notices to Operations — no action needed',
      body: { contentType: 'Text', content: 'This verifies that AOL copy failure, recovery, and maintenance notices reach only operations@memphismaterialhandling.com.\n\nThis is a test, not a reported outage. No action is needed.\n\nMemphis Material Handling' },
      toRecipients: [{ emailAddress: { address: this.#recipient() } }],
      internetMessageHeaders: [{ name: 'X-MMH-AOL-Monitor-Test', value: '2026-10-14-operations-only' }],
    });
  }

  async notifyMaintenance(input: { reason: string; expiry?: string }): Promise<void> {
    if (this.env.AOL_COPY_ALERTS_ENABLED !== 'true') throw new Error('alerts_disabled');
    const permitted = ['copy_checks_missing', 'copy_status_unavailable', 'copy_paused', 'copy_delivery_pending', 'copy_recovered', 'credential_renewal_due'];
    if (!permitted.includes(input.reason)) throw new Error('invalid_notice');
    let subject = 'Automatic AOL email checks need attention';
    let content = 'Automatic AOL Inbox copying has remained unhealthy for at least 15 minutes despite automatic retries. New AOL messages may be delayed.\n\nCheck the AOL Inbox for time-sensitive mail while the connection is investigated. The copier leaves AOL originals alone. A recovery notice will follow once copying is confirmed healthy.\n\nSupport reference: ' + input.reason;
    if (input.reason === 'copy_recovered') {
      subject = 'Automatic AOL email copying has recovered';
      content = 'The AOL-to-Microsoft copy connection has recovered after the earlier alert. Two consecutive monitor checks confirmed a current successful connection, no waiting messages, and no delivery errors.\n\nNo action is needed. Routine copying continues automatically.\n\nMemphis Material Handling';
    }
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

  // Retired permanently: no setting can reactivate the old AOL test recipient.
  async sendAcceptanceTest(): Promise<void> {
    throw new Error('test_retired');
  }

  // The single approved recipient is private deployment configuration, never RPC input.
  #recipient(): string {
    const recipient = this.env.AOL_COPY_ALERT_RECIPIENT;
    if (recipient !== 'operations@memphismaterialhandling.com') throw new Error('alert_recipient_invalid');
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
