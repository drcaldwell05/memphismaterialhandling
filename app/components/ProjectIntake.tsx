"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { projectNeeds, projectTimings, type Need, type Details } from "../../lib/project-request";
import { ProjectVerification } from "./ProjectVerification";
type Errors = Partial<Record<"needs" | "name" | "email" | "phone", string>>;

const stepNames = ["Your project", "Your details", "Review"];
const initialDetails: Details = {
  description: "", location: "", timing: "Not sure yet", name: "", company: "", email: "", phone: "",
};

export function ProjectIntake({ className }: { className: string }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [details, setDetails] = useState<Details>(initialDetails);
  const [errors, setErrors] = useState<Errors>({});
  const [config, setConfig] = useState<{ enabled: boolean; siteKey?: string; testRequestId?: string } | null>(null);
  const [token, setToken] = useState("");
  const [website, setWebsite] = useState("");
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const [sending, setSending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [sendError, setSendError] = useState("");
  const [finalError, setFinalError] = useState(false);
  const [reference, setReference] = useState("");
  const [submission, setSubmission] = useState<Record<string, unknown> | null>(null);
  const sendLock = useRef(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const testId = new URLSearchParams(window.location.search).get("projectTest");
    const query = testId ? `?test=${encodeURIComponent(testId)}` : "";
    fetch(`/api/project-requests/config${query}`, { signal: controller.signal, cache: "no-store" })
      .then(response => response.ok ? response.json() : { enabled: false })
      .then(value => { const result = value as { enabled?: boolean; siteKey?: string; testRequestId?: string }; setConfig({ enabled: result.enabled === true, siteKey: result.siteKey, testRequestId: result.testRequestId }); })
      .catch(() => { if (!controller.signal.aborted) setConfig({ enabled: false }); });
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    const button = trigger.current;
    return () => {
      document.body.style.overflow = previousOverflow;
      const menu = button?.closest("details");
      if (menu && !menu.open) menu.querySelector("summary")?.focus();
      else button?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    body.current?.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [open, step, accepted]);

  function update(field: keyof Details, value: string) {
    setDetails((previous) => ({ ...previous, [field]: value }));
    if (field === "name" || field === "email" || field === "phone") {
      setErrors((previous) => ({ ...previous, [field]: undefined, ...(field !== "name" ? { email: undefined, phone: undefined } : {}) }));
    }
  }

  function toggleNeed(value: Need) {
    setNeeds((previous) => previous.includes(value)
      ? previous.filter((item) => item !== value)
      : value === "unsure" ? [value] : [...previous.filter((item) => item !== "unsure"), value]);
    setErrors({});
  }

  function goTo(next: number) {
    if (sending || submission) return;
    setErrors({});
    setStep(next);
  }

  function closeForm() {
    if (sending) return;
    dialog.current?.close();
    setOpen(false);
    if (accepted) {
      setStep(0); setNeeds([]); setDetails(initialDetails); setAccepted(false);
      setSubmission(null); setToken(""); setSendError(""); setReference("");
    }
  }

  async function sendRequest() {
    if (sendLock.current || sending || finalError || !config?.enabled || (!token && !submission)) return;
    sendLock.current = true;
    const payload = submission ?? { ...details, needs, website, turnstileToken: token, requestId: config.testRequestId || crypto.randomUUID() };
    setSubmission(payload);
    setSending(true); setSendError("");
    try {
      const query = config.testRequestId ? `?test=${encodeURIComponent(config.testRequestId)}` : "";
      const response = await fetch(`/api/project-requests${query}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(45_000) });
      const result = await response.json() as { accepted?: boolean; error?: string; reference?: string; final?: boolean; verification?: boolean };
      if (response.ok && result.accepted === true) { setAccepted(true); setReference(result.reference || ""); return; }
      setSendError(typeof result.error === "string" ? result.error : "We couldn’t confirm your submission. Please try checking again.");
      if (result.reference) setReference(result.reference);
      if (result.final) setFinalError(true);
      else if (result.verification || response.status === 400 || response.status === 429 || response.status === 503) {
        setSubmission(null); setToken(""); setVerificationAttempt(attempt => attempt + 1);
      }
    } catch { setSendError("We couldn’t confirm your submission. Your answers are still here. Select Check submission to check again."); }
    finally { sendLock.current = false; setSending(false); }
  }

  function continueForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Errors = {};
    if (step === 0 && needs.length === 0) nextErrors.needs = "Choose at least one option. ‘I’m not sure’ is fine, too.";
    if (step === 1) {
      if (!details.name.trim()) nextErrors.name = "Please enter your name.";
      if (!details.email.trim() && !details.phone.trim()) nextErrors.email = "Add an email address or phone number so we can reach you.";
      if (details.email.trim() && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(details.email.trim())) nextErrors.email = "Please enter a valid email address.";
      if (details.phone.trim() && (!/^[+\d\s().#x-]+$/i.test(details.phone.trim()) || details.phone.replace(/\D/g, "").length < 7)) nextErrors.phone = "Please enter a phone number, including the area code.";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const field = Object.keys(nextErrors)[0];
      const control = event.currentTarget.querySelector<HTMLElement>(field === "needs" ? "input[name='needs']" : `[name='${field}']`);
      control?.focus();
      return;
    }
    if (step < 2) goTo(step + 1);
    else void sendRequest();
  }

  const selectedNeeds = projectNeeds.filter((need) => needs.includes(need.value));

  return (
    <>
      <button ref={trigger} type="button" className={`button button-primary ${className}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        Plan a project <span aria-hidden="true">↗</span>
      </button>
      {open && createPortal(
        <dialog ref={dialog} className="project-intake-dialog" aria-labelledby={`${id}-title`} onCancel={(event) => { event.preventDefault(); closeForm(); }} onClose={() => setOpen(false)}>
          <div className="intake-topbar">
            <div><p className="intake-kicker">Memphis Material Handling</p><h2 id={`${id}-title`}>Plan a project</h2></div>
            <button className="intake-close" type="button" aria-label="Close project form" disabled={sending} onClick={closeForm}><span aria-hidden="true">×</span></button>
          </div>
          <form className="intake-form" noValidate onSubmit={continueForm}>
            {!accepted && <ol className="intake-steps" aria-label="Project form progress">
              {stepNames.map((name, index) => <li key={name} aria-current={index === step ? "step" : undefined} data-complete={index < step}><span aria-hidden="true">{index < step ? "✓" : index + 1}</span>{name}</li>)}
            </ol>}
            <div className="intake-body" ref={body}>
              {accepted ? <section className="intake-success" aria-labelledby={`${id}-step-heading`} role="status"><span className="intake-success-mark" aria-hidden="true">✓</span><h3 ref={heading} tabIndex={-1} id={`${id}-step-heading`}>Your request has been submitted.</h3><p className="intake-intro">Thank you for telling us about your project. Our team will review your details and contact you using the information you provided.</p><p className="intake-help">Need to talk sooner? Call <a href="tel:9019477225">901-947-7225</a>.</p></section> : <>
              {config && !config.enabled && <p className="intake-preview-note"><strong>Online requests are temporarily unavailable.</strong> Please call <a href="tel:9019477225">901-947-7225</a> to discuss your project.</p>}
              {config?.testRequestId && <p className="intake-preview-note"><strong>Website setup test.</strong> This test email goes only to Russell.</p>}
              <div className="intake-honeypot" aria-hidden="true"><label htmlFor={`${id}-website`}>Leave this field empty<input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label></div>
              {step === 0 && <section aria-labelledby={`${id}-step-heading`}>
                <h3 ref={heading} tabIndex={-1} id={`${id}-step-heading`}>What would you like help with?</h3>
                <p className="intake-intro">You don’t need to know the equipment names. Start with what you’d like to do.</p>
                <fieldset className="intake-needs" aria-describedby={errors.needs ? `${id}-needs-error` : undefined}>
                  <legend>Choose all that apply.</legend>
                  {projectNeeds.map((need) => <label className={`intake-need${need.value === "unsure" ? " intake-need-unsure" : ""}`} key={need.value}>
                    <input type="checkbox" name="needs" value={need.value} checked={needs.includes(need.value)} onChange={() => toggleNeed(need.value)} aria-invalid={errors.needs ? true : undefined} aria-describedby={errors.needs ? `${id}-needs-error` : undefined} />
                    <span><strong>{need.title}</strong><small>{need.detail}</small></span>
                  </label>)}
                </fieldset>
                {errors.needs && <p className="intake-error" id={`${id}-needs-error`} role="alert">{errors.needs}</p>}
                <label className="intake-field intake-description" htmlFor={`${id}-description`}>Tell us a little more <span>(optional)</span>
                  <textarea id={`${id}-description`} name="description" rows={3} maxLength={3000} value={details.description} onChange={(event) => update("description", event.target.value)} placeholder="For example: We’re running out of room for boxes in our stockroom." aria-describedby={`${id}-description-help`} />
                </label>
                <p className="intake-help" id={`${id}-description-help`}>Already know what you need? Include equipment names, quantities, or sizes. Estimates are fine.</p>
              </section>}
              {step === 1 && <section aria-labelledby={`${id}-step-heading`}>
                <h3 ref={heading} tabIndex={-1} id={`${id}-step-heading`}>A few details to get started.</h3>
                <p className="intake-intro">Only your name and one way to reach you are required.</p>
                <div className="intake-fields">
                  <label className="intake-field" htmlFor={`${id}-location`}>Project city &amp; state <span>(optional)</span>
                    <input id={`${id}-location`} name="location" autoComplete="off" maxLength={180} placeholder="e.g. Memphis, TN" value={details.location} onChange={(event) => update("location", event.target.value)} />
                  </label>
                  <label className="intake-field" htmlFor={`${id}-timing`}>When are you hoping to start?
                    <select id={`${id}-timing`} name="timing" value={details.timing} onChange={(event) => update("timing", event.target.value)}>
                      {projectTimings.map((timing) => <option key={timing}>{timing}</option>)}
                    </select>
                  </label>
                  <label className="intake-field" htmlFor={`${id}-name`}>Your name <span>(required)</span>
                    <input id={`${id}-name`} name="name" autoComplete="name" required maxLength={120} value={details.name} onChange={(event) => update("name", event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${id}-name-error` : undefined} />
                    {errors.name && <span className="intake-error" id={`${id}-name-error`} role="alert">{errors.name}</span>}
                  </label>
                  <label className="intake-field" htmlFor={`${id}-company`}>Company <span>(optional)</span>
                    <input id={`${id}-company`} name="company" autoComplete="organization" maxLength={180} value={details.company} onChange={(event) => update("company", event.target.value)} />
                  </label>
                </div>
                <fieldset className="intake-contact-fields">
                  <legend>How can we reach you?</legend><p className="intake-help" id={`${id}-contact-help`}>Add an email address, a phone number, or both.</p>
                  <div className="intake-fields">
                    <label className="intake-field" htmlFor={`${id}-email`}>Email address
                      <input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} value={details.email} onChange={(event) => update("email", event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={`${id}-contact-help${errors.email ? ` ${id}-email-error` : ""}`} />
                      {errors.email && <span className="intake-error" id={`${id}-email-error`} role="alert">{errors.email}</span>}
                    </label>
                    <label className="intake-field" htmlFor={`${id}-phone`}>Phone number
                      <input id={`${id}-phone`} name="phone" type="tel" autoComplete="tel" maxLength={40} value={details.phone} onChange={(event) => update("phone", event.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby={`${id}-contact-help${errors.phone ? ` ${id}-phone-error` : ""}`} />
                      {errors.phone && <span className="intake-error" id={`${id}-phone-error`} role="alert">{errors.phone}</span>}
                    </label>
                  </div>
                </fieldset>
              </section>}
              {step === 2 && <section aria-labelledby={`${id}-step-heading`}>
                <h3 ref={heading} tabIndex={-1} id={`${id}-step-heading`}>Take a quick look.</h3>
                <p className="intake-intro">Check your project and contact details below.</p>
                <div className="intake-review-group">
                  <div className="intake-review-heading"><h4>Your project</h4><button type="button" onClick={() => goTo(0)} aria-label="Edit your project">Edit <span aria-hidden="true">↗</span></button></div>
                  <ul className="intake-review-needs">{selectedNeeds.map((need) => <li key={need.value}>{need.title}</li>)}</ul>
                  <p className="intake-review-description">{details.description.trim() || "No additional details yet."}</p>
                </div>
                <div className="intake-review-group">
                  <div className="intake-review-heading"><h4>Your details</h4><button type="button" onClick={() => goTo(1)} aria-label="Edit your details">Edit <span aria-hidden="true">↗</span></button></div>
                  <dl className="intake-review-details">
                    <div><dt>Name</dt><dd>{details.name.trim()}</dd></div>
                    <div><dt>Company</dt><dd>{details.company.trim() || "Not provided"}</dd></div>
                    <div><dt>Project location</dt><dd>{details.location.trim() || "Not decided yet"}</dd></div>
                    <div><dt>Timing</dt><dd>{details.timing}</dd></div>
                    <div><dt>Email</dt><dd>{details.email.trim() || "Not provided"}</dd></div>
                    <div><dt>Phone</dt><dd>{details.phone.trim() || "Not provided"}</dd></div>
                  </dl>
                </div>
                <div className="intake-delivery-note" id={`${id}-delivery-note`}><strong>{config?.enabled ? "Ready to start the conversation?" : "Prefer to talk it through?"}</strong><p>{config?.enabled ? "Send these details to our team. We’ll use your contact information to follow up about this project." : "Call 901-947-7225 to discuss your project with our team."}</p></div>
                {config?.enabled && config.siteKey && !finalError && <ProjectVerification key={verificationAttempt} siteKey={config.siteKey} onToken={setToken} />}
                {sendError && <div className="intake-error" role="alert"><p>{sendError}</p>{reference && <p>Reference: {reference}</p>}</div>}
              </section>}
              <p className="intake-session-note">Your answers stay in this form while this page is open. Refreshing or leaving the page clears them.</p>
              </>}
            </div>
            <div className="intake-bottom">
              {accepted ? <><span /><button className="button button-primary" type="button" onClick={closeForm}>Done <span aria-hidden="true">✓</span></button></> : <>
              {step > 0 ? <button className="intake-back" type="button" disabled={sending || Boolean(submission)} onClick={() => goTo(step - 1)}>← Back</button> : <span className="intake-step-count">Step 1 of 3</span>}
              {step < 2 ? <button className="button button-primary" type="submit">{step === 0 ? "Continue" : "Review request"} <span aria-hidden="true">→</span></button> : <button className="button button-primary" type="submit" disabled={!config?.enabled || sending || finalError || (!token && !submission)} aria-describedby={`${id}-delivery-note`}>{sending ? "Submitting…" : submission ? "Check submission" : config?.testRequestId ? "Send test to Russell" : "Send project request"} <span aria-hidden="true">↗</span></button>}
              </>}
            </div>
          </form>
        </dialog>, document.body
      )}
    </>
  );
}
