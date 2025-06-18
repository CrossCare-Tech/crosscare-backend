import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs';  // For password hashing
import jwt from 'jsonwebtoken';  // For generating access tokens
import sgMail from '@sendgrid/mail';
import cryptoRandomString from 'crypto-random-string';

const prisma = new PrismaClient();

// Set your SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Login function, where users can log in with either email or username
const login = async (req, res) => {
    try {
        const { email, name, password, doctorId } = req.body;
        console.log("Hi");

        // Check if the username or email exists in the database
        const user = await prisma.patient.findFirst({
            where: {
                OR: [
                    { email: email },
                    { name: name },
                ],
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
            return res.status(403).json({ 
                message: "Please verify your email before logging in",
                requiresVerification: true,
                email: user.email
            });
        }

        // Use bcrypt to compare the hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // If doctorId is provided, check if the user is a doctor
        if (doctorId && user.doctorId !== doctorId) {
            return res.status(403).json({ message: "Invalid doctor credentials" });
        }

        // Generate an access token (JWT)
        const accessToken = jwt.sign(
            { userId: user.id, email: user.email, name: user.name, doctorId: user.doctorId },  // Payload with userId, email, username, and doctorId (if available)
            process.env.JWT_SECRET,  // Secret key (ensure it's defined in .env)
            { expiresIn: '23h' }  // Expiration time (1 hour)
        );

        // Respond with the access token and user details
        res.status(200).json({
            message: "Login successful",
            accessToken,
            userId: user.id,
            patientId: user.id,
            email: user.email,
            name: user.name,
            profilePicture: user.profileImage,
            doctorId: user.doctorId,
        });
    } catch (error) {
        console.error("Login Error", error);  // Log the error to help debugging
        res.status(500).json({ message: "Internal Server Error", details: error.message });
    }
};

// Signup function - now sends OTP for email verification
const signup = async (req, res) => {
    try {
        const { firstName, lastName, dateOfBirth, email, password, name, phoneNumber } = req.body;

        // Support both new format (firstName, lastName, dateOfBirth) and old format (name)
        let fullName = name;
        let age = null;

        if (firstName && lastName) {
            fullName = `${firstName.trim()} ${lastName.trim()}`;
        }

        if (dateOfBirth) {
            const birthDate = new Date(dateOfBirth);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age = age - 1;
            }
        }

        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        // Check if the email already exists in the database
        const existingUser = await prisma.patient.findFirst({
            where: { email }
        });

        if (existingUser && existingUser.isEmailVerified) {
            return res.status(400).json({ message: "Email is already registered and verified" });
        }

        // Generate a 6-digit OTP
        const otp = cryptoRandomString({ length: 6, type: 'numeric' });
        
        // Set token expiry to 15 minutes from now
        const expiryTime = new Date(Date.now() + 15 * 60 * 1000);

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // If user exists but not verified, update their details
        if (existingUser && !existingUser.isEmailVerified) {
            await prisma.patient.update({
                where: { id: existingUser.id },
                data: {
                    name: fullName,
                    password: hashedPassword,
                    phoneNumber: phoneNumber || null,
                    age: age,
                    emailVerificationToken: otp,
                    emailTokenExpires: expiryTime
                }
            });
        } else {
            // Create new unverified user
            await prisma.patient.create({
                data: {
                    name: fullName,
                    email,
                    password: hashedPassword,
                    phoneNumber: phoneNumber || null,
                    age: age,
                    isEmailVerified: false,
                    emailVerificationToken: otp,
                    emailTokenExpires: expiryTime
                }
            });
        }

        // Send verification email with OTP
        const message = {
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: 'Crosscare - Verify Your Email',
            text: `Welcome to Crosscare! Your email verification code is: ${otp}. This code is valid for 15 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #E05FA0;">Welcome to Crosscare!</h2>
                    <p>Thank you for signing up. Please verify your email address to complete your registration.</p>
                    <p>Your verification code is: <strong style="font-size: 18px; color: #E05FA0;">${otp}</strong></p>
                    <p>This code is valid for 15 minutes.</p>
                    <p>If you didn't create this account, please ignore this email.</p>
                </div>
            `
        };

        await sgMail.send(message);

        res.status(200).json({ 
            message: "Verification code sent to your email. Please verify to complete registration.",
            email
        });
    } catch (error) {
        console.error("Signup Error", error);
        res.status(500).json({ message: "Internal Server Error", details: error.message });
    }
};

// Verify OTP and complete registration
const verifyEmailAndCompleteSignup = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        // Find user with the email
        const user = await prisma.patient.findFirst({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ message: "Email is already verified" });
        }

        // Check if OTP exists and is not expired
        if (!user.emailVerificationToken || !user.emailTokenExpires || user.emailTokenExpires < new Date()) {
            return res.status(400).json({ message: "OTP is invalid or expired" });
        }

        // Verify OTP
        if (user.emailVerificationToken !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // Update user as verified and clear verification fields
        const verifiedUser = await prisma.patient.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                emailVerificationToken: null,
                emailTokenExpires: null
            }
        });

        res.status(200).json({ 
            message: "Email verified successfully! You can now login.",
            patientId: verifiedUser.id,
            name: verifiedUser.name,
            email: verifiedUser.email
        });
    } catch (error) {
        console.error("Email Verification Error", error);
        res.status(500).json({ message: "Internal Server Error", details: error.message });
    }
};

// Resend verification OTP
const resendVerificationOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Find user with the email
        const user = await prisma.patient.findFirst({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ message: "Email is already verified" });
        }

        // Generate a new 6-digit OTP
        const otp = cryptoRandomString({ length: 6, type: 'numeric' });
        
        // Set token expiry to 15 minutes from now
        const expiryTime = new Date(Date.now() + 15 * 60 * 1000);

        // Update user with new OTP
        await prisma.patient.update({
            where: { id: user.id },
            data: {
                emailVerificationToken: otp,
                emailTokenExpires: expiryTime
            }
        });

        // Send verification email with new OTP
        const message = {
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: 'Crosscare - New Verification Code',
            text: `Your new email verification code is: ${otp}. This code is valid for 15 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #E05FA0;">Crosscare - New Verification Code</h2>
                    <p>Here's your new verification code:</p>
                    <p>Your verification code is: <strong style="font-size: 18px; color: #E05FA0;">${otp}</strong></p>
                    <p>This code is valid for 15 minutes.</p>
                </div>
            `
        };

        await sgMail.send(message);

        res.status(200).json({ 
            message: "New verification code sent to your email",
            email
        });
    } catch (error) {
        console.error("Resend OTP Error", error);
        res.status(500).json({ message: "Internal Server Error", details: error.message });
    }
};

export default { login, signup, verifyEmailAndCompleteSignup, resendVerificationOTP };
