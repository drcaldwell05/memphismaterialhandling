const active = document.body.dataset.active || 'home';
const links = [ ['services','/services','Services'], ['partners','/partners','Partners'], ['about','/about','Company'] ];
const brand = `<span class="brand-mark"><img src="assets/logo.png" alt="" width="1536" height="1024"></span><span class="brand-name">Memphis Material Handling</span>`;
const header = document.querySelector('[data-site-header]');
if (header) header.outerHTML = `<header class="site-header" id="top"><a class="skip-link" href="#main-content">Skip to content</a><div class="header-inner"><a class="brand" href="/" aria-label="Memphis Material Handling home">${brand}</a><nav class="desktop-nav" aria-label="Main navigation">${links.map(([key,href,label])=>`<a href="${href}" ${active===key?'aria-current="page"':''}>${label}</a>`).join('')}</nav><a class="button button-primary header-cta" href="/plan-project" ${active==='plan'?'aria-current="page"':''}>Plan a project <span aria-hidden="true">↗</span></a><button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="mobile-navigation"><span></span><span></span></button></div><nav class="mobile-nav" id="mobile-navigation" aria-label="Mobile navigation" hidden><a href="/" ${active==='home'?'aria-current="page"':''}>Home <span aria-hidden="true">↗</span></a>${links.map(([key,href,label])=>`<a href="${href}" ${active===key?'aria-current="page"':''}>${label}<span aria-hidden="true">↗</span></a>`).join('')}<a href="/plan-project" ${active==='plan'?'aria-current="page"':''}>Plan a project <span aria-hidden="true">↗</span></a><a class="mobile-nav-call" href="tel:9019477225">901-947-7225</a></nav></header>`;
const footer=document.querySelector('[data-site-footer]');
if (footer) footer.outerHTML=`<footer class="site-footer"><div class="wrap footer-main"><div class="footer-company"><a class="brand" href="/" aria-label="Memphis Material Handling home">${brand}</a><p>Planning, equipment, and installation.<br>Rooted in Memphis since 1986.</p></div><nav class="footer-nav" aria-label="Footer navigation"><p class="footer-label">Explore</p>${links.map(([key,href,label])=>`<a href="${href}" ${active===key?'aria-current="page"':''}>${label}</a>`).join('')}<a href="/contact" ${active==='contact'?'aria-current="page"':''}>Contact</a></nav><div class="footer-contact"><p class="footer-label">Start a conversation</p><a class="footer-phone" href="tel:9019477225">901-947-7225 <span aria-hidden="true">↗</span></a><address><a href="https://www.google.com/maps/search/?api=1&query=3832+Watman+Ave+Memphis+TN+38118" target="_blank" rel="noreferrer">3832 Watman Ave., Memphis, TN 38118</a><br>Monday–Friday, 8 am–5 pm</address></div></div><div class="wrap footer-bottom"><p>© ${new Date().getFullYear()} Memphis Material Handling, Inc.</p><a class="footer-to-top" href="#top">Back to top <span aria-hidden="true">↑</span></a><span>Memphis, Tennessee</span></div></footer>`;

const siteHeader=document.querySelector('.site-header');
const menu=document.querySelector('.menu-toggle');
const mobileNav=document.getElementById('mobile-navigation');
function closeMenu(){if(!menu||!mobileNav)return;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');mobileNav.hidden=true;}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');mobileNav.hidden=!open;});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
document.addEventListener('click',event=>{if(menu?.getAttribute('aria-expanded')==='true'&&!siteHeader.contains(event.target))closeMenu();});
mobileNav?.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
window.matchMedia('(min-width:901px)').addEventListener('change',event=>{if(event.matches)closeMenu();});
function onScroll(){siteHeader?.classList.toggle('is-scrolled',scrollY>12);}
window.addEventListener('scroll',onScroll,{passive:true});onScroll();

const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
if(!reduced.matches&&'IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('is-pending');observer.unobserve(entry.target);}}),{threshold:.1});document.querySelectorAll('.section-heading,.approach-links,.systems-top,.project-layout,.experience-heading,.closing-layout,.page-intro .wrap,.feature-row,.partner-card').forEach(el=>{el.classList.add('reveal');if(el.getBoundingClientRect().top>innerHeight){el.classList.add('is-pending');observer.observe(el);}});reduced.addEventListener('change',()=>{if(reduced.matches){document.querySelectorAll('.is-pending').forEach(el=>el.classList.remove('is-pending'));observer.disconnect();}});}

document.querySelectorAll('[data-copy-phone]').forEach(button=>button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText('901-947-7225');button.textContent='Phone number copied';setTimeout(()=>{button.textContent='Copy phone number';},2500);}catch{button.textContent='901-947-7225';}}));

const explorer=document.getElementById('warehouse-explorer');
if(explorer) import('./warehouse-explorer.js').then(({initWarehouseExplorer})=>initWarehouseExplorer(explorer)).catch(()=>{explorer.innerHTML='<p>Explore storage, material movement, dock equipment, and protection.</p><a class="text-link" href="/services">View our services ↗</a>';});

const journey=document.getElementById('journey');
if(journey) import('./journey.js').then(({initWarehouseJourney})=>initWarehouseJourney(journey)).catch(()=>{});

if(document.querySelector('[data-scroll-story]')) import('./page-motion.js').then(({initPageMotion})=>initPageMotion()).catch(()=>{});

// Keep the approved opening and its once-per-session entrance behavior intact.
import('./mmh-opening-start.js').catch(()=>{});
