export const projectNeeds = [
  { value: "storage", title: "I need more storage", detail: "Make room for more products or organize the space I have." },
  { value: "location", title: "I’m setting up or moving", detail: "Plan a new space, expand, or move to another location." },
  { value: "flow", title: "I need to move products more easily", detail: "Improve loading, unloading, or moving items through my space." },
  { value: "equipment", title: "I’m looking for equipment", detail: "Find new or used racks, shelving, conveyors, or other equipment." },
  { value: "installation", title: "I need equipment installed or moved", detail: "Get help putting equipment in place or rearranging what I have." },
  { value: "clearout", title: "I have equipment to sell or clear out", detail: "Discuss surplus equipment or clearing a facility." },
  { value: "unsure", title: "I’m not sure what I need yet", detail: "I’d like help figuring out where to start." },
] as const;

export const projectTimings = ["Not sure yet", "As soon as possible", "Within 1–3 months", "Within 3–6 months", "More than 6 months from now", "Just exploring options"] as const;
export type Need = typeof projectNeeds[number]["value"];
export type Details = { description: string; location: string; timing: string; name: string; company: string; email: string; phone: string };
export type ProjectRequest = Details & { needs: Need[] };
export type RequestErrors = Partial<Record<"needs" | keyof Details, string>>;

export function validateProjectRequest(value: unknown): { data?: ProjectRequest; errors: RequestErrors } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { errors: { name: "Please check your request." } };
  const input = value as Record<string, unknown>;
  const errors: RequestErrors = {};
  const limits = { description: 3000, location: 180, timing: 80, name: 120, company: 180, email: 254, phone: 40 };
  const details = {} as Details;
  for (const [key, limit] of Object.entries(limits)) {
    const field = key as keyof Details;
    const raw = input[field];
    if (typeof raw !== "string" || raw.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(raw) || (field !== "description" && /[\r\n]/.test(raw))) {
      errors[field] = "Please check this field and keep it within the displayed limit.";
      details[field] = "";
    } else details[field] = raw.trim();
  }
  const needs = input.needs;
  if (!Array.isArray(needs) || needs.length < 1 || needs.length > projectNeeds.length || needs.some(need => !projectNeeds.some(choice => choice.value === need)) || new Set(needs).size !== needs.length || (needs.includes("unsure") && needs.length > 1)) errors.needs = "Choose at least one project option.";
  if (!details.name) errors.name = "Please enter your name.";
  if (!details.email && !details.phone) errors.email = "Add an email address or phone number so we can reach you.";
  if (details.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(details.email)) errors.email = "Please enter a valid email address.";
  if (details.phone && (!/^[+\d\s().#x-]+$/i.test(details.phone) || details.phone.replace(/\D/g, "").length < 7)) errors.phone = "Please enter a phone number, including the area code.";
  if (!projectTimings.some(timing => timing === details.timing)) errors.timing = "Please choose a timing option.";
  return Object.keys(errors).length ? { errors } : { errors, data: { ...details, needs: needs as Need[] } };
}
