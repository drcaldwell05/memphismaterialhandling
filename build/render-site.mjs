import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const PUBLIC_PAGES = [
  { file:'index.html', route:'/', active:'home' },
  { file:'services.html', route:'/services', active:'services' },
  { file:'partners.html', route:'/partners', active:'partners' },
  { file:'about.html', route:'/about', active:'about' },
  { file:'contact.html', route:'/contact', active:'contact' },
  { file:'plan-project.html', route:'/plan-project', active:'plan' },
];
const ORIGIN = 'https://www.memphismaterialhandling.com';
const routeByFile = new Map(PUBLIC_PAGES.map(page=>[page.file,page.route]));
const escapeAttribute = value => value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const decodeText = value => value.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'");

function normalizeUrls(html) {
  return html.replace(/\b(href|src|action)="([^"]*)"/g, (full,attribute,value) => {
    if (!value || /^(?:#|\/|https?:|tel:|mailto:|data:)/.test(value)) return full;
    const filename=value.split(/[?#]/)[0];
    const rest=value.slice(filename.length);
    return `${attribute}="${routeByFile.has(filename) ? routeByFile.get(filename)+rest : '/'+value}"`;
  });
}

function sharedShell(source,active) {
  const marker=source.indexOf('\nconst siteHeader=');
  if (marker<0) throw new Error('Shared app shell marker was not found; update the build renderer with the app shell.');
  const output={header:'',footer:''};
  const document={body:{dataset:{active}},querySelector(selector){
    const key=selector==='[data-site-header]'?'header':selector==='[data-site-footer]'?'footer':null;
    if(!key)return null;
    return {set outerHTML(value){output[key]=value;}};
  }};
  // This is a bounded evaluation of our own checked-in shell templates only.
  // It does not run the motion/controller code or any visitor-supplied values.
  vm.runInNewContext(source.slice(0,marker),{document,Date},{timeout:1000});
  if(!output.header||!output.footer)throw new Error('The public document shell was not generated.');
  return output;
}

export async function renderSite(root=process.cwd()) {
  const publicRoot=path.join(root,'public');
  const destination=path.join(publicRoot,'_site-pages');
  await mkdir(destination,{recursive:true});
  const shellSource=await readFile(path.join(publicRoot,'app.js'),'utf8');
  for(const page of PUBLIC_PAGES){
    let html=await readFile(path.join(root,'site-pages',page.file),'utf8');
    const shell=sharedShell(shellSource,page.active);
    if(!html.includes('<div data-site-header></div>')||!html.includes('<div data-site-footer></div>'))throw new Error(`Missing document shell placeholders in ${page.file}`);
    html=html.replace('<div data-site-header></div>',shell.header).replace('<div data-site-footer></div>',shell.footer);
    html=normalizeUrls(html).replace(/<meta\s+name="robots"[^>]*>\s*/gi,'');
    const title=decodeText(html.match(/<title>([^<]+)<\/title>/i)?.[1]||'Memphis Material Handling');
    const description=decodeText(html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]||'Warehouse planning, equipment, and installation from Memphis Material Handling.');
    const canonical=ORIGIN+page.route;
    const metadata=`<meta name="robots" content="index,follow"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:site_name" content="Memphis Material Handling"><meta property="og:title" content="${escapeAttribute(title)}"><meta property="og:description" content="${escapeAttribute(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${ORIGIN}/og-redesign.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Memphis Material Handling — warehouse planning, equipment, and installation"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeAttribute(title)}"><meta name="twitter:description" content="${escapeAttribute(description)}"><meta name="twitter:image" content="${ORIGIN}/og-redesign.png">`;
    html=html.replace('</head>',metadata+'\n</head>');
    if(page.route==='/'){
      const business={ '@context':'https://schema.org', '@type':'LocalBusiness', name:'Memphis Material Handling, Inc.', url:ORIGIN, telephone:'+1-901-947-7225', foundingDate:'1986', image:ORIGIN+'/og-redesign.png', address:{'@type':'PostalAddress',streetAddress:'3832 Watman Ave.',addressLocality:'Memphis',addressRegion:'TN',postalCode:'38118',addressCountry:'US'}, openingHoursSpecification:[{'@type':'OpeningHoursSpecification',dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday'],opens:'08:00',closes:'17:00'}] };
      html=html.replace('</head>',`<script type="application/ld+json">${JSON.stringify(business).replaceAll('<','\\u003c')}</script>\n</head>`);
    }
    await writeFile(path.join(destination,page.file),html);
  }
  await writeFile(path.join(publicRoot,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /sign-in\nDisallow: /_site-pages/\nDisallow: /project-inbox\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
  await writeFile(path.join(publicRoot,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${PUBLIC_PAGES.map(page=>`<url><loc>${ORIGIN+page.route}</loc></url>`).join('')}</urlset>\n`);
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await renderSite();
