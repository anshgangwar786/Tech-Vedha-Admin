// Tech Vedha website enquiries → one row in `leads` + an email to the admin.
//
// Used by POST /api/lead/homepage (homepage "Let's talk" form) and POST /api/lead/contact
// (Contact page "Start a project" form). Both are called server-to-server by the
// Tech-Vedha-frontend Server Action (app/actions/enquiry.ts) with the form as
// multipart/form-data, proven by the shared REVALIDATE_SECRET.
//
// Name, email and phone go in their columns; everything else in `formData` as
// {"Label": value} pairs, which the Leads dashboard shows as-is.

import { NextRequest, NextResponse, after } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/app/lib/config/db";
import { sendLeadNotification } from "@/app/lib/config/email";
import { hasSharedSecret, identityOverLimit, ipOverLimit, requestIp } from "@/app/lib/utils/leadThrottle";
import { normalizeIndianMobile, validateEmail, validateIndianMobile, validatePersonName } from "@/utils/leadForm";

export type EnquiryKind = "homepage" | "contact";

export const ENQUIRY_LEAD_SOURCES: Record<EnquiryKind, string> = {
  homepage: "Homepage — Let's talk",
  contact: "Contact page — Start a project",
};

/** Header the frontend uses to pass on the visitor's IP (requests without the secret are rejected first). */
const CLIENT_IP_HEADER = "x-site-client-ip";
/** Spam trap: hidden field that people never fill in. Must match HONEYPOT_FIELD in Tech-Vedha-frontend/components/ui/Honeypot.tsx. */
const HONEYPOT_FIELD = "tv_hp_ref";

export interface EnquiryReply {
  ok: boolean;
  message: string;
  /** Field name → message, when validation failed (same names as the website form's inputs). */
  fieldErrors?: Record<string, string>;
}

const reply = (body: EnquiryReply, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const text = (form: FormData, key: string, max: number) => {
  const raw = form.get(key);
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
};

/** Field name → message for every invalid field; empty when valid. Same rules as Tech-Vedha-frontend/lib/formValidation.ts. */
function validate(kind: EnquiryKind, v: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  const add = (field: string, error: string | null) => {
    if (error) errors[field] = error;
  };
  add("name", validatePersonName(v.name));
  add("phone", validateIndianMobile(v.phone));
  add("email", validateEmail(v.email));
  if (kind === "contact") {
    add("service", v.services ? null : "Please pick at least one service.");
    add("company", v.company.length >= 2 ? null : "Please enter your company.");
    add("city", v.city.length >= 2 ? null : "Please enter your city or country.");
    add("timeframe", v.timeframe ? null : "Please pick when you'd like to start.");
  }
  return errors;
}

export async function handleEnquiry(req: NextRequest, kind: EnquiryKind) {
  if (!hasSharedSecret(req)) {
    return reply({ ok: false, message: "Enquiries are only accepted from the website." }, 401);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return reply({ ok: false, message: "We couldn't read your enquiry. Please try again." }, 400);
  }

  // Bots fill every field; pretend success so they don't retry.
  if (text(form, HONEYPOT_FIELD, 200)) return reply({ ok: true, message: "Thanks — your enquiry is in." });

  const services = form
    .getAll("service")
    .map((entry) => (typeof entry === "string" ? entry.trim().slice(0, 100) : ""))
    .filter(Boolean)
    .slice(0, 10);
  const v = {
    name: text(form, "name", 100),
    phone: text(form, "phone", 20),
    email: text(form, "email", 191).toLowerCase(),
    services: services.join(", "),
    otherService: text(form, "otherService", 200),
    company: text(form, "company", 150),
    city: text(form, "city", 150),
    timeframe: text(form, "timeframe", 60),
    message: text(form, "message", 2000),
  };

  const fieldErrors = validate(kind, v);
  const firstError = Object.values(fieldErrors)[0];
  if (firstError) return reply({ ok: false, message: firstError, fieldErrors }, 400);
  // Saved the same way every time: "+91 98765 43210" typed in any format → "+91 9876543210".
  v.phone = normalizeIndianMobile(v.phone) ?? v.phone;

  const ip = req.headers.get(CLIENT_IP_HEADER)?.trim() || requestIp(req);
  if (ipOverLimit(ip) || (await identityOverLimit(v.email, v.phone).catch(() => false))) {
    return reply(
      {
        ok: false,
        message: "You've sent several enquiries in a short time. Please wait a few minutes, or WhatsApp us directly.",
      },
      429,
    );
  }

  const details: Record<string, string> = {
    [services.length > 1 ? "Services" : "Service"]: v.services,
    "Other need": v.otherService,
    Company: v.company,
    "City / country": v.city,
    Start: v.timeframe,
    Message: v.message,
  };
  const formData = Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== ""),
  ) satisfies Prisma.InputJsonObject;

  try {
    const lead = await prisma.lead.create({
      data: {
        name: v.name,
        email: v.email,
        phoneNo: v.phone,
        leadSource: ENQUIRY_LEAD_SOURCES[kind],
        formData,
        status: "new",
      },
    });

    // Email the admin after the response is sent: the visitor never waits on SMTP, and after() keeps
    // serverless hosts alive until the send finishes (sendLeadNotification never throws).
    after(() =>
      sendLeadNotification({
        name: lead.name,
        email: lead.email,
        phoneNo: lead.phoneNo,
        leadSource: lead.leadSource,
        formData,
        createdAt: lead.createdAt,
      }),
    );

    return reply({ ok: true, message: "Thanks — your enquiry is in. We'll reply with next steps." });
  } catch (err) {
    console.error(`[enquiry:${kind}] Failed to save lead:`, err);
    return reply({ ok: false, message: "We couldn't send your enquiry just now. Please try again." }, 500);
  }
}
