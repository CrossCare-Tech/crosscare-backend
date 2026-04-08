import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const engagementController = {
  async logSession(req, res) {
    try {
      const { id } = req.params;
      const { sessionStartAt, sessionEndAt, durationMinutes, messageCount } = req.body;

      if (!sessionStartAt || !sessionEndAt || durationMinutes == null) {
        return res.status(400).json({
          success: false,
          message: "sessionStartAt, sessionEndAt, and durationMinutes are required",
        });
      }

      const engagement = await prisma.aiEngagement.create({
        data: {
          patientId: id,
          sessionStartAt: new Date(sessionStartAt),
          sessionEndAt: new Date(sessionEndAt),
          durationMinutes,
          messageCount: messageCount || 0,
        },
      });

      return res.status(201).json({ success: true, data: engagement });
    } catch (error) {
      console.error("Error logging AI engagement:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async getEngagements(req, res) {
    try {
      const { id } = req.params;

      const engagements = await prisma.aiEngagement.findMany({
        where: { patientId: id },
        orderBy: { createdAt: "desc" },
      });

      // Compute summary stats
      const totalSessions = engagements.length;
      const totalDurationMinutes = engagements.reduce((sum, e) => sum + e.durationMinutes, 0);
      const totalMessages = engagements.reduce((sum, e) => sum + e.messageCount, 0);
      const avgDurationMinutes = totalSessions > 0 ? Math.round((totalDurationMinutes / totalSessions) * 100) / 100 : 0;

      return res.status(200).json({
        success: true,
        data: {
          summary: {
            totalSessions,
            totalDurationMinutes,
            totalMessages,
            avgDurationMinutes,
          },
          sessions: engagements,
        },
      });
    } catch (error) {
      console.error("Error fetching AI engagements:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};

export default engagementController;
