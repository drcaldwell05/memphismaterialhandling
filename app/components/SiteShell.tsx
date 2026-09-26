import Image from "next/image";
import Link from "next/link";
import { SiteMotion } from "./SiteMotion";
import { ProjectIntake } from "./ProjectIntake";

export type ActivePage = "home" | "services" | "partners" | "about" | "contact";
const navigation: Array<{ href: string; label: string; key: ActivePage }> = [
  { href: "/", label: "Home", key: "home" },
  { href: "/services", label: "Services", key: "services" },
  { href: "/partners", label: "Partners", key: "partners" },
  { href: "/about", label: "About", key: "about" },
  { href: "/contact", label: "Contact", key: "contact" },
];
function Brand() {
  return <><span className="brand-mark"><Image src="/mmh-logo-forest-copper.png" alt="" width={1536} height={1024} priority unoptimized /></span><span className="brand-name">Memphis<span>Material Handling</span></span></>;
}
export function SiteHeader({ active }: { active?: ActivePage }) {
  return <header className="site-header" id="top"><SiteMotion /><a className="skip-link" href="#main-content">Skip to content</a>
    <div className="wrap header-inner">
      <Link className="brand" href="/" aria-label="Memphis Material Handling home"><Brand /></Link>
      <nav className="desktop-nav" aria-label="Main navigation">{navigation.map(item => <Link key={item.key} href={item.href} aria-current={active === item.key ? "page" : undefined}>{item.label}</Link>)}</nav>
      <div className="header-actions"><ProjectIntake className="header-cta" />
        <details className="mobile-menu"><summary aria-label="Navigation menu"><span className="menu-icon" aria-hidden="true"><i /><i /></span>Menu</summary>
          <div className="mobile-menu-panel"><nav aria-label="Mobile navigation">{navigation.map(item => <Link key={item.key} href={item.href} aria-current={active === item.key ? "page" : undefined}>{item.label}</Link>)}</nav><ProjectIntake className="mobile-project-cta" /><a className="mobile-phone" href="tel:9019477225">901-947-7225</a></div>
        </details>
      </div>
    </div>
  </header>;
}
export function SiteFooter() {
  return <footer className="site-footer">
    <div className="wrap footer-grid">
      <div className="footer-company"><Link className="brand footer-brand" href="/" aria-label="Memphis Material Handling home"><Brand /></Link><p>Planning, equipment, and installation.<br />Rooted in Memphis since 1986.</p></div>
      <nav className="footer-nav" aria-label="Company navigation"><h2>Explore</h2>{navigation.filter(item=>item.key!=="home").map(item=><Link href={item.href} key={item.key}>{item.label}</Link>)}</nav>
      <nav className="footer-nav" aria-label="Services navigation"><h2>Services</h2><Link href="/services#plan">Layout &amp; engineering</Link><Link href="/services#equip">New &amp; used equipment</Link><Link href="/services#install">Turnkey installation</Link></nav>
      <div className="footer-contact"><h2>Come find us</h2><a className="footer-phone" href="tel:9019477225">901-947-7225</a><address><a href="https://www.google.com/maps/search/?api=1&query=3832+Watman+Ave+Memphis+TN+38118" target="_blank" rel="noreferrer">3832 Watman Ave.<br />Memphis, TN 38118</a></address><p>Monday–Friday, 8:00 am–5:00 pm</p></div>
    </div>
    <div className="wrap footer-bottom"><p>© 2026 Memphis Material Handling, Inc.</p><span>Memphis, Tennessee</span></div>
    <a className="site-back-top" href="#top" aria-label="Back to top" hidden><span aria-hidden="true">↑</span> Top</a>
  </footer>;
}
