import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const createActivity = async (req, res) => {
    const { id } = req.params;  // User ID
    const { date, weight, weight_unit, water, steps, heart_rate, notetaking, wombPicture, sleepStart, sleepEnd } = req.body;
    
    // Use current date and time for 'date' if not provided
    const currentDate = date || new Date();  // Use provided date or current date if not given

    // Validate wombPicture to ensure it is a valid URL (basic validation)
    const urlPattern = /^https?:\/\/[^\s$.?#].[^\s]*$/i; // Regex pattern to check for https:// URLs
    if (wombPicture && !urlPattern.test(wombPicture)) {
        return res.status(400).json({ message: "Invalid URL format for wombPicture" });
    }

    try {
        const newActivity = await prisma.patientActivity.create({
            data: {
                userId: parseInt(id),  // Ensure 'id' is correctly parsed as an integer
                date: currentDate,  // Use the current date or the provided one
                weight,
                weight_unit,
                water,
                steps,
                heart_rate,
                notetaking,
                wombPicture,
                sleepStart,  // Set the sleep start to current if not provided
                sleepEnd,  // Set the sleep end to current if not provided
            }
        });

        res.status(201).json(newActivity);
    } catch (error) {
        console.error("Error creating activity:", error);
        res.status(500).json({ message: "Internal Server Error", details: error.message });
    }
};

export const getUserActivities = async (req, res) => {
    const { id } = req.params;  // User ID
    
    try {
        const activities = await prisma.patientActivity.findMany({
            where: {
                patientId: parseInt(id)
            },
        });

        res.status(200).json(activities);
    } catch (error) {
        console.error("Error fetching activities:", error);
        res.status(500).json({ message: "Internal Server Error", details: error.message });
    }
};

const addMeals = async (req, res) => {
    const { activityId } = req.params;
    const { name } = req.body;

    try {
        const meal = await prisma.meals.create({
            data: {
                patientActivityId: parseInt(activityId),
                name,
            }
        });

        res.status(201).json(meal);
    } catch (error) {
        console.error("Error adding meal:", error);
        res.status(500).json({ message: "Internal Server Error", details: error.message });
    }
};

export const updateActivity = async (req, res) => {
    const { activityId } = req.params;
    const { date, weight, weight_unit, water, steps, heart_rate, notetaking, wombPicture } = req.body;

    try {
        const updatedActivity = await prisma.patientActivity.update({
            where: {
                id: parseInt(activityId)
            },
            data: {
                date,
                weight,
                weight_unit,
                water,
                steps,
                heart_rate,
                notetaking,
                wombPicture,
            }
        });

        res.status(200).json(updatedActivity);
    } catch (error) {
        console.error("Error updating activity:", error);
        res.status(500).json({ message: "Internal Server Error", details: error.message });
    }
};

const updateMeal = async (req, res) => {
    const { activityId, mealId } = req.params;  // Get the activityId and mealId from the request parameters
    const { name } = req.body;  // Get the meal details from the request body
    
    try {
        // Find and update the meal with the provided mealId and activityId
        const updatedMeal = await prisma.meals.update({
            where: {
                    mealId: parseInt(mealId),  // Make sure mealId is passed correctly
                    patientActivityId: parseInt(activityId),  // Ensure activityId is passed correctly
            },
            data: {
                name,  // Update the meal name
            },
        });

        res.status(200).json(updatedMeal);  // Send back the updated meal
    } catch (error) {
        console.error("Error updating meal:", error);
        res.status(500).json({ message: "Internal Server Error", details: error.message });
    }
};

const getAllMeals = async (req, res) => {
    const { activityId } = req.params;  // Get the activityId from request parameters

    try {
        // Find all meals related to the specified activity
        const meals = await prisma.meals.findMany({
            where: {
                patientActivityId: parseInt(activityId),  // Filter meals by the activityId
            },
        });

        // Check if meals exist for the given activity
        if (meals.length === 0) {
            return res.status(404).json({ message: "No meals found for this activity" });
        }

        // Return the meals for the activity
        res.status(200).json(meals);
    } catch (error) {
        console.error("Error fetching meals:", error);
        res.status(500).json({ message: "Internal Server Error", details: error.message });
    }
};





export default {createActivity, addMeals, getUserActivities, updateActivity, updateMeal, getAllMeals};
