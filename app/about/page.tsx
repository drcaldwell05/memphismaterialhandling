import type { Metadata } from "next";
import Image from "next/image";
import { SiteFooter, SiteHeader } from "../components/SiteShell";
import { ProjectPhoto } from "../components/ProjectPhoto";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Memphis Material Handling, established in Memphis in 1986. Warehouse planning, engineering, equipment, installation, and liquidation.",
  openGraph: {
    title: "About Memphis Material Handling",
    description:
      "Established in Memphis in 1986. Warehouse planning, engineering, equipment, installation, and liquidation.",
    type: "website",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "About Memphis Material Handling",
    description:
      "Established in Memphis in 1986. Warehouse planning, engineering, equipment, installation, and liquidation.",
    images: [],
  },
};

const capabilities = [
  {
    number: "01",
    title: "CAD layout",
    copy: "Warehouse storage layouts.",
  },
  {
    number: "02",
    title: "Engineering & permitting",
    copy: "Storage-system engineering, seismic design, and permitting coordination.",
  },
  {
    number: "03",
    title: "New + used equipment",
    copy: "Storage, handling, dock, facility, and safety equipment.",
  },
  {
    number: "04",
    title: "Turnkey installation",
    copy: "Installation of approved equipment and storage systems.",
  },
  {
    number: "05",
    title: "Liquidation",
    copy: "Equipment liquidation services.",
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader active="about" />
      <main id="main-content">
        <section className="about-v3-hero" aria-labelledby="about-v3-title">
          <div className="wrap about-v3-hero-grid">
            <div className="about-v3-hero-copy">
              <p className="eyebrow red">About</p>
              <h1 id="about-v3-title">Warehouse systems. Memphis roots.</h1>
              <p className="about-v3-hero-lead">
                Established in Memphis in 1986, Memphis Material Handling plans,
                supplies, and installs warehouse storage and material-handling systems.
              </p>
            </div>

            <aside className="about-v3-profile" aria-label="Company profile" data-motion-surface>
              <div className="about-v3-profile-topline">
                <span>Company profile</span>
                <small>Memphis · Tennessee</small>
              </div>
              <dl>
                <div>
                  <dt>Established</dt>
                  <dd>1986</dd>
                </div>
                <div>
                  <dt>Project path</dt>
                  <dd>Plan · Equip · Install</dd>
                </div>
                <div>
                  <dt>Equipment</dt>
                  <dd>New + used</dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        <section
          className="about-v3-company"
          aria-labelledby="about-v3-company-title"
        >
          <div className="wrap about-v3-company-grid">
            <div className="about-v3-company-copy">
              <p className="eyebrow red">The company</p>
              <h2 id="about-v3-company-title">Memphis Material Handling, Inc.</h2>
              <p className="about-v3-company-lead">
                The company supports warehouse and distribution operations with
                CAD layouts, storage-system engineering, seismic design,
                permitting coordination, new and used equipment, turnkey
                installation, and liquidation services.
              </p>

              <section className="about-v3-leadership" aria-labelledby="about-v3-leadership-title">
                <p className="about-v3-leadership-eyebrow">Leadership</p>
                <h3 id="about-v3-leadership-title">Russell R. Caldwell</h3>
                <p className="about-v3-leadership-role">President</p>
              </section>
            </div>

            <figure className="about-v3-project-image" data-motion-surface>
              <div className="about-project-photo-wrap">
                <Image
                  src="/mmh-owner-warehouse-4k.webp"
                  alt="Warehouse storage-system installation in progress at a Memphis Material Handling project"
                  width={4096}
                  height={4096}
                  sizes="(max-width: 900px) 100vw, 48vw"
                  unoptimized
                />
                <ProjectPhoto />
              </div>
              <figcaption>
                <span>In the field</span>
                Warehouse storage installation in progress
              </figcaption>
            </figure>
          </div>
        </section>

        <section
          className="about-v3-capabilities"
          aria-labelledby="about-v3-capabilities-title"
        >
          <div className="wrap about-v3-capabilities-grid">
            <div className="about-v3-capabilities-heading">
              <p className="eyebrow light">What we do</p>
              <h2 id="about-v3-capabilities-title">Warehouse capabilities.</h2>
              <p>Planning, equipment, installation, and liquidation from one Memphis company.</p>
            </div>

            <ol className="about-v3-capability-list">
              {capabilities.map((capability) => (
                <li key={capability.number}>
                  <span aria-hidden="true">{capability.number}</span>
                  <h3>{capability.title}</h3>
                  <p>{capability.copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
