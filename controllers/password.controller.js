import { PrismaClient } from "@prisma/client";
import sgMail from '@sendgrid/mail';
import { v4 as uuid } from 'uuid';
import cryptoRandomString from 'crypto-random-string';

const prisma = new PrismaClient();

// Set your SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Request password reset and send OTP
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        console.log("this is the email", email);

        // Check if the user exists
        const user = await prisma.patient.findFirst({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate a 6-digit OTP
        const otp = cryptoRandomString({ length: 6, type: 'numeric' });
        
        // Set token expiry to 15 minutes from now
        const expiryTime = new Date(Date.now() + 15 * 60 * 1000);

        // Save OTP and expiry to database
        await prisma.patient.update({
            where: { id: user.id },
            data: {
                resetToken: otp,
                resetTokenExpires: expiryTime
            }
        });

        // Send email with OTP
        const message = {
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL, // Use verified sender
            subject: 'Crosscare Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}. This OTP is valid for 15 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #E05FA0;">Crosscare Password Reset</h2>
                    <p>You requested a password reset for your Crosscare account.</p>
                    <p>Your OTP for password reset is: <strong style="font-size: 18px;">${otp}</strong></p>
                    <p>This OTP is valid for 15 minutes.</p>
                    <p>If you didn't request this password reset, please ignore this email or contact support.</p>
                </div>
            `
        };

        await sgMail.send(message);

        res.status(200).json({ 
            message: "Password reset OTP sent to your email",
            email
        });
    } catch (error) {
        console.error("Password Reset Error:", error);
        res.status(500).json({ message: "Internal server error", details: error.message });
    }
};

// Verify OTP and reset password
const verifyOtpAndResetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        // Find user with the email
        const user = await prisma.patient.findFirst({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if OTP exists and is not expired
        if (!user.resetToken || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
            return res.status(400).json({ message: "OTP is invalid or expired" });
        }

        // Verify OTP
        if (user.resetToken !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // Hash the new password
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user's password and clear reset token fields
        await prisma.patient.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpires: null
            }
        });

        res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ message: "Internal server error", details: error.message });
    }
};

export default { requestPasswordReset, verifyOtpAndResetPassword };