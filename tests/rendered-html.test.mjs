import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test, { before } from 'node:test';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';
import { PUBLIC_PAGES, renderSite } from '../build/render-site.mjs';

// The harness emulates only static assets; it never calls private RPC or mail.
register('./cloudflare-loader.mjs', import.meta.url);
const root=fileURLToPath(new URL('../',import.meta.url));
const publicRoot=path.join(root,'public');
const ORIGIN='https://www.memphismaterialhandling.com';
let modulePromise;
before(async()=>{await renderSite(root);});
const workerModule=()=>modulePromise??=import(new URL('../dist/server/index.js',import.meta.url).href);
async function assetFetch(request){
  const filename=path.join(publicRoot,decodeURIComponent(new URL(request.url).pathname));
  if(!filename.startsWith(publicRoot+path.sep))return new Response('Not found',{status:404});
  try{
    if(!(await stat(filename)).isFile())return new Response('Not found',{status:404});
    const type=filename.endsWith('.html')?'text/html; charset=utf-8':filename.endsWith('.xml')?'application/xml':filename.endsWith('.txt')?'text/plain':'application/octet-stream';
    return new Response(request.method==='HEAD'?null:await readFile(filename),{headers:{'Content-Type':type}});
  }catch{return new Response('Not found',{status:404});}
}
async function render(pathname,options={}){
  const {default:worker}=await workerModule();
  return worker.fetch(new Request(ORIGIN+pathname,{headers:{accept:'text/html'},...options}),{ASSETS:{fetch:assetFetch}},{waitUntil(){},passThroughOnException(){}});
}
async function getHtml(pathname){const response=await render(pathname);assert.equal(response.status,200,pathname+' should render');assert.match(response.headers.get('content-type')||'',/^text\/html\b/i);return response.text();}
function structure(html,pathname){
  for(const tag of ['header','main','h1','footer'])assert.equal((html.match(new RegExp('<'+tag+'\\b','g'))||[]).length,1,pathname+' one '+tag);
  assert.match(html,/<main\b[^>]*id="main-content"/);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,pathname+' unique ids');
  for(const [,value] of html.matchAll(/\baria-(?:labelledby|controls)="([^"]+)"/g))for(const id of value.split(/\s+/))assert.ok(ids.includes(id),pathname+' aria reference '+id);
  assert.doesNotMatch(html,/<div data-site-(?:header|footer)>/,'Header and footer must exist before JavaScript');
}

test('serves all six approved public pages with a complete shell and searchable metadata',async()=>{
  for(const page of PUBLIC_PAGES){
    const html=await getHtml(page.route);structure(html,page.route);
    assert.ok(html.includes(`<link rel="canonical" href="${ORIGIN+page.route}">`));
    assert.ok(html.includes(`<meta property="og:url" content="${ORIGIN+page.route}">`));
    assert.match(html,/<meta property="og:title" content="[^"]+">/);
    assert.match(html,/<meta name="twitter:card" content="summary_large_image">/);
    assert.match(html,/<meta name="description" content="[^"]+">/);
    assert.match(html,/<meta name="robots" content="index,follow">/);
    assert.doesNotMatch(html,/noindex|nofollow/);
    assert.match(html,/href="\/plan-project"/);
    assert.match(html,/href="tel:9019477225"/);
    assert.match(html,/3832 Watman Ave\./);
    assert.match(html,/Monday–Friday/);
    assert.equal((html.match(/src="\/app\.js"/g)||[]).length,1);
    assert.doesNotMatch(html,/project-inbox\.html|signin-with-chatgpt|canViewInbox/);
  }
});

test('preserves the custom home story and verified business content',async()=>{
  const home=await getHtml('/');assert.match(home,/Room for/);assert.match(home,/what’s next\./);assert.match(home,/id="journey"/);assert.match(home,/id="next-chapter"/);assert.match(home,/class="journey-model"/);assert.match(home,/class="horizon-project-link" href="\/plan-project"/);assert.match(home,/application\/ld\+json/);assert.match(home,/"foundingDate":"1986"/);
  const about=await getHtml('/about');assert.match(about.replace(/<[^>]*>/g,' '),/Russell R\.\s+Caldwell/);assert.match(about,/>President</);assert.match(about,/1986/);assert.match(about,/Engineering &amp; permitting/);assert.match(about,/Turnkey installation/);assert.match(about,/liquidation/i);
  const contact=await getHtml('/contact');assert.match(contact,/901-947-7225/);assert.match(contact,/Memphis, TN 38118/);assert.match(contact,/8:00 am–5:00 pm/);assert.match(contact,/Get directions/);assert.doesNotMatch(contact,/<form\b/);
});

test('keeps services, equipment deep links and native disclosures complete',async()=>{
  const html=await getHtml('/services');assert.match(html,/From space\./);assert.match(html,/To system\./);assert.match(html,/src="\/assets\/warehouse\.webp"/);
  for(const id of ['plan','equip','install','equipment','storage','movement','dock','protection'])assert.ok(html.includes(`id="${id}"`));
  for(const item of ['CAD warehouse layout','seismic design','Permitting coordination','New or used','Power conveyor','Gravity conveyor','Safety netting','liquidation services'])assert.ok(html.includes(item),item);
  assert.equal((html.match(/<details\b/g)||[]).length,4);assert.equal((html.match(/<summary\b/g)||[]).length,4);
});

test('shows all 11 project organizations and six suppliers with the approved relationship distinction',async()=>{
  const html=await getHtml('/partners');
  for(const name of ['EVERSANA','The Hershey Company','Kellogg’s','Fred’s, Inc.','TJ Maxx','Costco Wholesale','Helen of Troy','Hydro Flask','Nike','Shelby County Sheriff’s Office','Memphis Police Department'])assert.ok(html.includes(name),name);
  for(const name of ['Interlake Mecalux','Mallard Manufacturing','Bluff Manufacturing','Borroughs Corporation','World Wide Material Handling','InCord'])assert.ok(html.includes(name),name);
  assert.equal((html.match(/data-project-index=/g)||[]).length,11);
  assert.equal((html.match(/class="source-row"/g)||[]).length,6);
  assert.match(html,/not paid partnerships, sponsorships, or endorsements/);assert.match(html,/does not imply an ongoing business relationship/);assert.match(html,/purchase equipment and products from/);
  assert.match(html,/id="project-experience"/);assert.match(html,/id="equipment-network"/);assert.doesNotMatch(html,/medline|warehouserack|Ridg-U-Rak|Cameron Pleasant/i);
  const motion=await readFile(path.join(publicRoot,'partners-motion.js'),'utf8');assert.match(motion,/--logo-gray/);assert.match(motion,/getBoundingClientRect/);
});

test('serves a native, accessible project questionnaire with a review and safe no-JavaScript fallback',async()=>{
  const html=await getHtml('/plan-project');
  assert.match(html,/<form\b[^>]*method="post"[^>]*action="\/api\/project-requests"/);
  for(const name of ['needs','description','location','timing','name','company','email','phone','website'])assert.ok(html.includes(`name="${name}"`));
  for(const id of ['your-project','project-basics','your-details'])assert.ok(html.includes(`id="${id}"`));
  assert.match(html,/<dialog\b[^>]*id="project-review"/);assert.match(html,/Review your project/);assert.match(html,/Send project request/);assert.match(html,/<noscript>/);
  assert.match(html,/<button\b[^>]*class="pp-review-button"[^>]*disabled/);
  assert.match(html,/type="email"/);assert.match(html,/type="tel"/);assert.match(html,/autocomplete="name"/);
  assert.doesNotMatch(html,/project-inbox|private draft|Email alerts aren’t enabled|Your email was sent/i);
});

test('redirects legacy .html and trailing-slash page aliases to clean URLs without loops',async()=>{
  for(const page of PUBLIC_PAGES){
    const aliases=page.route==='/'?['/index.html']:[page.route+'.html',page.route+'/'];
    for(const alias of aliases){const response=await render(alias+'?source=test');assert.equal(response.status,301);assert.equal(response.headers.get('location'),page.route+'?source=test');}
    const head=await render(page.route,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
    const post=await render(page.route,{method:'POST'});assert.equal(post.status,405);assert.equal(post.headers.get('allow'),'GET, HEAD');
  }
  assert.equal((await render('/_site-pages/index.html')).status,404);
});

test('keeps mail API routing and private Worker classes intact',async()=>{
  const config=await render('/api/project-requests/config');assert.equal(config.status,200);assert.deepEqual(await config.json(),{enabled:false});assert.equal(config.headers.get('cache-control'),'no-store');
  const post=await render('/api/project-requests',{method:'POST'});assert.equal(post.status,503);assert.match((await post.json()).error,/temporarily unavailable/);
  const builtWorker=await workerModule();assert.ok(builtWorker.ProjectSubmission);assert.ok(builtWorker.MailBridgeAlerts);
  const source=await readFile(path.join(root,'worker/index.ts'),'utf8');assert.ok(source.indexOf('handleProjectRequest(request, env)')<source.indexOf('const canonical = aliases'));
});

test('uses explicit asset handling and preserves existing protected delivery bindings',async()=>{
  const config=JSON.parse(await readFile(path.join(root,'dist/server/wrangler.json'),'utf8'));
  assert.equal(config.name,'memphismaterialhandling');assert.equal(config.assets.binding,'ASSETS');assert.equal(config.assets.html_handling,'none');
  for(const page of PUBLIC_PAGES){assert.ok(config.assets.run_worker_first.includes(page.route));assert.ok(config.assets.run_worker_first.includes(page.route==='/'?'/index.html':page.route+'.html'));}
  assert.ok(config.assets.run_worker_first.includes('/_site-pages/*'));assert.ok(config.assets.run_worker_first.includes('/api/*'));
  assert.equal(config.vars.PROJECT_REQUESTS_ENABLED,'true');assert.equal(config.vars.AOL_COPY_ALERTS_ENABLED,'true');assert.equal(config.durable_objects.bindings[0].class_name,'ProjectSubmission');assert.equal(config.migrations[0].tag,'project-submission-v1');assert.equal(config.ratelimits[0].name,'PROJECT_RATE_LIMITER');
  assert.ok(!('MS_GRAPH_CLIENT_SECRET' in config.vars));assert.ok(!('TURNSTILE_SECRET_KEY' in config.vars));
});

test('keeps local navigation/assets connected and publishes only public URLs in robots/sitemap',async()=>{
  const pages=new Map(await Promise.all(PUBLIC_PAGES.map(async page=>[page.route,await getHtml(page.route)])));
  for(const [pathname,html] of pages){
    for(const [,target] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
      if(!target.startsWith('/')&&!target.startsWith('#'))continue;
      const url=new URL(target.replaceAll('&amp;','&'),ORIGIN+pathname);
      if(pages.has(url.pathname)){if(url.hash)assert.ok(pages.get(url.pathname).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`),pathname+' '+target);}
      else await access(path.join(publicRoot,url.pathname));
    }
  }
  const robots=await readFile(path.join(publicRoot,'robots.txt'),'utf8');assert.match(robots,/Allow: \//);assert.match(robots,/Disallow: \/api\//);assert.match(robots,/Disallow: \/sign-in/);assert.match(robots,/Sitemap: https:\/\/www\.memphismaterialhandling\.com\/sitemap\.xml/);
  const sitemap=await readFile(path.join(publicRoot,'sitemap.xml'),'utf8');for(const page of PUBLIC_PAGES)assert.ok(sitemap.includes(`<loc>${ORIGIN+page.route}</loc>`));assert.doesNotMatch(sitemap,/sign-in|project-inbox|_site-pages|\.html/);
  for(const file of ['project-inbox.html','project-inbox.js','project-inbox.css'])await assert.rejects(access(path.join(publicRoot,file)));
});

test('keeps the approved once-per-session opening and motion fallbacks available',async()=>{
  const start=await readFile(path.join(publicRoot,'mmh-opening-start.js'),'utf8');assert.match(start,/navigation\.type !== "navigate"/);assert.match(start,/document\.referrer/);
  const app=await readFile(path.join(publicRoot,'app.js'),'utf8');assert.equal((app.match(/import\('\.\/mmh-opening-start\.js'\)/g)||[]).length,1);
  for(const file of ['assets/three.module.js','assets/THREE-LICENSE.txt','assets/manrope.woff2','assets/logo.png','assets/warehouse.webp','assets/memphis.jpg'])await access(path.join(publicRoot,file));
  const styles=await readFile(path.join(publicRoot,'page-motion.css'),'utf8');assert.match(styles,/prefers-reduced-motion/);
});
