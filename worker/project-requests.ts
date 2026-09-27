import { validateProjectRequest, type ProjectRequest } from "../lib/project-request";
import { PROJECT_SENDER, projectEmail } from "./project-email";

const HOSTS = new Set(["memphismaterialhandling.com", "www.memphismaterialhandling.com"]);
const MAX_BYTES = 24_000;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type MailEnv = Env & { MS_GRAPH_CLIENT_SECRET?: string; TURNSTILE_SECRET_KEY?: string };
type Receipt = { fingerprint: string; state: "pending" | "accepted" | "uncertain" | "failed"; started: number };

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export function ready(env: MailEnv) {
  return env.PROJECT_REQUESTS_ENABLED === "true" && GUID.test(env.MICROSOFT_TENANT_ID) && GUID.test(env.MICROSOFT_CLIENT_ID) && Boolean(env.MS_GRAPH_CLIENT_SECRET && env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY && env.PROJECT_SUBMISSIONS && env.PROJECT_RATE_LIMITER);
}

async function readBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > MAX_BYTES) throw new Error("body-size");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("empty-body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error("body-size"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
}

export async function handleProjectRequest(request: Request, env: MailEnv) {
  const url = new URL(request.url);
  if (url.pathname === "/api/project-requests/config" && request.method === "GET") {
    return json({ enabled: ready(env), siteKey: ready(env) ? env.TURNSTILE_SITE_KEY : undefined });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!ready(env)) return json({ error: "Online requests are temporarily unavailable. Please call 901-947-7225." }, 503);
  const origin = request.headers.get("origin");
  // Both domain variants are allowed, but the POST must come from its own origin.
  if (!HOSTS.has(url.hostname) || origin !== url.origin || request.headers.get("sec-fetch-site") === "cross-site") return json({ error: "Please submit your request from our website." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return json({ error: "Please check your request." }, 415);
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return json({ error: "Unable to verify this request. Please call 901-947-7225." }, 403);
  if (!(await env.PROJECT_RATE_LIMITER.limit({ key: `project:${ip}` })).success) return json({ error: "Please wait a minute before trying again." }, 429);
  let input: Record<string, unknown>;
  try { input = await readBody(request); } catch { return json({ error: "Please check your request and keep the description under 3,000 characters." }, 400); }
  if (!input || typeof input !== "object" || Array.isArray(input) || typeof input.website !== "string" || input.website !== "") return json({ error: "Unable to submit this request." }, 400);
  if (typeof input.requestId !== "string" || !UUID.test(input.requestId) || typeof input.turnstileToken !== "string" || !input.turnstileToken || input.turnstileToken.length > 2048) return json({ error: "Please complete the verification and try again.", verification: true }, 400);
  const { data, errors } = validateProjectRequest(input);
  if (!data) return json({ error: Object.values(errors)[0] || "Please check your project details.", errors }, 400);
  const id = env.PROJECT_SUBMISSIONS.idFromName(input.requestId);
  // The private Durable Object receives only validated fields and cannot be addressed publicly.
  return env.PROJECT_SUBMISSIONS.get(id).fetch(new Request("https://project-submission/", {
    method: "POST", body: JSON.stringify({ data, requestId: input.requestId, token: input.turnstileToken, hostname: url.hostname, ip }),
  }));
}

export class ProjectSubmission {
  constructor(private ctx: DurableObjectState, private env: MailEnv) {}

  async fetch(request: Request): Promise<Response> {
    const { data, requestId, token, hostname, ip } = await request.json() as { data: ProjectRequest; requestId: string; token: string; hostname: string; ip: string };
    const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(data))))).map(byte => byte.toString(16).padStart(2, "0")).join("");
    const old = await this.ctx.storage.get<Receipt>("receipt");
    if (old) return this.receiptResponse(old, fingerprint, requestId);

    let verification: { success?: boolean; hostname?: string; action?: string };
    try {
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: this.env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip, idempotency_key: crypto.randomUUID() }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error("verification-unavailable");
      verification = await response.json();
    } catch { return json({ error: "Verification is temporarily unavailable. Please try again.", verification: true }, 503); }
    if (!verification.success || verification.hostname !== hostname || verification.action !== "project_request") return json({ error: "Please complete the verification again.", verification: true }, 400);

    let accessToken: string;
    try {
      const response = await fetch(`https://login.microsoftonline.com/${this.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: this.env.MICROSOFT_CLIENT_ID, client_secret: this.env.MS_GRAPH_CLIENT_SECRET!, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
        signal: AbortSignal.timeout(8_000),
      });
      const body = await response.json() as { access_token?: string };
      if (!response.ok || !body.access_token) throw new Error("authorization-unavailable");
      accessToken = body.access_token;
    } catch { console.error("project_request_authorization_failed"); return json({ error: "We couldn’t submit your request. Your answers are still here. Please try again or call 901-947-7225.", verification: true }, 503); }

    // Reserve before sending. Concurrent requests and browser retries can never send twice.
    const existing = await this.ctx.storage.transaction(async transaction => {
      const receipt = await transaction.get<Receipt>("receipt");
      if (receipt) return receipt;
      await transaction.put("receipt", { fingerprint, state: "pending", started: Date.now() } satisfies Receipt);
      await transaction.setAlarm(Date.now() + RETENTION_MS);
    });
    if (existing) return this.receiptResponse(existing, fingerprint, requestId);

    let result: Response;
    try {
      result = await fetch(`https://graph.microsoft.com/v1.0/users/${PROJECT_SENDER}/sendMail`, {
        method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(projectEmail(data, requestId)), signal: AbortSignal.timeout(12_000),
      });
    } catch {
      await this.ctx.storage.put("receipt", { fingerprint, state: "uncertain", started: Date.now() } satisfies Receipt);
      console.error("project_request_delivery_uncertain", { reference: requestId });
      return this.receiptResponse({ fingerprint, state: "uncertain", started: Date.now() }, fingerprint, requestId);
    }
    const state = result.status === 202 ? "accepted" : "failed";
    await this.ctx.storage.put("receipt", { fingerprint, state, started: Date.now() } satisfies Receipt);
    if (state === "failed") console.error("project_request_delivery_rejected", { reference: requestId, status: result.status });
    return this.receiptResponse({ fingerprint, state, started: Date.now() }, fingerprint, requestId);
  }

  private receiptResponse(receipt: Receipt, fingerprint: string, reference: string) {
    if (receipt.fingerprint !== fingerprint) return json({ error: "This request has already been submitted. Please reopen the form to start another request.", final: true }, 409);
    if (receipt.state === "accepted") return json({ accepted: true, reference });
    if (receipt.state === "pending" && Date.now() - receipt.started < 60_000) return json({ pending: true, error: "Your request is still being submitted. Wait a moment, then check again." }, 409);
    if (receipt.state === "failed") return json({ error: "Your request could not be submitted. Please call 901-947-7225 and mention this reference.", reference, final: true }, 502);
    return json({ error: "We couldn’t confirm your submission. To avoid sending it twice, please call 901-947-7225 and mention this reference.", reference, final: true }, 502);
  }

  async alarm() { await this.ctx.storage.deleteAll(); }
}
