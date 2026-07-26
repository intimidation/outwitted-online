import type { GameAction, RaceId, ColorKey, RawMapDefinition } from '@outwitters/shared';

// Global debug log buffer for on-screen diagnostics
export const debugLogs: string[] = [];

function logDebug(msg: string) {
    const formatted = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log(formatted);
    debugLogs.push(formatted);
    const debugEl = document.getElementById('debug-log-output');
    if (debugEl) {
        debugEl.textContent = debugLogs.slice(-10).join('\n');
    }
}

export function getApiBaseUrl(): string {
    // Check localStorage override first (allows on-screen editing by user)
    const stored = localStorage.getItem('OUTWITTERS_API_URL');
    if (stored && stored.trim()) {
        return stored.trim();
    }

    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim() && !envUrl.includes('localhost')) {
        return envUrl.trim();
    }

    if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname;
        if (hostname.includes('run.app')) {
            // Google Cloud Run dynamic pairing fallback
            const apiHost = hostname.replace('outwitters-web', 'outwitters-api');
            return `${window.location.protocol}//${apiHost}/api`;
        }
    }
    return envUrl || 'http://localhost:3001/api';
}

export function setCustomApiBaseUrl(url: string) {
    localStorage.setItem('OUTWITTERS_API_URL', url.trim());
    window.location.reload();
}

async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${getApiBaseUrl()}${url}`;
    logDebug(`FETCH -> ${options?.method || 'GET'} ${fullUrl}`);

    try {
        const res = await fetch(fullUrl, options);
        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            logDebug(`ERR (${res.status}) -> ${fullUrl} : ${errText}`);
            throw new Error(`HTTP ${res.status} from ${fullUrl}: ${errText || res.statusText}`);
        }
        logDebug(`OK (${res.status}) -> ${fullUrl}`);
        return res;
    } catch (err: any) {
        const msg = `Network error fetching [${fullUrl}]: ${err.message || 'Failed to fetch'}`;
        logDebug(`FAIL -> ${msg}`);
        throw new Error(msg);
    }
}

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
        playerRole: 'P1' | 'P2';
        yourTurn: boolean;
        currentTurnNumber: number;
        currentPlayerRole: 'P1' | 'P2';
        winnerId?: string | null;
        gameState: any;
        updatedAt: string;
    };
}

export class OutwittersApiClient {
    /**
     * Get or create dev user profile
     */
    static async devLogin(username: string, displayName?: string) {
        const res = await safeFetch('/auth/dev-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, displayName }),
        });
        return res.json();
    }

    /**
     * Get active matches for a user
     */
    static async getMatches(userId: string) {
        const res = await safeFetch(`/matches?userId=${encodeURIComponent(userId)}`);
        return res.json();
    }

    /**
     * Create a new match
     */
    static async createMatch(params: CreateMatchParams) {
        const res = await safeFetch('/matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        return res.json();
    }

    /**
     * Get visible match state
     */
    static async getMatchState(matchId: string, userId: string): Promise<VisibleMatchResponse> {
        const res = await safeFetch(`/matches/${encodeURIComponent(matchId)}?userId=${encodeURIComponent(userId)}`);
        return res.json();
    }

    /**
     * Submit turn payload
     */
    static async submitTurn(matchId: string, userId: string, turnNumber: number, actions: GameAction[]) {
        const res = await safeFetch(`/matches/${encodeURIComponent(matchId)}/turns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, turnNumber, actions }),
        });
        return res.json();
    }

    /**
     * Resign match
     */
    static async resignMatch(matchId: string, userId: string) {
        const res = await safeFetch(`/matches/${encodeURIComponent(matchId)}/resign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        return res.json();
    }

    /**
     * Fetch turn history for replay / analyze mode
     */
    static async getReplayHistory(matchId: string, userId: string) {
        const res = await safeFetch(`/matches/${encodeURIComponent(matchId)}/history?userId=${encodeURIComponent(userId)}`);
        return res.json();
    }
}
