import {
    parseMapConfig,
    createInitialState,
    applyTurn,
    evaluateWin,
    getVisibleState,
    MAPS,
    type GameState,
    type GameParams,
    type GameAction,
    type PlayerId,
    type RaceId,
    type ColorKey,
    type RawMapDefinition,
} from '@outwitters/shared';
import { memoryStore, type MatchRecord, type TurnLogRecord } from '../db/store.js';

export const MAX_ACTIVE_MATCHES_PER_PLAYER = 300;

export interface CreateMatchDTO {
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

export interface SubmitTurnDTO {
    userId: string;
    matchId: string;
    turnNumber: number;
    actions: GameAction[];
}

export class MatchService {

    /**
     * Create a new match between two players.
     * Enforces:
     * - Max 300 active matches per user
     * - Custom maps are forced to UNRANKED
     */
    static createMatch(dto: CreateMatchDTO): MatchRecord {
        // Ensure user records exist in store (auto-provision if needed)
        if (!memoryStore.getUser(dto.creatorUserId)) {
            memoryStore.createUser({
                id: dto.creatorUserId,
                username: dto.creatorUserId.replace('usr_', ''),
                displayName: dto.creatorUserId.replace('usr_', ''),
                eloRating: 1200,
                pogEloRating: 1200,
            });
        }
        if (!memoryStore.getUser(dto.opponentUserId)) {
            memoryStore.createUser({
                id: dto.opponentUserId,
                username: dto.opponentUserId.replace('usr_', ''),
                displayName: dto.opponentUserId.replace('usr_', ''),
                eloRating: 1200,
                pogEloRating: 1200,
            });
        }

        // Enforce 300 active matches limit per player
        const creatorActive = memoryStore.getActiveMatchesCount(dto.creatorUserId);
        if (creatorActive >= MAX_ACTIVE_MATCHES_PER_PLAYER) {
            throw new Error(`Creator has reached the active match limit of ${MAX_ACTIVE_MATCHES_PER_PLAYER}`);
        }

        const opponentActive = memoryStore.getActiveMatchesCount(dto.opponentUserId);
        if (opponentActive >= MAX_ACTIVE_MATCHES_PER_PLAYER) {
            throw new Error(`Opponent has reached the active match limit of ${MAX_ACTIVE_MATCHES_PER_PLAYER}`);
        }

        // Get map definition
        let mapDef: RawMapDefinition;
        const isCustomMap = !!dto.customMapDef;

        if (isCustomMap) {
            mapDef = dto.customMapDef!;
        } else {
            mapDef = MAPS[dto.mapId];
            if (!mapDef) {
                throw new Error(`Map '${dto.mapId}' not found.`);
            }
        }

        // Design decision: Custom maps are UNRANKED only
        const isRanked = isCustomMap ? false : (dto.isRanked ?? true);

        // Randomize or pick turn assignment
        const p1UserId = dto.creatorUserId;
        const p2UserId = dto.opponentUserId;

        const p1ColorKey: ColorKey = dto.creatorColor || 'blue';
        const p2ColorKey: ColorKey = p1ColorKey === 'red' ? 'blue' : 'red';

        const gameParams: GameParams = {
            mapId: dto.mapId,
            p1Race: dto.creatorRace,
            p2Race: dto.opponentRace,
            p1ColorKey,
            p2ColorKey,
            sideSwap: dto.sideSwap || false,
            pogNerfs: dto.pogNerfs || false,
        };

        const mapConfig = parseMapConfig(mapDef, gameParams.sideSwap);
        const initialState = createInitialState(mapConfig, gameParams);

        const matchRecord: MatchRecord = {
            id: 'match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            player1Id: p1UserId,
            player2Id: p2UserId,
            mapId: dto.mapId,
            isCustomMap,
            isRanked,
            pogNerfs: gameParams.pogNerfs,
            p1Race: gameParams.p1Race,
            p2Race: gameParams.p2Race,
            p1ColorKey,
            p2ColorKey,
            sideSwap: gameParams.sideSwap,
            status: 'active',
            winnerId: null,
            currentTurnNumber: 1,
            currentPlayer: 'P1',
            gameState: initialState,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        return memoryStore.createMatch(matchRecord);
    }

    /**
     * Fetch match state filtered for the requesting player.
     * Enforces Fog of War and hides opponent's Wits count.
     */
    static getVisibleMatchState(matchId: string, requestingUserId: string) {
        const match = memoryStore.getMatch(matchId);
        if (!match) {
            throw new Error(`Match ${matchId} not found`);
        }

        if (match.player1Id !== requestingUserId && match.player2Id !== requestingUserId) {
            throw new Error(`User ${requestingUserId} is not a player in match ${matchId}`);
        }

        const playerRole: PlayerId = match.player1Id === requestingUserId ? 'P1' : 'P2';
        const mapDef = MAPS[match.mapId] || MAPS['SweetTooth'];
        const mapConfig = parseMapConfig(mapDef, match.sideSwap);

        // Apply server-side Fog of War filter (which strips/hides opponent wits)
        const visibleState = getVisibleState(match.gameState, playerRole, mapConfig);

        return {
            matchId: match.id,
            mapId: match.mapId,
            isCustomMap: match.isCustomMap,
            isRanked: match.isRanked,
            pogNerfs: match.pogNerfs,
            p1Race: match.p1Race,
            p2Race: match.p2Race,
            p1ColorKey: match.p1ColorKey,
            p2ColorKey: match.p2ColorKey,
            sideSwap: match.sideSwap,
            status: match.status,
            playerRole,
            yourTurn: match.currentPlayer === playerRole,
            currentTurnNumber: match.currentTurnNumber,
            currentPlayerRole: match.currentPlayer,
            winnerId: match.winnerId,
            gameState: visibleState,
            updatedAt: match.updatedAt,
        };
    }

    /**
     * Submit a turn payload.
     * Replays and validates actions using the deterministic shared engine.
     * Atomic turn execution: if any action fails, turn is rejected.
     * No turn undo during live play.
     */
    static submitTurn(dto: SubmitTurnDTO) {
        const match = memoryStore.getMatch(dto.matchId);
        if (!match) {
            throw new Error(`Match ${dto.matchId} not found`);
        }

        if (match.status !== 'active') {
            throw new Error(`Match ${dto.matchId} is not active`);
        }

        const playerRole: PlayerId = match.player1Id === dto.userId ? 'P1' : 'P2';
        if (match.currentPlayer !== playerRole) {
            throw new Error(`It is not user ${dto.userId}'s turn`);
        }

        if (match.currentTurnNumber !== dto.turnNumber) {
            throw new Error(`Turn number mismatch. Server expected turn ${match.currentTurnNumber}, received ${dto.turnNumber}`);
        }

        const mapDef = MAPS[match.mapId] || MAPS['SweetTooth'];
        const mapConfig = parseMapConfig(mapDef, match.sideSwap);

        const gameParams: GameParams = {
            mapId: match.mapId,
            p1Race: match.p1Race,
            p2Race: match.p2Race,
            p1ColorKey: match.p1ColorKey,
            p2ColorKey: match.p2ColorKey,
            sideSwap: match.sideSwap,
            pogNerfs: match.pogNerfs,
        };

        const stateBefore = JSON.parse(JSON.stringify(match.gameState));

        // Replay and validate turn actions via shared engine
        const turnResult = applyTurn(match.gameState, dto.actions, mapConfig, gameParams);
        if (!turnResult.success) {
            throw new Error(`Turn validation failed: ${turnResult.error}`);
        }

        const newState = turnResult.newState;

        // Check for game end / win condition
        const winResult = evaluateWin(newState, mapConfig);
        let winnerId: string | null = null;
        let newStatus: MatchRecord['status'] = 'active';

        if (winResult) {
            if (winResult.winner === 'P1') {
                winnerId = match.player1Id;
                newStatus = 'completed';
            } else if (winResult.winner === 'P2') {
                winnerId = match.player2Id;
                newStatus = 'completed';
            } else {
                newStatus = 'draw';
            }
            // If ranked, calculate and update Elo ratings
            if (match.isRanked && winnerId) {
                this.updateElo(winnerId === match.player1Id ? match.player1Id : match.player2Id,
                               winnerId === match.player1Id ? match.player2Id : match.player1Id,
                               match.pogNerfs);
            }
        }

        // Update match record
        match.gameState = newState;
        match.currentTurnNumber = newState.turnNumber;
        match.currentPlayer = newState.turn;
        match.status = newStatus;
        match.winnerId = winnerId;
        memoryStore.updateMatch(match);

        // Record turn log for replay and auditing
        const turnLog: TurnLogRecord = {
            matchId: match.id,
            turnNumber: dto.turnNumber,
            player: playerRole,
            actions: dto.actions,
            stateBefore,
            stateAfter: newState,
            submittedAt: new Date(),
        };
        memoryStore.addTurnLog(turnLog);

        return {
            success: true,
            status: match.status,
            winnerId: match.winnerId,
            nextTurnNumber: match.currentTurnNumber,
            nextPlayer: match.currentPlayer,
        };
    }

    /**
     * Resign / Forfeit a match.
     */
    static resignMatch(matchId: string, userId: string) {
        const match = memoryStore.getMatch(matchId);
        if (!match) throw new Error(`Match ${matchId} not found`);
        if (match.status !== 'active') throw new Error(`Match is not active`);
        if (match.player1Id !== userId && match.player2Id !== userId) throw new Error(`User is not in this match`);

        const winnerId = userId === match.player1Id ? match.player2Id : match.player1Id;
        match.status = 'abandoned';
        match.winnerId = winnerId;
        memoryStore.updateMatch(match);

        if (match.isRanked) {
            this.updateElo(winnerId, userId, match.pogNerfs);
        }

        return { success: true, winnerId };
    }

    /**
     * Fetch full turn history for replay / analyze mode.
     */
    static getReplayHistory(matchId: string, userId: string) {
        const match = memoryStore.getMatch(matchId);
        if (!match) throw new Error(`Match ${matchId} not found`);
        if (match.player1Id !== userId && match.player2Id !== userId) {
            throw new Error(`User is not authorized to view replay history`);
        }

        const logs = memoryStore.getTurnLogs(matchId);
        return {
            matchId,
            mapId: match.mapId,
            p1Race: match.p1Race,
            p2Race: match.p2Race,
            logs,
        };
    }

    /**
     * Standard Elo calculation update.
     */
    private static updateElo(winnerId: string, loserId: string, isPog: boolean, K: number = 32) {
        const winner = memoryStore.getUser(winnerId);
        const loser = memoryStore.getUser(loserId);
        if (!winner || !loser) return;

        const eloKey = isPog ? 'pogEloRating' : 'eloRating';
        const wRating = winner[eloKey];
        const lRating = loser[eloKey];

        const expectedWinner = 1 / (1 + Math.pow(10, (lRating - wRating) / 400));
        const expectedLoser = 1 - expectedWinner;

        winner[eloKey] = Math.round(wRating + K * (1 - expectedWinner));
        loser[eloKey] = Math.round(lRating + K * (0 - expectedLoser));
    }
}
