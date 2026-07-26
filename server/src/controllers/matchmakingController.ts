import { Router, Request, Response } from 'express';
import { MatchmakerService } from '../services/matchmaker.js';

export const matchmakingRouter = Router();

/**
 * POST /api/matchmaking/join
 * Join the matchmaking queue
 */
matchmakingRouter.post('/join', (req: Request, res: Response) => {
    try {
        const { userId, preferredRace, preferredMap, pogMode } = req.body;
        if (!userId || !preferredRace) {
            res.status(400).json({ error: 'userId and preferredRace are required' });
            return;
        }

        const entry = MatchmakerService.joinQueue(userId, preferredRace, preferredMap, pogMode || false);
        res.json({ success: true, entry });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Failed to join queue' });
    }
});

/**
 * POST /api/matchmaking/leave
 * Leave the matchmaking queue
 */
matchmakingRouter.post('/leave', (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }

        const removed = MatchmakerService.leaveQueue(userId);
        res.json({ success: true, removed });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Failed to leave queue' });
    }
});

/**
 * GET /api/matchmaking/status
 * Get queue & match search status for a user
 */
matchmakingRouter.get('/status', (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        if (!userId) {
            res.status(400).json({ error: 'userId parameter is required' });
            return;
        }

        const status = MatchmakerService.getQueueStatus(userId);
        res.json({ success: true, status });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Failed to check status' });
    }
});
