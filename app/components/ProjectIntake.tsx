"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

const projectNeeds = [
  { value: "storage", title: "I need more storage", detail: "Make room for more products or organize the space I have." },
  { value: "location", title: "I’m setting up or moving", detail: "Plan a new space, expand, or move to another location." },
  { value: "flow", title: "I need to move products more easily", detail: "Improve loading, unloading, or moving items through my space." },
  { value: "equipment", title: "I’m looking for equipment", detail: "Find new or used racks, shelving, conveyors, or other equipment." },
  { value: "installation", title: "I need equipment installed or moved", detail: "Get help putting equipment in place or rearranging what I have." },
  { value: "clearout", title: "I have equipment to sell or clear out", detail: "Discuss surplus equipment or clearing a facility." },
  { value: "unsure", title: "I’m not sure what I need yet", detail: "I’d like help figuring out where to start." },
] as const;

type Need = typeof projectNeeds[number]["value"];
type Details = {
  description: string;
  location: string;
  timing: string;
  name: string;
  company: string;
  email: string;
  phone: string;
};
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

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      const button = trigger.current;
      const menu = button?.closest("details");
      if (menu && !menu.open) menu.querySelector("summary")?.focus();
      else button?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    body.current?.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [open, step]);

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
    setErrors({});
    setStep(next);
  }

  function closeForm() {
    dialog.current?.close();
    setOpen(false);
  }

  function continueForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Errors = {};
    if (step === 0 && needs.length === 0) nextErrors.needs = "Choose at least one option. ‘I’m not sure’ is fine, too.";
    if (step === 1) {
      if (!details.name.trim()) nextErrors.name = "Please enter your name.";
      if (!details.email.trim() && !details.phone.trim()) nextErrors.email = "Add an email address or phone number so we can reach you.";
      if (details.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) nextErrors.email = "Please enter a valid email address.";
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
    // Delivery is intentionally unavailable until a receiving mailbox and a
    // server-side, validated email endpoint are configured and tested.
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
            <button className="intake-close" type="button" aria-label="Close project form" onClick={closeForm}><span aria-hidden="true">×</span></button>
          </div>
          <form className="intake-form" noValidate onSubmit={continueForm}>
            <ol className="intake-steps" aria-label="Project form progress">
              {stepNames.map((name, index) => <li key={name} aria-current={index === step ? "step" : undefined} data-complete={index < step}><span aria-hidden="true">{index < step ? "✓" : index + 1}</span>{name}</li>)}
            </ol>
            <div className="intake-body" ref={body}>
              <p className="intake-preview-note"><strong>Preview only.</strong> This form isn’t accepting requests yet. Nothing you enter will be sent.</p>
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
                      {["Not sure yet", "As soon as possible", "Within 1–3 months", "Within 3–6 months", "More than 6 months from now", "Just exploring options"].map((timing) => <option key={timing}>{timing}</option>)}
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
                <div className="intake-delivery-note" id={`${id}-delivery-note`}><strong>Online requests are coming soon.</strong><p>Email delivery isn’t connected yet, so this request can’t be sent. To discuss a project now, call <a href="tel:9019477225">901-947-7225</a>.</p></div>
              </section>}
              <p className="intake-session-note">Your answers stay in this form while this page is open. Refreshing or leaving the page clears them.</p>
            </div>
            <div className="intake-bottom">
              {step > 0 ? <button className="intake-back" type="button" onClick={() => goTo(step - 1)}>← Back</button> : <span className="intake-step-count">Step 1 of 3</span>}
              {step < 2 ? <button className="button button-primary" type="submit">{step === 0 ? "Continue" : "Review request"} <span aria-hidden="true">→</span></button> : <button className="button button-primary" type="button" disabled aria-describedby={`${id}-delivery-note`}>Send project request <span aria-hidden="true">↗</span></button>}
            </div>
          </form>
        </dialog>, document.body
      )}
    </>
  );
}
