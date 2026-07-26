import { Router, Request, Response } from 'express';
import { memoryStore } from '../db/store.js';

export const authRouter = Router();

/**
 * GET /api/auth/me
 * Get current user profile (Dev / Session)
 */
authRouter.get('/me', (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || 'usr_player1';
    const user = memoryStore.getUser(userId);

    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    res.json({ success: true, user });
});

/**
 * POST /api/auth/dev-login
 * Dev helper to switch active user / register test user
 */
authRouter.post('/dev-login', (req: Request, res: Response) => {
    const { username, displayName } = req.body;
    if (!username) {
        res.status(400).json({ error: 'username is required' });
        return;
    }

    const id = 'usr_' + username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    let existing = memoryStore.getUser(id);

    if (!existing) {
        existing = memoryStore.createUser({
            id,
            username,
            displayName: displayName || username,
            eloRating: 1200,
            pogEloRating: 1200,
        });
    }

    res.json({ success: true, user: existing });
});

/**
 * GET /api/leaderboard
 * Fetch top players by Elo
 */
authRouter.get('/leaderboard', (req: Request, res: Response) => {
    const mode = (req.query.mode as string) === 'pog' ? 'pogEloRating' : 'eloRating';
    const users = Array.from(memoryStore.users.values())
        .sort((a, b) => b[mode] - a[mode])
        .slice(0, 100);

    res.json({ success: true, mode, leaderboard: users });
});
