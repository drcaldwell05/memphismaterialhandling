import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const { outputFiles } = await build({
  entryPoints: ['worker/mail-bridge-alerts.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{ name: 'worker-runtime-test', setup(build) {
    build.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: 'runtime', namespace: 'test' }));
    build.onLoad({ filter: /^runtime$/, namespace: 'test' }, () => ({ contents: 'export class WorkerEntrypoint { constructor(ctx,env) { this.env=env; } }' }));
  } }],
});
const { MailBridgeAlerts } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
const env = { AOL_COPY_ALERTS_ENABLED:'true', AOL_COPY_ALERT_RECIPIENT:'operator@example.com', MICROSOFT_TENANT_ID:'synthetic-tenant', MICROSOFT_CLIENT_ID:'synthetic-client', MS_GRAPH_CLIENT_SECRET:'synthetic-secret' };

test('private failure notices always target the approved private recipient and reject arbitrary recipients', async t => {
  const calls=[];
  t.mock.method(globalThis,'fetch',async (url,options)=>{
    calls.push({url,options});
    return url.includes('/token') ? Response.json({access_token:'synthetic-token'}) : new Response(null,{status:202});
  });
  await new MailBridgeAlerts({},env).notify({pending:3,code:'source_connection_failed',to:'duane@example.com',body:'private content'});
  assert.equal(calls.length,2);
  assert.equal(calls[1].url,'https://graph.microsoft.com/v1.0/users/projects@memphismaterialhandling.com/sendMail');
  const email=JSON.parse(calls[1].options.body);
  assert.deepEqual(email.message.toRecipients,[{emailAddress:{address:'operator@example.com'}}]);
  assert.doesNotMatch(email.message.body.content,/private content|duane/);
  assert.match(email.message.body.content,/Messages currently waiting: 3/);
});

test('the approved recipient must be configured privately before a notice can send', async t => {
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('unexpected');});
  await assert.rejects(new MailBridgeAlerts({},{...env,AOL_COPY_ALERT_RECIPIENT:undefined}).notify({pending:1,code:'failure'}),/alert_recipient_missing/);
  assert.equal(calls,0);
});

test('maintenance notices use only the private recipient and reject unapproved content', async t => {
  const calls=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    calls.push({url,options});
    return url.includes('/token') ? Response.json({access_token:'synthetic-token'}) : new Response(null,{status:202});
  });
  const sender=new MailBridgeAlerts({},env);
  await sender.notifyMaintenance({reason:'copy_checks_missing',to:'unapproved@example.com',body:'private text'});
  const {message}=JSON.parse(calls[1].options.body);
  assert.deepEqual(message.toRecipients,[{emailAddress:{address:'operator@example.com'}}]);
  assert.doesNotMatch(JSON.stringify(message),/unapproved|private text/);
  await assert.rejects(sender.notifyMaintenance({reason:'arbitrary_message'}),/invalid_notice/);
  await assert.rejects(sender.notifyMaintenance({reason:'credential_renewal_due',expiry:'invalid'}),/invalid_expiration/);
  assert.equal(calls.length,2);
});

test('the monitor test is separately gated, uses the private recipient, and is signed by Dylan', async t => {
  const calls=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    calls.push({url,options});
    return url.includes('/token') ? Response.json({access_token:'synthetic-token'}) : new Response(null,{status:202});
  });
  await assert.rejects(new MailBridgeAlerts({},env).sendMonitorTest(),/monitor_test_disabled/);
  assert.equal(calls.length,0);
  await new MailBridgeAlerts({},{...env,AOL_MONITOR_TEST_ENABLED:'true'}).sendMonitorTest();
  const {message}=JSON.parse(calls[1].options.body);
  assert.deepEqual(message.toRecipients,[{emailAddress:{address:'operator@example.com'}}]);
  assert.match(message.subject,/TEST/);
  assert.match(message.body.content,/— Dylan/);
});

test('disabled or malformed requests never contact Microsoft',async t=>{
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('unexpected');});
  await assert.rejects(new MailBridgeAlerts({},{...env,AOL_COPY_ALERTS_ENABLED:'false'}).notify({pending:1,code:'failure'}),/disabled/);
  for(const input of [{pending:-1,code:'failure'},{pending:0,code:'private message text'},{pending:0.5,code:'failure'}]) await assert.rejects(new MailBridgeAlerts({},env).notify(input),/invalid_alert/);
  assert.equal(calls,0);
});

test('Microsoft rejection is never reported as accepted',async t=>{
  t.mock.method(globalThis,'fetch',async url=> url.includes('/token') ? Response.json({access_token:'synthetic-token'}) : new Response(null,{status:403}));
  await assert.rejects(new MailBridgeAlerts({},env).notify({pending:2,code:'failure'}),/delivery_unconfirmed/);
});

test('the separately gated setup email has a fixed AOL recipient and synthetic attachment', async t=>{
  const calls=[];
  t.mock.method(globalThis,'fetch',async (url,options)=>{
    calls.push({url,options});
    return url.includes('/token') ? Response.json({access_token:'synthetic-token'}) : new Response(null,{status:202});
  });
  await assert.rejects(new MailBridgeAlerts({},env).sendAcceptanceTest(),/test_disabled/);
  assert.equal(calls.length,0);
  await new MailBridgeAlerts({},{...env,AOL_COPY_TEST_ENABLED:'true'}).sendAcceptanceTest();
  const {message}=JSON.parse(calls[1].options.body);
  assert.deepEqual(message.toRecipients,[{emailAddress:{address:'memphismaterial@aol.com'}}]);
  assert.equal(message.subject,'TEST — AOL copy check');
  assert.equal(message.attachments[0].name,'aol-copy-check.txt');
  assert.match(Buffer.from(message.attachments[0].contentBytes,'base64').toString(),/No customer information/);
  assert.equal(typeof new MailBridgeAlerts({},env).deliver,'undefined');
});
