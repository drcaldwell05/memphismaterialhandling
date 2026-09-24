import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/SiteShell";
import "./sign-in.css";

export const metadata: Metadata = {
  title: "Staff Sign In",
  description: "Staff sign-in page for Memphis Material Handling.",
  robots: { index: false, follow: false },
  openGraph: { title: "Staff Sign In | Memphis Material Handling", description: "Staff sign-in page for Memphis Material Handling.", type: "website", images: [] },
  twitter: { card: "summary", title: "Staff Sign In | Memphis Material Handling", description: "Staff sign-in page for Memphis Material Handling.", images: [] },
};

export default function SignInPage() {
  return <>
    <SiteHeader />
    <main id="main-content" className="signin-page">
      <section className="signin-card" aria-labelledby="signin-title">
        <span className="signin-mark" aria-hidden="true"><Image src="/mmh-logo-forest-copper.png" alt="" width={1536} height={1024} unoptimized /></span>
        <p className="eyebrow">Memphis Material Handling</p>
        <h1 id="signin-title">Staff sign in.</h1>
        <p className="signin-intro">A dedicated space for the MMH team.</p>
        <p className="signin-status" id="signin-status"><strong>Staff access is coming soon.</strong> Accounts aren’t available yet.</p>
        <fieldset className="signin-fields" disabled aria-describedby="signin-status">
          <legend className="signin-legend">Account details</legend>
          <label htmlFor="staff-email">Email address<input id="staff-email" type="email" autoComplete="off" placeholder="you@example.com" /></label>
          <label htmlFor="staff-password">Password<input id="staff-password" type="password" autoComplete="off" placeholder="Enter your password" /></label>
          <button className="button button-primary" type="button" disabled>Sign in</button>
        </fieldset>
        <Link className="signin-return" href="/">Back to the website</Link>
      </section>
    </main>
    <SiteFooter />
  </>;
}
