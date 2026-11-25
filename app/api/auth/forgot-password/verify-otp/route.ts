import prisma from "@/app/lib/config/db";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { errorFields } from "@/app/lib/utils/errorFields";
import { hashOtp, reserveOtpAttempt, resetOtpAttempts } from "@/app/lib/utils/otpGuard";

// Brute-force guard (app/lib/utils/otpGuard.ts): each guess is counted BEFORE
// it is checked, so parallel requests can't test more than MAX_OTP_ATTEMPTS
// codes. When the limit is reached every pending code for the email is burned
// and the user must request a new one.

export async function POST(req: NextRequest) {
    try {
        const { email, otp } = await req.json();

        // Validation
        if (!email || !otp) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Email and OTP are required",
                },
                { status: 400 }
            );
        }

        // OTP format validation (must be 6 digits)
        if (typeof email !== "string" || !/^\d{6}$/.test(String(otp))) {
            return NextResponse.json(
                {
                    success: false,
                    message: "OTP must be 6 digits",
                },
                { status: 400 }
            );
        }


        const key = email.toLowerCase();

        // Reserve this guess before any await (see otpGuard.ts).
        const attempt = reserveOtpAttempt(key);
        const tooMany = () => NextResponse.json(
            {
                success: false,
                message: "Too many incorrect attempts. Please request a new OTP.",
            },
            { status: 429 }
        );
        if (!attempt.allowed) {
            await prisma.otp.deleteMany({ where: { email: key, verified: false } });
            return tooMany();
        }

        // find valid otp (stored as an HMAC, never in plain text)
        const otpRecord = await prisma.otp.findFirst({
            where: {
                email: key,
                otp: hashOtp(key, String(otp)),
                verified: false,
                expiresAt: { gt: new Date() },
            },
        })

        if (!otpRecord) {
            if (attempt.last) {
                await prisma.otp.deleteMany({ where: { email: key, verified: false } });
                return tooMany();
            }
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid or expired OTP",
                },
                { status: 400 }
            );
        }

        // Mark OTP as verified and extend its expiry to match the reset token,
        // so reset-password gets the full 15 minutes instead of whatever was
        // left of the original 10-minute OTP window. Only an unverified code
        // can be claimed, so two parallel correct requests can't both use it.
        const RESET_WINDOW_MINUTES = 15;
        const claimed = await prisma.otp.updateMany({
            where: { id: otpRecord.id, verified: false },
            data: {
                verified: true,
                expiresAt: new Date(Date.now() + RESET_WINDOW_MINUTES * 60 * 1000),
            },
        });
        if (claimed.count === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid or expired OTP",
                },
                { status: 400 }
            );
        }
        resetOtpAttempts(key);

        // Generate reset token (valid for 15 minutes)
        const resetToken = jwt.sign({
            email: email.toLowerCase(),
            otpId: otpRecord.id,
            type: "password_reset",
        },
            process.env.JWT_SECRET!,
            { expiresIn: "15m", audience: "password-reset", algorithm: "HS256" }
        )

        // Set reset token in HTTP-only cookie
        const response = NextResponse.json({
            success: true,
            message: "OTP verified successfully",
        });

        response.cookies.set("resetToken", resetToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 15, // 15 minutes
            path: "/",
        });


        return response;

    } catch (error) {
        console.error("Verify OTP error:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
                error: process.env.NODE_ENV === "development" ? errorFields(error).message : undefined,
            },
            { status: 500 }
        );
    }
}
