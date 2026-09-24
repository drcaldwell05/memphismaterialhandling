"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const PRESSABLE_SELECTOR = "a[href], button";
const REVEAL_SELECTOR = [
  "main > section > .wrap",
  ".home-v2-stage",
  ".home-v2-equipment-group",
  ".home-v2-logo",
  ".services-chapter",
  ".services-equipment-grid > section",
  ".partners-resource-grid > li",
  ".partners-sector",
  ".partner-card-grid > li",
  ".experience-brand",
  ".experience-project-link",
  ".about-v3-capability-list > li",
  ".contact-v3-brief-item",
  ".footer-grid > :not(.footer-bottom)",
].join(", ");

function isPressable(element: Element): element is HTMLAnchorElement | HTMLButtonElement {
  if (element instanceof HTMLButtonElement) {
    return !element.disabled && element.getAttribute("aria-disabled") !== "true";
  }

  if (!(element instanceof HTMLAnchorElement)) {
    return false;
  }

  if (element.getAttribute("aria-disabled") === "true") {
    return false;
  }

  return Boolean(element.getAttribute("href"));
}

function closestPressable(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }

  const pressable = target.closest(PRESSABLE_SELECTOR);
  return pressable && isPressable(pressable) ? pressable : null;
}

export function SiteMotion() {
  const progressRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const progressElement = progressRef.current;
    const header = progressElement?.closest<HTMLElement>(".site-header");

    if (!progressElement || !header) {
      return;
    }

    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    const menu = header.querySelector<HTMLDetailsElement>(".mobile-menu");
    const backToTop = document.querySelector<HTMLAnchorElement>(".site-back-top");
    const onBackToTop = (event: MouseEvent) => {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
      header.querySelector<HTMLAnchorElement>(".brand")?.focus({ preventScroll: true });
    };
    const closeMenu = () => { if (menu) menu.open = false; };
    const onMenuKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu?.open) {
        closeMenu();
        menu.querySelector("summary")?.focus();
      }
    };
    const onMenuClick = (event: MouseEvent) => {
      if (!menu?.open || !(event.target instanceof Element)) return;
      if (!menu.contains(event.target) || event.target.closest("a[href]")) closeMenu();
    };
    const onMenuFocusOut = (event: FocusEvent) => {
      if (menu?.open && event.relatedTarget instanceof Node && !menu.contains(event.relatedTarget)) closeMenu();
    };
    closeMenu();
    const pressedElements = new Set<HTMLElement>();
    const revealElements = Array.from(
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
    );
    let scrollFrame = 0;
    let pressReleaseTimer = 0;
    let revealObserver: IntersectionObserver | null = null;

    const onFocusReveal = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      let surface = event.target.closest<HTMLElement>(".motion-reveal");
      while (surface) {
        surface.classList.add("is-revealed");
        revealObserver?.unobserve(surface);
        surface = surface.parentElement?.closest<HTMLElement>(".motion-reveal") ?? null;
      }
    };

    const removePressedClasses = () => {
      pressedElements.forEach((element) => element.classList.remove("is-pressing"));
      pressedElements.clear();
    };

    const clearPressed = () => {
      if (pressReleaseTimer) {
        window.clearTimeout(pressReleaseTimer);
        pressReleaseTimer = 0;
      }
      removePressedClasses();
    };

    const schedulePressedRelease = () => {
      if (pressReleaseTimer) {
        window.clearTimeout(pressReleaseTimer);
      }
      pressReleaseTimer = window.setTimeout(() => {
        pressReleaseTimer = 0;
        removePressedClasses();
      }, 110);
    };

    const revealAll = () => {
      revealElements.forEach((element) => {
        element.classList.add("motion-reveal", "is-revealed");
      });
      revealObserver?.disconnect();
      revealObserver = null;
    };

    const setUpReveals = () => {
      if (reducedMotion.matches || !("IntersectionObserver" in window)) {
        revealAll();
        return;
      }

      const deferredElements: HTMLElement[] = [];
      revealElements.forEach((element) => {
        if (element.getBoundingClientRect().top <= window.innerHeight) {
          element.classList.add("motion-reveal", "is-revealed");
          return;
        }

        element.classList.add("motion-reveal");
        deferredElements.push(element);
      });

      if (!deferredElements.length) {
        return;
      }

      revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8%", threshold: 0.08 },
      );

      deferredElements.forEach((element) => revealObserver?.observe(element));
    };

    const releasePressed = (element: HTMLElement | null) => {
      if (!element) {
        clearPressed();
        return;
      }

      element.classList.remove("is-pressing");
      pressedElements.delete(element);
    };

    const updateScroll = () => {
      scrollFrame = 0;
      if (backToTop) backToTop.hidden = window.scrollY < 650;
      if (reducedMotion.matches) {
        progressElement.style.setProperty("--site-scroll-progress", "0");
        progressElement.style.transform = "scaleX(0)";
        header.classList.toggle("is-scrolled", window.scrollY > 12);
        return;
      }

      const scrollableHeight = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        0,
      );
      const progress = scrollableHeight === 0
        ? 0
        : Math.min(Math.max(window.scrollY / scrollableHeight, 0), 1);

      progressElement.style.setProperty("--site-scroll-progress", String(progress));
      progressElement.style.transform = `scaleX(${progress})`;
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    const scheduleScrollUpdate = () => {
      if (!scrollFrame) {
        scrollFrame = window.requestAnimationFrame(updateScroll);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      const pressable = closestPressable(event.target);
      if (!pressable) {
        return;
      }

      if (pressReleaseTimer) {
        window.clearTimeout(pressReleaseTimer);
        pressReleaseTimer = 0;
      }
      pressable.classList.add("is-pressing");
      pressedElements.add(pressable);
    };

    const onPointerUp = () => schedulePressedRelease();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== "Enter" && event.key !== " ")) {
        return;
      }

      const pressable = closestPressable(event.target);
      if (!pressable) {
        return;
      }

      pressable.classList.add("is-pressing");
      pressedElements.add(pressable);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      const pressable = closestPressable(event.target);
      if (pressable) {
        schedulePressedRelease();
        return;
      }

      releasePressed(null);
    };

    const onReducedMotionChange = () => {
      progressElement.style.transition = reducedMotion.matches ? "none" : "";

      if (!reducedMotion.matches) {
        scheduleScrollUpdate();
        return;
      }

      progressElement.style.setProperty("--site-scroll-progress", "0");
      progressElement.style.transform = "scaleX(0)";
      revealAll();
    };

    progressElement.style.transition = reducedMotion.matches ? "none" : "";
    setUpReveals();
    scheduleScrollUpdate();

    window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
    window.addEventListener("resize", scheduleScrollUpdate, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", clearPressed, { passive: true });
    window.addEventListener("blur", clearPressed);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("keydown", onMenuKey);
    document.addEventListener("click", onMenuClick);
    document.addEventListener("focusin", onFocusReveal);
    backToTop?.addEventListener("click", onBackToTop);
    menu?.addEventListener("focusout", onMenuFocusOut);
    reducedMotion.addEventListener("change", onReducedMotionChange);

    return () => {
      window.removeEventListener("scroll", scheduleScrollUpdate);
      window.removeEventListener("resize", scheduleScrollUpdate);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", clearPressed);
      window.removeEventListener("blur", clearPressed);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("keydown", onMenuKey);
      document.removeEventListener("click", onMenuClick);
      document.removeEventListener("focusin", onFocusReveal);
      backToTop?.removeEventListener("click", onBackToTop);
      menu?.removeEventListener("focusout", onMenuFocusOut);
      reducedMotion.removeEventListener("change", onReducedMotionChange);

      if (scrollFrame) {
        window.cancelAnimationFrame(scrollFrame);
      }

      revealObserver?.disconnect();
      revealElements.forEach((element) => {
        element.classList.remove("motion-reveal", "is-revealed");
      });
      clearPressed();
      header.classList.remove("is-scrolled");
    };
  }, [pathname]);

  return (
    <div
      ref={progressRef}
      className="site-scroll-progress"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: "0 0 auto",
        pointerEvents: "none",
        transform: "scaleX(0)",
        transformOrigin: "left center",
      }}
    />
  );
}
