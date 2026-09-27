/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { handleProjectRequest, json, type MailEnv } from "./project-requests";
export { ProjectSubmission } from "./project-requests";

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: MailEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/project-requests" || url.pathname === "/api/project-requests/config") {
      try { return await handleProjectRequest(request, env); }
      catch { console.error("project_request_unavailable"); return json({ error: "We couldn’t confirm your submission. Please call 901-947-7225.", final: true }, 502); }
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
