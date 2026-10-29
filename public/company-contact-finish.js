const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const targets = [...document.querySelectorAll('[data-cc-reveal]')];
const images = [...document.querySelectorAll('[data-cc-parallax]')];
const header = document.querySelector('.header-inner');
const meter = document.createElement('span');
meter.className = 'cc-page-meter';
meter.setAttribute('aria-hidden', 'true');
document.body.append(meter);
let queued = false;
let observer;
function paint() {
  queued = false;
  if (header) document.body.style.setProperty('--cc-header', `${header.getBoundingClientRect().height}px`);
  if (reduced.matches) return;
  const range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  document.body.style.setProperty('--cc-page-progress', Math.max(0, Math.min(1, scrollY / range)));
  for (const image of images) {
    const frame = image.parentElement.getBoundingClientRect();
    if (frame.bottom < -100 || frame.top > innerHeight + 100) continue;
    const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - frame.top - frame.height / 2) / innerHeight));
    image.style.transform = `translateY(${progress * Number(image.dataset.ccParallax || 20)}px) scale(1.025)`;
  }
}
function schedule() { if (!queued) { queued = true; requestAnimationFrame(paint); } }
function setMotion() {
  observer?.disconnect();
  targets.forEach(target => target.classList.remove('cc-pending'));
  document.body.classList.toggle('cc-motion', !reduced.matches);
  if (reduced.matches) images.forEach(image => image.style.removeProperty('transform'));
  else if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.remove('cc-pending');
        observer.unobserve(entry.target);
      }
    }, { threshold:.08, rootMargin:'0px 0px -15px 0px' });
    for (const target of targets) if (target.getBoundingClientRect().top > innerHeight) {
      target.classList.add('cc-pending');
      observer.observe(target);
    }
  }
  schedule();
}
addEventListener('scroll', schedule, { passive:true });
addEventListener('resize', schedule);
addEventListener('pageshow', schedule);
reduced.addEventListener('change', setMotion);
document.fonts?.ready.then(schedule);
if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.querySelector('main'));
setMotion();
