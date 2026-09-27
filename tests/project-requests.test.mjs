import assert from "node:assert/strict";
import { build } from "esbuild";
import test from "node:test";

async function moduleAt(entry) {
  const { outputFiles } = await build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", write: false });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);
}
const { handleProjectRequest, ProjectSubmission } = await moduleAt("worker/project-requests.ts");
const { projectEmail, PROJECT_RECIPIENTS } = await moduleAt("worker/project-email.ts");
const { validateProjectRequest } = await moduleAt("lib/project-request.ts");
const sample = { needs: ["storage"], name: "Sample Customer", company: "Example Warehouse", email: "customer@example.com", phone: "", description: "Need more room for pallets.", location: "Memphis, TN", timing: "Within 1–3 months" };
const requestId = "069b79a0-a0f9-4c9a-a6f3-1f592a7d215b";
const env = { PROJECT_REQUESTS_ENABLED: "true", MICROSOFT_TENANT_ID: "425c0726-da86-4408-a0c3-acf3cfbc6978", MICROSOFT_CLIENT_ID: "069b79a0-a0f9-4c9a-a6f3-1f592a7d215c", MS_GRAPH_CLIENT_SECRET: "synthetic-test-credential", TURNSTILE_SITE_KEY: "synthetic-sitekey", TURNSTILE_SECRET_KEY: "synthetic-test-secret", PROJECT_RATE_LIMITER: { limit: async () => ({ success: true }) }, PROJECT_SUBMISSIONS: { idFromName: name => name, get: () => ({ fetch: async () => Response.json({ accepted: true }) }) } };
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

test("public endpoint fails closed before configuration, on foreign origins, spam, and size violations", async () => {
  assert.equal((await handleProjectRequest(post(), { ...env, MS_GRAPH_CLIENT_SECRET: "" })).status, 503);
  assert.equal((await handleProjectRequest(post(input(), { origin: "https://evil.example" }), env)).status, 403);
  assert.equal((await handleProjectRequest(post(input(), {}, "https://other.example"), env)).status, 403);
  assert.equal((await handleProjectRequest(post(input({ website: "spam.example" })), env)).status, 400);
  assert.equal((await handleProjectRequest(post(input({ turnstileToken: "" })), env)).status, 400);
  assert.equal((await handleProjectRequest(post(input({ description: "x".repeat(30_000) })), env)).status, 400);
  assert.equal((await handleProjectRequest(post(input(), { "content-type": "text/plain" }), env)).status, 415);
  assert.equal((await handleProjectRequest(post(), { ...env, PROJECT_RATE_LIMITER: { limit: async () => ({ success: false }) } })).status, 429);
  assert.equal((await handleProjectRequest(post(), env)).status, 200);
});

function storage() {
  const items = new Map();
  let queue = Promise.resolve();
  const store = {
    get: async key => items.get(key), put: async (key, value) => items.set(key, value), setAlarm: async () => {}, deleteAll: async () => items.clear(),
    transaction: fn => { const result = queue.then(() => fn(store)); queue = result.catch(() => {}); return result; },
  };
  return store;
}
const objectRequest = (data = sample, token = "synthetic-token") => new Request("https://internal/", { method: "POST", body: JSON.stringify({ data, requestId, token, hostname: "memphismaterialhandling.com", ip: "192.0.2.1" }) });

test("delivery is duplicate safe, never reads mail, and uses only the projects sender", async t => {
  let sends = 0;
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, options });
    if (url.includes("siteverify")) return Response.json({ success: true, hostname: "memphismaterialhandling.com", action: "project_request" });
    if (url.includes("/token")) return Response.json({ access_token: "synthetic-access-token" });
    sends++; return new Response(null, { status: 202 });
  });
  const state = storage();
  const submission = new ProjectSubmission({ storage: state }, env);
  await Promise.all([submission.fetch(objectRequest()), submission.fetch(objectRequest())]);
  const retry = await submission.fetch(objectRequest());
  assert.equal((await retry.json()).accepted, true);
  assert.equal(sends, 1);
  assert.equal(requests.filter(item => item.url.includes("graph.microsoft.com"))[0].url, "https://graph.microsoft.com/v1.0/users/projects@memphismaterialhandling.com/sendMail");
  assert.ok(requests.every(item => item.options.method === "POST"));
  assert.equal((await submission.fetch(objectRequest({ ...sample, name: "Different person" }))).status, 409);
  assert.equal(sends, 1);
  assert.doesNotMatch(JSON.stringify(await state.get("receipt")), /customer@example.com|Sample Customer|pallets/);
});

test("rejects failed or misbound bot checks before requesting Microsoft access", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json({ success: true, hostname: "evil.example", action: "project_request" }); });
  const submission = new ProjectSubmission({ storage: storage() }, env);
  assert.equal((await submission.fetch(objectRequest())).status, 400);
  assert.equal(calls, 1);
});

test("a lost send response stays uncertain and is never automatically sent again", async t => {
  let sends = 0;
  t.mock.method(globalThis, "fetch", async url => {
    if (url.includes("siteverify")) return Response.json({ success: true, hostname: "memphismaterialhandling.com", action: "project_request" });
    if (url.includes("/token")) return Response.json({ access_token: "synthetic-access-token" });
    sends++; throw new Error("Connection lost after send");
  });
  const submission = new ProjectSubmission({ storage: storage() }, env);
  assert.equal((await submission.fetch(objectRequest())).status, 502);
  const retry = await submission.fetch(objectRequest());
  assert.equal((await retry.json()).final, true);
  assert.equal(sends, 1);
});

test("Microsoft rejection never produces a success message", async t => {
  t.mock.method(globalThis, "fetch", async url => {
    if (url.includes("siteverify")) return Response.json({ success: true, hostname: "memphismaterialhandling.com", action: "project_request" });
    if (url.includes("/token")) return Response.json({ access_token: "synthetic-access-token" });
    return new Response(null, { status: 403 });
  });
  const submission = new ProjectSubmission({ storage: storage() }, env);
  const response = await submission.fetch(objectRequest());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).accepted, undefined);
});

test("retired test links fail closed while normal requests always use both approved recipients", async () => {
  const configUrl = "https://memphismaterialhandling.com/api/project-requests/config";
  assert.deepEqual(await (await handleProjectRequest(new Request(configUrl), env)).json(), { enabled: true, siteKey: env.TURNSTILE_SITE_KEY });
  assert.deepEqual(await (await handleProjectRequest(new Request(configUrl + "?test=" + requestId), env)).json(), { enabled: false });
  const original = post();
  assert.equal((await handleProjectRequest(new Request(original.url + "?test=" + requestId, original), env)).status, 503);
  const message = projectEmail({ ...sample, delivery: "russell-test", to: "attacker@example.com" }, requestId).message;
  assert.deepEqual(message.toRecipients.map(item => item.emailAddress.address), ["russell@memphismaterialhandling.com", "duane@memphismaterialhandling.com"]);
  assert.equal(message.ccRecipients, undefined);
  assert.equal(message.bccRecipients, undefined);
  assert.doesNotMatch(message.body.content, /Dylan|website setup test|no action needed/i);
});
