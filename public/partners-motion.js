// The document remains a native scroll. Focus follows each company through it.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector('.header-inner');
const opening = document.querySelector('.partners-opening');
const projects = [...document.querySelectorAll('[data-project-index]')];
const items = [...document.querySelectorAll('[data-focus-item]')];
const sections = [...document.querySelectorAll('[data-partner-section]')];
const links = [...document.querySelectorAll('[data-industry-link]')];
const sectionLinks = [...document.querySelectorAll('[data-section-link]')];
const counter = document.querySelector('[data-company-counter]');
const progress = document.createElement('span');
progress.className = 'partners-progress';
progress.setAttribute('aria-hidden', 'true');
document.body.append(progress);
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const n=clamp(value); return n*n*(3-2*n); };
let requested = false;
let observer;
function paint() {
  requested = false;
  const headerHeight = header?.getBoundingClientRect().height || 74;
  document.body.style.setProperty('--cp-header', `${headerHeight}px`);
  const navHeight = document.querySelector('.partners-chapters')?.offsetHeight || 55;
  const visibleTop = headerHeight + navHeight;
  const focusLine = visibleTop + (innerHeight - visibleTop) * .48;
  const focusRange = Math.max(170, (innerHeight - visibleTop) * .36);
  let closestProject = projects[0], closestDistance = Infinity;
  for (const item of items) {
    const box = item.getBoundingClientRect();
    const distance = Math.abs(box.top + box.height * .5 - focusLine);
    const focus = reduced.matches ? 1 : ease((1 - distance / focusRange - .04) / .8);
    item.style.setProperty('--item-focus', focus.toFixed(3));
    item.style.setProperty('--logo-gray', (1-focus).toFixed(3));
    item.classList.toggle('is-in-focus', focus > .45);
    if (item.hasAttribute('data-project-index') && distance < closestDistance) {
      closestDistance = distance; closestProject = item;
    }
  }
  if (counter && closestProject) counter.textContent = closestProject.dataset.projectIndex.padStart(2,'0');
  const activeGroup = closestProject?.closest('[data-industry]');
  for (const link of links) {
    if (link.dataset.industryLink === activeGroup?.id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  let activeSection = sections[0];
  for (const section of sections) if (section.getBoundingClientRect().top <= visibleTop+50) activeSection = section;
  for (const link of sectionLinks) {
    if (link.dataset.sectionLink === activeSection?.id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  if (!reduced.matches) {
    const maximum = document.documentElement.scrollHeight - innerHeight;
    document.body.style.setProperty('--partner-progress', clamp(scrollY / Math.max(1, maximum)));
    opening?.style.setProperty('--opening-shift', `${Math.min(scrollY, 700)}px`);
  }
}
function requestPaint() { if (!requested) { requested = true; requestAnimationFrame(paint); } }
addEventListener('scroll', requestPaint, { passive:true });
addEventListener('resize', requestPaint);
addEventListener('pageshow', requestPaint);
document.fonts.ready.then(requestPaint);
if ('ResizeObserver' in window) new ResizeObserver(requestPaint).observe(document.querySelector('main'));
const targets = [...document.querySelectorAll('[data-partner-reveal]')];
function setMotion() {
  observer?.disconnect();
  targets.forEach(target => target.classList.remove('partner-pending'));
  document.body.classList.toggle('partners-motion', !reduced.matches);
  if (!reduced.matches && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.remove('partner-pending');
        observer.unobserve(entry.target);
      }
    }, { threshold:.05, rootMargin:'0px 0px 30px 0px' });
    targets.forEach(target => {
      if (target.getBoundingClientRect().top > innerHeight) {
        target.classList.add('partner-pending');
        observer.observe(target);
      }
    });
  }
  requestPaint();
}
reduced.addEventListener('change', setMotion);
setMotion();
