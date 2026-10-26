const SESSION_KEY = "mmh-opening-seen-v2";
const activeMounts = new WeakMap();
const pendingMounts = new WeakMap();
let playedInMemory = false;

function wasPlayed() {
  if (playedInMemory) return true;
  try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
}

function remember() {
  playedInMemory = true;
  try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* Storage is optional. */ }
}

async function loadLogo(url) {
  const image = new Image();
  image.decoding = "async";
  image.fetchPriority = "high";
  let timeout;
  const loaded = new Promise(resolve => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
  });
  image.src = url;
  const decoded = typeof image.decode === "function"
    ? image.decode().then(() => image.naturalWidth > 0, () => false)
    : loaded;
  try {
    return await Promise.race([
      decoded,
      new Promise(resolve => { timeout = setTimeout(() => resolve(false), 800); }),
    ]);
  } finally {
    clearTimeout(timeout);
    image.onload = null;
    image.onerror = null;
  }
}

/**
 * Adds one temporary intro overlay. The existing page is never wrapped,
 * restyled, hidden, scrolled, transformed, or given new DOM attributes.
 * Returns null when the intro is bypassed or the logo is unavailable.
 */
export async function mountMmhOpening({
  container = document.body,
  logoUrl = 'data:image/webp;base64,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',
  preview = false,
  force = false,
  onFinish,
} = {}) {
  if (!(container instanceof Element)) throw new TypeError("The opening container must be an element.");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if ((!preview && motion.matches) || (!preview && !force && wasPlayed())) return null;

  const token = Symbol("mmh-opening-mount");
  pendingMounts.set(container, token);
  activeMounts.get(container)?.destroy();

  let resolvedLogoUrl;
  try { resolvedLogoUrl = new URL(String(logoUrl), document.baseURI).href; } catch { return null; }
  if (!await loadLogo(resolvedLogoUrl) || pendingMounts.get(container) !== token) return null;
  if (!container.isConnected || (!preview && motion.matches) || (!preview && !force && wasPlayed())) return null;

  const previousFocus = document.activeElement;
  const host = document.createElement("div");
  host.setAttribute("data-mmh-opening", "");
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
        display: block;
        position: ${preview ? "absolute" : "fixed"};
        inset: 0;
        z-index: 2147483000;
        isolation: isolate;
        overflow: hidden;
        pointer-events: auto;
        contain: layout style;
        --forest: #23483b;
        --copper: #b76d45;
        --ease: cubic-bezier(.2,.8,.2,1);
        --size: ${preview ? "clamp(118px, 21cqw, 148px)" : "clamp(150px, 16vw, 202px)"};
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
        color: var(--forest);
        -webkit-font-smoothing: antialiased;
      }
      *, *::before, *::after { box-sizing: border-box; }
      .curtain { position: absolute; inset: 0; overflow: hidden; background: #fff; }
      .curtain::after {
        content: ""; position: absolute; inset: auto 0 0; height: 1px;
        background: linear-gradient(90deg, transparent, #b76d4550, transparent);
        opacity: 0;
      }
      .scene {
        position: absolute; inset: 0; display: flex; flex-direction: column;
        align-items: center; justify-content: center; padding: 72px 22px;
        perspective: 800px; transform-origin: 50% 44%;
      }
      .mark-wrap { position: relative; width: var(--size); margin-bottom: 27px; perspective: 650px; }
      .mark { display: block; width: 100%; height: auto; overflow: hidden; }
      .piece { transform-origin: 770px 485px; }
      .sweep { opacity: 0; }
      .name-mask { overflow: hidden; max-width: 100%; }
      .name {
        margin: 0; text-align: center; font-size: ${preview ? "clamp(19px, 3.1cqw, 25px)" : "clamp(22px, 2.2vw, 32px)"};
        line-height: 1.2; font-weight: 500; letter-spacing: -.037em;
      }
      .tagline {
        margin: 12px 0 0; color: #935234; font-size: ${preview ? "9px" : "10px"};
        line-height: 1.5; letter-spacing: .23em; text-transform: uppercase; text-align: center;
      }
      .rail { position: relative; width: 56px; height: 1px; margin-top: 26px; background: #e1e4dc; overflow: hidden; }
      .rail::before { content: ""; position: absolute; inset: 0; background: var(--copper); transform-origin: left; }
      .corner { position: absolute; width: 14px; height: 14px; opacity: .28; border-color: var(--copper); border-style: solid; border-width: 0; }
      .corner.tl { top: 24px; left: 24px; border-top-width: 1px; border-left-width: 1px; }
      .corner.br { bottom: 24px; right: 24px; border-bottom-width: 1px; border-right-width: 1px; }
      .topline { position: absolute; top: 28px; left: 49px; right: 70px; margin: 0; color: #71806e; font-size: 9px; line-height: 1.4; letter-spacing: .15em; text-transform: uppercase; }
      .skip {
        position: absolute; right: 35px; bottom: 15px; min-width: 90px; min-height: 44px;
        appearance: none; border: 0; border-radius: 3px; background: transparent;
        padding: 11px 9px; color: var(--forest); font: 400 11px/1.2 -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
        cursor: pointer; letter-spacing: .025em; z-index: 2;
      }
      .skip:hover { background: #23483b07; }
      .skip:focus-visible { outline: 2px solid var(--copper); outline-offset: 2px; }
      .playing .top { animation: top-in 1.16s var(--ease) .04s both; }
      .playing .left { animation: left-in 1.14s var(--ease) .18s both; }
      .playing .base { animation: base-in 1.12s var(--ease) .32s both; }
      .playing .complete { animation: lock-mark .16s ease 1.32s both; }
      .playing .mark-wrap { animation: mark-settle 2.3s var(--ease) both; }
      .playing .sweep { animation: copper-sweep .64s cubic-bezier(.3,0,.2,1) 1.49s both; }
      .playing .name { animation: name-in .8s var(--ease) .88s both; }
      .playing .tagline { animation: tagline-in .8s var(--ease) 1.06s both; }
      .playing .rail::before { animation: rail-in 1.45s var(--ease) .7s both; }
      .playing .corner { animation: corner-in 1.3s var(--ease) .14s both; }
      .playing .topline, .playing .skip { animation: annotation-in .65s ease .18s both; }
      .leaving .curtain { animation: curtain-out .85s cubic-bezier(.65,0,.2,1) both; }
      .leaving .scene { animation: scene-out .52s cubic-bezier(.4,0,.6,1) both; }
      .leaving .curtain::after { opacity: 1; }
      .leaving .topline, .leaving .corner { transition: opacity .22s ease; opacity: 0; }
      @keyframes top-in {
        0% { opacity: 0; transform: translate3d(80px,-290px,90px) rotateX(22deg) rotateY(-24deg) rotateZ(-13deg) scale(.76); }
        72% { opacity: 1; transform: translate3d(-7px,10px,0) rotateZ(1.4deg) scale(1.015); }
        100% { opacity: 1; transform: translate3d(0,0,0) rotateX(0) rotateY(0) rotateZ(0) scale(1); }
      }
      @keyframes left-in {
        0% { opacity: 0; transform: translate3d(-310px,120px,70px) rotateX(-15deg) rotateY(22deg) rotateZ(12deg) scale(.78); }
        73% { opacity: 1; transform: translate3d(10px,-5px,0) rotateZ(-1.3deg) scale(1.012); }
        100% { opacity: 1; transform: translate3d(0,0,0) rotateX(0) rotateY(0) rotateZ(0) scale(1); }
      }
      @keyframes base-in {
        0% { opacity: 0; transform: translate3d(280px,220px,110px) rotateX(-25deg) rotateY(-12deg) rotateZ(-12deg) scale(.74); }
        74% { opacity: 1; transform: translate3d(-9px,-7px,0) rotateZ(1.2deg) scale(1.018); }
        100% { opacity: 1; transform: translate3d(0,0,0) rotateX(0) rotateY(0) rotateZ(0) scale(1); }
      }
      @keyframes lock-mark { from { opacity: 0; } to { opacity: 1; } }
      @keyframes mark-settle {
        0% { transform: translateY(13px) rotateX(8deg) rotateZ(-3deg) scale(.94); }
        62% { transform: translateY(-3px) rotateX(0) rotateZ(0) scale(1.025); }
        85%, 100% { transform: translateY(0) rotateX(0) rotateZ(0) scale(1); }
      }
      @keyframes copper-sweep {
        0% { opacity: 0; transform: translateX(-300px) skewX(-16deg); }
        12%, 80% { opacity: .52; }
        100% { opacity: 0; transform: translateX(1040px) skewX(-16deg); }
      }
      @keyframes name-in {
        from { opacity: 0; transform: translateY(112%) rotateX(-12deg); letter-spacing: -.015em; }
        to { opacity: 1; transform: translateY(0) rotateX(0); letter-spacing: -.037em; }
      }
      @keyframes tagline-in { from { opacity: 0; transform: translateY(9px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes rail-in { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes corner-in { from { opacity: 0; transform: scale(1.5); } to { opacity: .28; transform: scale(1); } }
      @keyframes annotation-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes scene-out { to { opacity: 0; transform: translateY(-25px) scale(.965); } }
      @keyframes curtain-out {
        0% { transform: translateY(0); clip-path: inset(0); }
        100% { transform: translateY(-104%); clip-path: inset(0 0 5% 0); }
      }
      @media (max-width: 420px) {
        .scene { padding-inline: 18px; }
        .topline { left: 39px; top: 23px; font-size: 8px; }
        .corner.tl { top: 20px; left: 19px; }
        .corner.br { bottom: 20px; right: 19px; }
        .skip { right: 27px; bottom: 11px; }
        .tagline { letter-spacing: .17em; }
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation: none !important; transition: none !important; }
      }
    </style>
    <section class="opening" aria-label="Memphis Material Handling opening">
      <div class="curtain">
        <span class="corner tl" aria-hidden="true"></span>
        <span class="corner br" aria-hidden="true"></span>
        <p class="topline">Memphis Material Handling, Inc.</p>
        <div class="scene">
          <div class="mark-wrap">
            <svg class="mark" viewBox="400 100 740 760" role="img" aria-label="Memphis Material Handling logo">
              <defs>
                <image id="source" width="1536" height="1024" />
                <clipPath id="top-clip"><path d="M0 0H1536V445H960V526L834 598 736 542V425L652 323H0Z" /></clipPath>
                <clipPath id="left-clip"><path d="M0 323H652L736 425V542L619 571V1024H0Z" /></clipPath>
                <clipPath id="base-clip"><path d="M619 571 736 542 834 598 960 526V445H1536V1024H619Z" /></clipPath>
                <filter id="ink-alpha" color-interpolation-filters="sRGB">
                  <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -.333 -.333 -.333 0 1" />
                </filter>
                <mask id="ink" x="400" y="100" width="740" height="760" maskUnits="userSpaceOnUse" style="mask-type:alpha">
                  <use href="#source" filter="url(#ink-alpha)" />
                </mask>
                <linearGradient id="glint"><stop stop-color="#b76d45" stop-opacity="0" /><stop offset=".5" stop-color="#f4c3a0" stop-opacity=".9" /><stop offset="1" stop-color="#b76d45" stop-opacity="0" /></linearGradient>
              </defs>
              <g class="piece top"><use href="#source" clip-path="url(#top-clip)" /></g>
              <g class="piece left"><use href="#source" clip-path="url(#left-clip)" /></g>
              <g class="piece base"><use href="#source" clip-path="url(#base-clip)" /></g>
              <use class="complete" href="#source" />
              <g mask="url(#ink)"><rect class="sweep" x="340" y="0" width="185" height="1100" fill="url(#glint)" /></g>
            </svg>
          </div>
          <div class="name-mask"><p class="name">Memphis Material Handling</p></div>
          <p class="tagline">Built around your operation.</p>
          <div class="rail" aria-hidden="true"></div>
        </div>
        <button class="skip" type="button">Skip intro ↗</button>
      </div>
    </section>
  `;
  shadow.querySelector("#source").setAttribute("href", resolvedLogoUrl);

  let resolveFinished;
  const finished = new Promise(resolve => { resolveFinished = resolve; });
  let removed = false;
  let leaving = false;
  let exitTimer;
  let cleanupTimer;
  let fallbackTimer;
  const opening = shadow.querySelector(".opening");
  const skip = shadow.querySelector(".skip");
  const cleanup = () => {
    if (removed) return;
    removed = true;
    const ownedFocus = document.activeElement === host || shadow.activeElement !== null;
    clearTimeout(exitTimer);
    clearTimeout(cleanupTimer);
    clearTimeout(fallbackTimer);
    document.removeEventListener("keydown", onKeyDown, true);
    motion.removeEventListener("change", onMotionChange);
    skip.removeEventListener("click", onSkip);
    for (const element of shadow.querySelectorAll("*")) {
      for (const animation of element.getAnimations()) animation.cancel();
    }
    host.remove();
    if (activeMounts.get(container) === handle) activeMounts.delete(container);
    if (pendingMounts.get(container) === token) pendingMounts.delete(container);
    if (ownedFocus && previousFocus instanceof HTMLElement && previousFocus.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
    resolveFinished();
    if (typeof onFinish === "function") onFinish();
  };
  const finish = (immediate = false) => {
    if (removed) return;
    if (immediate || motion.matches) { cleanup(); return; }
    if (leaving) return;
    leaving = true;
    clearTimeout(exitTimer);
    opening.classList.add("leaving");
    // An explicit timer also completes cleanup if animation events are suppressed.
    cleanupTimer = setTimeout(cleanup, 870);
  };
  const onSkip = () => finish(true);
  const onKeyDown = event => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      finish(true);
    } else if (event.key === "Tab") {
      // Let the same Tab reach the existing page's native focus order.
      finish(true);
    }
  };
  const onMotionChange = () => { if (motion.matches) finish(true); };
  const handle = { finish, destroy: cleanup, finished };

  container.appendChild(host);
  activeMounts.set(container, handle);
  skip.addEventListener("click", onSkip);
  document.addEventListener("keydown", onKeyDown, true);
  motion.addEventListener("change", onMotionChange);
  remember();
  if (!motion.matches) {
    // Establish the initial keyframes before the first painted motion frame.
    opening.classList.add("playing");
    exitTimer = setTimeout(() => finish(), 2300);
  }
  fallbackTimer = setTimeout(cleanup, 5000);
  return handle;
}
