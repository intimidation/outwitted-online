import { memoryStore, type UserRecord } from '../db/store.js';
import { MatchService } from './matchService.js';
import type { RaceId } from '@outwitters/shared';

export interface QueueEntry {
    userId: string;
    preferredRace: RaceId;
    preferredMap?: string;
    pogMode: boolean;
    eloRating: number;
    queuedAt: Date;
}

export class MatchmakerService {
    private static queue: Map<string, QueueEntry> = new Map();

    /**
     * Add a player to the matchmaking queue
     */
    static joinQueue(userId: string, preferredRace: RaceId, preferredMap?: string, pogMode: boolean = false): QueueEntry {
        const user = memoryStore.getUser(userId);
        if (!user) throw new Error(`User ${userId} not found`);

        const activeMatches = memoryStore.getActiveMatchesCount(userId);
        if (activeMatches >= 300) {
            throw new Error(`User has reached the maximum limit of 300 active matches.`);
        }

        const elo = pogMode ? user.pogEloRating : user.eloRating;
        const entry: QueueEntry = {
            userId,
            preferredRace,
            preferredMap: preferredMap || 'SweetTooth',
            pogMode,
            eloRating: elo,
            queuedAt: new Date(),
        };

        this.queue.set(userId, entry);

        // Run immediate matchmaking check
        this.findMatches();

        return entry;
    }

    /**
     * Remove a player from the matchmaking queue
     */
    static leaveQueue(userId: string): boolean {
        return this.queue.delete(userId);
    }

    /**
     * Get queue status for a player
     */
    static getQueueStatus(userId: string) {
        const inQueue = this.queue.has(userId);
        const activeMatches = memoryStore.getUserMatches(userId);
        const latestMatch = activeMatches[0];

        return {
            inQueue,
            latestMatchId: latestMatch ? latestMatch.id : null,
        };
    }

    /**
     * Matchmaking Worker Loop
     * Pairs players based on Elo rating proximity and queue preferences.
     * Enforces separate queues for PoG vs Standard mode.
     */
    private static findMatches() {
        const entries = Array.from(this.queue.values());
        if (entries.length < 2) return;

        // Group by queue type (Standard vs PoG)
        const standardEntries = entries.filter(e => !e.pogMode);
        const pogEntries = entries.filter(e => e.pogMode);

        this.pairEntries(standardEntries);
        this.pairEntries(pogEntries);
    }

    private static pairEntries(pool: QueueEntry[]) {
        if (pool.length < 2) return;

        // Sort by Elo rating to match closest skill levels
        pool.sort((a, b) => a.eloRating - b.eloRating);

        for (let i = 0; i < pool.length - 1; i += 2) {
            const player1 = pool[i];
            const player2 = pool[i + 1];

            // Don't match player against themselves
            if (player1.userId === player2.userId) continue;

            try {
                // Determine map (use player1's preferred map or fallback)
                const chosenMap = player1.preferredMap || player2.preferredMap || 'SweetTooth';

                MatchService.createMatch({
                    creatorUserId: player1.userId,
                    opponentUserId: player2.userId,
                    mapId: chosenMap,
                    isRanked: true, // Queue matches are always ranked
                    pogNerfs: player1.pogMode,
                    creatorRace: player1.preferredRace,
                    opponentRace: player2.preferredRace,
                });

                // Remove both players from queue
                this.queue.delete(player1.userId);
                this.queue.delete(player2.userId);
            } catch (err: any) {
                console.error(`Matchmaking pairing error: ${err.message}`);
            }
        }
    }
}
