import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs';  // For password hashing
import jwt from 'jsonwebtoken';  // For generating access tokens

const prisma = new PrismaClient();

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

        // Set the JWT in an HttpOnly cookie
        res.cookie('accessToken', accessToken, {
            httpOnly: true,  // Prevent client-side JavaScript from accessing the cookie
            secure: process.env.NODE_ENV === 'production',  // Set to true if using HTTPS
            sameSite: 'Strict',  // Optional: for better security
            maxAge: 3600000,  // 1 hour
        });

        // Return the response with user details (excluding the token)
        res.status(200).json({
            message: "Logged in successfully",
            email: user.email,
            name: user.name,
            patientId: user.id,
            // doctorId: user.doctorId,  // Include doctorId if it's available
            accessToken: accessToken,
        });
    } catch (error) {
        console.error("Login Error", error);  // Log the error to help debugging
        res.status(500).json({ message: "Internal Server Error", details: error.message });
    }
};

// Signup function, where the user needs to provide a username, email, and password
const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if the email or username already exists in the database
        const existingUser = await prisma.patient.findFirst({
            where: {
                OR: [
                    { email },
                    { name },
                ],
            },
        });

        if (existingUser) {
            return res.status(400).json({ message: "Email or username is already taken" });
        }

        // Hash the password before saving it to the database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user in the database
        const newUser = await prisma.patient.create({
            data: {
                name,
                email,
                password: hashedPassword, // Store the hashed password
            },
        });

        // Respond with the newly created user
        res.status(201).json({
            message: "User created successfully",
            patientId: newUser.id,
            name: newUser.name,
            email: newUser.email,
        });
    } catch (error) {
        console.error("Signup Error", error);  // Log the error to help debugging
        res.status(500).json({ message: "Internal Server Error", details: error.message });
    }
};

export default { login, signup };
