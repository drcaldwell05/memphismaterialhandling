import type { ProjectRequest } from "../lib/project-request";

// A fixed, synthetic acceptance test; never accept a visitor-supplied recipient.
export const RUSSELL_TEST: ProjectRequest = {
  needs: ["storage"],
  name: "MMH Website Test",
  company: "TEST — no action needed",
  email: "operations@memphismaterialhandling.com",
  phone: "",
  description: "This is a setup test of the new Plan a project form requested by Dylan. No customer follow-up is needed. It checks delivery to Russell and the email layout.",
  location: "Memphis, TN",
  timing: "Not sure yet",
};

export function isRussellTest(data: ProjectRequest) {
  return Object.entries(RUSSELL_TEST).every(([key, value]) =>
    JSON.stringify(data[key as keyof ProjectRequest]) === JSON.stringify(value));
}
