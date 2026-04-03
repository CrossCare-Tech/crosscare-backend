import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import authRoutes from './routes/auth.route.js'
import activityRoutes from './routes/activity.route.js'
import userRoutes from './routes/user.route.js'
// import selfcareRoutes from './routes/selfcare.route.js'
import doctorAuthRoutes from './routes/doctor/auth.route.js'
import {GoogleGenerativeAI} from '@google/generative-ai';
import questionaireRoutes from './routes/questionaire.route.js';
import avatarRoutes from './routes/avatar.route.js';
import badgeRoutes from './routes/badge.route.js';
import engagementRoutes from './routes/engagement.route.js';


// Load environment variables
config();

const PORT = process.env.PORT || 5000;
const app = express();


const geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
app.use(express.json());

const allowedOrigins = [
    "*",
];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization"
};

app.use(cors(corsOptions));


// Test API Route
app.get('/', (req, res) => {
  res.send('Supabase Backend is Running');
});

// Patient Routes
app.use('/api', authRoutes);
app.use('/api', activityRoutes);
app.use('/api', userRoutes);
// app.use('/api', selfcareRoutes);
app.use('/api', questionaireRoutes);
app.use('/api', avatarRoutes);
app.use('/api', badgeRoutes);
app.use('/api', engagementRoutes);

// Doctor Routes
// app.use('/api', doctorAuthRoutes);

// 404 handler - must be after all routes
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Global error handler - must be last middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
