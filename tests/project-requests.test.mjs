import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { build } from "esbuild";
import test from "node:test";

async function moduleAt(entry) {
  const { outputFiles } = await build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", write: false });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);
}
const { handleProjectRequest, ProjectSubmission } = await moduleAt("worker/project-requests.ts");
const { projectEmail, PROJECT_RECIPIENTS } = await moduleAt("worker/project-email.ts");
const { validateProjectRequest } = await moduleAt("lib/project-request.ts");
const schema = await readFile("migrations/0001_project_requests.sql", "utf8");
const sample = { needs: ["storage"], name: "Sample Customer", company: "Example Warehouse", email: "customer@example.com", phone: "", description: "Need more room for pallets.", location: "Memphis, TN", timing: "Within 1–3 months" };
const requestId = "069b79a0-a0f9-4c9a-a6f3-1f592a7d215b";
const bindings = { PROJECT_REQUESTS_ENABLED: "true", MICROSOFT_TENANT_ID: "425c0726-da86-4408-a0c3-acf3cfbc6978", MICROSOFT_CLIENT_ID: "069b79a0-a0f9-4c9a-a6f3-1f592a7d215c", MS_GRAPH_CLIENT_SECRET: "synthetic-test-credential", TURNSTILE_SITE_KEY: "synthetic-sitekey", TURNSTILE_SECRET_KEY: "synthetic-test-secret", PROJECT_RATE_LIMITER: { limit: async () => ({ success: true }) }, PROJECT_SUBMISSIONS: { idFromName: name => name, get: () => ({ fetch: async () => Response.json({ accepted: true }) }) } };
const input = (extra = {}) => ({ ...sample, requestId, turnstileToken: "synthetic-token", website: "", ...extra });
const post = (data = input(), headers = {}, origin = "https://memphismaterialhandling.com") => new Request(`${origin}/api/project-requests`, { method: "POST", headers: { origin, "content-type": "application/json", "cf-connecting-ip": "192.0.2.1", ...headers }, body: JSON.stringify(data) });

test("validates both contact methods and rejects malformed or overlong fields", () => {
  assert.ok(validateProjectRequest(sample).data);
  assert.ok(validateProjectRequest({ ...sample, email: "", phone: "901-555-0123" }).data);
  for (const override of [{ email: "", phone: "" }, { needs: ["unsure", "storage"] }, { needs: ["not-real"] }, { needs: ["storage", "storage"] }, { name: "Bad\r\nName" }, { description: "x".repeat(3001) }, { timing: "invented" }, { email: "bad@example.com\nbcc@example.com" }, { phone: "123" }]) assert.equal(validateProjectRequest({ ...sample, ...override }).data, undefined);
});

test("email locks the recipients, escapes untrusted HTML, and sets Reply-To only when available", () => {
  const body = projectEmail({ ...sample, name: '<img src=x onerror="alert(1)">', description: "<script>alert('bad')</script>", to: "attacker@example.com" }, requestId);
  assert.deepEqual(body.message.toRecipients.map(recipient => recipient.emailAddress.address), PROJECT_RECIPIENTS);
  assert.equal(body.message.replyTo[0].emailAddress.address, sample.email);
  assert.match(body.message.body.content, /&lt;script&gt;/);
  assert.doesNotMatch(body.message.body.content, /<script>|<img src=x/);
  assert.equal(projectEmail({ ...sample, email: "", phone: "901-555-0123" }, requestId).message.replyTo, undefined);
});

test("public endpoint fails closed before configuration, on foreign origins, spam, and size violations", async t => {
  const { env } = backupDatabase(t);
  assert.equal((await handleProjectRequest(post(), bindings)).status, 503);
  assert.equal((await handleProjectRequest(post(), { ...env, TURNSTILE_SECRET_KEY: "" })).status, 503);
  assert.equal((await handleProjectRequest(post(input(), { origin: "https://evil.example" }), env)).status, 403);
  assert.equal((await handleProjectRequest(post(input(), {}, "https://other.example"), env)).status, 403);
  assert.equal((await handleProjectRequest(post(input({ website: "spam.example" })), env)).status, 400);
  assert.equal((await handleProjectRequest(post(input({ turnstileToken: "" })), env)).status, 400);
  assert.equal((await handleProjectRequest(post(input({ description: "x".repeat(30_000) })), env)).status, 400);
  assert.equal((await handleProjectRequest(post(input(), { "content-type": "text/plain" }), env)).status, 415);
  assert.equal((await handleProjectRequest(post(), { ...env, PROJECT_RATE_LIMITER: { limit: async () => ({ success: false }) } })).status, 429);
  assert.equal((await handleProjectRequest(post(), env)).status, 200);
});

function backupDatabase(t, rejectedSQL = null) {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  db.exec(schema);
  const binding = {
    prepare(sql) {
      const statement = db.prepare(sql);
      const execute = params => ({
        first: async column => statement.get(...params)?.[column] ?? null,
        run: async () => {
          if (rejectedSQL?.test(sql)) throw new Error("Synthetic storage outage");
          return { success: true, meta: { changes: statement.run(...params).changes } };
        },
      });
      return { ...execute([]), bind: (...params) => execute(params) };
    },
  };
  const env = { ...bindings, PROJECT_REQUESTS_DB: binding };
  const submission = new ProjectSubmission({ storage: { get: async () => undefined } }, env);
  const saved = () => db.prepare("SELECT * FROM project_requests WHERE reference = ?").get(requestId);
  return { env, submission, saved };
}
const objectRequest = (data = sample, token = "synthetic-token") => new Request("https://internal/", { method: "POST", body: JSON.stringify({ data, requestId, token, hostname: "memphismaterialhandling.com", ip: "192.0.2.1" }) });

test("saves once before Microsoft is contacted and never sends twice for the same reference", async t => {
  const { submission, saved } = backupDatabase(t);
  let sends = 0;
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, options });
    if (url.includes("siteverify")) return Response.json({ success: true, hostname: "memphismaterialhandling.com", action: "project_request" });
    assert.equal(saved().name, sample.name);
    assert.equal(saved().email_status, "pending");
    if (url.includes("/token")) return Response.json({ access_token: "synthetic-access-token" });
    sends++; return new Response(null, { status: 202 });
  });
  const concurrent = await Promise.all([submission.fetch(objectRequest()), submission.fetch(objectRequest())]);
  assert.ok(concurrent.every(response => response.ok));
  const retry = await submission.fetch(objectRequest());
  assert.equal((await retry.json()).accepted, true);
  assert.equal(sends, 1);
  assert.equal(requests.filter(item => item.url.includes("graph.microsoft.com"))[0].url, "https://graph.microsoft.com/v1.0/users/projects@memphismaterialhandling.com/sendMail");
  assert.ok(requests.every(item => item.options.method === "POST"));
  assert.equal((await submission.fetch(objectRequest({ ...sample, name: "Different person" }))).status, 409);
  assert.equal(sends, 1);
  const row = saved();
  assert.equal(row.email_status, "accepted");
  assert.equal(row.email, sample.email);
  assert.equal(row.description, sample.description);
  assert.deepEqual(JSON.parse(row.needs), sample.needs);
  assert.doesNotMatch(JSON.stringify(row), /synthetic-token|192\.0\.2\.1/);
});

test("rejects failed or misbound bot checks before saving or requesting Microsoft access", async t => {
  const { submission, saved } = backupDatabase(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json({ success: true, hostname: "evil.example", action: "project_request" }); });
  assert.equal((await submission.fetch(objectRequest())).status, 400);
  assert.equal(calls, 1);
  assert.equal(saved(), undefined);
});

test("a lost send response leaves a saved request marked uncertain and never sends again", async t => {
  const { submission, saved } = backupDatabase(t);
  let sends = 0;
  t.mock.method(globalThis, "fetch", async url => {
    if (url.includes("siteverify")) return Response.json({ success: true, hostname: "memphismaterialhandling.com", action: "project_request" });
    if (url.includes("/token")) return Response.json({ access_token: "synthetic-access-token" });
    sends++; throw new Error("Connection lost after send");
  });
  assert.equal((await submission.fetch(objectRequest())).status, 200);
  const retry = await submission.fetch(objectRequest());
  assert.deepEqual(await retry.json(), { accepted: true, reference: requestId });
  assert.equal(saved().email_status, "uncertain");
  assert.equal(saved().description, sample.description);
  assert.equal(sends, 1);
});

test("Microsoft rejection keeps the details and records a failed email", async t => {
  const { submission, saved } = backupDatabase(t);
  t.mock.method(globalThis, "fetch", async url => {
    if (url.includes("siteverify")) return Response.json({ success: true, hostname: "memphismaterialhandling.com", action: "project_request" });
    if (url.includes("/token")) return Response.json({ access_token: "synthetic-access-token" });
    return new Response(null, { status: 403 });
  });
  const response = await submission.fetch(objectRequest());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { accepted: true, reference: requestId });
  assert.equal(saved().email_status, "failed");
  assert.equal(saved().email_error, "microsoft_http_403");
  assert.equal(saved().email, sample.email);
});

test("an expired Microsoft credential still leaves a saved request", async t => {
  const { submission, saved } = backupDatabase(t);
  const fetch = t.mock.method(globalThis, "fetch", async url => {
    if (url.includes("siteverify")) return Response.json({ success: true, hostname: "memphismaterialhandling.com", action: "project_request" });
    return Response.json({ error: "invalid_client" }, { status: 401 });
  });
  assert.equal((await submission.fetch(objectRequest())).status, 200);
  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(saved().email_status, "failed");
  assert.equal(saved().email_error, "microsoft_authorization");
});

test("a missing Microsoft credential leaves intake enabled and flags the saved request", async t => {
  const { env, submission, saved } = backupDatabase(t);
  delete env.MS_GRAPH_CLIENT_SECRET;
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: true, hostname: "memphismaterialhandling.com", action: "project_request" }));
  const config = await handleProjectRequest(new Request("https://memphismaterialhandling.com/api/project-requests/config"), env);
  assert.equal((await config.json()).enabled, true);
  const response = await submission.fetch(objectRequest({ ...sample, email: "", phone: "901-555-0123" }));
  assert.equal(response.status, 200);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(saved().phone, "901-555-0123");
  assert.equal(saved().email_error, "mail_not_configured");
});

test("a database outage before saving offers a retry without claiming success or emailing", async t => {
  const { submission, saved } = backupDatabase(t, /INSERT INTO/);
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: true, hostname: "memphismaterialhandling.com", action: "project_request" }));
  const response = await submission.fetch(objectRequest());
  const result = await response.json();
  assert.equal(response.status, 503);
  assert.equal(result.verification, true);
  assert.match(result.error, /couldn’t confirm your request was saved/);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(saved(), undefined);
});

test("a failed email status update keeps the saved request visible for review", async t => {
  const { submission, saved } = backupDatabase(t, /UPDATE project_requests/);
  const fetch = t.mock.method(globalThis, "fetch", async url => {
    if (url.includes("siteverify")) return Response.json({ success: true, hostname: "memphismaterialhandling.com", action: "project_request" });
    if (url.includes("/token")) return Response.json({ access_token: "synthetic-access-token" });
    return new Response(null, { status: 202 });
  });
  assert.equal((await submission.fetch(objectRequest())).status, 200);
  assert.equal((await submission.fetch(objectRequest())).status, 200);
  assert.equal(fetch.mock.callCount(), 3);
  assert.equal(saved().email_status, "pending");
});

test("pre-database receipts still confirm old retries without sending a duplicate", async t => {
  const { env, saved } = backupDatabase(t);
  const fingerprint = createHash("sha256").update(JSON.stringify(sample)).digest("hex");
  const receipt = { fingerprint, state: "accepted", started: Date.now() };
  const submission = new ProjectSubmission({ storage: { get: async () => receipt } }, env);
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected fetch"); });
  assert.deepEqual(await (await submission.fetch(objectRequest())).json(), { accepted: true, reference: requestId });
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(saved(), undefined);
});

test("unavailable backup storage is reported by the read-only configuration endpoint", async t => {
  const { env } = backupDatabase(t, /SELECT 1 FROM project_requests/);
  const response = await handleProjectRequest(new Request("https://memphismaterialhandling.com/api/project-requests/config"), env);
  assert.deepEqual(await response.json(), { enabled: false });
});

test("retired test links fail closed while normal requests always use the three approved recipients", async t => {
  const { env } = backupDatabase(t);
  const configUrl = "https://memphismaterialhandling.com/api/project-requests/config";
  assert.deepEqual(await (await handleProjectRequest(new Request(configUrl), env)).json(), { enabled: true, siteKey: env.TURNSTILE_SITE_KEY });
  assert.deepEqual(await (await handleProjectRequest(new Request(configUrl + "?test=" + requestId), env)).json(), { enabled: false });
  const original = post();
  assert.equal((await handleProjectRequest(new Request(original.url + "?test=" + requestId, original), env)).status, 503);
  const message = projectEmail({ ...sample, delivery: "russell-test", to: "attacker@example.com" }, requestId).message;
  assert.deepEqual(message.toRecipients.map(item => item.emailAddress.address), ["duane@memphismaterialhandling.com", "russell@memphismaterialhandling.com", "operations@memphismaterialhandling.com"]);
  assert.equal(message.ccRecipients, undefined);
  assert.equal(message.bccRecipients, undefined);
  assert.doesNotMatch(message.body.content, /Dylan|website setup test|no action needed/i);
});
