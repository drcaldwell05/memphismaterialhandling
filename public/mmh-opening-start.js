import { mountMmhOpening } from "./mmh-opening.js";

// This module runs once per document, independently of React route renders.
function startOpening() {
  const navigation = performance.getEntriesByType("navigation")[0];
  if (navigation && navigation.type !== "navigate") return;

  // Internal full-page links also skip the opening if session storage is blocked.
  try {
    if (document.referrer && new URL(document.referrer).origin === location.origin) return;
  } catch { /* A missing referrer should not prevent a first entrance. */ }

  let opening = null;
  let pageLeft = false;
  const onPageHide = () => {
    pageLeft = true;
    opening?.destroy();
  };
  const stopListening = () => window.removeEventListener("pagehide", onPageHide);
  window.addEventListener("pagehide", onPageHide, { once: true });

  mountMmhOpening().then(handle => {
    opening = handle;
    if (pageLeft) opening?.destroy();
    if (opening) opening.finished.then(stopListening, stopListening);
    else stopListening();
  }).catch(stopListening);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startOpening, { once: true });
} else {
  startOpening();
}
