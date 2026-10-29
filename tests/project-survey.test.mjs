import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import test from 'node:test';
// Browser QA is opt-in: install Playwright or set MMH_PLAYWRIGHT_MODULE to its module path.
const {chromium}=await import(process.env.MMH_PLAYWRIGHT_MODULE || 'playwright');

const root=process.cwd();
const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const name=pathname==='/plan-project'?path.join(root,'site-pages/plan-project.html'):path.join(root,'public',pathname.replace(/^\//,''));
  try{const body=await readFile(name);res.setHeader('content-type',name.endsWith('.html')?'text/html':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'application/octet-stream');res.end(body);}catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({...(process.env.MMH_BROWSER_EXECUTABLE?{executablePath:process.env.MMH_BROWSER_EXECUTABLE}:{}),headless:true});
const mockTurnstile=`window.testVerification={renders:[],removed:[],complete(value='mock-token'){this.renders.at(-1).callback(value)},expire(){this.renders.at(-1)['expired-callback']()},error(){this.renders.at(-1)['error-callback']()}};window.turnstile={render(container,options){window.testVerification.renders.push(options);const fixture=document.createElement('div');fixture.textContent='Mock verification';fixture.style.cssText=options.size==='compact'?'height:140px;width:150px':'height:65px;min-width:300px;width:100%';container.append(fixture);return 'mock-'+window.testVerification.renders.length},remove(id){window.testVerification.removed.push(id);document.querySelector('[data-pp-verification]').replaceChildren()}};`;
async function setup({enabled=true,scriptFails=false,post}={}){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(()=>sessionStorage.setItem('mmh-opening-seen-v2','1'));
  const page=await context.newPage();const payloads=[];let scriptRequests=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/project-requests/config',route=>route.fulfill({json:{enabled,siteKey:enabled?'mock-site-key':undefined}}));
  await page.route('https://challenges.cloudflare.com/**',route=>{scriptRequests++;return scriptFails&&scriptRequests===1?route.abort():route.fulfill({contentType:'application/javascript',body:mockTurnstile})});
  await page.route('**/api/project-requests',route=>{payloads.push(route.request().postDataJSON());return post?post(route,payloads):route.fulfill({json:{accepted:true,reference:'mock-reference'}})});
  await page.goto(origin+'/plan-project',{waitUntil:'networkidle'});
  return {context,page,payloads,errors,scripts:()=>scriptRequests};
}
async function fill(page){await page.locator('.pp-choice').filter({has:page.locator('input[value="unsure"]')}).click();await page.locator('#project-name').fill('UI Test');await page.locator('#project-phone').fill('9015550142');await page.locator('#project-description').fill('<img src=x onerror=alert(1)>');await page.locator('.pp-review-button').click();await page.locator('#project-review[open]').waitFor();}
async function complete(page,value='mock-token'){await page.waitForFunction(()=>window.testVerification?.renders.length>0);await page.evaluate(v=>window.testVerification.complete(v),value);await page.locator('[data-pp-send]:enabled').waitFor();}
try {
await test('loads verification only at review, validates choices, and safely retries the exact first payload',async()=>{
  const f=await setup({post:(route,payloads)=>payloads.length===1?route.abort():route.fulfill({json:{accepted:true,reference:'mock-confirmed'}})});const {page}=f;
  assert.equal(f.scripts(),0);await page.locator('button[data-pp-next="1"]').click();assert.match(await page.locator('#project-needs-error').innerText(),/Choose at least one/);
  await page.locator('.pp-choice').filter({has:page.locator('input[value="storage"]')}).click();await fill(page);assert.equal(await page.locator('input[name="needs"]:checked').count(),1);
  await page.waitForFunction(()=>window.testVerification?.renders.length===1);assert.equal(await page.locator('[data-pp-send]').isDisabled(),true);assert.equal(f.scripts(),1);
  assert.match(await page.locator('[data-pp-summary]').innerText(),/<img src=x onerror=alert\(1\)>/);assert.equal(await page.locator('[data-pp-summary] img').count(),0);
  await complete(page);await page.locator('[data-pp-send]').click();await page.locator('[data-pp-send-error]:not([hidden])').waitFor();assert.equal(await page.locator('#project-name').isDisabled(),true);assert.equal(await page.locator('#project-success').isVisible(),false);
  await page.getByRole('button',{name:'Keep editing'}).click();await page.locator('#project-review[open]').waitFor({state:'hidden'});assert.equal(await page.locator('.pp-review-button').isEnabled(),true);await page.locator('.pp-review-button').click();
  await page.getByRole('button',{name:'Check submission'}).click();await page.locator('#project-success:not([hidden])').waitFor();assert.deepEqual(f.payloads[0],f.payloads[1]);assert.ok(f.payloads[0].turnstileToken);assert.ok(!('csrfToken' in f.payloads[0]));assert.match(f.payloads[0].requestId,/^[\da-f]{8}-[\da-f]{4}-4/);assert.deepEqual(f.errors,[]);await f.context.close();
});
await test('verification rejection renews the token without changing the request ID or answers',async()=>{
  const f=await setup({post:(route,payloads)=>route.fulfill({status:payloads.length===1?400:200,json:payloads.length===1?{verification:true,error:'Complete verification again.'}:{accepted:true,reference:'mock-renewed'}})});await fill(f.page);await complete(f.page,'first-token');await f.page.locator('[data-pp-send]').click();await f.page.waitForFunction(()=>window.testVerification.renders.length===2);assert.equal(await f.page.locator('[data-pp-send]').isDisabled(),true);await complete(f.page,'second-token');await f.page.locator('[data-pp-send]').click();await f.page.locator('#project-success:not([hidden])').waitFor();assert.equal(f.payloads[0].requestId,f.payloads[1].requestId);assert.equal(f.payloads[0].turnstileToken,'first-token');assert.equal(f.payloads[1].turnstileToken,'second-token');await f.context.close();
});
await test('expiration and script failures offer verification recovery; final server outcomes never show success',async()=>{
  const f=await setup({scriptFails:true,post:route=>route.fulfill({status:502,json:{final:true,error:'Please call about this reference.',reference:'mock-final'}})});await fill(f.page);await f.page.locator('[data-pp-verify-retry]:not([hidden])').waitFor();assert.equal(await f.page.locator('[data-pp-send]').isDisabled(),true);await f.page.locator('[data-pp-verify-retry]').click();await complete(f.page);await f.page.evaluate(()=>window.testVerification.expire());assert.equal(await f.page.locator('[data-pp-send]').isDisabled(),true);await f.page.locator('[data-pp-verify-retry]').click();await complete(f.page,'fresh-token');await f.page.locator('[data-pp-send]').click();await f.page.locator('[data-pp-send-error]:not([hidden])').waitFor();assert.equal(await f.page.locator('[data-pp-send]').isDisabled(),true);assert.equal(await f.page.locator('#project-success').isVisible(),false);assert.match(await f.page.locator('[data-pp-send-error]').innerText(),/mock-final/);await f.context.close();
});
await test('mobile/reduced-motion review remains usable and no private-draft controls leak',async()=>{
 const f=await setup();await fill(f.page);await complete(f.page);assert.equal(await f.page.locator('[data-pp-owner]').count(),0);assert.equal(await f.page.locator('a[href*="project-inbox"]').count(),0);
 for(const width of [1440,1024,768,650,390,320]){await f.page.setViewportSize({width,height:844});await f.page.waitForTimeout(80);assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'page overflow '+width);const box=await f.page.locator('#project-review').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1,'dialog outside viewport '+width);assert.equal(await f.page.locator('#project-review').evaluate(e=>e.scrollWidth>e.clientWidth),false,'verification overflows dialog '+width);}
 await f.page.emulateMedia({reducedMotion:'reduce'});await f.page.waitForTimeout(60);assert.equal(await f.page.locator('.pp-section:not(.pp-seen)').count(),0);await f.context.close();
});
await test('server field errors unlock the fields and focus the corrected control',async()=>{
 const f=await setup({post:route=>route.fulfill({status:400,json:{errors:{name:'Please check your name.'}}})});await fill(f.page);await complete(f.page);await f.page.locator('[data-pp-send]').click();await f.page.locator('#project-review[open]').waitFor({state:'hidden'});assert.equal(await f.page.locator('#project-name').isEnabled(),true);await f.page.waitForFunction(()=>document.activeElement?.id==='project-name');assert.match(await f.page.locator('#project-name-error').innerText(),/Please check your name/);await f.context.close();
});
await test('disabled delivery and no-JS defaults cannot submit or place contact data in a URL',async()=>{
 const f=await setup({enabled:false});await fill(f.page);assert.equal(await f.page.locator('[data-pp-send]').isDisabled(),true);assert.equal(f.scripts(),0);assert.match(await f.page.locator('[data-pp-send-error]').innerText(),/unavailable/);assert.equal(f.payloads.length,0);await f.context.close();
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto(origin+'/plan-project');assert.equal(await page.locator('#project-form').getAttribute('method'),'post');assert.equal(await page.locator('.pp-review-button').isDisabled(),true);assert.equal(await page.locator('noscript').isVisible(),true);await context.close();
});
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
