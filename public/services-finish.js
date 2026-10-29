// Native document scrolling connects the service chapters to the working floor.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const chapters = [...document.querySelectorAll('[data-sf-chapter]')];
const navLinks = [...document.querySelectorAll('[data-sf-nav]')];
const photo = document.querySelector('.sf-path-image');
const photoCount = document.querySelector('.sf-photo-count');
const photoLabel = document.querySelector('.sf-photo-label');
const photoSteps = [...document.querySelectorAll('.sf-photo-steps>span')];
const opening = document.querySelector('.sf-opening');
const targets = [...document.querySelectorAll('[data-sf-reveal]')];
const captions = ['The layout sets direction.', 'Equipment gives it form.', 'Installation makes it real.'];
const crops = [{x:'62%',scale:'1.05'},{x:'44%',scale:'1.2'},{x:'79%',scale:'1.12'}];
let active = -1, requested = false, observer;
const sections = [...chapters, document.querySelector('#equipment')].filter(Boolean);
function paint() {
  requested = false;
  const headerHeight = document.querySelector('.header-inner')?.getBoundingClientRect().height || 74;
  document.body.style.setProperty('--cp-header', `${headerHeight}px`);
  const focusLine = Math.max(headerHeight + 125, innerHeight * .43);
  let current = 0;
  chapters.forEach((chapter, index) => { if (chapter.getBoundingClientRect().top <= focusLine) current = index; });
  if (current !== active) {
    active = current;
    photo?.style.setProperty('--sf-photo-x', crops[current].x);
    photo?.style.setProperty('--sf-photo-scale', crops[current].scale);
    if (photoCount) photoCount.textContent = `0${current + 1} / 03`;
    if (photoLabel) photoLabel.textContent = captions[current];
    photoSteps.forEach((step, index) => step.classList.toggle('is-active', index === current));
  }
  let section = sections[0];
  sections.forEach(item => { if (item.getBoundingClientRect().top <= headerHeight + 110) section = item; });
  navLinks.forEach(link => {
    if (link.dataset.sfNav === section?.id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  if (!reduced.matches) opening?.style.setProperty('--sf-hero-shift', String(Math.min(scrollY, innerHeight)) + 'px');
}
function requestPaint() { if (!requested) { requested = true; requestAnimationFrame(paint); } }
function setMotion() {
  observer?.disconnect();
  targets.forEach(target => target.classList.remove('sf-pending'));
  document.body.classList.toggle('services-motion', !reduced.matches);
  if (!reduced.matches && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove('sf-pending'); observer.unobserve(entry.target); } });
    }, {threshold:.05, rootMargin:'0px 0px 10px 0px'});
    targets.forEach(target => { if (target.getBoundingClientRect().top > innerHeight) { target.classList.add('sf-pending'); observer.observe(target); } });
  }
  requestPaint();
}
function openHash() {
  if (!location.hash) return;
  let target;
  try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
  if (target?.tagName === 'DETAILS') target.open = true;
  requestPaint();
}
addEventListener('scroll', requestPaint, {passive:true});
addEventListener('resize', requestPaint);
addEventListener('pageshow', requestPaint);
addEventListener('hashchange', openHash);
reduced.addEventListener('change', setMotion);
document.fonts?.ready.then(requestPaint);
if ('ResizeObserver' in window) new ResizeObserver(requestPaint).observe(document.querySelector('main'));
openHash();
setMotion();
