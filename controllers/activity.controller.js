import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// import AWS from "aws-sdk";
// import multer from "multer";
// import { v4 as uuidv4 } from "uuid";
// Fetch user activities
const getUserActivities = async (req, res) => {
  const { id } = req.params;
  
  try {
      const activities = await prisma.patientActivity.findMany({
          where: { patientId: String(id) },
          orderBy: { date: "asc" }
      });

      const mergedActivities = activities.reduce((acc, activity) => {
          const date = activity.date.toISOString().split("T")[0];

          if (!acc[date]) {
              acc[date] = {
                  date,
                  details: {
                      water: 0,
                      waterGoal: activity.waterGoal || 0, // ✅ Include goal
                      heart: 0,
                      sleep: { start: null, end: null },
                      steps: 0,
                      stepsGoal: activity.stepsGoal || 0, // ✅ Include goal
                      weight: { value: 0, unit: "kg" }
                  }
              };
          }

          // Merge values
          acc[date].details.water += activity.water || 0;
          acc[date].details.heart = Math.max(acc[date].details.heart, activity.heart_rate || 0);
          acc[date].details.steps += activity.steps || 0;
          acc[date].details.weight.value = activity.weight || acc[date].details.weight.value;
          acc[date].details.weight.unit = activity.weight_unit || acc[date].details.weight.unit;

          if (activity.sleepStart) acc[date].details.sleep.start = activity.sleepStart;
          if (activity.sleepEnd) acc[date].details.sleep.end = activity.sleepEnd;

          return acc;
      }, {});

      res.status(200).json(Object.values(mergedActivities));
  } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
};

// Find or create activity for today
const findOrCreateActivity = async (patientId) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Normalize to start of day UTC

  // Check if an activity exists for today
  let activity = await prisma.patientActivity.findFirst({
      where: {
          patientId: String(patientId),
          date: today,
      },
  });

  // Fetch patient to get default goals
  const patient = await prisma.patient.findUnique({
      where: { id: String(patientId) },
  });

  if (!patient) throw new Error("Patient not found");

  // If no activity is found, create a new one with default values
  if (!activity) {
      activity = await prisma.patientActivity.create({
          data: {
              patientId: String(patientId),
              date: today,
              water: 0,
              waterGoal: patient.waterGoal || 0, // Default to 2500 ml if not set
              steps: 0,
              stepsGoal: patient.stepsGoal || 0, // Default to 5000 steps if not set
              heart_rate: 0,
              weight: null,
              weight_unit: "kg",
              notetaking: "",
              wombPicture: "",
          },
      });
  }

  return activity;
};


// Log Water Intake
const logWaterIntake = async (req, res) => {
  const { id } = req.params;
  console.log("req.params:", req.params);
  console.log("logWaterIntake id:", id);
  const { water, isIncrement = false } = req.body;

  console.log("logWaterIntake id:", id, "water:", water, "isIncrement:", isIncrement);

  if (water === undefined || water === null || isNaN(water)) {
      return res.status(400).json({ message: "Invalid water value. Must be a number." });
  }

  try {
      const patientExists = await prisma.patient.findUnique({
          where: { id: id },
      });

      if (!patientExists) {
          return res.status(400).json({ message: "Patient not found." });
      }

      const activity = await findOrCreateActivity(id);

      // If isIncrement is true, add to the existing value
      // Otherwise, replace the value (maintaining backwards compatibility)
      const updatedActivity = await prisma.patientActivity.update({
          where: {
              id: activity.id,
          },
          data: { 
              water: isIncrement ? {
                  increment: water
              } : water 
          },
      });

      res.status(200).json(updatedActivity);
  } catch (error) {
      console.error("Error logging water intake:", error);
      res.status(500).json({ message: "Error logging water intake", error: error.message });
  }
};

const WaterGoal = async (req, res) => {
  console.log("🔵 Received request to update water goal");

  const { id } = req.params;
  const { waterGoal } = req.body;

  console.log("🟡 Patient ID:", id);
  console.log("🟡 Water Goal received:", waterGoal);

  if (!waterGoal || isNaN(waterGoal)) {
    console.error("❌ Invalid water goal received:", waterGoal);
    return res.status(400).json({ message: "Invalid water goal value. Must be a number." });
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { id: String(id) } });

    if (!patient) {
      console.error("❌ Patient not found for ID:", id);
      return res.status(400).json({ message: "Patient not found." });
    }

    const activity = await findOrCreateActivity(id);

    if (!activity || !activity.id) {
      console.error("❌ Activity creation failed for patient:", id);
      return res.status(500).json({ message: "Error finding or creating patient activity." });
    }

    const updatedActivity = await prisma.patientActivity.update({
      where: { id: activity.id },
      data: { waterGoal: parseInt(waterGoal) },
    });

    console.log("✅ Water goal updated successfully:", updatedActivity.waterGoal);
    
    res.status(200).json(updatedActivity);
  } catch (error) {
    console.error("❌ Error updating water goal:", error);
    res.status(500).json({ message: "Error updating water goal", error: error.message });
  }
};


const getWaterStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Set to midnight

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // Calculate 7 days ago

    const patient = await prisma.patient.findUnique({ // Fetch patient data including waterGoal
      where: { id: String(id) },
    });

    if (!patient) {
      return res.status(400).json({ message: "Patient not found." });
    }

    const activities = await prisma.patientActivity.findMany({
      where: {
        patientId: String(id),
        date: {
          gte: sevenDaysAgo,
          lte: today,
        },
      },
      orderBy: { date: 'asc' },
    });

    const waterData = activities.map(activity => {
      const goalMl = activity.waterGoal || 0; // Default goal is 2500 ml
      // console.log(goalMl);

      return {
          id: activity.id,
          date: activity.date.toISOString().split("T")[0], // Date in YYYY-MM-DD format
          day: activity.date.toLocaleDateString('en-US', { weekday: 'short' }), // Short weekday name
          waterMl: activity.water,
          goalMl: goalMl, // Fixed: changed 'wate' to 'goalMl'
      };
  });

    res.status(200).json(waterData);
  } catch (error) {
    console.error("Error fetching water status:", error);
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
};
// Log Sleep Duration
const logSleepDuration = async (req, res) => {
  console.log("hi")
    try {
        const { id } = req.params;
        let { date, sleepStart, sleepEnd } = req.body;

        // Validate required fields
        if (!id || !sleepStart || !sleepEnd) {
            return res.status(400).json({ message: "Missing required fields: id, sleepStart, and sleepEnd are required." });
        }

        // Check if the patient exists
        const patientExists = await prisma.patient.findUnique({ where: { id: String(id) } });
        if (!patientExists) {
            return res.status(404).json({ message: "Patient not found." });
        }

        // Normalize date or use today's date in UTC
        date = date ? new Date(date) : new Date();
        date.setUTCHours(0, 0, 0, 0); // Set to UTC midnight

        // Function to convert 12-hour AM/PM time to Date object in UTC
        const parseTimeString = (timeStr, baseDate) => {
            if (!timeStr.includes("AM") && !timeStr.includes("PM")) {
                throw new Error(`Invalid time format: ${timeStr}`);
            }

            const [time, period] = timeStr.split(" ");
            let [hours, minutes] = time.split(":").map(Number);
            if (period.toLowerCase() === "pm" && hours !== 12) hours += 12;
            if (period.toLowerCase() === "am" && hours === 12) hours = 0;

            const parsedDate = new Date(baseDate);
            parsedDate.setUTCHours(hours, minutes, 0, 0); // Use setUTCHours to ensure UTC time
            return parsedDate;
        };

        // Convert sleep times to Date objects in UTC
        const sleepStartTime = parseTimeString(sleepStart, date);
        let sleepEndTime = parseTimeString(sleepEnd, date);

        console.log("Parsed Sleep Start Time (UTC):", sleepStartTime.toISOString());
        console.log("Parsed Sleep End Time (UTC):", sleepEndTime.toISOString());

        // Adjust for overnight sleep (e.g., 11 PM - 7 AM)
        if (sleepEndTime <= sleepStartTime) {
            sleepEndTime.setUTCDate(sleepEndTime.getUTCDate() + 1);
        }

        console.log("Adjusted Sleep End Time (UTC):", sleepEndTime.toISOString());

        // Find or create activity for the given patient and date
        let activity = await prisma.patientActivity.findFirst({
            where: { patientId: String(id), date },
        });

        if (activity) {
            // Update existing activity
            activity = await prisma.patientActivity.update({
                where: { id: activity.id },
                data: { sleepStart: sleepStartTime, sleepEnd: sleepEndTime },
            });
        } else {
            // Create new activity
            activity = await prisma.patientActivity.create({
                data: {
                    patientId: String(id),
                    date,
                    sleepStart: sleepStartTime,
                    sleepEnd: sleepEndTime,
                },
            });
        }

        // Function to calculate sleep duration
        const calculateDuration = (start, end) => {
            const durationMs = end - start;
            const hours = Math.floor(durationMs / (60 * 60 * 1000));
            const minutes = Math.floor((durationMs % (60 * 60 * 1000)) / (60 * 1000));
            return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
        };

        // Send response
        res.status(200).json({
            id: activity.id,
            date: date.toISOString().split("T")[0],
            sleepStart: sleepStartTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
            sleepEnd: sleepEndTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
            duration: calculateDuration(sleepStartTime, sleepEndTime),
        });

    } catch (error) {
        console.error("❌ Error logging sleep duration:", error);
        res.status(500).json({ message: "Error logging sleep duration", error: error.message || error });
    }
};

const getSleepStatus = async (req, res) => {
    const { id } = req.params;

    try {
        if (!id) {
            return res.status(400).json({ message: "Patient ID is required." });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to UTC midnight

        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setUTCDate(today.getUTCDate() - 6);

        const patient = await prisma.patient.findUnique({ where: { id: String(id) } });

        if (!patient) {
            return res.status(404).json({ message: "Patient not found." });
        }

        // Include createdAt in the selection
        const activities = await prisma.patientActivity.findMany({
            where: { 
                patientId: String(id), 
                // date: { gte: sevenDaysAgo, lte: today } 
            },
            orderBy: { date: "desc" },
            select: {
                id: true,
                date: true,
                sleepStart: true, 
                sleepEnd: true,
            }
        });

        // Create a function to calculate sleep duration
        const calculateDuration = (sleepStart, sleepEnd) => {
            if (!sleepStart || !sleepEnd) return "0 hr";
            
            const start = new Date(sleepStart);
            let end = new Date(sleepEnd);
            
            if (end <= start) end.setDate(end.getDate() + 1);

            const durationMs = end - start;
            const hours = Math.floor(durationMs / (60 * 60 * 1000));
            const minutes = Math.floor((durationMs % (60 * 60 * 1000)) / (60 * 1000));

            return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
        };

        // Process the activities directly without filling in missing days
        const sleepData = activities
            .filter(activity => activity.sleepStart !== null || activity.sleepEnd !== null)
            .map(activity => {
                const activityDate = new Date(activity.date);
                const formattedDate = `${activityDate.getUTCFullYear()}-${String(activityDate.getUTCMonth() + 1).padStart(2, '0')}-${String(activityDate.getUTCDate()).padStart(2, '0')}`;
                return {
                    id: activity.id,
                    day: new Date(activity.date).toLocaleDateString("en-US", { weekday: "short" }),
                    date: formattedDate,
                    sleepStart: activity.sleepStart ? new Date(activity.sleepStart).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" }) : null,
                    sleepEnd: activity.sleepEnd ? new Date(activity.sleepEnd).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" }) : null,
                    duration: activity.sleepStart && activity.sleepEnd ? calculateDuration(activity.sleepStart, activity.sleepEnd) : "0 hr",
                };
            });

        res.status(200).json(sleepData);
    } catch (error) {
        console.error("Error fetching sleep status:", error);
        res.status(500).json({ message: "Error fetching sleep status", error: error.message || error });
    }
};

const deleteSleepStatus = async (req, res) => {
  const { id } = req.params; // Sleep track ID

  try {
      // Check if the sleep track exists
      const sleepTrack = await prisma.patientActivity.findUnique({
          where: { id: String(id) },
      });

      if (!sleepTrack) {
          return res.status(404).json({ message: "Sleep track not found." });
      }

      // Instead of deleting the record, set sleep fields to NULL
      const updatedActivity = await prisma.patientActivity.update({
          where: { id: String(id) },
          data: {
              sleepStart: null,
              sleepEnd: null,
          },
      });

      res.status(200).json({ 
          message: "Sleep data removed successfully.", 
          data: updatedActivity 
      });
  } catch (error) {
      console.error("Error deleting sleep data:", error);
      res.status(500).json({ message: "Error deleting sleep data", error: error.message });
  }
};



// Calculate duration in hours, handling cases where sleepEnd is on the next day

// Log Heart Rate
const logHeartRate = async (req, res) => {
  const { id } = req.params;
  const { heartRate } = req.body;

  try {
      if (!id) {
          return res.status(400).json({ message: "Patient ID is required" });
      }
      
      if (heartRate === undefined || heartRate === null) {
          return res.status(400).json({ message: "Heart rate is required" });
      }

      const activity = await findOrCreateActivity(id);

      // Using the correct primary key 'id' from your schema
      const updatedActivity = await prisma.patientActivity.update({
        where: { 
            id: activity.id
        },
        data: { heart_rate: Number(heartRate) }
    });
    
    res.status(200).json({
        success: true,
        message: "Heart rate logged successfully",
        heartRate: Number(heartRate),
        activityId: updatedActivity.id,
        date: updatedActivity.date
    });
  } catch (error) {
      console.error("Error details:", error);
      res.status(500).json({ 
          message: "Error logging heart rate", 
          error: error.message || "Unknown error" 
      });
  }
};

const getHeartRate = async (req, res) => {
  const { id } = req.params; // Assuming 'id' is the patientId from the route
  
  try {
      // Find the most recent activity for this patient
      const activity = await prisma.patientActivity.findFirst({
          where: { patientId: String(id) },
          orderBy: { date: 'desc' }
      });
      
      if (!activity) {
          return res.status(404).json({ message: "Activity not found" });
      }
      
      // Format the response data
      const formattedData = {
          id: activity.id || id, // Use activity.id if available, otherwise fallback to the patient id
          date: activity.date.toISOString().split('T')[0],
          day: new Date(activity.date).toLocaleString('en-US', { weekday: 'short' }),
          heartRate: activity.heart_rate
      };
      
      res.status(200).json(formattedData);
  } catch (error) {
      console.error("Error details:", error);
      res.status(500).json({ message: "Error retrieving heart rate", error: error.message });
  }
};

// Log Steps
const logSteps = async (req, res) => {
  const { id } = req.params; // Patient ID
  const { steps } = req.body;

  console.log("req.params:", req.params);
  console.log("logSteps id:", id);
  console.log("Steps:", steps);

  try {
      const patient = await prisma.patient.findUnique({
          where: { id: id },
      });
      console.log("patient:", patient);

      if (!patient) {
          return res.status(400).json({ message: "Patient not found." });
      }

      // Find or create an activity for the patient
      const activity = await findOrCreateActivity(id); 

      // Update only the `steps` field
      await prisma.patientActivity.update({
        where: { id: activity.id },
        data: { steps: steps } // Ensure this matches your schema field name
    });

      // Fetch updated activity to ensure correct `stepsGoal`
      const updatedActivity = await prisma.patientActivity.findUnique({
          where: { id: activity.id },
          select: {
              id: true,
              date: true,
              steps: true,
              stepsGoal: true // Ensure this field is included
          }
      });

      res.status(200).json({
          id: updatedActivity.id,
          date: updatedActivity.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
          day: updatedActivity.date.toLocaleDateString("en-US", { weekday: "short" }), // Short weekday name
          steps: updatedActivity.steps,
          stepGoal: updatedActivity.stepsGoal ||0 , // Default to 5000 if undefined
      });
  } catch (error) {
      console.error("Error logging steps:", error);
      res.status(500).json({ message: "Error logging steps", error: error.message || error });
  }
};
const StepsGoal = async (req, res) => {
  const { id } = req.params; // Patient ID
  const { stepsGoal } = req.body;

  console.log("req.params:", req.params);
  console.log("logSteps id:", id);
  console.log("Steps:", stepsGoal);

  try {
      const patient = await prisma.patient.findUnique({
          where: { id: id },
      });
      console.log("patient:", patient);

      if (!patient) {
          return res.status(400).json({ message: "Patient not found." });
      }

      // Find or create an activity for the patient
      const activity = await findOrCreateActivity(id); 

      // Update only the `steps` field
      await prisma.patientActivity.update({
        where: { id: activity.id },
        data: { stepsGoal: stepsGoal } // Ensure this matches your schema field name
    });

      // Fetch updated activity to ensure correct `stepsGoal`
      const updatedActivity = await prisma.patientActivity.findUnique({
          where: { id: activity.id },
          select: {
              id: true,
              date: true,
              steps: true,
              stepsGoal: true // Ensure this field is included
          }
      });

      res.status(200).json({
          id: updatedActivity.id,
          date: updatedActivity.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
          day: updatedActivity.date.toLocaleDateString("en-US", { weekday: "short" }), // Short weekday name
          steps: updatedActivity.steps,
          stepGoal: updatedActivity.stepsGoal ||0 , // Default to 5000 if undefined
      });
  } catch (error) {
      console.error("Error logging steps:", error);
      res.status(500).json({ message: "Error logging steps", error: error.message || error });
  }
};

const getStepsStatus = async (req, res) => {
  const { id } = req.params; // Patient ID

  try {
      if (!id) {
          return res.status(400).json({ message: "Patient ID is required." });
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Normalize today's date

      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setUTCDate(today.getUTCDate() - 6); // Get data for the last 7 days

      const patient = await prisma.patient.findUnique({
          where: { id: String(id) },
      });

      if (!patient) {
          return res.status(404).json({ message: "Patient not found." });
      }

      // Fetch step activity for the past 7 days
      const activities = await prisma.patientActivity.findMany({
          where: {
              patientId: String(id),
              date: {
                  gte: sevenDaysAgo,
                  lte: today,
              },
          },
          orderBy: { date: "desc" },
      });

      const stepsData = activities.map(activity => ({
          id: activity.id,
          date: activity.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
          day: activity.date.toLocaleDateString("en-US", { weekday: "short" }), // Short weekday name
          steps: activity.steps || 0,
          stepsGoal: activity.stepsGoal || 0, // Assuming stepGoals is stored in the DB
      }));

      res.status(200).json(stepsData);
  } catch (error) {
      console.error("Error fetching step status:", error);
      res.status(500).json({ message: "Error fetching step status", error: error.message });
  }
};

// Log Weight
const logWeight = async (req, res) => {
  const { id } = req.params;
  let { weight, weight_unit } = req.body;

  if (weight === undefined || isNaN(weight)) {
      return res.status(400).json({ message: "Invalid weight value. Must be a number." });
  }

  try {
      const patient = await prisma.patient.findUnique({
          where: { id: String(id) },
      });

      if (!patient) {
          return res.status(400).json({ message: "Patient not found." });
      }

      const activity = await findOrCreateActivity(id);

      const updatedActivity = await prisma.patientActivity.update({
          where: { id: activity.id },
          data: { weight, weight_unit },
      });

      res.status(200).json({
          success: true,
          weight: updatedActivity.weight,
          weight_unit: updatedActivity.weight_unit,
          date: updatedActivity.date.toISOString().split("T")[0],
      });
  } catch (error) {
      console.error("Error logging weight:", error);
      res.status(500).json({ message: "Error logging weight", error: error.message });
  }
};


const getWeightStatus = async (req, res) => {
  const { id } = req.params; // Patient ID

  try {
      // Get today's date in UTC
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // Get date for 7 days ago
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);

      // Fetch weight logs from the past 7 days
      const activities = await prisma.patientActivity.findMany({
          where: {
              patientId: String(id),
              date: {
                  gte: sevenDaysAgo,
                  lte: today,
              },
          },
          orderBy: { date: "asc" },
      });

      // Helper function to format date
      const formatDateYYYYMMDD = (date) => date.toISOString().split("T")[0];

      // Initialize last logged weight
      let lastLoggedWeight = null;
      let lastLoggedWeightUnit = "kg"; // Default unit

      // ✅ Ensure each day has a weight log (fill missing days with last logged weight)
      const weightData = [];
      for (let i = 0; i < 7; i++) {
          const currentDate = new Date(sevenDaysAgo);
          currentDate.setDate(sevenDaysAgo.getDate() + i);
          const dateKey = formatDateYYYYMMDD(currentDate);

          // Find an activity for this specific date
          const activity = activities.find(act => formatDateYYYYMMDD(act.date) === dateKey);

          if (activity && activity.weight !== null) {
              lastLoggedWeight = activity.weight;
              lastLoggedWeightUnit = activity.weight_unit;
          }

          // ✅ Persist last known weight for missing days
          weightData.push({
              day: currentDate.toLocaleDateString("en-US", { weekday: "short" }),
              date: dateKey,
              weight: lastLoggedWeight !== null ? lastLoggedWeight : (weightData.length > 0 ? weightData[weightData.length - 1].weight : 0),
              weight_unit: lastLoggedWeightUnit,
          });
      }

      // ✅ Find the last recorded weight for display
      const lastActivity = activities.length > 0 ? activities[activities.length - 1] : null;
      const lastWeight = lastActivity ? lastActivity.weight : lastLoggedWeight;
      const lastWeightUnit = lastActivity ? lastActivity.weight_unit : lastLoggedWeightUnit;

      res.status(200).json({
          success: true,
          data: {
              lastWeight: lastWeight,
              weightData: weightData,
          }
      });

  } catch (error) {
      console.error("Error fetching weight status:", error);
      res.status(500).json({
          success: false,
          message: "Error fetching weight status",
          error: error.message
      });
  }
};




const createNote = async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description } = req.body;
  
      if (!title || !description) {
        return res.status(400).json({
          success: false,
          message: "Title and description are required"
        });
      }
  
      // Get current date and time
      const now = new Date();
      
      // Get the time zone offset in minutes and convert to milliseconds
      const timeZoneOffset = now.getTimezoneOffset() * 60000;
      
      // Adjust the date by adding the offset (subtract because getTimezoneOffset returns negative for east, positive for west)
      const localTime = new Date(now.getTime() - timeZoneOffset);
      
      // Create ISO string from the adjusted time
      const isoTime = localTime.toISOString();
      
      const patient = await prisma.patient.findUnique({
        where: { id }
      });
  
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found"
        });
      }
  
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let activity = await prisma.patientActivity.findFirst({
        where: {
          patientId: id,
          date: {
            gte: today,
            lt: new Date(today.getTime()),
          },
        },
      });
      
      // Store time data in the note
      const noteData = {
        title,
        description,
        createdAt: isoTime,
      };
      
      // Create new activity
      activity = await prisma.patientActivity.create({
        data: {
          patientId: id,
          date: now, // This will be stored in UTC in the database
          notetaking: JSON.stringify(noteData),
        },
      });
      
      // Format the date for display in local time
      const formattedDate = now.toLocaleString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
      
      return res.status(201).json({
        success: true,
        message: "Note created successfully",
        data: {
          id: activity.id,
          patientId: activity.patientId,
          date: isoTime, // Return the ISO time with local time zone adjustment
          title: noteData.title,
          description: noteData.description,
          createdAt: noteData.createdAt,
        }
      });
    } catch (error) {
      console.error("Error creating note:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create note",
        error: error.message
      });
    }
  };

  const editNote = async (req, res) => {
    try {
      const { id, noteId } = req.params; // Patient ID and Note ID
      const { title, description } = req.body;
  
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
  
      // Find the activity with the specific note ID
      const activity = await prisma.patientActivity.findUnique({
        where: { id: noteId }
      });
  
      if (!activity) {
        return res.status(404).json({
          success: false,
          message: "Note not found"
        });
      }
  
      // Check if this activity belongs to the patient
      if (activity.patientId !== id) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to edit this note"
        });
      }
  
      // Parse the existing note data
      let noteData;
      try {
        noteData = JSON.parse(activity.notetaking || "{}");
      } catch (e) {
        noteData = { title: "Untitled", description: "" };
      }
  
      // Get current time for the update timestamp
      const now = new Date();
      const timeZoneOffset = now.getTimezoneOffset() * 60000;
      const localTime = new Date(now.getTime() - timeZoneOffset);
      const isoTime = localTime.toISOString();
  
      // Update the note data
      const updatedNoteData = {
        ...noteData,
        title,
        description,
        updatedAt: isoTime, // Add a timestamp for the update
      };
  
      // Update the activity record
      const updatedActivity = await prisma.patientActivity.update({
        where: { id: noteId },
        data: {
          notetaking: JSON.stringify(updatedNoteData)
        }
      });
  
      // Format the date for display in local time
      const formattedDate = localTime.toLocaleString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
  
      return res.status(200).json({
        success: true,
        message: "Note updated successfully",
        data: {
          id: updatedActivity.id,
          patientId: updatedActivity.patientId,
          date: isoTime,
          title: updatedNoteData.title,
          description: updatedNoteData.description,
          createdAt: noteData.createdAt || isoTime,
          updatedAt: updatedNoteData.updatedAt
        }
      });
    } catch (error) {
      console.error("Error updating note:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update note",
        error: error.message
      });
    }
  };

  const getUserNotes = async (req, res) => {
    try {
      const { id } = req.params; // patientId from URL
      
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
      
      // Get all activities with notes
      const activities = await prisma.patientActivity.findMany({
        where: {
          patientId: id,
          notetaking: { not: null }
        },
        orderBy: {
          date: 'desc'
        }
      });
      
      // Get current date and time
      const now = new Date();
      
      
      // Get the time zone offset in minutes and convert to milliseconds
      const timeZoneOffset = now.getTimezoneOffset() * 60000;
      
      // Adjust the date by adding the offset (subtract because getTimezoneOffset returns negative for east, positive for west)
      const localTime = new Date(now.getTime() - timeZoneOffset);
      
      // Create ISO string from the adjusted time
      const isoTime = localTime.toISOString();
      
      // Parse notes from activities
      const allNotes = activities.map(activity => {
        try {
          const noteData = JSON.parse(activity.notetaking);
          let createdAt;
          
          // Use the stored createdAt time which has local time zone adjustment
          if (noteData.createdAt) {
            createdAt = new Date(noteData.createdAt);
          } else {
            // For older notes that don't have adjusted createdAt
            createdAt = new Date(activity.date);
          }
          
          // Format the date for display
          const formattedDate = createdAt.toLocaleString('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
          });
          
          return {
            id: activity.id,
            patientId: activity.patientId,
            date: activity.date,
            title: noteData.title || "Untitled",
            description: noteData.description || "",
            createdAt: createdAt,
            formattedDate: formattedDate,
          };
        } catch (e) {
          // Handle case where notetaking isn't valid JSON
          const createdAt = new Date(activity.date);
          const formattedDate = createdAt.toLocaleString('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
          });
          
          return {
            id: activity.id,
            patientId: activity.patientId,
            date: activity.date,
            title: "Untitled Note",
            description: activity.notetaking || "",
            createdAt: createdAt,
            formattedDate: formattedDate
          };
        }
      });
      
      // Get current date at the start of the day for categorization
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Calculate date for 7 days ago
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - 7);
      
      // Initialize section arrays
      const todayItems = [];
      const lastWeekItems = [];
      const previouslyItems = [];
      
      // Sort notes into categories
      allNotes.forEach(note => {
        const noteDate = note.createdAt;
        
        // Format the description to truncate it with ellipsis if too long
        if (note.description && note.description.length > 30) {
          note.description = note.description.substring(0, 30) + ' ...';
        }
        
        // Create the item object with formatted time
        const item = {
          id: note.id,
          title: note.title,
          description: note.description,
          date: note.formattedDate // Use formatted date that respects time zone
        };
        
        // Check if note was created today
        if (noteDate >= today) {
          todayItems.push(item);
        } 
        // Check if note was created in the last week
        else if (noteDate >= lastWeekStart) {
          lastWeekItems.push(item);
        } 
        // Everything else is categorized as previously
        else {
          previouslyItems.push(item);
        }
      });
      
      // Build content sections array in the exact format requested
      const contentSections = [];
      
      // Add Today section if there are notes
      if (todayItems.length > 0) {
        contentSections.push({
          title: "Today",
          items: todayItems
        });
      }
      
      // Add Last Week section if there are notes
      if (lastWeekItems.length > 0) {
        contentSections.push({
          title: "Last Week",
          items: lastWeekItems
        });
      }
      
      // Add Previously section if there are notes
      if (previouslyItems.length > 0) {
        contentSections.push({
          title: "Previously",
          items: previouslyItems
        });
      }
      
      // Return the content sections with today's date and time
      return res.status(200).json({
        success: true,
        data: contentSections,
        currentTime: isoTime,
      });
    } catch (error) {
      console.error("Error fetching notes:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch notes",
        error: error.message
      });
    }
  };

  const addMedication = async (req, res) => {
    try {
      const { id: patientId } = req.params; 
      const { medicationName, startDate, endDate, days, times } = req.body;
  
      if (!medicationName || !startDate || !days || !times || days.length === 0 || times.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: "Missing required medication information" 
        });
      }
      
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      });
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found"
        });
      }
  
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      let patientActivity = await prisma.patientActivity.findFirst({
        where: {
          patientId: patientId,
          date: today
        }
      });
  
      if (!patientActivity) {
        patientActivity = await prisma.patientActivity.create({
          data: {
            patientId: patientId,
            date: today
          }
        });
      }
  
      const formattedStartDate = new Date(startDate);
      const formattedEndDate = endDate ? new Date(endDate) : null;
      
      const formattedTimes = times.map(time => {
        const [hours, minutes] = time.split(':');
        const timeDate = new Date();
        timeDate.setHours(parseInt(hours, 10));
        timeDate.setMinutes(parseInt(minutes, 10));
        timeDate.setSeconds(0);
        return timeDate;
      });
  
      // Create medication in the database using Prisma
      const newMedication = await prisma.medication.create({
        data: {
          medicationName,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          days,
          times: formattedTimes,
          patientActivityId: patientActivity.id // Use the ID of the found or created activity
        }
      });
  
      return res.status(201).json({
        success: true,
        message: "Medication added successfully",
        data: newMedication
      });
    } catch (error) {
      console.error("Error adding medication:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to add medication", 
        error: error.message 
      });
    }
  };

  const getMedications = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        // Check if patient exists
        const patient = await prisma.patient.findUnique({ where: { id } });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        // Build query for medications
        let query = {
            where: {
                patientActivity: { patientId: id }
            },
            orderBy: { startDate: 'asc' },
            include: {
                patientActivity: { select: { date: true } }
            }
        };

        // Add date filters if provided
        if (startDate || endDate) {
            query.where.startDate = {};

            if (startDate) query.where.startDate.gte = new Date(startDate);
            if (endDate) query.where.startDate.lte = new Date(endDate);
        }

        // Fetch all medications for the patient
        const medications = await prisma.medication.findMany(query);

        // Map day numbers to abbreviations
        const dayAbbreviations = {
            0: "SU", // Sunday
            1: "M",  // Monday 
            2: "T",  // Tuesday
            3: "W",  // Wednesday
            4: "TH", // Thursday
            5: "F",  // Friday
            6: "SA"  // Saturday
        };

        // Process each medication individually
        const formattedMedications = medications.map(med => {
            const dateKey = med.startDate.toISOString().split('T')[0];
            
            // Convert completedDates array to an array of day abbreviations
            const completedDaysOfWeek = (med.completedDates || []).map(dateStr => {
                const date = new Date(dateStr);
                const dayOfWeek = date.getDay(); // 0-6 where 0 is Sunday
                return dayAbbreviations[dayOfWeek];
            });
            
            // Check if the medication has been completed for all scheduled days
            const isCompleteForAllScheduledDays = med.days.every(day => 
                completedDaysOfWeek.includes(day)
            );
            
            return {
                id: med.id,
                medicationName: med.medicationName,
                patientActivityId: med.patientActivityId,
                startDate: med.startDate.toISOString().split('T')[0],
                endDate: med.endDate ? med.endDate.toISOString().split('T')[0] : null,
                days: med.days,
                times: med.times.map(time => 
                    time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                ),
                activityDate: med.patientActivity.date.toISOString().split('T')[0],
                completed: isCompleteForAllScheduledDays,
                completedDates: med.completedDates || [],
                completedDaysOfWeek: completedDaysOfWeek
            };
        });

        // Group medications by active status (current vs. past)
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const activeMedications = formattedMedications.filter(med => {
            const endDate = med.endDate ? new Date(med.endDate) : null;
            return !endDate || endDate >= today;
        });

        const pastMedications = formattedMedications.filter(med => {
            const endDate = med.endDate ? new Date(med.endDate) : null;
            return endDate && endDate < today;
        });

        return res.status(200).json({
            success: true,
            data: activeMedications,
            past: pastMedications
        });

    } catch (error) {
        console.error("Error fetching medications:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch medications",
            error: error.message
        });
    }
};

const markMedicationCompleted = async (req, res) => {
  try {
      const medicationId = req.params.medicationId || req.params.id;
      const { completed, date, time } = req.body;

      if (completed === undefined) {
          return res.status(400).json({ 
              success: false,
              message: "Completed status is required."
          });
      }

      if (!medicationId) {
          return res.status(400).json({
              success: false,
              message: "Medication ID is required."
          });
      }

      if (!date) {
          return res.status(400).json({
              success: false,
              message: "Completion date is required."
          });
      }

      // Format the date string to YYYY-MM-DD format only
      const dateObj = new Date(date);
      if (isNaN(dateObj)) {
          return res.status(400).json({
              success: false,
              message: "Invalid date format. Use YYYY-MM-DD."
          });
      }

      // Format as YYYY-MM-DD only, without time component
      const formattedDateString = dateObj.toISOString().split('T')[0];

      // Fetch the specific medication
      const medication = await prisma.medication.findUnique({
          where: { id: medicationId }
      });

      if (!medication) {
          return res.status(404).json({
              success: false,
              message: "Medication not found."
          });
      }

      // Get the day of the week for this date
      const dayOfWeek = dateObj.getDay(); // 0-6 where 0 is Sunday

      // Map day number to abbreviation
      const dayAbbreviations = {
          0: "SU", // Sunday
          1: "M",  // Monday 
          2: "T",  // Tuesday
          3: "W",  // Wednesday
          4: "TH", // Thursday
          5: "F",  // Friday
          6: "SA"  // Saturday
      };
      const dayAbbreviation = dayAbbreviations[dayOfWeek];

      // Check if this day is in the medication's scheduled days
      if (!medication.days.includes(dayAbbreviation)) {
          return res.status(400).json({
              success: false,
              message: `This medication is not scheduled for ${dayAbbreviation} (${formattedDateString}).`
          });
      }

      // Retrieve existing completed dates, or initialize an empty array
      let completedDates = medication.completedDates || [];

      // If marking as completed, add the date
      if (completed) {
          if (!completedDates.includes(formattedDateString)) {
              completedDates.push(formattedDateString);
          }
      } else {
          // If marking as incomplete, remove the date
          completedDates = completedDates.filter(d => d !== formattedDateString);
      }

      // Update medication with completedDates array
      const updatedMedication = await prisma.medication.update({
          where: { id: medicationId },
          data: { completedDates }
      });

      return res.status(200).json({
          success: true,
          message: `Medication ${completed ? 'marked as completed' : 'marked as incomplete'} for ${dayAbbreviation} on ${formattedDateString}.`,
          data: updatedMedication
      });
  } catch (error) {
      console.error("Error updating medication completion status:", error);
      return res.status(500).json({
          success: false,
          message: "Failed to update medication completion status.",
          error: error.message
      });
  }
};


// AWS.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION || 'us-east-1'
// });

// const s3 = new AWS.S3();

// // Configure multer for memory storage
// const storage = multer.memoryStorage();
// export const upload = multer({
//   storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB limit
//   }
// });

// Add a journal entry with optional image
// const addJournalEntry = async (req, res) => {
//   try {
//     const { id } = req.params; // Patient ID
//     const { title } = req.body;
//     let imageUrl = null;

//     // Validate input
//     if (!title || !content) {
//       return res.status(400).json({
//         success: false,
//         message: "Title and content are required"
//       });
//     }

//     // Check if patient exists
//     const patient = await prisma.patient.findUnique({
//       where: { id }
//     });

//     if (!patient) {
//       return res.status(404).json({
//         success: false,
//         message: "Patient not found"
//       });
//     }

//     // Handle image upload if present
//     if (req.file) {
//       const fileExtension = req.file.originalname.split('.').pop();
//       const fileName = `journal/${id}/${uuidv4()}.${fileExtension}`;

//       // Set up S3 upload parameters
//       const params = {
//         Bucket: process.env.AWS_S3_BUCKET_NAME,
//         Key: fileName,
//         Body: req.file.buffer,
//         ContentType: req.file.mimetype,
//         ACL: 'public-read' // Make the file publicly accessible
//       };

//       // Upload image to S3
//       const uploadResult = await s3.upload(params).promise();
//       imageUrl = uploadResult.Location; // Store the HTTPS URL
//     }

//     // Get current date and time
//     const now = new Date();

//     // Find or create an activity entry for today
//     const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//     let activity = await prisma.patientActivity.findFirst({
//       where: {
//         patientId: id,
//         date: {
//           gte: today,
//           lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Next day
//         },
//       },
//     });

//     // If no activity for today, create one
//     if (!activity) {
//       activity = await prisma.patientActivity.create({
//         data: {
//           patientId: id,
//           date: now,
//         },
//       });
//     }

//     // Create the journal entry
//     const journalData = {
//       title,
//       imageUrl,
//       createdAt: now.toISOString(),
//     };

//     // Update the wombPicture field with the journal data
//     const updatedActivity = await prisma.patientActivity.update({
//       where: { id: activity.id },
//       data: {
//         wombPicture: JSON.stringify(journalData),
//       },
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Journal entry created successfully",
//       data: {
//         id: updatedActivity.id,
//         patientId: updatedActivity.patientId,
//         date: updatedActivity.date,
//         journal: journalData,
//       }
//     });
//   } catch (error) {
//     console.error("Error creating journal entry:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to create journal entry",
//       error: error.message
//     });
//   }
// };

// // Get all journal entries for a patient
// const getJournalEntries = async (req, res) => {
//   try {
//     const { id } = req.params; // Patient ID

//     // Check if patient exists
//     const patient = await prisma.patient.findUnique({
//       where: { id }
//     });

//     if (!patient) {
//       return res.status(404).json({
//         success: false,
//         message: "Patient not found"
//       });
//     }

//     // Get all activities with journal entries
//     const activities = await prisma.patientActivity.findMany({
//       where: {
//         patientId: id,
//         wombPicture: { not: null, not: "" }
//       },
//       orderBy: {
//         date: 'desc'
//       }
//     });

//     // Parse journal entries from activities
//     const journalEntries = activities.map(activity => {
//       try {
//         const journalData = JSON.parse(activity.wombPicture);
//         const createdAt = new Date(journalData.createdAt || activity.date);
        
//         // Format date for display
//         const formattedDate = createdAt.toLocaleString('en-US', {
//           year: 'numeric',
//           month: 'long',
//           day: 'numeric',
//           hour: 'numeric',
//           minute: 'numeric',
//           hour12: true
//         });

//         return {
//           id: activity.id,
//           patientId: activity.patientId,
//           date: activity.date,
//           title: journalData.title || "Untitled",
//           imageUrl: journalData.imageUrl || null,
//           createdAt: createdAt,
//           formattedDate: formattedDate
//         };
//       } catch (e) {
//         // Handle case where wombPicture isn't valid JSON
//         return null;
//       }
//     }).filter(entry => entry !== null);

//     return res.status(200).json({
//       success: true,
//       data: journalEntries
//     });
//   } catch (error) {
//     console.error("Error fetching journal entries:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch journal entries",
//       error: error.message
//     });
//   }
// };

// // Get a single journal entry
// const getJournalEntry = async (req, res) => {
//   try {
//     const { id, entryId } = req.params;

//     const activity = await prisma.patientActivity.findUnique({
//       where: { id: entryId }
//     });

//     if (!activity || activity.patientId !== id || !activity.wombPicture) {
//       return res.status(404).json({
//         success: false,
//         message: "Journal entry not found"
//       });
//     }

//     try {
//       const journalData = JSON.parse(activity.wombPicture);
//       const createdAt = new Date(journalData.createdAt || activity.date);
      
//       // Format date for display
//       const formattedDate = createdAt.toLocaleString('en-US', {
//         year: 'numeric',
//         month: 'long',
//         day: 'numeric',
//         hour: 'numeric',
//         minute: 'numeric',
//         hour12: true
//       });

//       return res.status(200).json({
//         success: true,
//         data: {
//           id: activity.id,
//           patientId: activity.patientId,
//           date: activity.date,
//           title: journalData.title || "Untitled",
//           content: journalData.content || "",
//           imageUrl: journalData.imageUrl || null,
//           createdAt: createdAt,
//           formattedDate: formattedDate
//         }
//       });
//     } catch (e) {
//       return res.status(500).json({
//         success: false,
//         message: "Invalid journal data format"
//       });
//     }
//   } catch (error) {
//     console.error("Error fetching journal entry:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch journal entry",
//       error: error.message
//     });
//   }
// };




export default {
    getUserActivities,
    logWaterIntake,
    WaterGoal,
    getWaterStatus,
    logSleepDuration,
    getSleepStatus,
    logHeartRate,
    logSteps,
    logWeight,
    StepsGoal,
    createNote,
    editNote,
    getHeartRate,
    getWeightStatus,
    deleteSleepStatus,
    getUserNotes,
    addMedication,
    getMedications,
    getStepsStatus,
    markMedicationCompleted,
    // addJournalEntry,
    // getJournalEntries,
    // getJournalEntry,
    // upload,
};
