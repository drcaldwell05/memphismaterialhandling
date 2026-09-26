import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const OFFICIAL_ROUTES = [
  { pathname: "/", source: "../app/page.tsx" },
  { pathname: "/services", source: "../app/services/page.tsx" },
  { pathname: "/partners", source: "../app/partners/page.tsx" },
  { pathname: "/about", source: "../app/about/page.tsx" },
  { pathname: "/contact", source: "../app/contact/page.tsx" },
  { pathname: "/sign-in", source: "../app/sign-in/page.tsx" },
];

const OFFICIAL_ASSETS = [
  "/mmh-logo-forest-copper.png",
  "/mmh-owner-warehouse-4k.webp",
  "/og-redesign.png",
  "/clients/costco.jpg",
  "/clients/freds-super-dollar.jpg",
  "/clients/helen-of-troy.png",
  "/clients/hershey.svg",
  "/clients/hydro-flask.svg",
  "/clients/kelloggs.png",
  "/clients/eversana.png",
  "/clients/memphis-police.png",
  "/clients/nike.jpg",
  "/clients/shelby-county-sheriff.png",
  "/clients/tj-maxx.svg",
  "/partners/bluff-manufacturing.png",
  "/partners/borroughs.jpg",
  "/partners/incord.png",
  "/partners/mallard.png",
  "/partners/interlake-mecalux.svg",
  "/partners/world-wide-material-handling.gif",
];

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function getHtml(pathname) {
  const response = await render(pathname);
  assert.equal(response.status, 200, `${pathname} should render successfully`);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  return response.text();
}

function assertDocumentStructure(html, pathname) {
  assert.equal((html.match(/<header\b/g) ?? []).length, 1, `${pathname} should have one header`);
  assert.equal((html.match(/<main\b/g) ?? []).length, 1, `${pathname} should have one main`);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${pathname} should have one h1`);
  assert.equal((html.match(/<footer\b/g) ?? []).length, 1, `${pathname} should have one footer`);
  assert.match(html, /<main\b[^>]*\bid="main-content"[^>]*>/i);
}

function getMainHtml(html, pathname) {
  const match = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i);
  assert.ok(match, `${pathname} should include a complete main element`);
  return match[0];
}

function getImageTags(source, asset) {
  return [...source.matchAll(/<Image\b[\s\S]*?\/>/g)]
    .map((match) => match[0])
    .filter((tag) => tag.includes(`src="${asset}"`));
}

function countDirectMainSections(mainHtml) {
  const voidElements = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);
  let count = 0;
  let depth = 0;
  let insideMain = false;

  for (const tag of mainHtml.matchAll(/<(\/)?([a-z][\w:-]*)\b[^>]*>/gi)) {
    const closing = Boolean(tag[1]);
    const name = tag[2].toLowerCase();

    if (name === "main") {
      if (closing) break;
      insideMain = true;
      continue;
    }

    if (!insideMain) continue;

    if (closing) {
      depth -= 1;
      continue;
    }

    if (name === "section" && depth === 0) count += 1;
    if (!voidElements.has(name) && !tag[0].endsWith("/>")) depth += 1;
  }

  return count;
}

function assertResolvedAriaLabelledby(html, pathname) {
  const idCounts = new Map();
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
    idCounts.set(match[1], (idCounts.get(match[1]) ?? 0) + 1);
  }

  const references = [...html.matchAll(/\baria-labelledby="([^"]+)"/g)]
    .flatMap((match) => match[1].trim().split(/\s+/));

  assert.ok(references.length > 0, `${pathname} should include aria-labelledby relationships`);
  for (const reference of references) {
    assert.equal(
      idCounts.get(reference),
      1,
      `${pathname} aria-labelledby should resolve uniquely to #${reference}`,
    );
  }
}

function assertMetaContent(html, attribute, value, pathname) {
  assert.ok(
    html.includes(`<meta ${attribute} content="${value}"/>`),
    `${pathname} should emit ${attribute} as ${value}`,
  );
}

test("renders Home as the complete Plan, Equip, Install overview", async () => {
  const html = await getHtml("/");
  assert.match(html, /<title>Memphis Material Handling \| Complete Warehouse Systems<\/title>/i);
  assert.match(html, /Complete warehouse systems/i);
  assert.match(html, /Your warehouse\./i);
  assert.match(html, /Working better\./i);
  assert.match(html, /From a clear plan/i);
  for (const stage of ["plan", "equip", "install"]) {
    assert.ok(html.includes(`href="/services#${stage}"`));
    assert.match(html, new RegExp(`<h3>${stage}<span`, "i"));
  }
  assert.match(html, /A place for everything/i);
  assert.match(html, /Built on experience/i);
  assert.match(html, /Memphis, since 1986/i);
  assert.match(html, /What’s next for your space/i);
  assert.match(html, /\/clients\/eversana\.png/);
  assert.match(html, /\/clients\/hershey\.svg/);
  assert.match(html, /\/clients\/nike\.jpg/);
  assert.match(html, /does not imply endorsement/i);
  assert.doesNotMatch(html, /More than equipment|What we supply|Built for operations that cannot stand still/i);
  assert.doesNotMatch(html, /three-person|3 person|small office team|Cameron Pleasant|Ridg-U-Rak/i);
  assertDocumentStructure(html, "/");
});

test("renders Services as a complete project path with verified capabilities", async () => {
  const html = await getHtml("/services");
  assert.match(html, /<title>Warehouse Services \| Memphis Material Handling<\/title>/i);
  assert.match(html, /Make your space/i);
  assert.match(html, /work for you/i);
  assert.match(html, /The layout sets the direction/i);
  assert.match(html, /href="#plan"/);
  assert.match(html, /href="#equip"/);
  assert.match(html, /href="#install"/);
  assert.match(html, /id="plan"/);
  assert.match(html, /id="equip"/);
  assert.match(html, /id="install"/);
  assert.match(html, /Plan the warehouse layout/i);
  assert.match(html, /Select the equipment/i);
  assert.match(html, /Install the system/i);
  assert.match(html, /CAD layout/);
  assert.match(html, /seismic design/i);
  assert.match(html, /Power conveyor/);
  assert.match(html, /Gravity conveyor/);
  assert.match(html, /Safety netting/);
  assert.match(html, /turnkey installation/i);
  assert.match(html, /provides liquidation services/i);
  assert.match(html, /Discuss your next project/i);
  assert.match(html, /href="tel:9019477225"/);
  assert.match(html, /href="\/contact"/);
  assert.doesNotMatch(html, /What sets us apart|One accountable project path|Reconfigured/i);
  assertDocumentStructure(html, "/services");
});

test("renders Partners and Experience with application-led resources and past work", async () => {
  const html = await getHtml("/partners");
  assert.match(html, /<title>Partners &amp; Experience \| Memphis Material Handling<\/title>/i);
  assert.match(html, /Good work starts/i);
  assert.match(html, /href="#equipment-network"/);
  assert.match(html, /href="#project-experience"/);
  assert.match(html, /id="equipment-network"/);
  assert.match(html, /id="project-experience"/);
  assert.match(html, /Expertise for each application/i);
  assert.match(html, /Mallard Manufacturing/);
  assert.match(html, /World Wide Material Handling/);
  assert.match(html, /InCord/);
  assert.match(html, /Bluff Manufacturing/);
  assert.match(html, /Borroughs Corporation/);
  assert.match(html, /Pallet racking and warehouse storage systems/i);
  assert.match(html, /Interlake Mecalux/);
  assert.match(html, /href="https:\/\/www\.interlakemecalux\.com\/"/);
  assert.doesNotMatch(html, /warehouserack/i);
  assert.match(html, /Life sciences services/);
  assert.match(html, /Food manufacturing/);
  assert.match(html, /Consumer products &amp; apparel/);
  assert.match(html, /Public safety/);
  assert.match(html, />EVERSANA</i);
  assert.doesNotMatch(html, /medline/i);
  assert.match(html, /The Hershey Company/);
  assert.match(html, /TJ Maxx/);
  assert.match(html, /Memphis Police Department/);
  assert.match(html, /Nike/);
  assert.match(html, /does not imply endorsement/i);
  assert.match(html, /target="_blank" rel="noreferrer"/i);
  assert.doesNotMatch(html, /Neil Camberg|Warehouse Rack Company president Neil|Ridg-U-Rak|Cameron Pleasant/i);
  assert.doesNotMatch(html, /A stronger network|The best solution rarely comes from one catalog|Historic project experience/i);
  assertDocumentStructure(html, "/partners");
});

test("keeps the compact Partners directory complete and separates past experience", async () => {
  const html = await getHtml("/partners");
  const main = getMainHtml(html, "/partners");
  const supplierLinks = [...main.matchAll(/<a class="partner-card"[^>]*>/g)].map(match => match[0]);
  assert.equal(supplierLinks.length, 6);
  for (const link of supplierLinks) {
    assert.match(link, /href="https:\/\//);
    assert.match(link, /target="_blank"/);
    assert.match(link, /rel="noreferrer"/);
    assert.match(link, /aria-label="Visit .+opens in a new tab"/);
  }
  assert.equal((main.match(/class="experience-brand"/g) ?? []).length, 11);
  assert.match(main, /class="experience-brand-logo navy"/);
  assert.match(main, /Selected past project organizations/);
  assert.match(main, /Product availability and project roles are confirmed in the applicable proposal/);
  assert.match(main, /does not imply endorsement, partnership, or an ongoing business relationship/);
  assert.match(main, /id="warehouse-resource"/);
  assert.doesNotMatch(main, /partners-network-board|partners-sector-list|network-node/);
  assertResolvedAriaLabelledby(html, "/partners");
});

test("renders About as company, capability, and leadership evidence", async () => {
  const [html, styles] = await Promise.all([
    getHtml("/about"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const main = getMainHtml(html, "/about");

  assert.match(html, /<title>About \| Memphis Material Handling<\/title>/i);
  assert.equal(countDirectMainSections(main), 3);
  assert.match(main, /class="about-v3-hero"/);
  assert.match(main, /class="about-v3-company"/);
  assert.match(main, /class="about-v3-capabilities"/);
  assert.match(main, /Warehouse systems\. Memphis roots/i);
  assert.match(main, /aria-label="Company profile"/i);
  assert.match(main, /Established/);
  assert.match(main, /Plan · Equip · Install/);
  assert.match(main, /Memphis Material Handling, Inc\./);
  assert.match(main, /Warehouse capabilities/i);
  assert.match(main, /CAD layout/);
  assert.match(main, /Engineering &amp; permitting/);
  assert.match(main, /New \+ used equipment/);
  assert.match(main, /Turnkey installation/);
  assert.match(main, /Liquidation/);
  assert.match(main, /Russell R\. Caldwell/);
  assert.match(main, />President</i);
  assert.match(main, /Warehouse storage-system installation in progress/i);
  assert.match(main, /width="4096" height="4096"/i);
  assert.equal((main.match(/href="tel:/g) ?? []).length, 0);
  assert.doesNotMatch(main, /about-v2-/i);
  assert.doesNotMatch(main, /Talk through the next warehouse need/i);
  assert.doesNotMatch(main, /Built in Memphis\. Focused on the operation|Owner &amp; President|Practical standards\. Consistent execution/i);
  assert.doesNotMatch(main, /three-person|3 person|small office team|team size/i);
  assert.match(
    styles,
    /\.about-v3-project-image img\s*\{[^}]*\bheight:\s*auto\s*;?[^}]*\}/i,
  );
  assertResolvedAriaLabelledby(html, "/about");
  assertDocumentStructure(html, "/about");
});

test("renders Contact with a direct call path and no embedded project form", async () => {
  const html = await getHtml("/contact");
  const main = getMainHtml(html, "/contact");

  assert.match(html, /<title>Contact \| Memphis Material Handling<\/title>/i);
  assert.equal(countDirectMainSections(main), 2);
  assert.match(main, /class="contact-v3-hero"/);
  assert.match(main, /class="contact-v3-brief"/);
  assert.match(main, /Let’s talk about your project/i);
  assert.match(main, /aria-label="Memphis Material Handling contact details"/i);
  assert.equal((main.match(/href="tel:9019477225"/g) ?? []).length, 1);
  assert.match(main, /901-947-7225/);
  assert.match(main, /3832 Watman Ave\./);
  assert.match(main, /Memphis, TN 38118/);
  assert.match(main, /Get directions/i);
  assert.match(main, /target="_blank" rel="noreferrer"/i);
  assert.match(main, /Monday–Friday/);
  assert.match(main, /8:00 am–5:00 pm/);
  assert.match(main, /What to have ready/i);
  assert.equal((main.match(/class="contact-v3-brief-item"/g) ?? []).length, 3);
  assert.match(main, />Space</i);
  assert.match(main, />Equipment</i);
  assert.match(main, />Timing</i);
  assert.doesNotMatch(main, /contact-v2-|contact-v3-final/i);
  assert.doesNotMatch(main, /Start with a direct call|Ready to talk/i);
  assert.doesNotMatch(main, /Start the next warehouse project|Bring us what you know|How a project begins/i);
  assert.doesNotMatch(main, /fastest response|reconfiguration|relocation|equipment removal|Mid-South/i);
  assert.doesNotMatch(main, /<form\b|action=|mailto:|email/i);
  assertResolvedAriaLabelledby(html, "/contact");
  assertDocumentStructure(html, "/contact");
});

test("validates the official site routes and their shared shell", async () => {
  assert.deepEqual(
    OFFICIAL_ROUTES.map(({ pathname }) => pathname),
    ["/", "/services", "/partners", "/about", "/contact", "/sign-in"],
  );

  const [layout, styles, packageJson, shell, files] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SiteShell.tsx", import.meta.url), "utf8"),
    Promise.all(
      OFFICIAL_ROUTES.map(({ source }) => readFile(new URL(source, import.meta.url), "utf8")),
    ),
  ]);

  assert.match(layout, /Complete Warehouse Systems/i);
  assert.match(layout, /Handled locally/i);
  assert.match(layout, /og-redesign\.png/i);
  assert.match(layout, /icon: "\/mmh-logo-forest-copper\.png"/i);
  assert.match(styles, /\.mobile-menu-panel/i);
  assert.match(styles, /max-height:\s*calc\(100svh - 70px\)/i);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/i);
  assert.match(styles, /\.about-v3-hero/i);
  assert.match(styles, /\.about-v3-company/i);
  assert.match(styles, /\.about-v3-capabilities/i);
  assert.match(styles, /\.contact-v3-hero/i);
  assert.match(styles, /\.contact-v3-brief/i);
  assert.doesNotMatch(styles, /\.(?:about|contact)-v2-/i);
  assert.match(shell, /className="skip-link"/i);
  assert.doesNotMatch(shell, /logo-animation/i);
  assert.doesNotMatch(files.join("\n"), /(?:about|contact)-v2-/i);
  assert.doesNotMatch(
    files.join("\n"),
    /three-person|3 person|small office team|Cameron Pleasant|Ridg-U-Rak|Neil Camberg/i,
  );
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});

test("keeps every official-site image available without animation assets", async () => {
  assert.ok(OFFICIAL_ASSETS.every((asset) => !asset.includes("logo-animation")));

  await Promise.all(
    OFFICIAL_ASSETS.map((asset) => access(new URL(`../public${asset}`, import.meta.url))),
  );
});

test("keeps warehouse photography direct and Home wrap collections centered", async () => {
  const warehouseImage = "/mmh-owner-warehouse-4k.webp";
  const [homeHtml, aboutHtml, homeSource, aboutSource, styles] = await Promise.all([
    getHtml("/"),
    getHtml("/about"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/about/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  const homeWarehouseImages = getImageTags(homeSource, warehouseImage);
  const aboutWarehouseImages = getImageTags(aboutSource, warehouseImage);

  assert.equal(homeWarehouseImages.length, 1);
  assert.equal(aboutWarehouseImages.length, 1);
  assert.ok(homeWarehouseImages.every((tag) => /\bunoptimized\b/.test(tag)));
  assert.ok(aboutWarehouseImages.every((tag) => /\bunoptimized\b/.test(tag)));
  assert.equal(
    (getMainHtml(homeHtml, "/").match(/<img\b[^>]*\bsrc="\/mmh-owner-warehouse-4k\.webp"/g) ?? []).length,
    1,
  );
  assert.equal(
    (getMainHtml(aboutHtml, "/about").match(/<img\b[^>]*\bsrc="\/mmh-owner-warehouse-4k\.webp"/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(homeHtml, /\/_next\/image[^"']*mmh-owner-warehouse-4k/i);
  assert.doesNotMatch(aboutHtml, /\/_next\/image[^"']*mmh-owner-warehouse-4k/i);

  assert.match(styles, /\.wrap\s*\{[^}]*\bmargin-inline:\s*auto\b[^}]*\}/i);

});

test("wires one shared motion controller and keeps reveal content fail-open", async () => {
  const [shell, motion, styles, routeFiles, routeHtml] = await Promise.all([
    readFile(new URL("../app/components/SiteShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SiteMotion.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    Promise.all(
      OFFICIAL_ROUTES.map(({ source }) => readFile(new URL(source, import.meta.url), "utf8")),
    ),
    Promise.all(OFFICIAL_ROUTES.map(({ pathname }) => getHtml(pathname))),
  ]);

  assert.equal((shell.match(/<SiteMotion\s*\/>/g) ?? []).length, 1);
  assert.equal((shell.match(/import\s+\{\s*SiteMotion\s*\}/g) ?? []).length, 1);
  assert.doesNotMatch(routeFiles.join("\n"), /<SiteMotion\b/);

  const revealSelector = motion.match(
    /const REVEAL_SELECTOR = \[([\s\S]*?)\]\.join\("\s*,\s*"\);/,
  );
  assert.ok(revealSelector, "SiteMotion should declare one shared reveal selector");
  assert.doesNotMatch(revealSelector[1], /\.footer-grid\s*>\s*\*/);
  assert.doesNotMatch(revealSelector[1], /["']\.footer-bottom["']/);
  assert.match(
    motion,
    /if\s*\(reducedMotion\.matches\s*\|\|\s*!\("IntersectionObserver" in window\)\)\s*\{\s*revealAll\(\);\s*return;/,
  );
  assert.match(
    motion,
    /const revealAll = \(\) => \{[\s\S]*?classList\.add\("motion-reveal", "is-revealed"\)/,
  );
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.motion-reveal[\s\S]*?opacity:\s*1\s*!important[\s\S]*?transform:\s*none\s*!important/i,
  );

  for (const [index, html] of routeHtml.entries()) {
    const pathname = OFFICIAL_ROUTES[index].pathname;
    assert.equal(
      (html.match(/class="site-scroll-progress"/g) ?? []).length,
      1,
      `${pathname} should mount one shared motion controller`,
    );
    assert.doesNotMatch(
      html,
      /class="[^"]*\bmotion-reveal\b[^"]*"/i,
      `${pathname} should remain visible before client motion starts`,
    );
    assert.doesNotMatch(
      html,
      /class="[^"]*\bis-revealed\b[^"]*"/i,
      `${pathname} should not require a client reveal class to render`,
    );
  }
});

test("keeps public navigation and contact links connected", async () => {
  const pages = new Map(await Promise.all(OFFICIAL_ROUTES.map(async ({ pathname }) => [pathname, await getHtml(pathname)])));
  for (const [pathname, html] of pages) {
    const header = html.match(/<header\b[\s\S]*?<\/header>/)[0];
    assert.doesNotMatch(header, /Memphis office/i);
    assert.match(header, /src="\/mmh-logo-forest-copper\.png"/);
    assert.match(header, /aria-label="Memphis Material Handling home"/);
    assert.doesNotMatch(header, /mmh-logo(?:-reverse)?\.svg/);
    const projectButtons = /<button\b[^>]*aria-haspopup="dialog"[^>]*>Plan a project/g;
    assert.equal((header.match(projectButtons) ?? []).length, 2, `${pathname} should offer desktop and mobile project form buttons`);
    assert.equal((html.match(projectButtons) ?? []).length, pathname === "/" ? 3 : 2, `${pathname} should include the homepage form button when applicable`);
    assert.doesNotMatch(html, /<a[^>]*href="\/contact"[^>]*>Plan a project/);
    assert.doesNotMatch(header, /href="\/sign-in"/);
    assert.doesNotMatch(html, /id="project-planner"|From an idea to a clear brief|Build a project brief|<form\b|class="project-intake-dialog"/);
    for (const [, reference] of html.matchAll(/\baria-controls="([^"]+)"/g)) {
      assert.equal((html.match(new RegExp(`\\bid="${reference}"`, "g")) ?? []).length, 1, `${pathname}: ${reference} must resolve once`);
    }
    for (const [, href] of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
      if (!href.startsWith("/") && !href.startsWith("#")) continue;
      const target = new URL(href.replaceAll("&amp;", "&"), `https://mmh.test${pathname}`);
      if (pages.has(target.pathname)) {
        if (target.hash) assert.ok(pages.get(target.pathname).includes(`id="${decodeURIComponent(target.hash.slice(1))}"`), `${pathname}: ${href} should resolve`);
      } else {
        await access(new URL(`../public${target.pathname}`, import.meta.url));
      }
    }
  }
});

test("renders the project pathway and complete supplier filters", async () => {
  const [services, partners, styles] = await Promise.all([
    getHtml("/services"), getHtml("/partners"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(services, /aria-label="Explore the project stages"/);
  assert.doesNotMatch(services, /class="services-plan"/);
  assert.match(partners, /aria-label="Filter equipment resources"/);
  assert.equal((partners.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.equal((partners.match(/aria-pressed="false"/g) ?? []).length, 3);
  assert.match(styles, /\[hidden\]\s*\{\s*display:\s*none!important/);
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?animation:\s*none!important/);

});

test("emits accurate metadata for every official site route", async () => {
  const metadataCases = [
    {
      pathname: "/",
      title: "Memphis Material Handling | Complete Warehouse Systems",
      description: "Warehouse planning, storage-system engineering, new and used equipment, permitting coordination, and turnkey installation from Memphis.",
      socialTitle: "Memphis Material Handling | Complete Warehouse Systems",
      socialDescription: "Warehouse planning, storage-system engineering, new and used equipment, permitting coordination, and turnkey installation from Memphis.",
      card: "summary_large_image",
      hasImage: true,
    },
    {
      pathname: "/services",
      title: "Warehouse Services | Memphis Material Handling",
      description: "Warehouse design, storage-system engineering, equipment supply, permitting, installation, and liquidation services in Memphis.",
      socialTitle: "Warehouse Services | Memphis Material Handling",
      socialDescription: "Warehouse planning, storage-system engineering, equipment, permitting, installation, and liquidation services in Memphis.",
      card: "summary",
      hasImage: false,
    },
    {
      pathname: "/partners",
      title: "Partners &amp; Experience | Memphis Material Handling",
      description: "Equipment resources and selected past project experience for Memphis Material Handling.",
      socialTitle: "Partners &amp; Experience | Memphis Material Handling",
      socialDescription: "Equipment resources and selected past project experience for Memphis Material Handling.",
      card: "summary",
      hasImage: false,
    },
    {
      pathname: "/about",
      title: "About | Memphis Material Handling",
      description: "About Memphis Material Handling, established in Memphis in 1986. Warehouse planning, engineering, equipment, installation, and liquidation.",
      socialTitle: "About Memphis Material Handling",
      socialDescription: "Established in Memphis in 1986. Warehouse planning, engineering, equipment, installation, and liquidation.",
      card: "summary",
      hasImage: false,
    },
    {
      pathname: "/contact",
      title: "Contact | Memphis Material Handling",
      description: "Call Memphis Material Handling at 901-947-7225 about warehouse planning, equipment, installation, or liquidation.",
      socialTitle: "Contact Memphis Material Handling",
      socialDescription: "Call Memphis Material Handling at 901-947-7225 about warehouse planning, equipment, installation, or liquidation.",
      card: "summary",
      hasImage: false,
    },
    {
      pathname: "/sign-in",
      title: "Staff Sign In | Memphis Material Handling",
      description: "Staff sign-in page for Memphis Material Handling.",
      socialTitle: "Staff Sign In | Memphis Material Handling",
      socialDescription: "Staff sign-in page for Memphis Material Handling.",
      card: "summary",
      hasImage: false,
    },
  ];

  assert.deepEqual(
    metadataCases.map(({ pathname }) => pathname),
    OFFICIAL_ROUTES.map(({ pathname }) => pathname),
  );

  for (const metadata of metadataCases) {
    const html = await getHtml(metadata.pathname);
    assert.ok(
      html.includes(`<title>${metadata.title}</title>`),
      `${metadata.pathname} should emit the correct document title`,
    );
    assertMetaContent(html, 'name="description"', metadata.description, metadata.pathname);
    assertMetaContent(html, 'property="og:title"', metadata.socialTitle, metadata.pathname);
    assertMetaContent(html, 'property="og:description"', metadata.socialDescription, metadata.pathname);
    assertMetaContent(html, 'name="twitter:card"', metadata.card, metadata.pathname);
    assertMetaContent(html, 'name="twitter:title"', metadata.socialTitle, metadata.pathname);
    assertMetaContent(html, 'name="twitter:description"', metadata.socialDescription, metadata.pathname);
    assert.match(html, /<link rel="icon"[^>]+mmh-logo-forest-copper\.png/i);

    if (metadata.hasImage) {
      assert.match(html, /<meta property="og:image"[^>]+og-redesign\.png/i);
      assert.match(html, /<meta name="twitter:image"[^>]+og-redesign\.png/i);
    } else {
      assert.doesNotMatch(html, /<meta property="og:image"/i);
      assert.doesNotMatch(html, /<meta name="twitter:image"/i);
      assert.doesNotMatch(html, /og-redesign\.png/i);
    }
  }
});

// Exercise the actual built responses, including progressive-enhancement paths.
test("renders accessible system explorers with a complete equipment fallback", async () => {
  for (const pathname of ["/", "/services"]) {
    const html = await getHtml(pathname);
    const main = getMainHtml(html, pathname);
    const explorerStart = main.indexOf('class="warehouse-explorer"');
    assert.ok(explorerStart >= 0);
    const explorer = main.slice(explorerStart, main.indexOf('<details class="', explorerStart));
    const tabs = [...explorer.matchAll(/<button\b[^>]*role="tab"[^>]*>/g)].map(match => match[0]);
    const panels = [...explorer.matchAll(/<div\b[^>]*role="tabpanel"[^>]*>/g)].map(match => match[0]);
    assert.equal(tabs.length, 4);
    assert.equal(panels.length, 4);
    assert.equal(tabs.filter(tag => tag.includes('aria-selected="true"')).length, 1);
    assert.equal(panels.filter(tag => /\bhidden(?:=""|\s|>)/.test(tag)).length, 3);
    for (const tab of tabs) {
      const panelId = tab.match(/aria-controls="([^"]+)"/)[1];
      assert.equal(panels.filter(panel => panel.includes(`id="${panelId}"`)).length, 1);
    }
    assert.match(main, /<details class="(?:wrap )?equipment-catalogue">/);
    assert.match(main, /View the full equipment list/);
    assert.match(main, /Illustrative layout/);
    assertResolvedAriaLabelledby(html, pathname);
  }
});

test("keeps project-photo fallback links and call preparation available", async () => {
  for (const pathname of ["/", "/about"]) {
    const main = getMainHtml(await getHtml(pathname), pathname);
    assert.match(main, /<a[^>]*class="project-photo-open"[^>]*href="\/mmh-owner-warehouse-4k.webp"/);
    assert.match(main, /<dialog\b[^>]*aria-labelledby=/);
    assert.doesNotMatch(main, /<dialog\b[^>]*\bopen(?:=|\s|>)/);
  }
  const main = getMainHtml(await getHtml("/contact"), "/contact");
  assert.equal((main.match(/type="checkbox"/g) ?? []).length, 3);
  assert.match(main, /Mark space ready for the call/);
  assert.match(main, /Mark equipment ready for the call/);
  assert.match(main, /Mark timing ready for the call/);
  assert.doesNotMatch(main, /<form\b/);
});
