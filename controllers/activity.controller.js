import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Fetch user activities
const getUserActivities = async (req, res) => {
    const { id } = req.params;
    
    try {
        const activities = await prisma.patientActivity.findMany({
            where: { patientId: String(id) },
            orderBy: { date: "asc" } // Ensure order
        });

        const mergedActivities = activities.reduce((acc, activity) => {
            const date = activity.date.toISOString().split("T")[0];

            if (!acc[date]) {
                acc[date] = {
                    date,
                    details: {
                        water: 0,
                        waterGoal:0,
                        heart: 0,
                        sleep: { start: null, end: null },
                        steps: 0,
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

            // Use the latest sleep data (if available)
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
    today.setHours(0, 0, 0, 0); // Set time to midnight

    // Check if an activity exists for today
    let activity = await prisma.patientActivity.findFirst({
        where: {
            patientId: String(patientId),
            date: today,
        },
    });

    // If no activity is found, create a new one
    if (!activity) {
        activity = await prisma.patientActivity.create({
            data: {
                patientId: String(patientId),
                date: today,
                water: 0,
                steps: 0,
                heart_rate: 0,
                weight: 0,
                weight_unit: "kg",
                notetaking: "",
                wombPicture: "", // Provide an empty string as a default value
                waterGoal: patientId.waterGoal || 0,
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
    const { water } = req.body;

    console.log("logWaterIntake id:", id);

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

        const updatedActivity = await prisma.patientActivity.update({
            where: {
                id: activity.id, // Include the id from the activity object
            },
            data: { water: water },
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
      console.log(goalMl);

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

        // Normalize date or use today's date
        date = date ? new Date(date) : new Date();
        date.setHours(12, 0, 0, 0); // Set to midnight to prevent timezone issues

        // Function to convert 12-hour AM/PM time to Date object
        const parseTimeString = (timeStr, baseDate) => {
            if (!timeStr.includes("AM") && !timeStr.includes("PM")) {
                throw new Error(`Invalid time format: ${timeStr}`);
            }

            const [time, period] = timeStr.split(" ");
            let [hours, minutes] = time.split(":").map(Number);
            if (period.toLowerCase() === "pm" && hours !== 12) hours += 12;
            if (period.toLowerCase() === "am" && hours === 12) hours = 0;

            const parsedDate = new Date(baseDate);
            parsedDate.setHours(hours, minutes, 0, 0);
            return parsedDate;
        };

        // Convert sleep times to Date objects
        const sleepStartTime = parseTimeString(sleepStart, date);
        let sleepEndTime = parseTimeString(sleepEnd, date);

        // Adjust for overnight sleep (e.g., 11 PM - 7 AM)
        if (sleepEndTime <= sleepStartTime) {
            sleepEndTime.setDate(sleepEndTime.getDate() + 1);
        }

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
        // Use local midnight time instead of UTC
        today.setHours(0, 0, 0, 0);

        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);

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
            orderBy: { date: "asc" },
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
        const sleepData = activities.map(activity => {
            const activityDate = new Date(activity.date);
            const formattedDate = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}-${String(activityDate.getDate()).padStart(2, '0')}`;
            return {
                id: activity.id,
                day: new Date(activity.date).toLocaleDateString("en-US", { weekday: "short" }),
                date: formattedDate,
                sleepStart: activity.sleepStart ? new Date(activity.sleepStart).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : null,
                sleepEnd: activity.sleepEnd ? new Date(activity.sleepEnd).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : null,
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
    const { patientId } = req.params;
    const { heartRate } = req.body;

    try {
        const activity = await findOrCreateActivity(patientId);

        const updatedActivity = await prisma.patientActivity.update({
            where: { patientId_date: { patientId: String(patientId), date: activity.date } },
            data: { heart_rate: heartRate }
        });

        res.status(200).json(updatedActivity);
    } catch (error) {
        res.status(500).json({ message: "Error logging heart rate", error });
    }
};

// Log Steps
const logSteps = async (req, res) => {
    const { id } = req.params; // patientId
    const { steps } = req.body;
    console.log("req.params:", req.params);
    console.log("logWaterIntake id:", id);
    console.log("Weight Unit:", steps);

    try {

        const patient = await prisma.patient.findUnique({
            where: { id: id },
        });

        if (!patient) {
            return res.status(400).json({ message: "Patient not found." });
        }

        const activity = await findOrCreateActivity(id); // Ensure this function handles activity creation properly

        const updatedActivity = await prisma.patientActivity.update({
            where: {
                id: activity.id
            },
            data: {
                steps: steps // Use correct field name
            }
        });

        res.status(200).json({
            steps: updatedActivity.steps,
        });
    } catch (error) {
        console.error("Error logging steps:", error); // Log error for debugging
        res.status(500).json({ message: "Error logging steps", error: error.message || error });
    }
};
// Log Weight
const logWeight = async (req, res) => {
    const { id } = req.params;
    console.log("req.params:", req.params);
    console.log("logWaterIntake id:", id);
    let { weight, weight_unit } = req.body;
    console.log("Weight:", weight);
    console.log("Weight Unit:", weight_unit);

    try {
        const patient = await prisma.patient.findUnique({
            where: { id: id },
        });

        if (!patient) {
            return res.status(400).json({ message: "Patient not found." });
        }

        const now = new Date();
        const isoTime = now.toISOString();

        const activity = await findOrCreateActivity(id);

        const updatedActivity = await prisma.patientActivity.update({
            where: { id: activity.id, }, // Corrected where clause
            data: { weight, weight_unit },
        });

        res.status(200).json({
            weight: updatedActivity.weight,
            weight_unit: updatedActivity.weight_unit,
            date: isoTime,
        });
    } catch (error) {
        console.error("Error logging weight:", error);
        res.status(500).json({ message: "Error logging weight", error: error.message });
    }
};

const getWeightStatus = async (req, res) => {
    const { id } = req.params; // Assuming patient ID is in req.params.id
  
    try {
      // Get current date and set to start of day
      const today = new Date();
      today.setHours(12, 0, 0, 0);
  
      // Calculate 7 days ago
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
  
      // Get activities for the last 7 days
      const activities = await prisma.patientActivity.findMany({
        where: {
          patientId: String(id),
          date: {
            gte: sevenDaysAgo,
            lte: new Date(), // Use current date and time to include today's entries
          },
          weight: { not: null }, // Only include activities with weight data
        },
        orderBy: { date: 'asc' },
      });
  
      // Helper function to format date as YYYY-MM-DD
      const formatDateYYYYMMDD = (date) => {
        return date.toISOString().split('T')[0]; // Gets the YYYY-MM-DD part
      };
  
      // Find the last logged weight
      const lastActivity = activities.length > 0 ? activities[activities.length - 1] : null;
      const lastWeight = lastActivity ? lastActivity.weight : null;
      const lastWeightUnit = lastActivity ? lastActivity.weight_unit : null;
      const lastWeightDate = lastActivity ? formatDateYYYYMMDD(lastActivity.date) : null;
  
      // Prepare data for the bar graph
      const weightData = activities.map(activity => ({
        day: activity.date.toLocaleDateString('en-US', { weekday: 'short' }),
        weight: activity.weight,
        weight_unit: activity.weight_unit,
        date: formatDateYYYYMMDD(activity.date) // Format as YYYY-MM-DD
      }));
  
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
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
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
      // Get patientId from URL - modified to use patientId directly
      const { id: patientId } = req.params; 
      const { medicationName, startDate, endDate, days, times } = req.body;
  
      // Validate required fields
      if (!medicationName || !startDate || !days || !times || days.length === 0 || times.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: "Missing required medication information" 
        });
      }
      
      // Check if the patient exists
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      });
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found"
        });
      }
  
      // Find or create PatientActivity for today
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to midnight
  
      let patientActivity = await prisma.patientActivity.findFirst({
        where: {
          patientId: patientId,
          date: today
        }
      });
  
      // If no activity exists for today, create one
      if (!patientActivity) {
        patientActivity = await prisma.patientActivity.create({
          data: {
            patientId: patientId,
            date: today
          }
        });
      }
  
      // Format dates properly
      const formattedStartDate = new Date(startDate);
      const formattedEndDate = endDate ? new Date(endDate) : null;
      
      // Format times (assuming times come as string array like ["08:00", "20:00"])
      const formattedTimes = times.map(time => {
        // Create a date object for each time
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
      const { id } = req.params; // patientId
      const { startDate, endDate } = req.query; // Optional date filters
      
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
      
      // Build query for medications
      let query = {
        where: {
          patientActivity: {
            patientId: id
          }
        },
        orderBy: {
          startDate: 'asc'
        },
        include: {
          patientActivity: {
            select: {
              date: true
            }
          }
        }
      };
      
      // Add date filters if provided
      if (startDate || endDate) {
        query.where.startDate = {};
        
        if (startDate) {
          query.where.startDate.gte = new Date(startDate);
        }
        
        if (endDate) {
          query.where.startDate.lte = new Date(endDate);
        }
      }
      
      // Get medications
      const medications = await prisma.medication.findMany(query);
      
      // Format the medication data
      const formattedMedications = medications.map(med => {
        return {
          id: med.id,
          medicationName: med.medicationName,
          patientActivityId: med.patientActivityId,
          startDate: med.startDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
          endDate: med.endDate ? med.endDate.toISOString().split('T')[0] : null,
          days: med.days,
          times: med.times.map(time => 
            time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          ),
          activityDate: med.patientActivity.date.toISOString().split('T')[0],
          completed: med.completed // Include the completed status here
        };
      });
      
      // Group medications by active status (current vs. past)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
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
        data: {
          active: activeMedications,
          past: pastMedications
        }
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
      // Log all params to debug
      console.log("Request params:", req.params);
      
      // Check which parameter contains the medication ID
      const medicationId = req.params.medicationId || req.params.id;
      
      // Log the extracted medication ID
      console.log("Medication ID:", medicationId);
      
      const { completed } = req.body;
      
      // Log request body
      console.log("Request body:", req.body);
  
      // Validate required fields
      if (completed === undefined) {
        return res.status(400).json({ 
          success: false,
          message: "Completed status is required" 
        });
      }
  
      // Verify medication ID is not undefined
      if (!medicationId) {
        return res.status(400).json({
          success: false,
          message: "Medication ID is required"
        });
      }
  
      // Check if medication exists
      const medication = await prisma.medication.findUnique({
        where: { id: medicationId }
      });
  
      if (!medication) {
        return res.status(404).json({
          success: false,
          message: "Medication not found"
        });
      }
  
      // Update medication completion status
      const updatedMedication = await prisma.medication.update({
        where: { id: medicationId },
        data: { completed }
      });
  
      return res.status(200).json({
        success: true,
        message: `Medication ${completed ? 'marked as completed' : 'marked as incomplete'}`,
        data: updatedMedication
      });
    } catch (error) {
      console.error("Error updating medication completion status:", error);
      console.error("Error details:", error.stack);
      return res.status(500).json({
        success: false,
        message: "Failed to update medication completion status",
        error: error.message
      });
    }
  };


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
    createNote,
    getWeightStatus,
    deleteSleepStatus,
    getUserNotes,
    addMedication,
    getMedications,
    markMedicationCompleted
};
