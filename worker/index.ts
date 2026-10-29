/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { handleProjectRequest, json, type MailEnv } from "./project-requests";
export { ProjectSubmission } from "./project-requests";
export { MailBridgeAlerts } from "./mail-bridge-alerts";

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const publicPages: Readonly<Record<string, string>> = {
  "/": "index.html", "/services": "services.html", "/partners": "partners.html",
  "/about": "about.html", "/contact": "contact.html", "/plan-project": "plan-project.html",
};
const aliases: Readonly<Record<string, string>> = {
  "/index.html": "/", "/services.html": "/services", "/services/": "/services",
  "/partners.html": "/partners", "/partners/": "/partners", "/about.html": "/about", "/about/": "/about",
  "/contact.html": "/contact", "/contact/": "/contact", "/plan-project.html": "/plan-project", "/plan-project/": "/plan-project",
};

const worker = {
  async fetch(request: Request, env: MailEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/project-requests" || url.pathname === "/api/project-requests/config") {
      try { return await handleProjectRequest(request, env); }
      catch { console.error("project_request_unavailable"); return json({ error: "We couldn’t confirm your submission. Please call 901-947-7225.", final: true }, 502); }
    }

    // These files are internal asset targets, never a second public URL for a page.
    if (url.pathname === "/_site-pages" || url.pathname.startsWith("/_site-pages/")) {
      return new Response("Not found", { status: 404 });
    }

    const canonical = aliases[url.pathname];
    const document = publicPages[url.pathname];
    if (canonical !== undefined || document) {
      if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
      if (canonical !== undefined) return new Response(null, { status: 301, headers: { Location: canonical + url.search } });
      const assetUrl = new URL(request.url);
      assetUrl.pathname = `/_site-pages/${document}`;
      const response = await env.ASSETS.fetch(new Request(assetUrl, request));
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "public, max-age=0, must-revalidate");
      headers.set("X-Content-Type-Options", "nosniff");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const images = (env as MailEnv & { IMAGES?: ImagesBinding }).IMAGES;
          if (!images) throw new Error("Image transformation is unavailable.");
          const result = await images.input(body).transform(width > 0 ? { width } : {}).output({ format: format as "image/webp" | "image/avif" | "image/jpeg" | "image/png", quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
