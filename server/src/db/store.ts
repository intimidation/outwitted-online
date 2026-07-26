import pkg from 'pg';
const { Pool } = pkg;
import type { GameState, GameParams, GameAction, PlayerId, RaceId, ColorKey } from '@outwitters/shared';

export interface UserRecord {
    id: string;
    username: string;
    displayName: string;
    eloRating: number;
    pogEloRating: number;
    discordId?: string;
    avatarUrl?: string;
}

export interface MatchRecord {
    id: string;
    player1Id: string;
    player2Id: string;
    mapId: string;
    isCustomMap: boolean;
    isRanked: boolean;
    pogNerfs: boolean;
    p1Race: RaceId;
    p2Race: RaceId;
    p1ColorKey: ColorKey;
    p2ColorKey: ColorKey;
    sideSwap: boolean;
    status: 'active' | 'completed' | 'abandoned' | 'draw';
    winnerId?: string | null;
    currentTurnNumber: number;
    currentPlayer: PlayerId;
    gameState: GameState;
    createdAt: Date;
    updatedAt: Date;
}

export interface TurnLogRecord {
    id?: number;
    matchId: string;
    turnNumber: number;
    player: PlayerId;
    actions: GameAction[];
    stateBefore: GameState;
    stateAfter: GameState;
    submittedAt: Date;
}

// Memory fallback store for development without Postgres running
class MemoryStore {
    users: Map<string, UserRecord> = new Map();
    matches: Map<string, MatchRecord> = new Map();
    turnLogs: TurnLogRecord[] = [];

    constructor() {
        // Seed default dev users
        this.users.set('usr_player1', {
            id: 'usr_player1',
            username: 'player1',
            displayName: 'Commander Alpha',
            eloRating: 1200,
            pogEloRating: 1200,
        });
        this.users.set('usr_player2', {
            id: 'usr_player2',
            username: 'player2',
            displayName: 'Commander Bravo',
            eloRating: 1200,
            pogEloRating: 1200,
        });
    }

    getUser(id: string): UserRecord | undefined {
        return this.users.get(id);
    }

    createUser(user: UserRecord): UserRecord {
        this.users.set(user.id, user);
        return user;
    }

    getActiveMatchesCount(userId: string): number {
        let count = 0;
        for (const m of this.matches.values()) {
            if (m.status === 'active' && (m.player1Id === userId || m.player2Id === userId)) {
                count++;
            }
        }
        return count;
    }

    createMatch(match: MatchRecord): MatchRecord {
        this.matches.set(match.id, match);
        return match;
    }

    getMatch(id: string): MatchRecord | undefined {
        return this.matches.get(id);
    }

    getUserMatches(userId: string): MatchRecord[] {
        return Array.from(this.matches.values())
            .filter(m => m.player1Id === userId || m.player2Id === userId)
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }

    updateMatch(match: MatchRecord): MatchRecord {
        match.updatedAt = new Date();
        this.matches.set(match.id, match);
        return match;
    }

    addTurnLog(log: TurnLogRecord): void {
        this.turnLogs.push(log);
    }

    getTurnLogs(matchId: string): TurnLogRecord[] {
        return this.turnLogs
            .filter(l => l.matchId === matchId)
            .sort((a, b) => a.turnNumber - b.turnNumber);
    }
}

export const memoryStore = new MemoryStore();
