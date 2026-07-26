import { Router, Request, Response } from 'express';
import { MatchService } from '../services/matchService.js';
import { memoryStore } from '../db/store.js';

export const matchRouter = Router();

/**
 * POST /api/matches
 * Create a new match
 */
matchRouter.post('/', (req: Request, res: Response) => {
    try {
        const { creatorUserId, opponentUserId, mapId, customMapDef, isRanked, pogNerfs, creatorRace, opponentRace, creatorColor, sideSwap } = req.body;

        if (!creatorUserId || !opponentUserId || !mapId || !creatorRace || !opponentRace) {
            res.status(400).json({ error: 'Missing required parameters (creatorUserId, opponentUserId, mapId, creatorRace, opponentRace)' });
            return;
        }

        const match = MatchService.createMatch({
            creatorUserId,
            opponentUserId,
            mapId,
            customMapDef,
            isRanked,
            pogNerfs,
            creatorRace,
            opponentRace,
            creatorColor,
            sideSwap,
        });

        res.status(201).json({ success: true, match });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Failed to create match' });
    }
});

/**
 * GET /api/matches/open
 * Fetch open matches waiting for an opponent
 */
matchRouter.get('/open', (req: Request, res: Response) => {
    try {
        const userId = (req.query.userId as string) || '';
        const matches = MatchService.getOpenMatches(userId);
        res.json({ success: true, count: matches.length, matches });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Failed to fetch open matches' });
    }
});

/**
 * POST /api/matches/:id/join
 * Join an open match
 */
matchRouter.post('/:id/join', (req: Request, res: Response) => {
    try {
        const matchId = req.params.id;
        const { userId, race } = req.body;

        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }

        const match = MatchService.joinOpenMatch(matchId, userId, race);
        res.json({ success: true, match });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Failed joining match' });
    }
});
matchRouter.get('/', (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) {
        res.status(400).json({ error: 'userId query parameter is required' });
        return;
    }

    const matches = memoryStore.getUserMatches(userId);
    res.json({ success: true, count: matches.length, matches });
});

/**
 * GET /api/matches/:id
 * Get visible game state for a match (filtered with Fog of War)
 */
matchRouter.get('/:id', (req: Request, res: Response) => {
    try {
        const matchId = req.params.id;
        const userId = req.query.userId as string;

        if (!userId) {
            res.status(400).json({ error: 'userId query parameter is required' });
            return;
        }

        const visibleState = MatchService.getVisibleMatchState(matchId, userId);
        res.json({ success: true, match: visibleState });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Failed to fetch match state' });
    }
});

/**
 * POST /api/matches/:id/turns
 * Submit a turn (replayed and validated via shared engine)
 */
matchRouter.post('/:id/turns', (req: Request, res: Response) => {
    try {
        const matchId = req.params.id;
        const { userId, turnNumber, actions } = req.body;

        if (!userId || turnNumber === undefined || !Array.isArray(actions)) {
            res.status(400).json({ error: 'Missing required payload (userId, turnNumber, actions array)' });
            return;
        }

        const result = MatchService.submitTurn({
            userId,
            matchId,
            turnNumber,
            actions,
        });

        res.json({ success: true, result });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Turn submission failed' });
    }
});

/**
 * POST /api/matches/:id/resign
 * Resign / forfeit a match
 */
matchRouter.post('/:id/resign', (req: Request, res: Response) => {
    try {
        const matchId = req.params.id;
        const { userId } = req.body;

        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }

        const result = MatchService.resignMatch(matchId, userId);
        res.json({ success: true, result });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Resignation failed' });
    }
});

/**
 * GET /api/matches/:id/events
 * Real-time SSE endpoint for turn notification alerts
 */
matchRouter.get('/:id/events', (req: Request, res: Response) => {
    const matchId = req.params.id;
    const userId = req.query.userId as string;

    if (!userId) {
        res.status(400).json({ error: 'userId query parameter is required' });
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', matchId, userId })}\n\n`);

    // Poll every 3 seconds for match updates for this user
    const interval = setInterval(() => {
        try {
            const visibleState = MatchService.getVisibleMatchState(matchId, userId);
            res.write(`data: ${JSON.stringify({ type: 'state_update', match: visibleState })}\n\n`);
        } catch (err: any) {
            // Match closed or user invalid
        }
    }, 3000);

    req.on('close', () => {
        clearInterval(interval);
    });
});

/**
 * GET /api/matches/:id/history
 * Fetch full turn history for replay / analyze mode
 */
matchRouter.get('/:id/history', (req: Request, res: Response) => {
    try {
        const matchId = req.params.id;
        const userId = req.query.userId as string;

        if (!userId) {
            res.status(400).json({ error: 'userId query parameter is required' });
            return;
        }

        const history = MatchService.getReplayHistory(matchId, userId);
        res.json({ success: true, history });
    } catch (err: any) {
        res.status(400).json({ error: err.message || 'Failed to fetch replay history' });
    }
});
