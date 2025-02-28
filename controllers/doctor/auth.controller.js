import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Temporary test data for login
        const testUser = {
            email: 'testdoctor@example.com',
            password: 'testpassword', // Use the plain password for testing
            name: 'Test Doctor',
            doctorId: 'testdoctor123',
        };

        // Check if the email matches the test user for testing purposes
        if (email === testUser.email && password === testUser.password) {
            // Simulate a user as if it's retrieved from the database
            const user = testUser;

            // Generate an access token (JWT)
            const accessToken = jwt.sign(
                { doctorId: user.doctorId, email: user.email, name: user.name},
                process.env.JWT_SECRET,
                { expiresIn: '23h' }
            );

            // Set the JWT in an HttpOnly cookie
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 3600000, // 1 hour
            });

            // Return the response with user details
            return res.status(200).json({
                message: "Logged in successfully",
                email: user.email,
                name: user.name,
                doctorId: user.doctorId,
                accessToken: accessToken,
            });
        }

        // Otherwise, check the database for the user (if test data is not used)
        const user = await prisma.doctor.findFirst({
            where: {
                email,
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if the user has a doctorId (indicating a doctor)
        if (!user.doctorId) {
            return res.status(403).json({ message: "Access denied. Only doctors can log in." });
        }

        // Use bcrypt to compare the hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate an access token (JWT)
        const accessToken = jwt.sign(
            { userId: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '23h' }
        );

        // Set the JWT in an HttpOnly cookie
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 3600000, // 1 hour
        });

        // Return the response with user details
        res.status(200).json({
            message: "Logged in successfully",
            email: user.email,
            name: user.name,
            doctorId: user.doctorId,
            accessToken: accessToken,
        });
    } catch (error) {
        console.error("Login Error", error);
        res.status(500).json({ message: "Internal Server Error", details: error.message });
    }
};


export default {login};