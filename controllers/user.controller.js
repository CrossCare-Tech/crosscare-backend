import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken';  // JWT library to verify token
import { createClient } from '@supabase/supabase-js';
// import AWS from "aws-sdk";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

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

const supabaseUrl = 'https://tskzddfyjazcirdvloch.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRza3pkZGZ5amF6Y2lyZHZsb2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1MDc0NDYsImV4cCI6MjA1NjA4MzQ0Nn0.g4zXLk_GWg0VgvYEpye_bLshsMTpvaZHXXe3xP1cLCg';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure multer for memory storage
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
}).single('imageUrl'); 

const uploadProfileImage = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; // Get token from Authorization header

    if (!token) {
        return res.status(401).json({ message: "Authorization token required" });
    }

    try {
        // Verify the token and extract userId from the payload
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        // Get userId from the decoded token
        const { userId } = decoded;

        // Find the user with the given userId
        const user = await prisma.patient.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if file exists in the request
        if (!req.file) {
            return res.status(400).json({ message: "No image file provided" });
        }

        // Generate a unique filename
        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `${userId}_${uuidv4()}.${fileExt}`;
        const filePath = `profile-images/${fileName}`;

        // Upload the file to Supabase Storage
        const { data, error } = await supabase
            .storage
            .from('cross-care')
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                cacheControl: '3600'
            });

        if (error) {
            console.error("Supabase storage error:", error);
            return res.status(500).json({ 
                message: "Failed to upload image", 
                details: error.message 
            });
        }

        // Get the public URL for the uploaded file
        const { data: urlData } = supabase
            .storage
            .from('cross-care')
            .getPublicUrl(filePath);

        const imageUrl = urlData.publicUrl;

        // Update user profile with image URL
        await prisma.patient.update({
            where: { id: userId },
            data: { profileImage: imageUrl }
        });

        res.status(200).json({ 
            message: "Profile image uploaded successfully",
            imageUrl 
        });
    } catch (error) {
        console.error("Error uploading profile image:", error);
        res.status(500).json({ 
            message: "Internal Server Error", 
            details: error.message 
        });
    }
};

export default {getProfileDetails, uploadProfileImage, upload};