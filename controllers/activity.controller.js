import { BadgeType, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { createClient } from '@supabase/supabase-js';
// import AWS from "aws-sdk";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
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

      const hotMamaBadgeResult = await checkAndAwardHotMamaBadge(id);
      
      // Check for Health Queen badge
      const healthQueenBadgeResult = await checkAndAwardHealthQueenBadge(id);
      
      // Get all the patient's badges to include in the response
      const patientBadges = await prisma.patientBadge.findMany({
          where: { patientId: id },
          include: {
              badge: {
                  select: {
                      type: true,
                      title: true,
                      description: true,
                      createdAt: true,
                  }
              }
          }
      });

      // Determine if any new badges were awarded
      const newBadge = 
          (healthQueenBadgeResult && healthQueenBadgeResult.awarded) ? healthQueenBadgeResult.badge :
          (hotMamaBadgeResult && hotMamaBadgeResult.awarded) ? hotMamaBadgeResult.badge :
          null;

      // Combine badge progress information
      const badgeProgress = {
          hotMama: hotMamaBadgeResult && !hotMamaBadgeResult.awarded && hotMamaBadgeResult.progress ? 
              hotMamaBadgeResult.progress : null,
          healthQueen: healthQueenBadgeResult && !healthQueenBadgeResult.awarded && healthQueenBadgeResult.progress ? 
              healthQueenBadgeResult.progress : null
      };

      res.status(200).json({
          activities: Object.values(mergedActivities),
          badges: patientBadges,
          newBadge,
          badgeProgress
      });

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
              waterGoal: patient.waterGoal || 2500, // Default to 2500 ml if not set
              steps: 0,
              stepsGoal: patient.stepsGoal || 5000, // Default to 5000 steps if not set
              heart_rate: 0,
              weight: null,
              calorieGoal: patient.calorieGoal || 2000,
              caloriesConsumed: 0,
              goodFoodCount: 0,
              badFoodCount: 0,
              weight_unit: "kg",
          },
      });
  }

  return activity;
};

const getUserGoals = async (req, res) => {
  const { id } = req.params;
  
  try {
    // First check if the user exists
    const patient = await prisma.patient.findUnique({
      where: { id: String(id) },
    });
    
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    
    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Try to find existing activity for today
    let activity = await prisma.patientActivity.findFirst({
      where: {
        patientId: id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Tomorrow
        }
      }
    });
    
    // If no activity exists for today, create one
    if (!activity) {
      activity = await prisma.patientActivity.create({
        data: {
          patientId: id,
          date: today,
          calorieGoal: patient.calorieGoal || 2000,
          waterGoal: patient.waterGoal || 2500,
          stepsGoal: patient.stepsGoal || 5000,
          caloriesConsumed: 0,
          goodFoodCount: 0,
          badFoodCount: 0,
          water: 0,
          steps: 0
        }
      });
      
      console.log("✅ Created initial activity with default goals for user:", id);
    }
    
    // Return the goals (either from existing activity or newly created one)
    res.status(200).json({
      calorieGoal: activity.calorieGoal || 2000,
      waterGoal: activity.waterGoal || 2500,
      stepsGoal: activity.stepsGoal || 5000
    });
  } catch (error) {
    console.error("Error in getUserGoals:", error);
    res.status(500).json({ message: "Error fetching user goals", error: error.message });
  }
};

// Function to check and award "Health Queen" badge for logging all habits daily for a month
const checkAndAwardHealthQueenBadge = async (patientId) => {
  try {
    // Get the current date
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    // Calculate 63 days ago (9 weeks) to check for cumulative streaks
    const sixtyThreeDaysAgo = new Date(today);
    sixtyThreeDaysAgo.setDate(today.getDate() - 62);
    
    // Find all activities in the past 9 weeks
    const activities = await prisma.patientActivity.findMany({
      where: {
        patientId: String(patientId),
        date: {
          gte: sixtyThreeDaysAgo,
          lte: today,
        },
      },
    });
    
    // Health Queen badge progression
    const healthQueenBadges = [
      { type: BadgeType.HEALTH_QUEEN_I, weeksRequired: 1, title: "Health Queen I", description: "Completed first week of logging all habits" },
      { type: BadgeType.HEALTH_QUEEN_II, weeksRequired: 2, title: "Health Queen II", description: "Completed two consecutive weeks of logging all habits" },
      { type: BadgeType.HEALTH_QUEEN_III, weeksRequired: 3, title: "Health Queen III", description: "Completed three consecutive weeks of logging all habits" },
      { type: BadgeType.HEALTH_QUEEN_IV, weeksRequired: 4, title: "Health Queen IV", description: "Completed four consecutive weeks of logging all habits" },
      { type: BadgeType.HEALTH_QUEEN_V, weeksRequired: 5, title: "Health Queen V", description: "Completed five consecutive weeks of logging all habits" },
      { type: BadgeType.HEALTH_QUEEN_VI, weeksRequired: 6, title: "Health Queen VI", description: "Completed six consecutive weeks of logging all habits" },
      { type: BadgeType.HEALTH_QUEEN_VII, weeksRequired: 7, title: "Health Queen VII", description: "Completed seven consecutive weeks of logging all habits" },
      { type: BadgeType.HEALTH_QUEEN_VIII, weeksRequired: 8, title: "Health Queen VIII", description: "Completed eight consecutive weeks of logging all habits" },
      { type: BadgeType.HEALTH_QUEEN_IX, weeksRequired: 9, title: "Health Queen IX", description: "Completed nine consecutive weeks of logging all habits" }
    ];
    
    // Function to check consecutive weeks of habit logging
    const checkConsecutiveWeeks = (activities) => {
      // Group activities by week
      const weekGroups = {};
      activities.forEach(activity => {
        const activityDate = new Date(activity.date);
        const weekStart = new Date(activityDate);
        weekStart.setDate(activityDate.getDate() - activityDate.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weekGroups[weekKey]) {
          weekGroups[weekKey] = {
            completeDays: new Set(),
            hasAllHabits: false
          };
        }
        
        // Check if all habits are logged for this day
        const hasWater = activity.water !== null && activity.water > 0;
        const hasSleep = activity.sleepStart !== null && activity.sleepEnd !== null;
        const hasFood = true; // Replace with actual food logging check
        
        if (hasWater && hasSleep && hasFood) {
          weekGroups[weekKey].completeDays.add(activityDate.toISOString().split('T')[0]);
        }
      });
      
      // Check for consecutive complete weeks (7 days logged)
      const consecutiveWeeks = Object.values(weekGroups)
        .filter(week => week.completeDays.size === 7)
        .length;
      
      return consecutiveWeeks;
    };
    
    // Calculate consecutive complete weeks
    const consecutiveWeeks = checkConsecutiveWeeks(activities);
    
    // Find the highest badge to award based on consecutive weeks
    let badgeToAward = null;
    for (const badgeLevel of healthQueenBadges) {
      if (consecutiveWeeks >= badgeLevel.weeksRequired) {
        // Check if the badge exists in the database
        let badge = await prisma.badge.findUnique({
          where: { type: badgeLevel.type },
        });
        
        // If the badge doesn't exist, create it
        if (!badge) {
          badge = await prisma.badge.create({
            data: {
              type: badgeLevel.type,
              title: badgeLevel.title,
              description: badgeLevel.description,
            },
          });
          console.log(`✨ Created ${badge.title} badge:`, badge);
        }
        
        // Check if this patient already has the badge
        const alreadyAwarded = await prisma.patientBadge.findUnique({
          where: {
            patientId_badgeId: {
              patientId,
              badgeId: badge.id,
            },
          },
        });
        
        // If not already awarded, set as badge to award
        if (!alreadyAwarded) {
          badgeToAward = badge;
        }
      }
    }
    
    // Award the badge if found
    if (badgeToAward) {
      const awarded = await prisma.patientBadge.create({
        data: {
          patientId,
          badgeId: badgeToAward.id,
        },
      });
      console.log("✅ Awarded Health Queen badge:", awarded);
      
      return {
        awarded: true,
        badge: {
          type: badgeToAward.type,
          title: badgeToAward.title,
          description: badgeToAward.description
        }
      };
    } else {
      console.log(`ℹ️ Only ${consecutiveWeeks} consecutive weeks of habit logging detected.`);
      return { 
        awarded: false, 
        reason: `Only ${consecutiveWeeks} consecutive weeks of habit logging`,
        progress: {
          weeksCompleted: consecutiveWeeks,
          weeksRequired: 9
        }
      };
    }
  } catch (error) {
    console.error("Error checking/awarding Health Queen badge:", error);
    return { awarded: false, error: error.message };
  }
};

// Function to check and award "Hot Mama" badge for 3-month consistency streak
const checkAndAwardHotMamaBadge = async (patientId) => {
  try {
    // Get the current date
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    // We need to check three consecutive months
    const currentMonth = {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: new Date(today.getFullYear(), today.getMonth() + 1, 0)
    };
    
    const lastMonth = {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0)
    };
    
    const twoMonthsAgo = {
      start: new Date(today.getFullYear(), today.getMonth() - 2, 1),
      end: new Date(today.getFullYear(), today.getMonth() - 1, 0)
    };
    
    // Define months to check
    const monthsToCheck = [twoMonthsAgo, lastMonth, currentMonth];
    
    // Track results for each month
    const monthResults = [];
    
    // For each month, check if the user had at least 25 days of activity
    for (const month of monthsToCheck) {
      // Find all activities in this month
      const activities = await prisma.patientActivity.findMany({
        where: {
          patientId: String(patientId),
          date: {
            gte: month.start,
            lte: month.end,
          },
        },
      });
      
      // Count days with any activity (water, sleep, steps)
      const daysWithActivity = new Set();
      
      activities.forEach(activity => {
        // Check if this activity has any tracked data
        if (
          (activity.water !== null && activity.water > 0) || 
          (activity.steps !== null && activity.steps > 0) || 
          (activity.sleepStart !== null && activity.sleepEnd !== null) ||
          (activity.heart_rate !== null && activity.heart_rate > 0) ||
          (activity.weight !== null)
        ) {
          // Add the date string to the set to count unique days
          const dateString = activity.date.toISOString().split('T')[0];
          daysWithActivity.add(dateString);
        }
      });
      
      // Get total days in this month
      const daysInMonth = (month.end.getDate() - month.start.getDate()) + 1;
      
      // Add result for this month
      monthResults.push({
        monthName: month.start.toLocaleString('default', { month: 'long', year: 'numeric' }),
        daysWithActivity: daysWithActivity.size,
        daysInMonth,
        consistencyMet: daysWithActivity.size >= 25
      });
    }
    
    console.log("Monthly consistency results:", monthResults);
    
    // Check if all three months met the 25-day threshold
    const allMonthsConsistent = monthResults.every(month => month.consistencyMet);
    
    if (allMonthsConsistent) {
      console.log("🏅 3-month consistency streak detected, checking for Hot Mama badge...");
      
      // Check if the badge exists in the database
      let badge = await prisma.badge.findUnique({
        where: { type: BadgeType.HOT_MAMA },
      });
      
      // If the badge doesn't exist, create it
      if (!badge) {
        badge = await prisma.badge.create({
          data: {
            type: BadgeType.HOT_MAMA,
            title: "Hot Mama",
            description: "3 month streak with being consistent at least 25/30 days in each month",
          },
        });
        console.log("✨ Created Hot Mama badge:", badge);
      }
      
      // Check if this patient already has the badge
      const alreadyAwarded = await prisma.patientBadge.findUnique({
        where: {
          patientId_badgeId: {
            patientId,
            badgeId: badge.id,
          },
        },
      });
      
      // If not already awarded, award the badge
      if (!alreadyAwarded) {
        const awarded = await prisma.patientBadge.create({
          data: {
            patientId,
            badgeId: badge.id,
          },
        });
        console.log("✅ Awarded Hot Mama badge:", awarded);
        
        return {
          awarded: true,
          badge: {
            type: badge.type,
            title: badge.title,
            description: badge.description
          }
        };
      } else {
        console.log("ℹ️ Hot Mama badge already awarded earlier.");
        return { awarded: false };
      }
    } else {
      // Calculate overall progress
      const completedMonths = monthResults.filter(month => month.consistencyMet).length;
      
      console.log(`ℹ️ Only ${completedMonths}/3 months with 25+ days of activity detected.`);
      return { 
        awarded: false, 
        reason: `Only ${completedMonths}/3 months with 25+ days of activity.`,
        progress: {
          monthsCompleted: completedMonths,
          monthsRequired: 3,
          monthDetails: monthResults
        }
      };
    }
  } catch (error) {
    console.error("Error checking/awarding Hot Mama badge:", error);
    return { awarded: false, error: error.message };
  }
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

      const waterGoalMet = updatedActivity.waterGoal && updatedActivity.water >= updatedActivity.waterGoal;
      console.log(`Water goal status: ${waterGoalMet ? 'MET' : 'NOT MET'} (${updatedActivity.water}/${updatedActivity.waterGoal || 'no goal'})`);
      const waterLogs = await prisma.patientActivity.findMany({
        where: {
          patientId: id,
          water: { not: null },
        },
      });

      let firstLogBadge = null;
      if (waterLogs.length === 1) {
        console.log("🏅 First water entry detected, attempting badge award...");
  
        let badge = await prisma.badge.findUnique({
          where: { type: BadgeType.HYDRATED_QUEEN },
        });
  
        if (!badge) {
          badge = await prisma.badge.create({
            data: {
              type: BadgeType.HYDRATED_QUEEN,
              title: "Hydrated Queen",
              description: "First time water is logged",
            },
          });
          console.log("✨ Created badge:", badge);
        }
  
        const alreadyAwarded = await prisma.patientBadge.findUnique({
          where: {
            patientId_badgeId: {
              patientId: id,
              badgeId: badge.id,
            },
          },
        });
  
        if (!alreadyAwarded) {
          const awarded = await prisma.patientBadge.create({
            data: {
              patientId: id,
              badgeId: badge.id,
            },
          });
          console.log("✅ Awarded badge:", awarded);
          firstLogBadge = awarded;
        } else {
          console.log("ℹ️ Badge already awarded earlier.");
        }
      }
      
      // Check for water streak badge
      let streakResult = { awarded: false };
    if (waterGoalMet) {
      streakResult = await checkWaterStreakBadge(id);
      console.log("Streak check result:", streakResult);
    }
      
      // Get all the patient's badges to include in the response
      const patientBadges = await prisma.patientBadge.findMany({
        where: { patientId: id },
        include: {
          badge: {
            select: {
              type: true,
              title: true,
              description: true,
              createdAt: true,
            }
          }
        }
      });

      res.status(200).json({
        updatedActivity, 
        waterLogs,
        badges: patientBadges,
        newBadges: {
          firstLog: firstLogBadge,
          streak: streakResult.awarded ? streakResult.badge : null
        },
        streakProgress: streakResult.progress || null
      });
  } catch (error) {
      console.error("Error logging water intake:", error);
      res.status(500).json({ message: "Error logging water intake", error: error.message });
  }
};

// Function to check for water streak and award Water Wizard badge
// Function to check for water streak and award Water Wizard badges progressively
const checkWaterStreakBadge = async (patientId) => {
  try {
    // Get the current date and set to midnight
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    // Calculate 63 days ago (9 weeks) to check for cumulative streaks
    const sixtyThreeDaysAgo = new Date(today);
    sixtyThreeDaysAgo.setDate(today.getDate() - 62);
    
    // Find all activities in the past 9 weeks
    const activities = await prisma.patientActivity.findMany({
      where: {
        patientId: String(patientId),
        date: {
          gte: sixtyThreeDaysAgo,
          lte: today,
        },
      },
      orderBy: { date: 'asc' },
    });
    
    // Water Wizard badge progression
    const waterWizardBadges = [
      { type: BadgeType.WATER_WIZARD_I, weeksRequired: 1, title: "Water Wizard I", description: "Completed first week of meeting water goals" },
      { type: BadgeType.WATER_WIZARD_II, weeksRequired: 2, title: "Water Wizard II", description: "Completed two consecutive weeks of meeting water goals" },
      { type: BadgeType.WATER_WIZARD_III, weeksRequired: 3, title: "Water Wizard III", description: "Completed three consecutive weeks of meeting water goals" },
      { type: BadgeType.WATER_WIZARD_IV, weeksRequired: 4, title: "Water Wizard IV", description: "Completed four consecutive weeks of meeting water goals" },
      { type: BadgeType.WATER_WIZARD_V, weeksRequired: 5, title: "Water Wizard V", description: "Completed five consecutive weeks of meeting water goals" },
      { type: BadgeType.WATER_WIZARD_VI, weeksRequired: 6, title: "Water Wizard VI", description: "Completed six consecutive weeks of meeting water goals" },
      { type: BadgeType.WATER_WIZARD_VII, weeksRequired: 7, title: "Water Wizard VII", description: "Completed seven consecutive weeks of meeting water goals" },
      { type: BadgeType.WATER_WIZARD_VIII, weeksRequired: 8, title: "Water Wizard VIII", description: "Completed eight consecutive weeks of meeting water goals" },
      { type: BadgeType.WATER_WIZARD_IX, weeksRequired: 9, title: "Water Wizard IX", description: "Completed nine consecutive weeks of meeting water goals" }
    ];
    
    // Function to check consecutive weeks of water goal achievement
    const checkConsecutiveWeeks = (activities) => {
      // Group activities by week
      const weekGroups = {};
      activities.forEach(activity => {
        const activityDate = new Date(activity.date);
        const weekStart = new Date(activityDate);
        weekStart.setDate(activityDate.getDate() - activityDate.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weekGroups[weekKey]) {
          weekGroups[weekKey] = {
            completeDays: 0,
            hasMetGoal: false
          };
        }
        
        // Check if water goal was met for this day
        const waterGoal = activity.waterGoal || 0;
        const waterIntake = activity.water || 0;
        
        if (waterGoal > 0 && waterIntake >= waterGoal) {
          weekGroups[weekKey].completeDays++;
        }
      });
      
      // Check for consecutive complete weeks (at least 5 days met goal)
      const consecutiveWeeks = Object.values(weekGroups)
        .filter(week => week.completeDays >= 5)
        .length;
      
      return consecutiveWeeks;
    };
    
    // Calculate consecutive complete weeks
    const consecutiveWeeks = checkConsecutiveWeeks(activities);
    
    // Find the highest badge to award based on consecutive weeks
    let badgeToAward = null;
    for (const badgeLevel of waterWizardBadges) {
      if (consecutiveWeeks >= badgeLevel.weeksRequired) {
        // Check if the badge exists in the database
        let badge = await prisma.badge.findUnique({
          where: { type: badgeLevel.type },
        });
        
        // If the badge doesn't exist, create it
        if (!badge) {
          badge = await prisma.badge.create({
            data: {
              type: badgeLevel.type,
              title: badgeLevel.title,
              description: badgeLevel.description,
            },
          });
          console.log(`✨ Created ${badge.title} badge:`, badge);
        }
        
        // Check if this patient already has the badge
        const alreadyAwarded = await prisma.patientBadge.findUnique({
          where: {
            patientId_badgeId: {
              patientId,
              badgeId: badge.id,
            },
          },
        });
        
        // If not already awarded, set as badge to award
        if (!alreadyAwarded) {
          badgeToAward = badge;
        }
      }
    }
    
    // Award the badge if found
    if (badgeToAward) {
      const awarded = await prisma.patientBadge.create({
        data: {
          patientId,
          badgeId: badgeToAward.id,
        },
      });
      console.log("✅ Awarded Water Wizard badge:", awarded);
      
      return {
        awarded: true,
        badge: {
          type: badgeToAward.type,
          title: badgeToAward.title,
          description: badgeToAward.description
        }
      };
    } else {
      console.log(`ℹ️ Only ${consecutiveWeeks} consecutive weeks of water goal achievement detected.`);
      return { 
        awarded: false, 
        reason: `Only ${consecutiveWeeks} consecutive weeks of water goal achievement`,
        progress: {
          weeksCompleted: consecutiveWeeks,
          weeksRequired: 9
        }
      };
    }
  } catch (error) {
    console.error("Error checking water streak:", error);
    return { awarded: false, error: error.message };
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
      const goalMl = activity.waterGoal || 0;
      const waterMl = activity.water || 0;
      const goalMet = goalMl > 0 && waterMl >= goalMl;

      return {
          id: activity.id,
          date: activity.date.toISOString().split("T")[0], // Date in YYYY-MM-DD format
          day: activity.date.toLocaleDateString('en-US', { weekday: 'short' }), // Short weekday name
          waterMl: activity.water,
          goalMl: goalMl, // Fixed: changed 'wate' to 'goalMl'
          goalMet: goalMet
      };
  });
  const streakStatus = await checkWaterStreakBadge(id);

  // Get all the patient's badges to include in the response
  const patientBadges = await prisma.patientBadge.findMany({
    where: { patientId: id },
    include: {
      badge: {
        select: {
          type: true,
          title: true,
          description: true,
          createdAt: true,
        }
      }
    }
  });

  const hasWaterWizard = patientBadges.some(pb => 
    pb.badge.type === 'WATER_WIZARD' || pb.badge.type === 'WATER_WIZARD_I'
  );

  res.status(200).json({
    waterData,
    waterWizardStatus: {
      hasWeeklyBadge: hasWaterWizard,
      currentProgress: streakStatus.progress || null
    }
  });
  } catch (error) {
    console.error("Error fetching water status:", error);
    res.status(500).json({ message: "Internal Server Error", details: error.message });
  }
};
// Log Sleep Duration

// Check and award Rested Diva badge for first time logging 8+ hours of sleep
const checkAndAwardRestedDivaBadge = async (patientId, sleepStart, sleepEnd) => {
  try {
    // Calculate sleep duration in hours
    let start = new Date(sleepStart);
    let end = new Date(sleepEnd);
    
    // Adjust for overnight sleep
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
    
    const durationMs = end - start;
    const durationHours = durationMs / (60 * 60 * 1000);
    
    // Only proceed if sleep duration is at least 8 hours
    if (durationHours >= 8) {
      console.log(`🛌 Sleep duration: ${durationHours.toFixed(2)} hours - Qualifies for Rested Diva badge!`);
      
      // Check if the badge exists in the database
      let badge = await prisma.badge.findUnique({
        where: { type: BadgeType.RESTED_DIVA },
      });
      
      // If the badge doesn't exist, create it
      if (!badge) {
        badge = await prisma.badge.create({
          data: {
            type: BadgeType.RESTED_DIVA,
            title: "Rested Diva",
            description: "First time logging sleep (and getting minimum 8 hours of sleep)",
          },
        });
        console.log("✨ Created Rested Diva badge:", badge);
      }
      
      // Check if this patient already has the badge
      const alreadyAwarded = await prisma.patientBadge.findUnique({
        where: {
          patientId_badgeId: {
            patientId,
            badgeId: badge.id,
          },
        },
      });
      
      // If not already awarded, award the badge
      if (!alreadyAwarded) {
        const awarded = await prisma.patientBadge.create({
          data: {
            patientId,
            badgeId: badge.id,
          },
        });
        console.log("✅ Awarded Rested Diva badge:", awarded);
        
        return {
          awarded: true,
          badge: {
            type: badge.type,
            title: badge.title,
            description: badge.description
          }
        };
      } else {
        console.log("ℹ️ Rested Diva badge already awarded earlier.");
        return { awarded: false };
      }
    } else {
      console.log(`🛌 Sleep duration: ${durationHours.toFixed(2)} hours - Does not qualify for Rested Diva badge`);
      return { awarded: false, reason: "Sleep duration less than 8 hours" };
    }
  } catch (error) {
    console.error("Error checking/awarding Rested Diva badge:", error);
    return { awarded: false, error: error.message };
  }
};

// Check and award Sleep Wizard badge for logging sleep daily for a week
const checkAndAwardSleepWizardBadge = async (patientId) => {
  try {
    // Get the current date and set to midnight
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    // Calculate 63 days ago (9 weeks) to check for cumulative streaks
    const sixtyThreeDaysAgo = new Date(today);
    sixtyThreeDaysAgo.setDate(today.getDate() - 62);
    
    // Find all activities in the past 9 weeks with sleep logged
    const activities = await prisma.patientActivity.findMany({
      where: {
        patientId: String(patientId),
        date: {
          gte: sixtyThreeDaysAgo,
          lte: today,
        },
        sleepStart: { not: null },
        sleepEnd: { not: null }
      },
      orderBy: { date: 'asc' },
    });
    
    // Sleep Wizard badge progression
    const sleepWizardBadges = [
      { type: BadgeType.SLEEP_WIZARD_I, weeksRequired: 1, title: "Sleep Wizard I", description: "Completed first week of consistent sleep logging" },
      { type: BadgeType.SLEEP_WIZARD_II, weeksRequired: 2, title: "Sleep Wizard II", description: "Completed two consecutive weeks of sleep logging" },
      { type: BadgeType.SLEEP_WIZARD_III, weeksRequired: 3, title: "Sleep Wizard III", description: "Completed three consecutive weeks of sleep logging" },
      { type: BadgeType.SLEEP_WIZARD_IV, weeksRequired: 4, title: "Sleep Wizard IV", description: "Completed four consecutive weeks of sleep logging" },
      { type: BadgeType.SLEEP_WIZARD_V, weeksRequired: 5, title: "Sleep Wizard V", description: "Completed five consecutive weeks of sleep logging" },
      { type: BadgeType.SLEEP_WIZARD_VI, weeksRequired: 6, title: "Sleep Wizard VI", description: "Completed six consecutive weeks of sleep logging" },
      { type: BadgeType.SLEEP_WIZARD_VII, weeksRequired: 7, title: "Sleep Wizard VII", description: "Completed seven consecutive weeks of sleep logging" },
      { type: BadgeType.SLEEP_WIZARD_VIII, weeksRequired: 8, title: "Sleep Wizard VIII", description: "Completed eight consecutive weeks of sleep logging" },
      { type: BadgeType.SLEEP_WIZARD_IX, weeksRequired: 9, title: "Sleep Wizard IX", description: "Completed nine consecutive weeks of sleep logging" }
    ];
    
    // Function to check consecutive weeks of sleep logging
    const checkConsecutiveWeeks = (activities) => {
      // Group activities by week
      const weekGroups = {};
      activities.forEach(activity => {
        const activityDate = new Date(activity.date);
        const weekStart = new Date(activityDate);
        weekStart.setDate(activityDate.getDate() - activityDate.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weekGroups[weekKey]) {
          weekGroups[weekKey] = {
            completeDays: new Set(),
            hasActivityEachDay: false
          };
        }
        
        weekGroups[weekKey].completeDays.add(activityDate.toISOString().split('T')[0]);
      });
      
      // Check for consecutive complete weeks (7 days logged)
      const consecutiveWeeks = Object.values(weekGroups)
        .filter(week => week.completeDays.size === 7)
        .length;
      
      return consecutiveWeeks;
    };
    
    // Calculate consecutive complete weeks
    const consecutiveWeeks = checkConsecutiveWeeks(activities);
    
    // Find the highest badge to award based on consecutive weeks
    let badgeToAward = null;
    for (const badgeLevel of sleepWizardBadges) {
      if (consecutiveWeeks >= badgeLevel.weeksRequired) {
        // Check if the badge exists in the database
        let badge = await prisma.badge.findUnique({
          where: { type: badgeLevel.type },
        });
        
        // If the badge doesn't exist, create it
        if (!badge) {
          badge = await prisma.badge.create({
            data: {
              type: badgeLevel.type,
              title: badgeLevel.title,
              description: badgeLevel.description,
            },
          });
          console.log(`✨ Created ${badge.title} badge:`, badge);
        }
        
        // Check if this patient already has the badge
        const alreadyAwarded = await prisma.patientBadge.findUnique({
          where: {
            patientId_badgeId: {
              patientId,
              badgeId: badge.id,
            },
          },
        });
        
        // If not already awarded, set as badge to award
        if (!alreadyAwarded) {
          badgeToAward = badge;
        }
      }
    }
    
    // Award the badge if found
    if (badgeToAward) {
      const awarded = await prisma.patientBadge.create({
        data: {
          patientId,
          badgeId: badgeToAward.id,
        },
      });
      console.log("✅ Awarded Sleep Wizard badge:", awarded);
      
      return {
        awarded: true,
        badge: {
          type: badgeToAward.type,
          title: badgeToAward.title,
          description: badgeToAward.description
        }
      };
    } else {
      console.log(`ℹ️ Only ${consecutiveWeeks} consecutive weeks of sleep logging detected.`);
      return { 
        awarded: false, 
        reason: `Only ${consecutiveWeeks} consecutive weeks of sleep logging`,
        progress: {
          weeksCompleted: consecutiveWeeks,
          weeksRequired: 9
        }
      };
    }
  } catch (error) {
    console.error("Error checking/awarding Sleep Wizard badge:", error);
    return { awarded: false, error: error.message };
  }
};

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

        // Check for badges
        // 1. Rested Diva badge (first time logging 8+ hours of sleep)
        const restedDivaBadgeResult = await checkAndAwardRestedDivaBadge(id, sleepStartTime, sleepEndTime);
        
        // 2. Sleep Wizard badge (logged sleep daily for a week)
        const sleepWizardBadgeResult = await checkAndAwardSleepWizardBadge(id);
        
        // Get all the patient's badges to include in the response
        const patientBadges = await prisma.patientBadge.findMany({
            where: { patientId: id },
            include: {
                badge: {
                    select: {
                        type: true,
                        title: true,
                        description: true,
                        createdAt: true,
                    }
                }
            }
        });


        // Send response
        res.status(200).json({
            id: activity.id,
            date: date.toISOString().split("T")[0],
            sleepStart: sleepStartTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
            sleepEnd: sleepEndTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
            duration: calculateDuration(sleepStartTime, sleepEndTime),
            newBadges: {
              restedDiva: restedDivaBadgeResult && restedDivaBadgeResult.awarded ? restedDivaBadgeResult.badge : null,
              sleepWizard: sleepWizardBadgeResult && sleepWizardBadgeResult.awarded ? sleepWizardBadgeResult.badge : null
          }
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

        // Check for Sleep Wizard badge (7-day streak)
        const sleepWizardBadgeResult = await checkAndAwardSleepWizardBadge(id);
        
        // Get all the patient's badges to include in the response
        const patientBadges = await prisma.patientBadge.findMany({
            where: { patientId: id },
            include: {
                badge: {
                    select: {
                        type: true,
                        title: true,
                        description: true,
                        createdAt: true,
                    }
                }
            }
        });

        res.status(200).json({
            sleepData,
            newBadge: sleepWizardBadgeResult && sleepWizardBadgeResult.awarded ? sleepWizardBadgeResult.badge : null
        });
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

// Function to check and award "On the move!" badge for meeting step goals for a month
const checkAndAwardOnTheMoveBadge = async (patientId) => {
  try {
    // Get the current date
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    // Calculate 63 days ago (9 weeks) to check for cumulative streaks
    const sixtyThreeDaysAgo = new Date(today);
    sixtyThreeDaysAgo.setDate(today.getDate() - 62);
    
    // Find all activities in the past 9 weeks with step goals logged
    const activities = await prisma.patientActivity.findMany({
      where: {
        patientId: String(patientId),
        date: {
          gte: sixtyThreeDaysAgo,
          lte: today,
        },
        steps: { not: null },
        stepsGoal: { not: null },
      },
    });
    
    // On the Move badge progression
    const onTheMoveBadges = [
      { type: BadgeType.ON_THE_MOVE_I, weeksRequired: 1, title: "On the Move I", description: "Completed first week of meeting step goals" },
      { type: BadgeType.ON_THE_MOVE_II, weeksRequired: 2, title: "On the Move II", description: "Completed two consecutive weeks of meeting step goals" },
      { type: BadgeType.ON_THE_MOVE_III, weeksRequired: 3, title: "On the Move III", description: "Completed three consecutive weeks of meeting step goals" },
      { type: BadgeType.ON_THE_MOVE_IV, weeksRequired: 4, title: "On the Move IV", description: "Completed four consecutive weeks of meeting step goals" },
      { type: BadgeType.ON_THE_MOVE_V, weeksRequired: 5, title: "On the Move V", description: "Completed five consecutive weeks of meeting step goals" },
      { type: BadgeType.ON_THE_MOVE_VI, weeksRequired: 6, title: "On the Move VI", description: "Completed six consecutive weeks of meeting step goals" },
      { type: BadgeType.ON_THE_MOVE_VII, weeksRequired: 7, title: "On the Move VII", description: "Completed seven consecutive weeks of meeting step goals" },
      { type: BadgeType.ON_THE_MOVE_VIII, weeksRequired: 8, title: "On the Move VIII", description: "Completed eight consecutive weeks of meeting step goals" },
      { type: BadgeType.ON_THE_MOVE_IX, weeksRequired: 9, title: "On the Move IX", description: "Completed nine consecutive weeks of meeting step goals" }
    ];
    
    // Function to check consecutive weeks of step goal achievement
    const checkConsecutiveWeeks = (activities) => {
      // Group activities by week
      const weekGroups = {};
      activities.forEach(activity => {
        const activityDate = new Date(activity.date);
        const weekStart = new Date(activityDate);
        weekStart.setDate(activityDate.getDate() - activityDate.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weekGroups[weekKey]) {
          weekGroups[weekKey] = {
            completeDays: 0,
            hasMetGoal: false
          };
        }
        
        // Check if step goal was met for this day
        if (activity.steps >= activity.stepsGoal && activity.stepsGoal > 0) {
          weekGroups[weekKey].completeDays++;
        }
      });
      
      // Check for consecutive complete weeks (at least 5 days met goal)
      const consecutiveWeeks = Object.values(weekGroups)
        .filter(week => week.completeDays >= 5)
        .length;
      
      return consecutiveWeeks;
    };
    
    // Calculate consecutive complete weeks
    const consecutiveWeeks = checkConsecutiveWeeks(activities);
    
    // Find the highest badge to award based on consecutive weeks
    let badgeToAward = null;
    for (const badgeLevel of onTheMoveBadges) {
      if (consecutiveWeeks >= badgeLevel.weeksRequired) {
        // Check if the badge exists in the database
        let badge = await prisma.badge.findUnique({
          where: { type: badgeLevel.type },
        });
        
        // If the badge doesn't exist, create it
        if (!badge) {
          badge = await prisma.badge.create({
            data: {
              type: badgeLevel.type,
              title: badgeLevel.title,
              description: badgeLevel.description,
            },
          });
          console.log(`✨ Created ${badge.title} badge:`, badge);
        }
        
        // Check if this patient already has the badge
        const alreadyAwarded = await prisma.patientBadge.findUnique({
          where: {
            patientId_badgeId: {
              patientId,
              badgeId: badge.id,
            },
          },
        });
        
        // If not already awarded, set as badge to award
        if (!alreadyAwarded) {
          badgeToAward = badge;
        }
      }
    }
    
    // Award the badge if found
    if (badgeToAward) {
      const awarded = await prisma.patientBadge.create({
        data: {
          patientId,
          badgeId: badgeToAward.id,
        },
      });
      console.log("✅ Awarded On the Move badge:", awarded);
      
      return {
        awarded: true,
        badge: {
          type: badgeToAward.type,
          title: badgeToAward.title,
          description: badgeToAward.description
        }
      };
    } else {
      console.log(`ℹ️ Only ${consecutiveWeeks} consecutive weeks of step goal achievement detected.`);
      return { 
        awarded: false, 
        reason: `Only ${consecutiveWeeks} consecutive weeks of step goal achievement`,
        progress: {
          weeksCompleted: consecutiveWeeks,
          weeksRequired: 9
        }
      };
    }
  } catch (error) {
    console.error("Error checking/awarding On the Move badge:", error);
    return { awarded: false, error: error.message };
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
          goalMet: activity.steps >= activity.stepsGoal && activity.stepsGoal > 0
      }));

      // Check for "On the move!" badge
      const badgeResult = await checkAndAwardOnTheMoveBadge(id);

       // Get all the patient's badges to include in the response
       const patientBadges = await prisma.patientBadge.findMany({
        where: { patientId: id },
        include: {
            badge: {
                select: {
                    type: true,
                    title: true,
                    description: true,
                    createdAt: true,
                }
            }
        }
    });

    res.status(200).json({
        stepsData,
        badges: patientBadges,
        newBadge: badgeResult && badgeResult.awarded ? badgeResult.badge : null,
        badgeProgress: badgeResult && !badgeResult.awarded && badgeResult.progress ? badgeResult.progress : null
    });
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
    
    const patient = await prisma.patient.findUnique({
      where: { id }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    // Get start of today for date query
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Find or create an activity for today
    let activity = await prisma.patientActivity.findFirst({
      where: {
        patientId: id,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });
    
    // If no activity exists for today, create one
    if (!activity) {
      activity = await prisma.patientActivity.create({
        data: {
          patientId: id,
          date: now,
        },
      });
    }
    
    // Now create the note with correct fields from your schema
    const note = await prisma.noteTaking.create({
      data: {
        patientActivityId: activity.id,
        title,
        description,
        // createdAt and updatedAt are handled automatically by Prisma
      }
    });

    const notesCount = await prisma.noteTaking.count({
      where: {
        patientActivity: {
          patientId: id
        }
      }
    });
    
    // Initialize badge variable
    let heartScribeBadge = null;
    
    // Award HEART_SCRIBE badge if this is the first note
    if (notesCount === 1) {
      console.log("🏅 First journal entry detected, attempting badge award...");
      
      let badge = await prisma.badge.findUnique({
        where: { type: BadgeType.HEART_SCRIBE },
      });
      
      if (!badge) {
        badge = await prisma.badge.create({
          data: {
            type: BadgeType.HEART_SCRIBE,
            title: "Heart Scribe",
            description: "First time Logging an entry in the journal",
          },
        });
        console.log("✨ Created badge:", badge);
      }
      
      const alreadyAwarded = await prisma.patientBadge.findUnique({
        where: {
          patientId_badgeId: {
            patientId: id,
            badgeId: badge.id,
          },
        },
      });
      
      if (!alreadyAwarded) {
        const awarded = await prisma.patientBadge.create({
          data: {
            patientId: id,
            badgeId: badge.id,
          },
        });
        console.log("✅ Awarded badge:", awarded);
        heartScribeBadge = awarded;
      } else {
        console.log("ℹ️ Badge already awarded earlier.");
      }
    }
    
    // Format the date for display in local time
    const formattedDate = note.createdAt.toLocaleString('en-US', {
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
        id: note.id,
        patientId: id,
        title: note.title,
        description: note.description,
        createdAt: note.createdAt,
        formattedDate
      },
      badge: heartScribeBadge
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

const formatDateTime = (date) => {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
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

    // Find the note using the NoteTaking model
    const note = await prisma.noteTaking.findUnique({
      where: { id: noteId },
      include: { patientActivity: true }
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found"
      });
    }

    // Check if this note belongs to the patient
    if (note.patientActivity.patientId !== id) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to edit this note"
      });
    }

    // Update the note using the NoteTaking model
    const updatedNote = await prisma.noteTaking.update({
      where: { id: noteId },
      data: {
        title,
        description
        // updatedAt will be automatically updated by Prisma
      }
    });

    // Format the date for display
    const formattedDate = formatDateTime(updatedNote.updatedAt);

    return res.status(200).json({
      success: true,
      message: "Note updated successfully",
      data: {
        id: updatedNote.id,
        patientId: id,
        title: updatedNote.title,
        description: updatedNote.description,
        createdAt: updatedNote.createdAt,
        updatedAt: updatedNote.updatedAt,
        formattedDate
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
    
    // Get all notes for this patient using the NoteTaking model
    const notes = await prisma.noteTaking.findMany({
      where: {
        patientActivity: {
          patientId: id
        }
      },
      include: {
        patientActivity: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Get current date and time
    const now = new Date();
    
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
    notes.forEach(note => {
      const noteDate = note.createdAt;
      const formattedDate = formatDateTime(noteDate);
      
      // Format the description to truncate it with ellipsis if too long
      let shortDescription = note.description || "";
      if (shortDescription.length > 30) {
        shortDescription = shortDescription.substring(0, 30) + ' ...';
      }
      
      // Create the item object with formatted time
      const item = {
        id: note.id,
        title: note.title || "Untitled",
        description: shortDescription,
        date: formattedDate // Use formatted date
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
    
    // Return the content sections with current time
    return res.status(200).json({
      success: true,
      data: contentSections,
      currentTime: new Date().toISOString(),
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


const supabaseUrl = 'https://sfpyewutvgmsmlywgcor.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmcHlld3V0dmdtc21seXdnY29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNjA4MzksImV4cCI6MjA2NTYzNjgzOX0.Zi_hX4b1imMCc6B9ErW9HjmGztJ1XCDga_NY_BskO6U';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure multer for memory storage
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
}).single('imageUrl');  

// Function to check and award Snapshot badge for first photo upload
const checkAndAwardSnapshotBadge = async (patientId) => {
  try {
    // Check if the SNAPSHOT badge type exists in the enum
    // Make sure you've added this to your BadgeType enum in schema.prisma:
    // SNAPSHOT // First time photo is uploaded
    
    // Check if the badge exists in the database
    let badge = await prisma.badge.findUnique({
      where: { type: BadgeType.SNAPSHOT },
    });
    
    // If the badge doesn't exist, create it
    if (!badge) {
      badge = await prisma.badge.create({
        data: {
          type: BadgeType.SNAPSHOT,
          title: "Snapshot Queen",
          description: "First time photo is uploaded",
        },
      });
      console.log("✨ Created Snapshot badge:", badge);
    }
    
    // Check if this patient already has the badge
    const alreadyAwarded = await prisma.patientBadge.findUnique({
      where: {
        patientId_badgeId: {
          patientId,
          badgeId: badge.id,
        },
      },
    });
    
    // If not already awarded, award the badge
    if (!alreadyAwarded) {
      const awarded = await prisma.patientBadge.create({
        data: {
          patientId,
          badgeId: badge.id,
        },
      });
      console.log("✅ Awarded Snapshot badge:", awarded);
      
      return {
        awarded: true,
        badge: {
          type: badge.type,
          title: badge.title,
          description: badge.description
        }
      };
    } else {
      console.log("ℹ️ Snapshot badge already awarded earlier.");
      return { awarded: false };
    }
  } catch (error) {
    console.error("Error checking/awarding Snapshot badge:", error);
    return { awarded: false, error: error.message };
  }
};

// Add a journal entry with optional image
const addJournalEntry = async (req, res) => {
  try {
    const { id } = req.params; // Patient ID
    const { title } = req.body;
    let { imageUrl } = req.body;
    console.log(imageUrl);

    // Validate input - only title is required now
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required"
      });
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
    let uploadedPhoto = false;

    // Handle image upload if present
    if (req.file) {
      uploadedPhoto = true;
      const fileExtension = req.file.originalname.split('.').pop();
      const fileName = `journal/${id}/${uuidv4()}.${fileExtension}`;
      
      console.log("Uploading file to Supabase:", fileName);
      
      // Upload to Supabase Storage
      const { data, error } = await supabase
        .storage
        .from('crosscare') // Bucket name
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (error) {
        console.error("Error uploading to Supabase:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
          error: error.message
        });
      }

      console.log("Upload successful, getting public URL");
      
      // Get the public URL
      const { data: urlData, error: urlError } = supabase
        .storage
        .from('crosscare') // Bucket name
        .getPublicUrl(fileName);

      if (urlError) {
        console.error("Error getting public URL:", urlError);
        return res.status(500).json({
          success: false,
          message: "Failed to get public URL",
          error: urlError.message
        });
      }

      imageUrl = urlData.publicUrl;
      console.log("Generated image URL:", imageUrl);
    }

    // Get current date and time
    const now = new Date();
    
    // For finding today's activities, use local midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let activity = await prisma.patientActivity.findFirst({
      where: {
        patientId: id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Next day
        },
      },
    });

    // If no activity for today, create one
    if (!activity) {
      activity = await prisma.patientActivity.create({
        data: {
          patientId: id,
          date: now,
        },
      });
    }

    // Create the WombPicture entry
    const wombPictureData = {
      patientActivityId: activity.id,
      title,
      imageUrl,
      createdAt: now,
    };

    const wombPicture = await prisma.wombPicture.create({
      data: wombPictureData,
    });

    const year = wombPicture.createdAt.getFullYear();
    const month = String(wombPicture.createdAt.getMonth() + 1).padStart(2, '0');
    const day = String(wombPicture.createdAt.getDate()).padStart(2, '0');
    const hours = String(wombPicture.createdAt.getHours()).padStart(2, '0');
    const minutes = String(wombPicture.createdAt.getMinutes()).padStart(2, '0');
    const seconds = String(wombPicture.createdAt.getSeconds()).padStart(2, '0');
    const milliseconds = String(wombPicture.createdAt.getMilliseconds()).padStart(3, '0');
    
    // Format in ISO-like format but using local time values
    const localFormattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
    
    let badgeResult = null;
    if (uploadedPhoto) {
      // Check if this patient has any previous photos
      const previousPhotos = await prisma.wombPicture.findMany({
        where: {
          patientActivityId: {
            in: await prisma.patientActivity.findMany({
              where: { patientId: id },
              select: { id: true }
            }).then(activities => activities.map(a => a.id))
          },
          id: { not: wombPicture.id }, // Exclude the one we just created
          imageUrl: { not: null } // Only count entries with images
        },
        take: 1 // We only need to know if there's at least one
      });
      
      // If this is the first photo, award the badge
      if (previousPhotos.length === 0) {
        console.log("🏅 First photo upload detected, awarding Snapshot badge...");
        badgeResult = await checkAndAwardSnapshotBadge(id);
      }
    }
    
    // Get all the patient's badges to include in the response
    const patientBadges = await prisma.patientBadge.findMany({
      where: { patientId: id },
      include: {
        badge: {
          select: {
            type: true,
            title: true,
            description: true,
            createdAt: true,
          }
        }
      }
    });
    
    return res.status(201).json({
      success: true,
      message: "Journal entry created successfully",
      data: {
        id: wombPicture.id,
        title: wombPicture.title,
        imageUrl: wombPicture.imageUrl,
        createdAt: localFormattedDate,
      },
      badges: patientBadges,
      newBadge: badgeResult && badgeResult.awarded ? badgeResult.badge : null
    });
  } catch (error) {
    console.error("Error creating journal entry:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create journal entry",
      error: error.message
    });
  }
};


// Get all journal entries for a patient
const getJournalEntries = async (req, res) => {
  try {
    const { id } = req.params; // Patient ID

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

    // Get all WombPicture entries related to the patient
    const wombPictures = await prisma.wombPicture.findMany({
      where: {
        patientActivity: {
          patientId: id,
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group the journal entries by today, last week, and previously
    const groupedEntries = {
      "Today": [],
      "Last Week": [],
      "Previously": []
    };

    const currentDate = new Date();
    const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0)); // Start of today
    const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999)); // End of today
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(currentDate.getDate() - 7); // 7 days ago from today

    wombPictures.forEach((wombPicture) => {
      const createdAt = new Date(wombPicture.createdAt);

      // Convert the dates to UTC for consistent comparison
      const createdAtUTC = Date.UTC(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());

      // Custom format for date (dd/mm/yyyy, hh:mm a)
      const day = createdAt.getDate();
      const month = createdAt.getMonth() + 1; // Months are zero-indexed
      const year = createdAt.getFullYear();
      const hours = createdAt.getHours();
      const minutes = createdAt.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedTime = `${(hours % 12) || 12}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;

      const formattedDate = `${day}/${month}/${year}, ${formattedTime}`;

      // If the entry was created today
      if (createdAt >= startOfDay && createdAt <= endOfDay) {
        groupedEntries["Today"].push({
          id: wombPicture.id,
          title: wombPicture.title,
          imageUrl: wombPicture.imageUrl,
          date: formattedDate
        });
      } else if (createdAt >= sevenDaysAgo && createdAt < startOfDay) {
        // If the entry was created in the last 7 days but not today
        groupedEntries["Last Week"].push({
          id: wombPicture.id,
          title: wombPicture.title,
          imageUrl: wombPicture.imageUrl,
          date: formattedDate
        });
      } else {
        // Otherwise, categorize as "Previously"
        groupedEntries["Previously"].push({
          id: wombPicture.id,
          title: wombPicture.title,
          imageUrl: wombPicture.imageUrl,
          date: formattedDate
        });
      }
    });

    // Return the grouped entries in the desired format
    return res.status(200).json({
      success: true,
      data: [
        {
          title: "Today",
          items: groupedEntries["Today"]
        },
        {
          title: "Last Week",
          items: groupedEntries["Last Week"]
        },
        {
          title: "Previously",
          items: groupedEntries["Previously"]
        }
      ]
    });
  } catch (error) {
    console.error("Error fetching journal entries:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch journal entries",
      error: error.message
    });
  }
};

// Get a single journal entry
const getJournalEntry = async (req, res) => {
  try {
    const { id, entryId } = req.params;

    // Modify the query to include the patientActivity
    const wombPicture = await prisma.wombPicture.findUnique({
      where: { id: entryId },
      include: {
        patientActivity: true,  // This will include the related patientActivity
      },
    });

    // Check if wombPicture exists and if patientActivity.patientId matches the requested id
    if (!wombPicture || wombPicture.patientActivity.patientId !== id) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    // Format the createdAt date properly
    const createdAt = new Date(wombPicture.createdAt); // Convert the createdAt field to a Date object
    const day = createdAt.getDate();
    const month = createdAt.getMonth() + 1; // Months are zero-indexed
    const year = createdAt.getFullYear();
    const hours = createdAt.getHours();
    const minutes = createdAt.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedTime = `${(hours % 12) || 12}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
    const formattedDate = `${day}/${month}/${year}, ${formattedTime}`;

    return res.status(200).json({
      success: true,
      data: {
        id: wombPicture.id,
        title: wombPicture.title,
        imageUrl: wombPicture.imageUrl,
        createdAt: formattedDate, // Use the formatted date
      },
    });
  } catch (error) {
    console.error("Error fetching journal entry:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch journal entry",
      error: error.message,
    });
  }
};

// Update a journal entry with optional new image
const updateJournalEntry = async (req, res) => {
  try {
    const { id, entryId } = req.params; // Patient ID and Entry ID
    const { title } = req.body;
    let { imageUrl } = req.body; // Existing image URL if provided
    console.log("Title:", title);
    console.log("Existing Image URL:", imageUrl);

    // Validate input - title is required for updating
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required"
      });
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

    // Check if journal entry exists
    const wombPicture = await prisma.wombPicture.findUnique({
      where: { id: entryId }
    });

    if (!wombPicture) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found"
      });
    }

    // Handle image upload if a new file is uploaded
    if (req.file) {
      const fileExtension = req.file.originalname.split('.').pop();
      const fileName = `journal/${id}/${uuidv4()}.${fileExtension}`;

      console.log("Uploading file to Supabase:", fileName);

      // Upload to Supabase Storage
      const { data, error } = await supabase
        .storage
        .from('crosscare') // Bucket name
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (error) {
        console.error("Error uploading to Supabase:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
          error: error.message
        });
      }

      console.log("Upload successful, getting public URL");

      // Get the public URL of the uploaded image
      const { data: urlData, error: urlError } = await supabase
        .storage
        .from('crosscare') // Bucket name
        .getPublicUrl(fileName);

      if (urlError) {
        console.error("Error getting public URL:", urlError);
        return res.status(500).json({
          success: false,
          message: "Failed to get public URL",
          error: urlError.message
        });
      }

      // Use the newly generated public URL for image
      imageUrl = urlData.publicUrl;
      console.log("Generated new image URL:", imageUrl);
    }

    // Update the journal entry
    const updatedWombPicture = await prisma.wombPicture.update({
      where: { id: entryId },
      data: {
        title,
        imageUrl: imageUrl || wombPicture.imageUrl, // Use new URL if available, otherwise keep the old one
      },
    });

    return res.status(200).json({
      success: true,
      message: "Journal entry updated successfully",
      data: {
        id: updatedWombPicture.id,
        patientActivityId: updatedWombPicture.patientActivityId,
        title: updatedWombPicture.title,
        imageUrl: updatedWombPicture.imageUrl,
        createdAt: updatedWombPicture.createdAt,
      }
    });
  } catch (error) {
    console.error("Error updating journal entry:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update journal entry",
      error: error.message
    });
  }
};

const findOrCreateActivityForDate = async (patientId, targetDate) => {
  // Set to start of day for consistent date comparison
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Try to find existing activity for this date
  let activity = await prisma.patientActivity.findFirst({
    where: {
      patientId: patientId,
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });

  // If no activity exists for this date, create one
  if (!activity) {
    activity = await prisma.patientActivity.create({
      data: {
        patientId: patientId,
        date: startOfDay, // Use start of day as the date
        calorieGoal: 0, // Default calorie goal
        caloriesConsumed: 0,
        goodFoodCount: 0,
        badFoodCount: 0
      }
    });
    
    console.log("✅ Created new activity for date:", startOfDay.toISOString().split('T')[0]);
  }

  return activity;
};


//food Log Entry
const caloriesGoal = async (req, res) => {
  console.log("🔵 Received request to update calorie goal");

  const { id } = req.params;
  const { calorieGoal, date } = req.body;

  console.log("🟡 Patient ID:", id);
  console.log("🟡 Calorie Goal received:", calorieGoal);

  if (!calorieGoal || isNaN(calorieGoal)) {
    console.error("❌ Invalid calorie goal received:", calorieGoal);
    return res.status(400).json({ message: "Invalid calorie goal value. Must be a number." });
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { id: String(id) } });

    if (!patient) {
      console.error("❌ Patient not found for ID:", id);
      return res.status(400).json({ message: "Patient not found." });
    }

    const targetDate = date ? new Date(date) : new Date();
    const activity = await findOrCreateActivityForDate(id, targetDate);

    if (!activity || !activity.id) {
      console.error("❌ Activity creation failed for patient:", id);
      return res.status(500).json({ message: "Error finding or creating patient activity." });
    }

    const updatedActivity = await prisma.patientActivity.update({
      where: { id: activity.id },
      data: { calorieGoal: parseInt(calorieGoal) },
    });

    console.log("✅ Calorie goal updated successfully:", updatedActivity.calorieGoal);
    console.log("🎯 Today's Calorie Goal:", updatedActivity.calorieGoal, "calories");
    
    res.status(200).json({
      success: true,
      calorieGoal: updatedActivity.calorieGoal,
      date: targetDate.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error("❌ Error updating calorie goal:", error);
    res.status(500).json({ message: "Error updating calorie goal", error: error.message });
  }
};

// Add this new endpoint to your backend
const getCalorieHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { timeRange = 'week' } = req.query; // week, month, lastMonth, today
    
    // Calculate date range based on timeRange
    let startDate, endDate;
    const now = new Date();
    
    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
    }

    // Fetch all activities for this patient within date range
    const activities = await prisma.patientActivity.findMany({
      where: { 
        patientId: id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      select: { 
        id: true, 
        calorieGoal: true, 
        caloriesConsumed: true, 
        date: true
      },
    });

    // Fetch all meals for these activities
    const activityIds = activities.map(a => a.id);
    const meals = await prisma.meals.findMany({
      where: { 
        patientActivityId: { in: activityIds },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        totalCalories: true,
        createdAt: true,
        patientActivityId: true
      }
    });

    // Group calories by date
    const dailyCalories = {};
    
    // Initialize all dates in range with 0 calories
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dailyCalories[dateKey] = 0;
    }
    
    // Add actual calorie data
    meals.forEach(meal => {
      const dateKey = meal.createdAt.toISOString().split('T')[0];
      if (dailyCalories[dateKey] !== undefined) {
        dailyCalories[dateKey] += meal.totalCalories;
      }
    });

    // Convert to array format for frontend
    const chartData = Object.keys(dailyCalories).map(date => ({
      date,
      calories: dailyCalories[date],
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
    }));

    res.status(200).json({
      success: true,
      timeRange,
      chartData,
      totalDays: chartData.length
    });

  } catch (error) {
    console.error('Error fetching calorie history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const addMeals = async (req, res) => {
  console.log("🔵 Received request to add food item");
  
  const { id: patientId } = req.params;
  console.log(patientId);
  
  try {
    const { mealType, name, portion, calories, classification, date, quantity = 1 } = req.body;

    console.log("🟡 Patient ID:", patientId);
    console.log("🟡 Adding food:", { name, portion, calories, classification, quantity });

    // Get or create activity for today (or you could accept a date parameter)
    const targetDate = date ? new Date(date) : new Date();
    const activity = await findOrCreateActivityForDate(patientId, targetDate);

    // Check if this exact food item already exists in this meal
    const result = await prisma.$transaction(async (tx) => {
      console.log("tx keys:", Object.keys(tx));

      let meal = await tx.meals.findUnique({
        where: {
          patientActivityId_mealType: {
            patientActivityId: activity.id,
            mealType: (mealType || 'BREAKFAST').toUpperCase(),
          }
        },
        include: {
          foodItems: true
        }
      });

      if (!meal) {
        meal = await tx.meals.create({
          data: {
            patientActivityId: activity.id,
            mealType: (mealType || 'BREAKFAST').toUpperCase(),
            totalCalories: 0,
            foodItemsCount: 0,
            isSavedAsMeal: false
          },
          include: {
            foodItems: true
          }
        });
      }

      // Check if this exact food item (same name and portion) already exists
      const existingFoodItem = meal.foodItems.find(item => 
        item.name === name && 
        item.portion === portion && 
        item.classification === classification
      );

      let foodItem;
      const totalCaloriesForThisAddition = parseInt(calories) * parseInt(quantity);

      if (existingFoodItem) {
        // Update existing food item quantity
        foodItem = await tx.foodItem.update({
          where: { id: existingFoodItem.id },
          data: {
            quantity: { increment: parseInt(quantity) }
          }
        });
        console.log("✅ Updated existing food item quantity:", foodItem.name, "New quantity:", foodItem.quantity);
      } else {
        // Create new food item
        foodItem = await tx.foodItem.create({
          data: {
            dailyMealId: meal.id,
            name,
            portion,
            quantity: parseInt(quantity),
            calories: parseInt(calories), // calories per single portion
            classification: classification || 'GOOD'
          }
        });
        console.log("✅ Created new food item:", foodItem.name, "Quantity:", foodItem.quantity);
      }

      // Update meal totals
      await tx.meals.update({
        where: { id: meal.id },
        data: {
          totalCalories: { increment: totalCaloriesForThisAddition },
          foodItemsCount: { increment: parseInt(quantity) },
        }
      });

      const goodIncrement = (classification === 'GOOD') ? parseInt(quantity) : 0;
      const badIncrement = (classification === 'BAD') ? parseInt(quantity) : 0;

      const updatedActivity = await tx.patientActivity.update({
        where: { id: activity.id },
        data: {
          caloriesConsumed: { increment: totalCaloriesForThisAddition },
          goodFoodCount: { increment: goodIncrement },
          badFoodCount: { increment: badIncrement }
        }
      });

      return { foodItem, updatedActivity, mealId: meal.id };
    });

    console.log("✅ Food added successfully:", result.foodItem.name);
    console.log("🎯 Total calories consumed:", result.updatedActivity.caloriesConsumed);

    res.status(200).json({
      success: true,
      foodItem: result.foodItem,
      mealId: result.mealId, // Include mealId for frontend reference
      dailyProgress: {
        caloriesConsumed: result.updatedActivity.caloriesConsumed,
        calorieGoal: result.updatedActivity.calorieGoal,
        goodFoodCount: result.updatedActivity.goodFoodCount,
        badFoodCount: result.updatedActivity.badFoodCount
      }
    });

  } catch (error) {
    console.error("❌ Error adding food item:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

const getMeals = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // Get the optional date parameter
    
    console.log("🟡 I'm being called", id);
    console.log("🟡 Date filter:", date);

    let whereClause = { patientId: id };
    
    // If date is provided, filter by that specific date
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      whereClause.date = {
        gte: startOfDay,
        lte: endOfDay
      };
      
      console.log("🟡 Filtering by date range:", startOfDay, "to", endOfDay);
    }

    // Fetch activities for this patient (filtered by date if provided)
    const activities = await prisma.patientActivity.findMany({
      where: whereClause,
      select: { 
        id: true, 
        calorieGoal: true, 
        caloriesConsumed: true, 
        goodFoodCount: true, 
        badFoodCount: true,
        date: true 
      },
    });

    if (activities.length === 0) {
      // If no activities found for the specific date, return empty structure
      return res.status(200).json({
        success: true,
        calorieGoal: 0,
        caloriesConsumed: 0,
        goodFoodCount: 0,
        badFoodCount: 0,
        meals: {
          BREAKFAST: [],
          LUNCH: [],
          DINNER: [],
          SNACK: [],
        },
      });
    }

    // Collect all activity IDs
    const activityIds = activities.map(a => a.id);

    // Fetch all meals for the filtered activities
    const meals = await prisma.meals.findMany({
      where: { patientActivityId: { in: activityIds } },
      include: {
        foodItems: {
          select: {
            id: true,
            name: true,
            portion: true,
            quantity: true, // Add quantity field
            calories: true,
            classification: true,
          },
        },
      },
      orderBy: { mealType: 'asc' },
    });

    // Group meals by mealType
    const groupedMeals = {
      BREAKFAST: [],
      LUNCH: [],
      DINNER: [],
      SNACK: [],
    };

    for (const meal of meals) {
      const key = meal.mealType.toUpperCase();
      if (!groupedMeals[key]) groupedMeals[key] = [];
      groupedMeals[key].push(meal);
    }

    // Aggregate data across filtered activities
    const calorieGoal = activities.reduce((sum, a) => sum + (a.calorieGoal || 0), 0);
    const caloriesConsumed = activities.reduce((sum, a) => sum + (a.caloriesConsumed || 0), 0);
    const goodFoodCount = activities.reduce((sum, a) => sum + (a.goodFoodCount || 0), 0);
    const badFoodCount = activities.reduce((sum, a) => sum + (a.badFoodCount || 0), 0);

    console.log("✅ Meals fetched successfully for date:", date || "all dates");
    console.log("🎯 Found", activities.length, "activities with", meals.length, "meals");

    res.status(200).json({
      success: true,
      calorieGoal,
      caloriesConsumed,
      goodFoodCount,
      badFoodCount,
      meals: groupedMeals,
    });
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const createAppointment = async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const { title, appointmentDate } = req.body;

    console.log("🔵 Received request to create appointment");
    console.log("🟡 Patient ID:", patientId);
    console.log("🟡 Appointment details:", { title, appointmentDate });

    // Validate required fields
    if (!title || !appointmentDate) {
      console.error("❌ Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Title and appointment date are required"
      });
    }

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      console.error("❌ Patient not found for ID:", patientId);
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        title,
        appointmentDate: new Date(appointmentDate),
      }
    });

    console.log("✅ Appointment created successfully:", appointment.id);
    
    return res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      data: appointment
    });
  } catch (error) {
    console.error("❌ Error creating appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create appointment",
      error: error.message
    });
  }
};

// Update an existing appointment
const updateAppointment = async (req, res) => {
  try {
    const { id: patientId, appointmentId } = req.params;
    const { title, appointmentDate } = req.body;

    console.log("🔵 Received request to update appointment");
    console.log("🟡 Patient ID:", patientId);
    console.log("🟡 Appointment ID:", appointmentId);
    console.log("🟡 Updated details:", { title, appointmentDate });

    // Validate that at least one field is provided
    if (!appointmentDate) {
      console.error("❌ No fields to update provided");
      return res.status(400).json({
        success: false,
        message: "At least one field (title or appointmentDate) must be provided"
      });
    }

    // Check if appointment exists and belongs to this patient
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patientId
      }
    });

    if (!appointment) {
      console.error("❌ Appointment not found or doesn't belong to patient");
      return res.status(404).json({
        success: false,
        message: "Appointment not found or doesn't belong to this patient"
      });
    }

    // Prepare update data
    const updateData = {};
    if (title) updateData.title = title;
    if (appointmentDate) updateData.appointmentDate = new Date(appointmentDate);

    // Update the appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData
    });

    console.log("✅ Appointment updated successfully:", updatedAppointment.id);

    return res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
      data: updatedAppointment
    });
  } catch (error) {
    console.error("❌ Error updating appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update appointment",
      error: error.message
    });
  }
};

// Delete an appointment
const deleteAppointment = async (req, res) => {
  try {
    const { id: patientId, appointmentId } = req.params;

    console.log("🔵 Received request to delete appointment");
    console.log("🟡 Patient ID:", patientId);
    console.log("🟡 Appointment ID:", appointmentId);

    // Check if appointment exists and belongs to this patient
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patientId
      }
    });

    if (!appointment) {
      console.error("❌ Appointment not found or doesn't belong to patient");
      return res.status(404).json({
        success: false,
        message: "Appointment not found or doesn't belong to this patient"
      });
    }

    // Delete the appointment
    await prisma.appointment.delete({
      where: { id: appointmentId }
    });

    console.log("✅ Appointment deleted successfully:", appointmentId);

    return res.status(200).json({
      success: true,
      message: "Appointment deleted successfully"
    });
  } catch (error) {
    console.error("❌ Error deleting appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete appointment",
      error: error.message
    });
  }
};

// Get all appointments for a patient
const getPatientAppointments = async (req, res) => {
  try {
    const { id: patientId } = req.params;
    
    console.log("🔵 Received request to fetch appointments");
    console.log("🟡 Patient ID:", patientId);

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      console.error("❌ Patient not found for ID:", patientId);
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    // Get all appointments for this patient
    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      orderBy: { appointmentDate: 'asc' }
    });

    console.log(`✅ Found ${appointments.length} appointments for patient`);

    // Format appointments for frontend
    const formattedAppointments = appointments.map(appointment => ({
      id: appointment.id,
      title: appointment.title,
      date: appointment.appointmentDate.toISOString(),
    }));

    return res.status(200).json(formattedAppointments);
  } catch (error) {
    console.error("❌ Error fetching appointments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch appointments",
      error: error.message
    });
  }
};

// New function to delete a food item
const deleteFoodItem = async (req, res) => {
  console.log("🔵 Received request to delete food item");
  
  const { userId, mealId, foodItemId } = req.params;
  
  try {
    console.log("🟡 User ID:", userId);
    console.log("🟡 Meal ID:", mealId);
    console.log("🟡 Food Item ID:", foodItemId);

    // Verify that the meal belongs to the user
    const meal = await prisma.meals.findFirst({
      where: {
        id: mealId,
        patientActivity: {
          patientId: userId
        }
      },
      include: {
        foodItems: {
          where: { id: foodItemId }
        },
        patientActivity: true
      }
    });

    if (!meal) {
      return res.status(404).json({
        success: false,
        error: "Meal not found or doesn't belong to user"
      });
    }

    const foodItem = meal.foodItems[0];
    if (!foodItem) {
      return res.status(404).json({
        success: false,
        error: "Food item not found"
      });
    }

    // Calculate totals to subtract
    const totalCaloriesToSubtract = foodItem.calories * foodItem.quantity;
    const goodCountToSubtract = (foodItem.classification === 'GOOD') ? foodItem.quantity : 0;
    const badCountToSubtract = (foodItem.classification === 'BAD') ? foodItem.quantity : 0;

    // Delete the food item and update totals
    const result = await prisma.$transaction(async (tx) => {
      // Delete the food item
      await tx.foodItem.delete({
        where: { id: foodItemId }
      });

      // Update meal totals
      await tx.meals.update({
        where: { id: mealId },
        data: {
          totalCalories: { decrement: totalCaloriesToSubtract },
          foodItemsCount: { decrement: foodItem.quantity },
        }
      });

      // Update activity totals
      const updatedActivity = await tx.patientActivity.update({
        where: { id: meal.patientActivity.id },
        data: {
          caloriesConsumed: { decrement: totalCaloriesToSubtract },
          goodFoodCount: { decrement: goodCountToSubtract },
          badFoodCount: { decrement: badCountToSubtract }
        }
      });

      return { updatedActivity };
    });

    console.log("✅ Food item deleted successfully:", foodItem.name);
    console.log("🎯 Updated calories consumed:", result.updatedActivity.caloriesConsumed);

    res.status(200).json({
      success: true,
      message: "Food item deleted successfully",
      dailyProgress: {
        caloriesConsumed: result.updatedActivity.caloriesConsumed,
        calorieGoal: result.updatedActivity.calorieGoal,
        goodFoodCount: result.updatedActivity.goodFoodCount,
        badFoodCount: result.updatedActivity.badFoodCount
      }
    });

  } catch (error) {
    console.error("❌ Error deleting food item:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// New function to update food item quantity
const updateFoodItemQuantity = async (req, res) => {
  console.log("🔵 Received request to update food item quantity");
  
  const { userId, mealId, foodItemId } = req.params;
  const { quantity } = req.body;
  
  try {
    console.log("🟡 User ID:", userId);
    console.log("🟡 Meal ID:", mealId);
    console.log("🟡 Food Item ID:", foodItemId);
    console.log("🟡 New Quantity:", quantity);

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: "Quantity must be at least 1"
      });
    }

    // Verify that the meal belongs to the user
    const meal = await prisma.meals.findFirst({
      where: {
        id: mealId,
        patientActivity: {
          patientId: userId
        }
      },
      include: {
        foodItems: {
          where: { id: foodItemId }
        },
        patientActivity: true
      }
    });

    if (!meal) {
      return res.status(404).json({
        success: false,
        error: "Meal not found or doesn't belong to user"
      });
    }

    const foodItem = meal.foodItems[0];
    if (!foodItem) {
      return res.status(404).json({
        success: false,
        error: "Food item not found"
      });
    }

    const oldQuantity = foodItem.quantity;
    const quantityDifference = parseInt(quantity) - oldQuantity;
    const caloriesDifference = foodItem.calories * quantityDifference;
    const goodCountDifference = (foodItem.classification === 'GOOD') ? quantityDifference : 0;
    const badCountDifference = (foodItem.classification === 'BAD') ? quantityDifference : 0;

    // Update the food item quantity and totals
    const result = await prisma.$transaction(async (tx) => {
      // Update food item quantity
      const updatedFoodItem = await tx.foodItem.update({
        where: { id: foodItemId },
        data: { quantity: parseInt(quantity) }
      });

      // Update meal totals
      await tx.meals.update({
        where: { id: mealId },
        data: {
          totalCalories: { increment: caloriesDifference },
          foodItemsCount: { increment: quantityDifference },
        }
      });

      // Update activity totals
      const updatedActivity = await tx.patientActivity.update({
        where: { id: meal.patientActivity.id },
        data: {
          caloriesConsumed: { increment: caloriesDifference },
          goodFoodCount: { increment: goodCountDifference },
          badFoodCount: { increment: badCountDifference }
        }
      });

      return { updatedFoodItem, updatedActivity };
    });

    console.log("✅ Food item quantity updated successfully:", foodItem.name, "New quantity:", quantity);
    console.log("🎯 Updated calories consumed:", result.updatedActivity.caloriesConsumed);

    res.status(200).json({
      success: true,
      foodItem: result.updatedFoodItem,
      dailyProgress: {
        caloriesConsumed: result.updatedActivity.caloriesConsumed,
        calorieGoal: result.updatedActivity.calorieGoal,
        goodFoodCount: result.updatedActivity.goodFoodCount,
        badFoodCount: result.updatedActivity.badFoodCount
      }
    });

  } catch (error) {
    console.error("❌ Error updating food item quantity:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

export default {
    getUserActivities,
    logWaterIntake,
    getUserGoals,
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
    addJournalEntry,
    getJournalEntries,
    getJournalEntry,
    upload,
    updateJournalEntry,
    caloriesGoal,
    addMeals,
    getMeals,
    getCalorieHistory,
    createAppointment,
    getPatientAppointments,
    updateAppointment,
    deleteAppointment,
    deleteFoodItem,
    updateFoodItemQuantity
};
