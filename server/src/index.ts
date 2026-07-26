import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { matchRouter } from './controllers/matchController.js';
import { authRouter } from './controllers/authController.js';
import { matchmakingRouter } from './controllers/matchmakingController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors({
    origin: '*', // Allow all origins for dev/cloud deployment
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/matches', matchRouter);
app.use('/api/auth', authRouter);
app.use('/api/matchmaking', matchmakingRouter);

app.listen(PORT, HOST, () => {
    console.log(`🚀 Outwitters Server running on http://${HOST}:${PORT}`);
});
