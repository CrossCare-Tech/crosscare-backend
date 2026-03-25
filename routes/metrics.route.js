import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import authenticateToken from '../middleware/auth.middleware.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/metrics/start — called when user logs in
router.post('/metrics/start', authenticateToken, async (req, res) => {
  try {
    const session = await prisma.sessionMetric.create({
      data: {
        patientId: req.userId,
        loginTime: new Date(),
      },
    });
    res.status(201).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /api/metrics/end — called when user logs out or closes app
router.post('/metrics/end', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required' });
    }

    const session = await prisma.sessionMetric.findFirst({
      where: { id: sessionId, patientId: req.userId },
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const logoutTime = new Date();
    const durationMinutes = (logoutTime - new Date(session.loginTime)) / 1000 / 60;

    const updated = await prisma.sessionMetric.update({
      where: { id: sessionId },
      data: {
        logoutTime,
        durationMinutes: parseFloat(durationMinutes.toFixed(2)),
      },
    });

    res.status(200).json({
      message: 'Session ended',
      durationMinutes: updated.durationMinutes,
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET /api/metrics/history — get all sessions for the logged-in user
router.get('/metrics/history', authenticateToken, async (req, res) => {
  try {
    const sessions = await prisma.sessionMetric.findMany({
      where: { patientId: req.userId },
      orderBy: { loginTime: 'desc' },
    });

    const totalMinutes = sessions
      .filter((s) => s.durationMinutes !== null)
      .reduce((sum, s) => sum + s.durationMinutes, 0);

    res.status(200).json({
      totalSessions: sessions.length,
      totalMinutes: parseFloat(totalMinutes.toFixed(2)),
      sessions,
    });
  } catch (error) {
    console.error('Error fetching session history:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
