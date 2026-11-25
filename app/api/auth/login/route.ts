import prisma from "@/app/lib/config/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { isCrossSiteWrite } from "@/app/lib/utils/csrf";
import { issueSession } from "@/app/lib/utils/session";
import { requestIp } from "@/app/lib/utils/leadThrottle";
import {
  beginLoginAttempt,
  loginIdentifier,
  loginSucceeded,
  releaseLoginAttempt,
  type LoginAttempt,
} from "@/app/lib/utils/loginThrottle";

// Compared against when the account doesn't exist, so an unknown email or
// username takes as long to reject as a wrong password (no timing oracle).
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hash(randomBytes(16).toString("hex"), 10));

export async function POST(req: NextRequest) {
  // Another site must not be able to sign a visitor in (login CSRF).
  if (isCrossSiteWrite(req)) {
    return NextResponse.json({ message: "Cross-site request blocked." }, { status: 403 });
  }
  let attempt: LoginAttempt | null = null;
  try {
    const { email, username, password } = await req.json();

    // A non-string password would make bcrypt throw (500) for existing
    // accounts only, so it is rejected here like a missing one.
    if (!password || typeof password !== "string" || (!email && !username)) {
      return NextResponse.json(
        {
          message:
            "Please provide either email or username along with password",
        },
        { status: 400 }
      );
    }

    // Brute-force limit (per identifier and per IP, per server instance — see
    // loginThrottle.ts). Checked before any DB/password work, and identical
    // for existing and unknown accounts.
    const started = beginLoginAttempt(loginIdentifier(email, username), requestIp(req));
    if ("retryAfter" in started) {
      return NextResponse.json(
        { message: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(started.retryAfter) } }
      );
    }
    attempt = started;

    // Fetch WITH password (needed for bcrypt comparison); never returned to client
    // Emails are stored lowercased (signup/users routes) — match that here.
    const user = await prisma.user.findUnique({
      where: email ? { email: String(email).toLowerCase().trim() } : { username },
    });

    // Same response for unknown account and wrong password, so the login form
    // can't be used to discover which emails/usernames exist.
    const isMatch = await bcrypt.compare(password, user ? user.password : await getDummyHash());
    if (!user || !isMatch) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    loginSucceeded(attempt);

    const response = NextResponse.json({
      message: "Login successfull",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });

    // Short-lived, sliding session: kept alive by /api/auth/refresh while the
    // admin is active (components/common/SessionTimeout.tsx).
    issueSession(response, user, Date.now());

    return response;


  } catch (error) {
    if (attempt) releaseLoginAttempt(attempt);
    console.log("Error message", error)
    return NextResponse.json(
        { message: " Internal Server Error-Login Api failed"},
        { status: 500 }
    )
  }
}
