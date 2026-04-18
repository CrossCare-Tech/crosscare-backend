import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticateToken from '../middleware/auth.middleware.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

// POST /api/metrics/start — called when user logs in
router.post('/metrics/start', authenticateToken, async (req, res) => {
  try {
    const id = uuidv4();
    const patientId = req.userId;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "session_metrics" ("id","patientId","loginTime") VALUES ($1,$2,NOW())`,
      id, patientId
    );
    res.status(201).json({ sessionId: id });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// POST /api/metrics/end — called when user logs out or closes app
router.post('/metrics/end', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: 'sessionId is required' });

    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "session_metrics" WHERE "id"=$1 AND "patientId"=$2`,
      sessionId, req.userId
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const session = rows[0];
    const logoutTime = new Date();
    const durationMinutes = parseFloat(
      ((logoutTime - new Date(session.loginTime)) / 1000 / 60).toFixed(2)
    );

    await prisma.$executeRawUnsafe(
      `UPDATE "session_metrics" SET "logoutTime"=$1,"durationMinutes"=$2 WHERE "id"=$3`,
      logoutTime, durationMinutes, sessionId
    );

    res.status(200).json({ message: 'Session ended', durationMinutes });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// GET /api/metrics/history — get all sessions for the logged-in user
router.get('/metrics/history', authenticateToken, async (req, res) => {
  try {
    const sessions = await prisma.$queryRawUnsafe(
      `SELECT "id","patientId","loginTime","logoutTime","durationMinutes"
       FROM "session_metrics" WHERE "patientId"=$1 ORDER BY "loginTime" DESC`,
      req.userId
    );

    const totalMinutes = sessions
      .filter((s) => s.durationMinutes !== null)
      .reduce((sum, s) => sum + Number(s.durationMinutes || 0), 0);

    res.status(200).json({
      totalSessions: sessions.length,
      totalMinutes: parseFloat(totalMinutes.toFixed(2)),
      sessions,
    });
  } catch (error) {
    console.error('Error fetching session history:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

export default router;
