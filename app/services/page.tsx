import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/SiteShell";
import { ProjectPath } from "../components/ProjectPath";
import { WarehouseExplorer } from "../components/WarehouseExplorer";

export const metadata: Metadata = {
  title: "Warehouse Services",
  description:
    "Warehouse design, storage-system engineering, equipment supply, permitting, installation, and liquidation services in Memphis.",
  openGraph: {
    title: "Warehouse Services | Memphis Material Handling",
    description: "Warehouse planning, storage-system engineering, equipment, permitting, installation, and liquidation services in Memphis.",
    type: "website",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Warehouse Services | Memphis Material Handling",
    description: "Warehouse planning, storage-system engineering, equipment, permitting, installation, and liquidation services in Memphis.",
    images: [],
  },
};

const projectStages = [
  {
    id: "plan",
    number: "01",
    label: "Plan",
    title: "Plan the warehouse layout.",
    copy: "Coordinate CAD layout, storage-system design, seismic design, and permitting before equipment is installed.",
  },
  {
    id: "equip",
    number: "02",
    label: "Equip",
    title: "Select the equipment.",
    copy: "Specify new or used storage, flow, conveyor, dock, safety, and facility equipment for the approved plan.",
  },
  {
    id: "install",
    number: "03",
    label: "Install",
    title: "Install the system.",
    copy: "Provide turnkey installation of the approved equipment and storage systems.",
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

export default function ServicesPage() {
  return (
    <>
      <SiteHeader active="services" />
      <main id="main-content">
        <section className="services-hero-v2">
          <div className="wrap services-hero-v2-grid">
            <div className="services-hero-v2-copy">
              <p className="eyebrow red">Warehouse services</p>
              <h1>
                Make your space<br />
                <em>work for you.</em>
              </h1>
              <p className="services-hero-v2-lead">
                CAD layout, storage-system engineering, seismic design, permitting
                coordination, new and used equipment, and turnkey installation.
              </p>
              <div className="button-row">
                <Link className="button button-primary" href="/contact">Talk with MMH</Link>
                <a className="text-link" href="tel:9019477225">901-947-7225 <span aria-hidden="true">↗</span></a>
              </div>
            </div>

            <ProjectPath stages={projectStages} />
          </div>


        </section>

        <section className="services-path section" aria-labelledby="services-path-title">
          <div className="wrap services-path-shell">
            <div className="services-path-intro">
              <p className="eyebrow red">Project path</p>
              <h2 id="services-path-title">The layout sets the direction.</h2>
              <p>
                Engineering, equipment selection, and installation follow the
                same warehouse plan.
              </p>

            </div>

            <ol className="services-chapters">
              {projectStages.map((stage) => (
                <li className="services-chapter" id={stage.id} key={stage.id}>
                  <article aria-labelledby={`${stage.id}-title`} data-motion-surface>
                    <div className="services-chapter-topline">
                      <span aria-hidden="true">{stage.number}</span>
                      <p>{stage.label}</p>
                    </div>
                    <h3 id={`${stage.id}-title`}>{stage.title}</h3>
                    <p className="services-chapter-copy">{stage.copy}</p>
                  </article>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="equipment" className="services-equipment section" aria-labelledby="services-equipment-title">
          <div className="wrap services-equipment-heading">
            <div>
              <p className="eyebrow light">Equipment</p>
              <h2 id="services-equipment-title">Equipment for your warehouse.</h2>
            </div>
            <p>
              New and used material-handling equipment across storage, movement,
              work areas, docks, and protection.
            </p>
          </div>

          <div className="wrap"><WarehouseExplorer groups={equipmentGroups} /></div>
          <details className="wrap equipment-catalogue">
            <summary>View the full equipment list <span aria-hidden="true">+</span></summary>
            <div className="services-equipment-grid">
              {equipmentGroups.map((group) => (
                <section key={group.number} aria-labelledby={`equipment-${group.number}`}>
                  <span aria-hidden="true">{group.number}</span>
                  <h3 id={`equipment-${group.number}`}>{group.title}</h3>
                  <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
              ))}
            </div>
          </details>
        </section>

        <section className="services-change section" aria-labelledby="services-change-title">
          <div className="wrap services-change-grid">
            <div>
              <p className="eyebrow red">Used equipment &amp; liquidation</p>
              <h2 id="services-change-title">When the warehouse changes.</h2>
            </div>
            <div className="services-change-copy">
              <p>
                Memphis Material Handling supplies used material-handling
                equipment and provides liquidation services.
              </p>
            </div>
          </div>
        </section>

        <section className="services-contact" aria-labelledby="services-contact-title">
          <div className="wrap services-contact-panel" data-motion-surface>
            <div>
              <p className="eyebrow light">Let’s get to work</p>
              <h2 id="services-contact-title">Discuss your next project.</h2>
            </div>
            <div className="services-contact-copy">
              <p>
                Call about a layout, storage system, equipment need,
                installation, or liquidation.
              </p>
              <div className="button-row">
                <a className="button button-light" href="tel:9019477225">Call 901-947-7225</a>
                <Link className="text-link text-link-light" href="/contact">Contact details <span aria-hidden="true">↗</span></Link>
              </div>
              <small>3832 Watman Ave. · Monday–Friday, 8:00 am–5:00 pm</small>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
