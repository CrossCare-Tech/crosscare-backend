import { PrismaClient, BadgeType, HabitType } from '@prisma/client';
const prisma = new PrismaClient();

// ✅ Award a PatientBadge
const awardPatientBadge = async (req, res) => {
  const { patientId, badgeType } = req.body;

  try {
    const badge = await prisma.badge.findUnique({ where: { type: badgeType } });
    if (!badge) return res.status(404).json({ message: 'Badge not found' });

    const existing = await prisma.patientBadge.findUnique({
      where: {
        patientId_badgeId: {
          patientId,
          badgeId: badge.id,
        },
      },
    });

    if (existing) return res.status(200).json({ message: 'Badge already awarded', badge });

    const awarded = await prisma.patientBadge.create({
      data: {
        patientId,
        badgeId: badge.id,
      },
    });

    res.status(201).json({ message: 'Badge awarded', awarded });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error awarding badge' });
  }
};

// ✅ Get all PatientBadges for a user
const getPatientBadges = async (req, res) => {
    const { id } = req.params;
  
    try {
      const badges = await prisma.patientBadge.findMany({
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
  
      res.status(200).json(badges);
    } catch (err) {
      console.error('❌ Error fetching patient badges:', err);
      res.status(500).json({ error: 'Failed to fetch patient badges' });
    }
  };
  
  

// ✅ Award a HabitBadge
const awardHabitBadge = async (req, res) => {
  const { patientId, habit, badgeType } = req.body;

  try {
    const existing = await prisma.habitBadge.findUnique({
      where: {
        patientId_badgeType: {
          patientId,
          badgeType,
        },
      },
    });

    if (existing) return res.status(200).json({ message: 'Habit badge already awarded' });

    const awarded = await prisma.habitBadge.create({
      data: {
        patientId,
        habit,
        badgeType,
      },
    });

    res.status(201).json({ message: 'Habit badge awarded', awarded });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error awarding habit badge' });
  }
};

// ✅ Get all HabitBadges for a user
 const getHabitBadges = async (req, res) => {
  const { id } = req.params;
  try {
    const badges = await prisma.habitBadge.findMany({
      where: { patientId: id },
    });
    res.status(200).json(badges);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch habit badges' });
  }
};

const awardMilestoneBadge = async (req, res) => {
  try {
    const { patientId, badgeType, title, description } = req.body;
    
    // if (!patientId || !badgeType) {
    //   return res.status(400).json({ 
    //     success: false, 
    //     message: "Patient ID and badge type are required" 
    //   });
    // }
    
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
    
    // Check if the badge exists, create it if not
    let badge = await prisma.badge.findUnique({
      where: { type: badgeType },
    });
    
    if (!badge) {
      badge = await prisma.badge.create({
        data: {
          type: badgeType,
          title: title,
          description: description,
        },
      });
      console.log(`Created badge: ${badgeType}`, badge);
    }
    
    // Check if this badge has already been awarded to the patient
    const existingBadge = await prisma.patientBadge.findUnique({
      where: {
        patientId_badgeId: {
          patientId,
          badgeId: badge.id,
        },
      },
    });
    
    if (existingBadge) {
      return res.status(200).json({
        success: true,
        message: "Badge already awarded",
        badge
      });
    }
    
    // Award the badge
    const awarded = await prisma.patientBadge.create({
      data: {
        patientId,
        badgeId: badge.id,
      },
    });
    
    console.log(`Awarded ${badgeType} badge to patient ${patientId}`, awarded);
    
    return res.status(201).json({
      success: true,
      message: "Badge awarded successfully",
      badge,
      awarded
    });
  } catch (error) {
    console.error("Error awarding milestone badge:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to award badge",
      error: error.message
    });
  }
};

export default { awardHabitBadge, getHabitBadges, getPatientBadges, awardPatientBadge, awardMilestoneBadge }