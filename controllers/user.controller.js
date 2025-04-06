import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken';  // JWT library to verify token

const prisma = new PrismaClient();

const getProfileDetails = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; // Get token from Authorization header

    if (!token) {
        return res.status(401).json({ message: "Authorization token required" });
    }

    try {
        // Verify the token and extract userId from the payload
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });  // Match the algorithm

        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        // Get userId from the decoded token
        const { userId } = decoded;

        // Find the user with the given userId
        const user = await prisma.patient.findUnique({
            where: {
                id: userId,  // Use the userId from the decoded token
            },
            include:{
                activities: true,  // Include activities related to the user
                questionnaires: true,  // Include questionnaires related to the user
                questionResponses: true,  // Include question responses related to the user
            }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Return the user profile details
        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching profile details", error);
        res.status(500).json({ message: "Internal Server Error", details: error.message });
    }
};

export default getProfileDetails;