import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/SiteShell";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Call Memphis Material Handling at 901-947-7225 about warehouse planning, equipment, installation, or liquidation.",
  openGraph: {
    title: "Contact Memphis Material Handling",
    description:
      "Call Memphis Material Handling at 901-947-7225 about warehouse planning, equipment, installation, or liquidation.",
    type: "website",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Contact Memphis Material Handling",
    description:
      "Call Memphis Material Handling at 901-947-7225 about warehouse planning, equipment, installation, or liquidation.",
    images: [],
  },
};

const projectBrief = [
  {
    number: "01",
    title: "Space",
    copy: "A floor plan, dimensions, address, or photos.",
  },
  {
    number: "02",
    title: "Equipment",
    copy: "Your existing equipment and what you need.",
  },
  {
    number: "03",
    title: "Timing",
    copy: "Your target date or next project milestone.",
  },
];

export default function ContactPage() {
  return (
    <>
      <SiteHeader active="contact" />
      <main id="main-content">
        <section
          className="contact-v3-hero"
          aria-labelledby="contact-v3-title"
        >
          <div className="wrap contact-v3-hero-grid">
            <div className="contact-v3-hero-copy">
              <p className="contact-v3-eyebrow">Contact</p>
              <h1 id="contact-v3-title">Let’s talk about your project.</h1>
              <p className="contact-v3-hero-lead">
                Call Memphis Material Handling to discuss warehouse planning,
                equipment, installation, or liquidation.
              </p>
            </div>

            <address
              className="contact-v3-office"
              aria-label="Memphis Material Handling contact details"
              data-motion-surface
            >
              <div className="contact-v3-office-heading">
                <span>Contact details</span>
                <small>Memphis · Tennessee</small>
              </div>

              <a
                className="contact-v3-office-phone"
                href="tel:9019477225"
                aria-label="Call Memphis Material Handling at 901-947-7225"
              >
                <span>Phone</span>
                <strong>901-947-7225</strong>
              </a>

              <div className="contact-v3-office-grid">
                <div className="contact-v3-office-address">
                  <span>Address</span>
                  <p>
                    3832 Watman Ave.<br />
                    Memphis, TN 38118
                  </p>
                  <a
                    className="contact-v3-directions"
                    href="https://www.google.com/maps/search/?api=1&query=3832+Watman+Ave+Memphis+TN+38118"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Get directions to Memphis Material Handling in Google Maps, opens in a new tab"
                  >
                    Get directions <span aria-hidden="true">↗</span>
                  </a>
                </div>
                <div className="contact-v3-office-hours">
                  <span>Hours</span>
                  <p>
                    Monday–Friday<br />
                    8:00 am–5:00 pm
                  </p>
                </div>
              </div>
            </address>
          </div>
        </section>

        <section
          className="contact-v3-brief"
          aria-labelledby="contact-v3-brief-title"
        >
          <div className="wrap">
            <div className="contact-v3-brief-heading">
              <div>
                <p className="contact-v3-eyebrow">Before you call</p>
                <h2 id="contact-v3-brief-title">What to have ready.</h2>
              </div>
              <p>
                If available, have a floor plan or dimensions, equipment details,
                and your target timeline ready.
              </p>
            </div>

            <ol className="contact-v3-brief-list">
              {projectBrief.map((item) => (
                <li className="contact-v3-brief-item" key={item.number}>
                  <span aria-hidden="true">{item.number}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </div>
                  <label className="brief-ready"><input type="checkbox" aria-label={`Mark ${item.title.toLowerCase()} ready for the call`} /><span>Ready for the call</span></label>
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
