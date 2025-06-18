import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken';  // JWT library to verify token
import { createClient } from '@supabase/supabase-js';
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
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                age: true,
                week: true,
                day: true,
                profileImage: true,
                avatarUrl: true,
                createdAt: true,
                updatedAt: true,
                activities: true,
                questionnaires: true,
                questionResponses: true,
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

// TODO: Replace with your actual Supabase credentials
const supabaseUrl = 'https://sfpyewutvgmsmlywgcor.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmcHlld3V0dmdtc21seXdnY29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNjA4MzksImV4cCI6MjA2NTYzNjgzOX0.Zi_hX4b1imMCc6B9ErW9HjmGztJ1XCDga_NY_BskO6U';
const supabase = createClient(supabaseUrl, supabaseKey);

// Storage bucket name
const STORAGE_BUCKET = 'crosscare';

// avatarController.js - Updated multer configuration
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
}).single('imageUrl'); 

export const upload1 = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
}).single('avatarUrl'); 

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
            .from(STORAGE_BUCKET)
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                cacheControl: '3600',
                upsert: true
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
            .from(STORAGE_BUCKET)
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

const updatePregnancyWeek = async (req, res) => {
  try {
    // Extract patient ID from the request parameters
    const { id } = req.params;
    
    // Extract the pregnancy week and day from the request body
    const { week, day } = req.body;
    
    // Validate that at least one field is provided
    if (week === undefined && day === undefined) {
      return res.status(400).json({
        success: false,
        message: "At least one of pregnancy week or day is required"
      });
    }
    
    // Prepare update data object
    const updateData = {};
    
    // Validate and add week if provided
    if (week !== undefined && week !== null) {
      const weekNumber = parseInt(week);
      if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 42) {
        return res.status(400).json({
          success: false,
          message: "Pregnancy week must be a number between 1 and 42"
        });
      }
      updateData.week = weekNumber;
    }
    
    // Validate and add day if provided
    if (day !== undefined && day !== null) {
      const dayNumber = parseInt(day);
      console.log('Day validation:', { day, dayNumber, isNaN: isNaN(dayNumber) });
      if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 7) {
        return res.status(400).json({
          success: false,
          message: "Day must be a number between 1 and 7"
        });
      }
      updateData.day = dayNumber;
    }
    
    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }
    
    // Update the patient's pregnancy week and/or day
    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: updateData
    });
    
    // Return the updated patient data
    return res.status(200).json({
      success: true,
      message: "Pregnancy information updated successfully",
      data: {
        id: updatedPatient.id,
        name: updatedPatient.name,
        week: updatedPatient.week,
        day: updatedPatient.day
      }
    });
    
  } catch (error) {
    console.error("Error updating pregnancy information:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update pregnancy information",
      error: error.message
    });
  }
};

const getPregnancyWeek = async (req, res) => {
  try {
    // Extract patient ID from the request parameters
    const { id } = req.params;
    
    // Check if patient exists and get their data
    const patient = await prisma.patient.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        week: true,
        day: true
      }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }
    
    // Return the patient's pregnancy week and day
    return res.status(200).json({
      success: true,
      data: {
        id: patient.id,
        name: patient.name,
        week: patient.week || null,
        day: patient.day || null
      }
    });
    
  } catch (error) {
    console.error("Error getting pregnancy information:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get pregnancy information",
      error: error.message
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    // Extract patient ID from the request parameters
    const { id } = req.params;
    
    // Extract profile data from the request body
    const { name, email, phoneNumber, age, week } = req.body;
    
    // Create an update object with only the fields that were provided
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (age !== undefined) updateData.age = parseInt(age);
    if (week !== undefined) {
      const weekNumber = parseInt(week);
      // Validate week is in appropriate range for pregnancy
      if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 42) {
        return res.status(400).json({
          success: false,
          message: "Pregnancy week must be a number between 1 and 42"
        });
      }
      updateData.week = weekNumber;
    }
    
    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update"
      });
    }
    
    // If email is being updated, check if it already exists for another user
    if (email) {
      const existingUser = await prisma.patient.findUnique({
        where: { email }
      });
      
      if (existingUser && existingUser.id !== id) {
        return res.status(409).json({
          success: false,
          message: "Email already in use by another account"
        });
      }
    }
    
    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }
    
    // Update the patient's profile
    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        age: true,
        week: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Return the updated patient data
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedPatient
    });
    
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message
    });
  }
};

const uploadAvatar = async (req, res) => {
  try {
    // Get token from authorization header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required"
      });
    }

    try {
      // Verify the token and extract userId
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

      if (!decoded || !decoded.userId) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token"
        });
      }

      // Get userId from the decoded token
      const userId = decoded.userId;

      // First check if patient exists
      const patient = await prisma.patient.findUnique({
        where: { id: userId }
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Check if file exists
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Generate a unique file name
      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `avatar-${userId}-${uuidv4()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase
        .storage
        .from(STORAGE_BUCKET)
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload avatar to storage',
          error: error.message
        });
      }

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      // Update the patient record with the new avatar URL
      const updatedPatient = await prisma.patient.update({
        where: { id: userId },
        data: { avatarUrl }
      });

      res.status(200).json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatarUrl,
        }
      });
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: jwtError.message
      });
    }
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process avatar upload',
      error: error.message
    });
  }
};

export default {getProfileDetails, uploadProfileImage, upload, updatePregnancyWeek, getPregnancyWeek, updateProfile, uploadAvatar, upload1};