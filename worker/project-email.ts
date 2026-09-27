import { projectNeeds, type ProjectRequest } from "../lib/project-request";

export const PROJECT_SENDER = "projects@memphismaterialhandling.com";
export const PROJECT_RECIPIENTS = ["russell@memphismaterialhandling.com", "duane@memphismaterialhandling.com"];

function html(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function projectEmail(data: ProjectRequest, reference: string) {
  const needs = projectNeeds.filter(need => data.needs.includes(need.value));
  const subject = `New project request — ${data.company || data.name}`;
  const row = (label: string, value: string) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e1e6e1;vertical-align:top;width:120px;color:#68766c;font-size:13px;">${label}</td><td style="padding:10px 0;border-bottom:1px solid #e1e6e1;color:#23483b;font-size:15px;overflow-wrap:anywhere;">${html(value || "Not provided")}</td></tr>`;
  const content = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f3ef;font-family:Arial,Helvetica,sans-serif;color:#23483b;">
<div style="display:none;max-height:0;overflow:hidden;">${html(data.name)}${data.company ? ` · ${html(data.company)}` : ""} has a project to discuss.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f3ef;"><tr><td align="center" style="padding:28px 12px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #d7dfd8;">
<tr><td style="padding:27px 30px;background:#23483b;border-top:4px solid #b76d45;"><p style="margin:0 0 12px;color:#edb38e;font-size:12px;letter-spacing:1.5px;">MEMPHIS MATERIAL HANDLING</p><h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.2;font-weight:600;">A new project to talk about.</h1></td></tr>
<tr><td style="padding:28px 30px 12px;"><p style="margin:0;font-size:16px;line-height:1.6;"><strong>${html(data.name)}</strong>${data.company ? ` from <strong>${html(data.company)}</strong>` : ""} submitted a request through Plan a project.</p><h2 style="margin:28px 0 12px;font-size:18px;">What they need</h2><ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.8;">${needs.map(need => `<li>${html(need.title)}</li>`).join("")}</ul>
<div style="margin-top:20px;padding:18px 20px;background:#f2f5ef;border-left:3px solid #b76d45;font-size:15px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere;">${html(data.description || "No additional project details provided.")}</div>
<h2 style="margin:28px 0 8px;font-size:18px;">Contact &amp; project details</h2><table role="presentation" cellspacing="0" cellpadding="0" width="100%">${row("Name", data.name)}${row("Company", data.company)}${row("Email", data.email)}${row("Phone", data.phone)}${row("Location", data.location)}${row("Timing", data.timing)}</table>
<p style="margin:22px 0 16px;font-size:14px;line-height:1.6;color:#53665b;">${data.email ? "Use Reply to respond directly to the customer." : "This customer provided a phone number only. Please contact them by phone."} This request was sent to both Russell and Duane.</p></td></tr>
<tr><td style="padding:18px 30px;background:#f6f7f4;border-top:1px solid #dfe5dd;font-size:11px;line-height:1.6;color:#68766c;">Website project request · ${html(reference)}<br>Memphis Material Handling · 901-947-7225</td></tr>
</table></td></tr></table></body></html>`;
  return {
    message: {
      subject,
      body: { contentType: "HTML", content },
      toRecipients: PROJECT_RECIPIENTS.map(address => ({ emailAddress: { address } })),
      ...(data.email ? { replyTo: [{ emailAddress: { address: data.email, name: data.name } }] } : {}),
      internetMessageHeaders: [{ name: "x-mmh-project-reference", value: reference }],
    },
    saveToSentItems: true,
  };
}
