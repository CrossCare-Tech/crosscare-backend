import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import authRoutes from './routes/auth.route.js'
import activityRoutes from './routes/activity.route.js'
import userRoutes from './routes/user.route.js'
import doctorAuthRoutes from './routes/doctor/auth.route.js'
import {GoogleGenerativeAI} from '@google/generative-ai';

// Load environment variables
config();

const PORT = process.env.PORT || 5000;
const app = express();

const geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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


const digitalDoulaDocs = `
A **digital doula** is a virtual assistant providing emotional, informational, and physical support for pregnant women through online platforms. They help with:
- **Prenatal Education:** Guidance on nutrition, exercise, and mental well-being.
- **Labor & Birth Support:** Breathing techniques, pain management tips, and real-time virtual coaching.
- **Postpartum Care:** Breastfeeding guidance, newborn care, and emotional support.
Digital doulas use AI-powered tools to offer personalized advice, reducing stress and improving birth outcomes.
`;

// Mock function to transcribe audio (you'll replace this with your actual transcription logic)
const transcribeAudioToText = async (audioUri) => {
    // Assume this function sends the audio file to a transcription API and returns the transcribed text.
    // For example, you could use Google Cloud Speech-to-Text, or any other transcription service.

    return "Transcribed text from audio";  // Placeholder for the actual transcription result
};

// API Route to handle Gemini queries with RAG
app.post('/ask-gemini', async (req, res) => {
    try {
        const { prompt, type } = req.body;

        if (!prompt) return res.status(400).json({ error: "Prompt is required!" });
        if (!type) return res.status(400).json({ error: "Message type is required!" });
        if (type !== "text" && type !== "audio") return res.status(400).json({ error: "Invalid message type!" });

        const model = geminiAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        let query;
        let userQuestion;

        if (type === "text") {
            userQuestion = prompt;
        } else if (type === "audio") {
            // Transcribe audio to text
            userQuestion = await transcribeAudioToText(prompt);  // Assuming prompt is the audio URI or path
        }

        // Combine prompt with Digital Doula contextual data
        query = `Use the following knowledge to answer the question:\n\n${digitalDoulaDocs}\n\nUser question: ${userQuestion}`;

        const result = await model.generateContent(query);
        const responseText = result.response.text();

        res.json({ response: responseText });
    } catch (error) {
        console.error("Gemini Error:", error);
        res.status(500).json({ error: "Something went wrong!" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
