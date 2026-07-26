import type { GameAction, RaceId, ColorKey, RawMapDefinition } from '@outwitters/shared';

function getApiBaseUrl(): string {
    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl && typeof envUrl === 'string' && !envUrl.includes('localhost')) {
        return envUrl;
    }
    if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname;
        if (hostname.includes('run.app')) {
            // Google Cloud Run dynamic pairing: outwitters-web-xxx.run.app -> outwitters-api-xxx.run.app
            const apiHost = hostname.replace('outwitters-web', 'outwitters-api');
            return `${window.location.protocol}//${apiHost}/api`;
        }
    }
    return envUrl || 'http://localhost:3001/api';
}

const API_BASE_URL = getApiBaseUrl();

export interface CreateMatchParams {
    creatorUserId: string;
    opponentUserId: string;
    mapId: string;
    customMapDef?: RawMapDefinition;
    isRanked?: boolean;
    pogNerfs?: boolean;
    creatorRace: RaceId;
    opponentRace: RaceId;
    creatorColor?: ColorKey;
    sideSwap?: boolean;
}

export interface VisibleMatchResponse {
    success: boolean;
    match: {
        matchId: string;
        status: 'active' | 'completed' | 'abandoned' | 'draw';
        isRanked: boolean;
        pogNerfs: boolean;
        playerRole: 'P1' | 'P2';
        yourTurn: boolean;
        currentTurnNumber: number;
        currentPlayerRole: 'P1' | 'P2';
        winnerId?: string | null;
        gameState: any; // GameState with opponent wits hidden as -1
        updatedAt: string;
    };
}

export class OutwittersApiClient {
    /**
     * Get or create dev user profile
     */
    static async devLogin(username: string, displayName?: string) {
        const res = await fetch(`${API_BASE_URL}/auth/dev-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, displayName }),
        });
        if (!res.ok) throw new Error('Dev login failed');
        return res.json();
    }

    /**
     * Get active matches for a user
     */
    static async getMatches(userId: string) {
        const res = await fetch(`${API_BASE_URL}/matches?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error('Failed to fetch matches');
        return res.json();
    }

    /**
     * Create a new match
     */
    static async createMatch(params: CreateMatchParams) {
        const res = await fetch(`${API_BASE_URL}/matches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create match');
        return data;
    }

    /**
     * Get visible match state (Fog of War applied by server)
     */
    static async getMatchState(matchId: string, userId: string): Promise<VisibleMatchResponse> {
        const res = await fetch(`${API_BASE_URL}/matches/${encodeURIComponent(matchId)}?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch match state');
        return data;
    }

    /**
     * Submit turn payload
     */
    static async submitTurn(matchId: string, userId: string, turnNumber: number, actions: GameAction[]) {
        const res = await fetch(`${API_BASE_URL}/matches/${encodeURIComponent(matchId)}/turns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, turnNumber, actions }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit turn');
        return data;
    }

    /**
     * Resign match
     */
    static async resignMatch(matchId: string, userId: string) {
        const res = await fetch(`${API_BASE_URL}/matches/${encodeURIComponent(matchId)}/resign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to resign match');
        return data;
    }

    /**
     * Fetch turn history for replay / analyze mode
     */
    static async getReplayHistory(matchId: string, userId: string) {
        const res = await fetch(`${API_BASE_URL}/matches/${encodeURIComponent(matchId)}/history?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch replay history');
        return data;
    }
}
