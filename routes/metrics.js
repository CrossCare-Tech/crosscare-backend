import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken from "../middleware/auth.middleware.js";

const router = new Router();
const prisma = new PrismaClient();

router.post("/session", authenticateToken, async (req, res) => {
  try {
    const { duration_ms, timestamp } = req.body;
    // auth middleware attaches `req.userId` (see middleware/auth.middleware.js)
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (duration_ms === undefined || duration_ms === null) {
      return res.status(400).json({ error: "Missing session duration" });
    }

    const duration = Number(duration_ms);
    if (Number.isNaN(duration) || duration < 0) {
      return res.status(400).json({ error: "Invalid session duration" });
    }

    const ts = timestamp ? new Date(timestamp) : new Date();
    const created = await prisma.sessionMetric.create({
      data: {
        patientId: userId,
        durationMs: duration,
        timestamp: ts,
      },
    });

    res.status(201).json({ success: true, session: created });
  } catch (error) {
    console.error("Session metrics error:", error);
    res.status(500).json({ error: "Failed to record session" });
  }
});

// GET recent sessions for the authenticated user
// GET /api/metrics/session/recent?limit=10
router.get("/session/recent", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const limit = Math.min(Number(req.query.limit) || 10, 100);
    const sessions = await prisma.sessionMetric.findMany({
      where: { patientId: userId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    res.json({ sessions });
  } catch (err) {
    console.error('Failed to fetch recent sessions', err);
    res.status(500).json({ error: 'Failed to fetch recent sessions' });
  }
});

// GET today's summary for the authenticated user
// GET /api/metrics/session/summary/today
router.get("/session/summary/today", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const startOfDay = new Date();
    startOfDay.setUTCHours(0,0,0,0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const sessionsToday = await prisma.sessionMetric.findMany({
      where: {
        patientId: userId,
        timestamp: { gte: startOfDay, lt: endOfDay }
      }
    });

    const totalMs = sessionsToday.reduce((s, it) => s + it.durationMs, 0);
    const count = sessionsToday.length;
    const avgMs = count ? Math.round(totalMs / count) : 0;

    const lastSession = sessionsToday.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null;

    res.json({ totalMs, count, avgMs, lastSession });
  } catch (err) {
    console.error('Failed to fetch summary', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// GET simple: total seconds logged in today + last logout time
// GET /api/metrics/session/today-simple
router.get("/session/today-simple", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const startOfDay = new Date();
    startOfDay.setUTCHours(0,0,0,0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const sessionsToday = await prisma.sessionMetric.findMany({
      where: {
        patientId: userId,
        timestamp: { gte: startOfDay, lt: endOfDay }
      },
      orderBy: { timestamp: "desc" }
    });

    const totalSeconds = Math.floor(
      sessionsToday.reduce((sum, s) => sum + s.durationMs, 0) / 1000
    );
    const lastLogout = sessionsToday.length > 0 ? sessionsToday[0].timestamp : null;
    const sessionCount = sessionsToday.length;

    res.json({
      totalSeconds,
      lastLogout,
      sessionCount,
      humanReadable: `${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60)}m ${totalSeconds % 60}s`
    });
  } catch (err) {
    console.error('Failed to fetch today simple', err);
    res.status(500).json({ error: 'Failed to fetch today simple' });
  }
});

export default router;