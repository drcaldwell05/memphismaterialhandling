import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./partners.css";
import { PartnerDirectory } from "../components/PartnerDirectory";
import { SiteFooter, SiteHeader } from "../components/SiteShell";

export const metadata: Metadata = {
  title: "Partners & Experience",
  description:
    "Equipment resources and selected past project experience for Memphis Material Handling.",
  openGraph: {
    title: "Partners & Experience | Memphis Material Handling",
    description: "Equipment resources and selected past project experience for Memphis Material Handling.",
    type: "website",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Partners & Experience | Memphis Material Handling",
    description: "Equipment resources and selected past project experience for Memphis Material Handling.",
    images: [],
  },
};

const equipmentResources = [
  {
    name: "Mallard Manufacturing",
    categories: ["Storage & flow"],
    logo: "/partners/mallard.png",
    width: 350,
    height: 80,
    role: "Flow systems",
    products: "Carton flow and pallet flow.",
    website: "https://www.mallardmfg.com/",
  },
  {
    name: "World Wide Material Handling",
    categories: ["Safety & protection"],
    logo: "/partners/world-wide-material-handling.gif",
    width: 121,
    height: 101,
    role: "Rack accessories & protection",
    products: "Wire decking, rack accessories, guard rail, and end-rack protection.",
    website: "https://www.wwmh.net/",
  },
  {
    name: "InCord",
    categories: ["Safety & protection"],
    logo: "/partners/incord.png",
    width: 1000,
    height: 600,
    role: "Safety systems",
    products: "Industrial safety netting and safety products.",
    website: "https://incord.com/",
  },
  {
    name: "Bluff Manufacturing",
    categories: ["Safety & protection", "Dock & facility"],
    logo: "/partners/bluff-manufacturing.png",
    width: 352,
    height: 76,
    role: "Dock & facility",
    products: "Dock equipment, mezzanines, guard rail, and in-rack protection.",
    website: "https://www.bluffmanufacturing.com/",
  },
  {
    name: "Borroughs Corporation",
    categories: ["Storage & flow", "Dock & facility"],
    logo: "/partners/borroughs.jpg",
    width: 264,
    height: 66,
    role: "Shelving & work areas",
    products: "Industrial shelving and shop equipment.",
    website: "https://www.borroughs.com/",
  },
];

const warehouseResource = {
  name: "Interlake Mecalux",
  anchor: "warehouse-resource",
    categories: ["Storage & flow"],
  role: "Racking & equipment",
  products: "Pallet racking and warehouse storage systems.",
  logo: "/partners/interlake-mecalux.svg",
  width: 180,
  height: 60,
  website: "https://www.interlakemecalux.com/",
};

const experienceSectors = [
  {
    title: "Life sciences services",
    companies: [
      { name: "EVERSANA", logo: "/clients/eversana.png", width: 2425, height: 416 },
    ],
  },
  {
    title: "Food manufacturing",
    companies: [
      { name: "The Hershey Company", logo: "/clients/hershey.svg", width: 188, height: 50 },
      { name: "Kellogg’s", logo: "/clients/kelloggs.png", width: 64, height: 64 },
    ],
  },
  {
    title: "Retail",
    companies: [
      { name: "Fred’s, Inc.", logo: "/clients/freds-super-dollar.jpg", width: 1200, height: 900, logoClass: "freds" },
      { name: "TJ Maxx", logo: "/clients/tj-maxx.svg", width: 345, height: 83 },
      { name: "Costco Wholesale", logo: "/clients/costco.jpg", width: 507, height: 146 },
    ],
  },
  {
    title: "Consumer products & apparel",
    companies: [
      { name: "Helen of Troy", logo: "/clients/helen-of-troy.png", width: 320, height: 160 },
      { name: "Hydro Flask", logo: "/clients/hydro-flask.svg", width: 446, height: 105 },
      { name: "Nike", logo: "/clients/nike.jpg", width: 5000, height: 2813 },
    ],
  },
  {
    title: "Public safety",
    companies: [
      { name: "Shelby County Sheriff’s Office", logo: "/clients/shelby-county-sheriff.png", width: 96, height: 96 },
      { name: "Memphis Police Department", logo: "/clients/memphis-police.png", width: 583, height: 345, logoClass: "navy" },
    ],
  },
];

export default function PartnersPage() {
  const resources = [...equipmentResources, warehouseResource];
  const experience = experienceSectors.flatMap((sector) =>
    sector.companies.map((company) => ({ ...company, sector: sector.title })),
  );

  return (
    <>
      <SiteHeader active="partners" />
      <main id="main-content" className="partners-page">
        <section className="partner-intro" aria-labelledby="partners-title">
          <div className="wrap partner-intro-grid">
            <div>
              <p className="eyebrow">Partners &amp; experience</p>
              <h1 id="partners-title">Good work starts<br />with <em>good connections.</em></h1>
            </div>
            <p className="partner-intro-copy">Equipment resources and project experience, brought together around your warehouse needs.</p>
          </div>
          <nav className="wrap partner-page-nav" aria-label="Partners page sections">
            <a href="#equipment-network">Equipment network <span aria-hidden="true">↓</span></a>
            <a href="#project-experience">Past project experience <span aria-hidden="true">↓</span></a>

          </nav>
        </section>

        <section className="partner-directory" id="equipment-network" aria-labelledby="equipment-network-title">
          <div className="wrap">
            <div className="partner-section-heading">
              <div><p className="partner-section-index">Equipment network</p><h2 id="equipment-network-title">Expertise for each application.</h2></div>
              <p>Flow, storage, protection, and facility equipment.</p>
            </div>
            <PartnerDirectory resources={resources} />
            <p className="partner-network-note">Product availability and project roles are confirmed in the applicable proposal.</p>
          </div>
        </section>

        <section className="partner-experience" id="project-experience" aria-labelledby="project-experience-title">
          <div className="wrap">
            <div className="partner-section-heading">
              <div><p className="partner-section-index">Selected past project experience</p><h2 id="project-experience-title">Across industries.<br />On the warehouse floor.</h2></div>
              <p>Selected past material-handling and facility work in distribution, manufacturing, retail, consumer products, and public safety.</p>
            </div>
            <ul className="partner-experience-grid" aria-label="Selected past project organizations">
              {experience.map((company) => (
                <li className="experience-brand" key={company.name}>
                  <div className={`experience-brand-logo${company.logoClass ? ` ${company.logoClass}` : ""}`}><Image src={company.logo} alt="" width={company.width} height={company.height} unoptimized /></div>
                  <h3>{company.name}</h3>
                  <p>{company.sector}</p>
                </li>
              ))}
              <li className="experience-project-link">
                <Link href="/contact"><span>Planning your next project?</span><strong>Let's talk through it.</strong><span className="experience-project-arrow" aria-hidden="true">↗</span></Link>
              </li>
            </ul>
            <p className="partner-experience-note">Company and brand names identify selected past project experience. Their inclusion does not imply endorsement, partnership, or an ongoing business relationship.</p>
          </div>
        </section>

        <section className="partner-contact" aria-labelledby="partner-contact-title">
          <div className="wrap partner-contact-inner">
            <div><p className="partner-section-index">Memphis Material Handling</p><h2 id="partner-contact-title">Put the right resources to work.</h2></div>
            <a className="button button-dark" href="tel:9019477225">Call 901-947-7225 <span aria-hidden="true">↗</span></a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
