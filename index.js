import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import authRoutes from './routes/auth.route.js'
import activityRoutes from './routes/activity.route.js'
import userRoutes from './routes/user.route.js'
import doctorAuthRoutes from './routes/doctor/auth.route.js'

// Load environment variables
config();

const PORT = process.env.PORT || 5000;
const app = express();


app.use(express.json());
app.use(cors());

// console.log(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

// Initialize Supabase
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
// console.log(supabase);

// Test API Route
app.get('/', (req, res) => {
  res.send('Supabase Backend is Running');
});

// Patient Routes
app.use('/api', authRoutes);
app.use('/api', activityRoutes);
app.use('/api', userRoutes);

// Doctor Routes
// app.use('/api', doctorAuthRoutes);

// Handle Prisma disconnect on app termination


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
