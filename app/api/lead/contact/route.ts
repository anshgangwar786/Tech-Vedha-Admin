import type { NextRequest } from "next/server";
import { handleEnquiry } from "@/app/lib/server/enquiryLead";

// POST /api/lead/contact — Tech Vedha website enquiry (see app/lib/server/enquiryLead.ts).
export const POST = (req: NextRequest) => handleEnquiry(req, "contact");
