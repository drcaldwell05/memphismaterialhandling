import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "./components/SiteShell";
import { WarehouseExplorer } from "./components/WarehouseExplorer";
import { ProjectPhoto } from "./components/ProjectPhoto";
import { ProjectIntake } from "./components/ProjectIntake";

const homeTitle = "Memphis Material Handling | Complete Warehouse Systems";
const homeDescription =
  "Warehouse planning, storage-system engineering, new and used equipment, permitting coordination, and turnkey installation from Memphis.";

export const metadata: Metadata = {
  title: { absolute: homeTitle },
  description: homeDescription,
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    type: "website",
    images: [
      {
        url: "/og-redesign.png",
        width: 1200,
        height: 630,
        alt: "Memphis Material Handling Inc. — Complete warehouse systems. Handled locally.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
    images: ["/og-redesign.png"],
  },
};

const projectStages = [
  {
    number: "01",
    label: "Plan",
    title: "Plan the warehouse layout.",
    copy: "Coordinate CAD layout, storage-system design, seismic design, and permitting before equipment is installed.",
    href: "/services#plan",
  },
  {
    number: "02",
    label: "Equip",
    title: "Select the equipment.",
    copy: "Specify new or used storage, flow, conveyor, dock, safety, and facility equipment for the approved plan.",
    href: "/services#equip",
  },
  {
    number: "03",
    label: "Install",
    title: "Install the system.",
    copy: "Provide turnkey installation of the approved equipment and storage systems.",
    href: "/services#install",
  },
];

const equipmentGroups = [
  {
    number: "01",
    title: "Storage systems",
    items: ["Pallet rack", "Drive-in rack", "Push-back rack", "Pick modules", "Industrial shelving"],
  },
  {
    number: "02",
    title: "Flow & movement",
    items: ["Carton flow", "Pallet flow", "Power conveyor", "Gravity conveyor", "Carts"],
  },
  {
    number: "03",
    title: "Dock & facility",
    items: ["Dock equipment", "Mezzanines", "Packaging tables", "Shop equipment", "Industrial fans"],
  },
  {
    number: "04",
    title: "Safety & protection",
    items: ["Wire decking", "Wire mesh", "Guard rail", "End-of-rack guards", "Safety netting"],
  },
];

const selectedExperience = [
  { name: "EVERSANA", logo: "/clients/eversana.png", width: 2425, height: 416 },
  { name: "The Hershey Company", logo: "/clients/hershey.svg", width: 188, height: 50 },
  { name: "Costco Wholesale", logo: "/clients/costco.jpg", width: 507, height: 146 },
  { name: "Helen of Troy", logo: "/clients/helen-of-troy.png", width: 320, height: 160 },
  { name: "Kellogg’s", logo: "/clients/kelloggs.png", width: 64, height: 64 },
  { name: "Nike", logo: "/clients/nike.jpg", width: 5000, height: 2813 },
];

export default function Home() {
  return <>
    <SiteHeader active="home" />
    <main id="main-content">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Memphis Material Handling</p>
            <h1 id="home-title">Your warehouse.<br /><span>Working better.</span></h1>
            <p className="hero-lead">Storage systems, equipment, and installation. Everything your space needs, thoughtfully brought together.</p>
            <div className="button-row"><ProjectIntake className="hero-project" /><Link className="text-link" href="/services">Explore our services <span aria-hidden="true">↗</span></Link></div>
            <p className="hero-location">Memphis, Tennessee <span aria-hidden="true">/</span> Established 1986</p>
          </div>
          <figure className="hero-photo">
            <Image src="/mmh-owner-warehouse-4k.webp" alt="Warehouse racking installation in progress at a Memphis Material Handling project" width={4096} height={4096} priority sizes="(max-width: 780px) 100vw, 46vw" unoptimized />
            <figcaption>From the warehouse floor.</figcaption>
            <ProjectPhoto />
          </figure>
        </div>
      </section>

      <section className="home-services section" aria-labelledby="services-overview-title">
        <div className="wrap">
          <div className="section-heading"><div><p className="eyebrow">A complete approach</p><h2 id="services-overview-title">From a clear plan<br />to a working system.</h2></div><p>One connected process for your layout, your equipment, and the work that brings it all together.</p></div>
          <ol className="service-overview">{projectStages.map(stage => <li key={stage.number}><Link href={stage.href}><span className="service-number">{stage.number}</span><h3>{stage.label}<span aria-hidden="true">↗</span></h3><p>{stage.copy}</p></Link></li>)}</ol>
        </div>
      </section>

      <section className="home-equipment section" aria-labelledby="equipment-title">
        <div className="wrap">
          <div className="equipment-intro"><div><p className="eyebrow">New + used equipment</p><h2 id="equipment-title">A place for everything.<br />A system that fits.</h2><p>Rack and shelving. Material movement. Dock equipment and protection. Find the right pieces for your operation.</p></div><ul className="equipment-index">{equipmentGroups.map(group => <li key={group.number}><span>{group.number}</span>{group.title}</li>)}</ul></div>
          <details className="home-explorer"><summary>Explore warehouse equipment <span aria-hidden="true">+</span></summary><WarehouseExplorer groups={equipmentGroups} /><details className="equipment-catalogue"><summary>View the full equipment list <span aria-hidden="true">+</span></summary><div className="home-v2-equipment-grid">{equipmentGroups.map(group => <section key={group.number} aria-labelledby={`home-equipment-${group.number}`}><h3 id={`home-equipment-${group.number}`}>{group.title}</h3><ul>{group.items.map(item => <li key={item}>{item}</li>)}</ul></section>)}</div></details><div className="explorer-services-link"><Link href="/services#equipment">View all equipment and services <span aria-hidden="true">↗</span></Link></div></details>
        </div>
      </section>

      <section className="home-experience section" aria-labelledby="experience-title">
        <div className="wrap">
          <div className="section-heading"><div><p className="eyebrow">Memphis, since 1986</p><h2 id="experience-title">Built on experience.<br />Focused on your operation.</h2></div><div><p>From warehouse planning and storage-system engineering to turnkey installation, we help bring the whole project together.</p><Link className="text-link" href="/about">Get to know MMH <span aria-hidden="true">↗</span></Link></div></div>
          <div className="experience-topline"><span>Selected past project experience</span><Link href="/partners">Our partners &amp; experience <span aria-hidden="true">↗</span></Link></div>
          <div className="client-strip">{selectedExperience.map(company => <div key={company.name}><Image src={company.logo} alt={`${company.name} logo`} width={company.width} height={company.height} unoptimized /></div>)}</div>
          <p className="fine-print">Company names identify selected past project experience. Their inclusion does not imply endorsement, partnership, or an ongoing business relationship.</p>
        </div>
      </section>
      <section className="contact-band" aria-labelledby="home-contact-title"><div className="wrap contact-band-inner"><div><p className="eyebrow">Let’s get to work</p><h2 id="home-contact-title">What’s next for your space?</h2><p>Tell us what you have in mind. We’ll help you find a starting point.</p></div><a className="button button-light" href="tel:9019477225">Call 901-947-7225 <span aria-hidden="true">↗</span></a></div></section>
    </main>
    <SiteFooter />
  </>;
}
