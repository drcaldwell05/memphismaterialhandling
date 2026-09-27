"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render(container: HTMLElement, options: { sitekey: string; action: string; theme: string; callback(token: string): void; "expired-callback"(): void; "error-callback"(): void }): string;
      remove(id: string): void;
    };
  }
}

export function ProjectVerification({ siteKey, onToken }: { siteKey: string; onToken(token: string): void }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let widget: string | undefined;
    let disposed = false;
    function render() {
      if (!disposed && container.current && window.turnstile && !widget) {
        widget = window.turnstile.render(container.current, {
          sitekey: siteKey, action: "project_request", theme: "light", callback: onToken,
          "expired-callback": () => onToken(""), "error-callback": () => onToken(""),
        });
      }
    }
    let script = document.querySelector<HTMLScriptElement>('script[data-project-verification]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.projectVerification = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    render();
    return () => { disposed = true; script.removeEventListener("load", render); if (widget) window.turnstile?.remove(widget); };
  }, [siteKey, onToken]);
  return <div className="intake-verification"><div ref={container} /><p className="intake-help">Complete the verification above before sending. If it doesn’t load, call <a href="tel:9019477225">901-947-7225</a>.</p></div>;
}
