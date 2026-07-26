/**
 * Outwitters Shared Game Engine
 *
 * CRITICAL DESIGN RULE: Every function in this module is PURE.
 * No globals. No DOM. No side effects. Given the same inputs, always the same output.
 * This module runs identically on client and server.
 *
 * Ported from Gamelogic.html — original functions referenced in comments.
 */

import type {
    HexCoord, GridHex, PlayerId, GameState, GameParams,
    MapConfig, RawMapDefinition, Unit, UnitType, GameAction,
    ActionResult, WinResult, ValidTarget, DamageEvent,
} from './types.js';
import { UNIT_RULES, MAX_WITS, BASE_INCOME, INCOME_START_TURN, STARTING_WITS_P1, STARTING_WITS_P2, STARTING_BASE_HP } from './constants.js';
import { HEX_DIRECTIONS } from './types.js';


// ═══════════════════════════════════════════════════════════════
// HEX MATH UTILITIES
// ═══════════════════════════════════════════════════════════════

/** Convert axial hex coordinates to pixel position. (Gamelogic.html L2988) */
export function hexToPixel(q: number, r: number, hexRadius: number): { x: number; y: number } {
    return {
        x: hexRadius * 3 / 2 * q,
        y: hexRadius * Math.sqrt(3) * (r + q / 2),
    };
}

/** Round fractional axial coordinates to the nearest hex. (Gamelogic.html L2993-2998) */
export function hexRound(q: number, r: number): HexCoord {
    const s = -q - r;
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    const qD = Math.abs(rq - q), rD = Math.abs(rr - r), sD = Math.abs(rs - s);
    if (qD > rD && qD > sD) rq = -rr - rs;
    else if (rD > sD) rr = -rq - rs;
    return { q: rq, r: rr };
}

/** Manhattan-like hex distance between two hexes. (Gamelogic.html L3000) */
export function getDistance(a: HexCoord, b: HexCoord): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs((-a.q - a.r) - (-b.q - b.r))) / 2;
}

/** Get all valid neighbors of a hex position that exist on the grid. (Gamelogic.html L3001-3004) */
export function getNeighbors(q: number, r: number, grid: GridHex[]): HexCoord[] {
    return HEX_DIRECTIONS
        .map(d => ({ q: q + d.q, r: r + d.r }))
        .filter(pos => grid.some(g => g.q === pos.q && g.r === pos.r));
}

/** Get all neighbor coords (no grid filter — for geometry operations) */
export function getNeighborCoords(q: number, r: number): HexCoord[] {
    return HEX_DIRECTIONS.map(d => ({ q: q + d.q, r: r + d.r }));
}


// ═══════════════════════════════════════════════════════════════
// GRID & MAP QUERIES (pure — take map/state as params)
// ═══════════════════════════════════════════════════════════════

/** Check if a hex is an obstacle. (Gamelogic.html L3006-3009) */
export function isObstacle(q: number, r: number, mapConfig: MapConfig): boolean {
    return (mapConfig.parsedObstacles ?? []).some(o => o.q === q && o.r === r);
}

/** Check if a hex is a bonus space. (Gamelogic.html L3010-3013) */
export function isBonusSpace(q: number, r: number, mapConfig: MapConfig): boolean {
    return (mapConfig.parsedBonusSpaces ?? []).some(b => b.q === q && b.r === r);
}

/** Find a unit occupying a specific hex. (Gamelogic.html L3014-3017) */
export function getUnitAt(q: number, r: number, state: GameState): Unit | undefined {
    return state.units.find(u => u.q === q && u.r === r);
}

/** Check if a hex belongs to a player's base (center or surround). (Gamelogic.html L3036-3047) */
export function isBase(q: number, r: number, player: PlayerId, mapConfig: MapConfig): boolean {
    const b = mapConfig.parsedBases[player];
    if (b && q === b.q && r === b.r) return true;
    const surr = player === 'P1' ? mapConfig.parsedP1Surround : mapConfig.parsedP2Surround;
    return (surr ?? []).some(h => h.q === q && h.r === r);
}


// ═══════════════════════════════════════════════════════════════
// LINE OF SIGHT
// ═══════════════════════════════════════════════════════════════

/**
 * Check if there is line of sight from start to end for a given unit.
 * Uses BFS along the shortest-path corridor — obstacles and enemy units block.
 * (Gamelogic.html L3049-3074)
 */
export function hasLoS(
    start: HexCoord, end: HexCoord, unit: Unit,
    state: GameState, mapConfig: MapConfig
): boolean {
    const targetDist = getDistance(start, end);
    if (targetDist <= 1) return true;

    const queue: Array<{ q: number; r: number; dist: number }> = [
        { q: start.q, r: start.r, dist: 0 },
    ];
    const visited = new Set<string>([`${start.q},${start.r}`]);

    while (queue.length > 0) {
        const curr = queue.shift()!;
        for (const d of HEX_DIRECTIONS) {
            const n = { q: curr.q + d.q, r: curr.r + d.r };
            if (getDistance(n, end) === targetDist - curr.dist - 1) {
                if (n.q === end.q && n.r === end.r) return true;
                const key = `${n.q},${n.r}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    if (isObstacle(n.q, n.r, mapConfig)) continue;
                    const u = getUnitAt(n.q, n.r, state);
                    if (u && u.player !== unit.player) continue;
                    queue.push({ q: n.q, r: n.r, dist: curr.dist + 1 });
                }
            }
        }
    }
    return false;
}


// ═══════════════════════════════════════════════════════════════
// VISION / FOG OF WAR
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate the set of visible hexes for a player.
 * Returns a Set of "q,r" strings.
 * (Gamelogic.html L2768-2796)
 */
export function calculateVision(
    player: PlayerId, state: GameState, mapConfig: MapConfig
): Set<string> {
    const visible = new Set<string>();

    function addSource(q: number, r: number, range: number): void {
        const queue: Array<{ q: number; r: number; d: number }> = [{ q, r, d: 0 }];
        const localVisited = new Set<string>([`${q},${r}`]);
        visible.add(`${q},${r}`);

        while (queue.length > 0) {
            const curr = queue.shift()!;
            if (curr.d >= range) continue;
            for (const d of HEX_DIRECTIONS) {
                const nq = curr.q + d.q, nr = curr.r + d.r;
                const key = `${nq},${nr}`;
                if (!isObstacle(nq, nr, mapConfig) && !localVisited.has(key)) {
                    localVisited.add(key);
                    visible.add(key);
                    const occ = getUnitAt(nq, nr, state);
                    if (!occ || occ.player === player) {
                        queue.push({ q: nq, r: nr, d: curr.d + 1 });
                    }
                }
            }
        }
    }

    state.units
        .filter(u => u.player === player)
        .forEach(u => {
            const vRange = u.type === 'Thorn'
                ? 2
                : Math.max(u.moveRange, u.attackRange);
            addSource(u.q, u.r, vRange);
        });

    return visible;
}

/**
 * Filter game state to only include information visible to a specific player.
 * This is the critical anti-cheat function — the server MUST call this
 * before sending state to a client.
 */
export function getVisibleState(
    fullState: GameState, forPlayer: PlayerId, mapConfig: MapConfig
): GameState {
    const vision = calculateVision(forPlayer, fullState, mapConfig);
    const opponent: PlayerId = forPlayer === 'P1' ? 'P2' : 'P1';
    return {
        ...fullState,
        units: fullState.units.filter(u =>
            u.player === forPlayer || vision.has(`${u.q},${u.r}`)
        ),
        // Design decision: opponent wits are HIDDEN
        wits: {
            ...fullState.wits,
            [opponent]: -1, // Sentinel value — client renders as "?"
        },
    };
}


// ═══════════════════════════════════════════════════════════════
// MOVE & TARGET VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate all valid move destinations for a unit.
 * (Gamelogic.html L3076-3101)
 *
 * @param useFogOfWar - If true, fog-of-war affects pathfinding (client-side).
 *                      Server should pass false since it has full state.
 */
export function calculateValidMoves(
    unit: Unit, state: GameState, mapConfig: MapConfig,
    useFogOfWar: boolean = false
): HexCoord[] {
    if (unit.moved || state.wits[state.turn] < 1 || unit.moveRange === 0) return [];

    const grid = mapConfig.geomGrid;
    const visited = new Set<string>([`${unit.q},${unit.r}`]);
    const reachable: HexCoord[] = [];
    const queue: Array<{ q: number; r: number; depth: number }> = [
        { q: unit.q, r: unit.r, depth: 0 },
    ];

    const currentVision = useFogOfWar ? calculateVision(state.turn, state, mapConfig) : null;

    while (queue.length > 0) {
        const curr = queue.shift()!;
        if (curr.depth > 0) {
            const occupant = getUnitAt(curr.q, curr.r, state);
            if (!occupant || occupant === unit) {
                reachable.push({ q: curr.q, r: curr.r });
            }
        }
        if (curr.depth >= unit.moveRange) continue;

        for (const n of getNeighbors(curr.q, curr.r, grid)) {
            const key = `${n.q},${n.r}`;
            if (!visited.has(key) && !isObstacle(n.q, n.r, mapConfig)) {
                const occ = getUnitAt(n.q, n.r, state);
                const isVisible = !useFogOfWar || currentVision!.has(`${n.q},${n.r}`);
                const knownOcc = (occ && (occ.player === unit.player || isVisible)) ? occ : null;
                if (!knownOcc || knownOcc.player === unit.player) {
                    visited.add(key);
                    queue.push({ q: n.q, r: n.r, depth: curr.depth + 1 });
                }
            }
        }
    }
    return reachable;
}

/**
 * Calculate all valid targets for a unit's action (attack, heal, scramble, siege, etc).
 * (Gamelogic.html L3103-3156)
 */
export function calculateValidTargets(
    unit: Unit, state: GameState, mapConfig: MapConfig, gameParams: GameParams,
    useFogOfWar: boolean = false
): ValidTarget[] {
    if (unit.attacked || state.wits[state.turn] < 1) return [];

    const grid = mapConfig.geomGrid;
    const targets: ValidTarget[] = [];
    const enemy: PlayerId = unit.player === 'P1' ? 'P2' : 'P1';
    const currentVision = useFogOfWar ? calculateVision(state.turn, state, mapConfig) : null;
    const isVisible = (q: number, r: number) => !useFogOfWar || currentVision!.has(`${q},${r}`);

    if (unit.attackRange > 0) {
        if (unit.type === 'Medic') {
            // Heal friendly units in range
            state.units.forEach(t => {
                if (t.player === unit.player && t !== unit && getDistance(unit, t) <= unit.attackRange) {
                    targets.push({ q: t.q, r: t.r });
                }
            });
        } else if (unit.type === 'Scrambler') {
            // Convert enemy units in range
            state.units.forEach(t => {
                if (t.player !== unit.player && getDistance(unit, t) <= unit.attackRange && isVisible(t.q, t.r)) {
                    targets.push({ q: t.q, r: t.r, special: 'Scramble' });
                }
            });
        } else if (unit.type === 'Mobi') {
            // Select a friendly unit to teleport
            state.units.forEach(t => {
                if (t.player === unit.player && t !== unit) {
                    targets.push({ q: t.q, r: t.r, special: 'MobiSelectTarget' });
                }
            });
        } else if (unit.type === 'BrambleSieged') {
            // Place thorns within range 2
            const visited = new Set<string>();
            const bfsQueue: Array<{ q: number; r: number; d: number }> = [
                { q: unit.q, r: unit.r, d: 0 },
            ];
            while (bfsQueue.length > 0) {
                const curr = bfsQueue.shift()!;
                if (curr.d > 0 && !getUnitAt(curr.q, curr.r, state) && !isObstacle(curr.q, curr.r, mapConfig)) {
                    targets.push({ q: curr.q, r: curr.r, special: 'Bramble' });
                }
                if (curr.d >= 2) continue;
                getNeighbors(curr.q, curr.r, grid).forEach(n => {
                    const key = `${n.q},${n.r}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        bfsQueue.push({ q: n.q, r: n.r, d: curr.d + 1 });
                    }
                });
            }
        } else if (unit.type === 'Thorn') {
            // Attack enemy units and bases in range
            grid.forEach(hex => {
                const dist = getDistance(unit, hex);
                if (dist > 0 && dist <= unit.attackRange) {
                    const tUnit = getUnitAt(hex.q, hex.r, state);
                    if ((tUnit && tUnit.player !== unit.player && isVisible(hex.q, hex.r)) ||
                        isBase(hex.q, hex.r, enemy, mapConfig)) {
                        targets.push({ q: hex.q, r: hex.r });
                    }
                }
            });
        } else if (unit.type === 'BombshellSieged' || unit.type === 'Sniper') {
            // Long-range attack with LoS check
            grid.forEach(hex => {
                const dist = getDistance(unit, hex);
                if (dist > 0 && dist <= unit.attackRange && hasLoS(unit, hex, unit, state, mapConfig)) {
                    const tUnit = getUnitAt(hex.q, hex.r, state);
                    if ((tUnit && tUnit.player !== unit.player && isVisible(hex.q, hex.r)) ||
                        isBase(hex.q, hex.r, enemy, mapConfig) ||
                        unit.type === 'BombshellSieged') {
                        targets.push({ q: hex.q, r: hex.r });
                    }
                }
            });
        } else {
            // Standard melee attack
            grid.forEach(hex => {
                const dist = getDistance(unit, hex);
                if (dist > 0 && dist <= unit.attackRange) {
                    const tUnit = getUnitAt(hex.q, hex.r, state);
                    if ((tUnit && tUnit.player !== unit.player && isVisible(hex.q, hex.r)) ||
                        isBase(hex.q, hex.r, enemy, mapConfig)) {
                        targets.push({ q: hex.q, r: hex.r });
                    }
                }
            });
        }
    }

    // Siege toggle (Bombshell/Bramble ↔ Sieged variants)
    if (['Bombshell', 'BombshellSieged', 'Bramble', 'BrambleSieged'].includes(unit.type) &&
        state.wits[unit.player] >= 1 && !unit.attacked) {
        targets.push({ q: unit.q, r: unit.r, special: 'ToggleSiege' });
    }

    return targets;
}


// ═══════════════════════════════════════════════════════════════
// STATE MUTATIONS (all return NEW state — never mutate input)
// ═══════════════════════════════════════════════════════════════

/** Generate a unique unit ID */
function generateUnitId(): string {
    return 'unit_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
}

/** Deep-clone a game state */
export function cloneState(state: GameState): GameState {
    return {
        turn: state.turn,
        turnNumber: state.turnNumber,
        wits: { ...state.wits },
        baseHp: { ...state.baseHp },
        units: state.units.map(u => ({ ...u })),
        bonusSpaces: JSON.parse(JSON.stringify(state.bonusSpaces)),
        spawnsUsedThisTurn: [...state.spawnsUsedThisTurn],
        pendingSpawnType: state.pendingSpawnType,
    };
}

/**
 * Remove thorns whose parent BrambleSieged no longer exists or has unsieged.
 * (Gamelogic.html L3019-3034)
 */
function cleanUpOrphanedThorns(units: Unit[]): Unit[] {
    let changed = true;
    let result = [...units];
    while (changed) {
        const initialCount = result.length;
        result = result.filter(u => {
            if (u.type !== 'Thorn') return true;
            if (u.parentId === 'sandbox') return true;
            if (!u.parentId) return false;
            const parent = result.find(p => p.id === u.parentId);
            if (!parent) return false;
            if (parent.type === 'Bramble') return false;
            return true;
        });
        changed = result.length !== initialCount;
    }
    return result;
}

/**
 * Apply damage events to the game state.
 * Returns a new state with damage applied, units killed, and wit bounty awarded.
 * (Gamelogic.html L2798-2817)
 */
function applyDamageEvents(
    state: GameState, events: DamageEvent[], attackerPlayer: PlayerId, mapConfig: MapConfig
): GameState {
    const newState = cloneState(state);
    const baseDmg: Record<PlayerId, number> = { P1: 0, P2: 0 };

    events.forEach(evt => {
        if (isBase(evt.q, evt.r, 'P1', mapConfig)) {
            if (attackerPlayer !== 'P1') baseDmg.P1 = Math.max(baseDmg.P1, evt.amt);
        } else if (isBase(evt.q, evt.r, 'P2', mapConfig)) {
            if (attackerPlayer !== 'P2') baseDmg.P2 = Math.max(baseDmg.P2, evt.amt);
        } else {
            const u = newState.units.find(u => u.q === evt.q && u.r === evt.r);
            if (u && u.player !== attackerPlayer) u.hp -= evt.amt;
        }
    });

    newState.baseHp.P1 -= baseDmg.P1;
    newState.baseHp.P2 -= baseDmg.P2;

    // Award wits for kills
    const kills = newState.units.filter(u => u.hp <= 0 && u.player !== attackerPlayer).length;
    if (kills > 0) {
        newState.wits[attackerPlayer] = Math.min(MAX_WITS, newState.wits[attackerPlayer] + kills);
    }

    // Remove dead units and clean up orphaned thorns
    newState.units = newState.units.filter(u => u.hp > 0);
    newState.units = cleanUpOrphanedThorns(newState.units);

    return newState;
}


// ═══════════════════════════════════════════════════════════════
// ACTION EXECUTION (the core engine function)
// ═══════════════════════════════════════════════════════════════

/**
 * Apply a single action to the game state.
 * Returns { success, newState, error }.
 *
 * This is the server's validation function. Every action is checked for legality.
 * (Gamelogic.html L2819-2913 — `executeCommand`)
 */
export function applyAction(
    state: GameState, action: GameAction, mapConfig: MapConfig, gameParams: GameParams
): ActionResult {
    const newState = cloneState(state);

    if (action.action === 'ADD_WIT') {
        if (newState.wits[action.player] >= MAX_WITS) {
            return { success: false, newState: state, error: 'Wits already at maximum' };
        }
        newState.wits[action.player]++;
        return { success: true, newState };
    }

    if (action.action === 'SPAWN') {
        const rules = UNIT_RULES[action.unitType];
        if (!rules) return { success: false, newState: state, error: 'Invalid unit type' };
        if (newState.wits[newState.turn] < rules.cost) {
            return { success: false, newState: state, error: 'Not enough wits' };
        }
        if (getUnitAt(action.toQ, action.toR, newState)) {
            return { success: false, newState: state, error: 'Hex is occupied' };
        }

        const isSpawn = mapConfig.parsedSpawns[newState.turn]
            .some(s => s.q === action.toQ && s.r === action.toR);
        if (!isSpawn || newState.spawnsUsedThisTurn.includes(`${action.toQ},${action.toR}`)) {
            return { success: false, newState: state, error: 'Invalid spawn location' };
        }

        newState.wits[newState.turn] -= rules.cost;
        newState.spawnsUsedThisTurn.push(`${action.toQ},${action.toR}`);

        let maxHp = rules.maxHp;
        if (action.unitType === 'Mobi' && gameParams.pogNerfs) maxHp = 1;

        newState.units.push({
            id: generateUnitId(),
            type: action.unitType,
            player: newState.turn,
            q: action.toQ, r: action.toR,
            hp: maxHp, maxHp,
            moveRange: rules.moveRange,
            attackRange: rules.attackRange,
            damage: rules.damage ?? 0,
            heal: rules.heal ?? 0,
            moved: false, attacked: false,
        });
        return { success: true, newState };
    }

    if (action.action === 'MOVE') {
        const u = newState.units.find(u => u.q === action.fromQ && u.r === action.fromR);
        if (!u || u.player !== newState.turn || u.moved) {
            return { success: false, newState: state, error: 'Invalid move source' };
        }

        // Validate move is legal (server uses no fog-of-war)
        const validMoves = calculateValidMoves(u, newState, mapConfig, false);
        if (!validMoves.some(m => m.q === action.toQ && m.r === action.toR)) {
            return { success: false, newState: state, error: 'Invalid move destination' };
        }

        newState.wits[newState.turn] -= 1;
        u.q = action.toQ;
        u.r = action.toR;
        u.moved = true;
        return { success: true, newState };
    }

    if (action.action === 'ACT') {
        const u = newState.units.find(u => u.q === action.fromQ && u.r === action.fromR);
        if (!u || u.player !== newState.turn || u.attacked) {
            return { success: false, newState: state, error: 'Invalid act source' };
        }

        // Handle Mobi Teleport separately
        if (action.special === 'MobiTeleport') {
            const tgtU = newState.units.find(t => t.q === action.targetQ && t.r === action.targetR);
            if (!tgtU || tgtU.player !== newState.turn) {
                return { success: false, newState: state, error: 'Invalid teleport target' };
            }
            const isNeighbor = getDistance(u, { q: action.toQ, r: action.toR }) === 1;
            const occ = getUnitAt(action.toQ, action.toR, newState);
            if (!isNeighbor || isObstacle(action.toQ, action.toR, mapConfig) || (occ && occ !== tgtU)) {
                return { success: false, newState: state, error: 'Invalid teleport destination' };
            }

            newState.wits[newState.turn] -= 1;
            u.attacked = true;
            tgtU.q = action.toQ;
            tgtU.r = action.toR;
            tgtU.moved = true;
            return { success: true, newState };
        }

        // Validate target using full target calculation (server: no fog)
        const validTargets = calculateValidTargets(u, newState, mapConfig, gameParams, false);
        const tgtMatch = validTargets.find(t =>
            t.q === action.toQ && t.r === action.toR && t.special === action.special
        );
        if (!tgtMatch) {
            return { success: false, newState: state, error: 'Invalid action target' };
        }

        newState.wits[newState.turn] -= 1;

        // Handle siege toggle
        if (action.special === 'ToggleSiege') {
            const overheal = u.hp > u.maxHp ? 1 : 0;
            const isSieging = (u.type === 'Bombshell' || u.type === 'Bramble');

            const typeMap: Record<string, UnitType> = {
                'Bombshell': 'BombshellSieged',
                'BombshellSieged': 'Bombshell',
                'Bramble': 'BrambleSieged',
                'BrambleSieged': 'Bramble',
            };
            u.type = typeMap[u.type] ?? u.type;
            const newRules = UNIT_RULES[u.type];
            u.maxHp = newRules.maxHp;
            u.hp = newRules.maxHp + overheal;
            u.moveRange = newRules.moveRange;
            u.attackRange = newRules.attackRange;
            u.damage = newRules.damage ?? 0;

            if (isSieging) {
                u.moved = true;
                u.attacked = u.type !== 'BrambleSieged';
            } else {
                u.attacked = false;
                u.moved = false;
            }
            newState.units = cleanUpOrphanedThorns(newState.units);
            return { success: true, newState };
        }

        // Mark action as used
        u.attacked = true;

        if (action.special === 'Scramble') {
            const targetU = newState.units.find(t => t.q === action.toQ && t.r === action.toR);
            if (targetU) {
                targetU.player = newState.turn;
                targetU.hp = 1;
                targetU.moved = false;
                targetU.attacked = false;
            }
        } else if (action.special === 'Bramble') {
            newState.units.push({
                id: generateUnitId(),
                parentId: u.id,
                type: 'Thorn',
                player: newState.turn,
                q: action.toQ, r: action.toR,
                hp: 2, maxHp: 2,
                moveRange: 0, attackRange: 1,
                damage: 1, heal: 0,
                moved: false, attacked: false,
            });
        } else if (u.type === 'BombshellSieged') {
            // AoE damage: 3 to center, 1 to neighbors
            const dmgEvts: DamageEvent[] = [{ q: action.toQ, r: action.toR, amt: 3 }];
            getNeighbors(action.toQ, action.toR, mapConfig.geomGrid)
                .forEach(n => dmgEvts.push({ q: n.q, r: n.r, amt: 1 }));
            const afterDmg = applyDamageEvents(newState, dmgEvts, newState.turn, mapConfig);
            return { success: true, newState: afterDmg };
        } else if (u.type === 'Medic') {
            const targetU = newState.units.find(t => t.q === action.toQ && t.r === action.toR);
            if (targetU) targetU.hp = targetU.maxHp + 1;
        } else {
            // Standard attack
            const afterDmg = applyDamageEvents(
                newState,
                [{ q: action.toQ, r: action.toR, amt: u.damage }],
                newState.turn,
                mapConfig
            );
            return { success: true, newState: afterDmg };
        }

        return { success: true, newState };
    }

    return { success: false, newState: state, error: 'Unknown action type' };
}


// ═══════════════════════════════════════════════════════════════
// TURN MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Apply a sequence of actions for a complete turn, then transition to the next player.
 * This is the server's main entry point for processing a turn submission.
 *
 * Returns the state after all actions + end-of-turn processing.
 */
export function applyTurn(
    state: GameState, actions: GameAction[], mapConfig: MapConfig, gameParams: GameParams
): ActionResult {
    let currentState = cloneState(state);

    // Apply each action sequentially
    for (let i = 0; i < actions.length; i++) {
        const result = applyAction(currentState, actions[i], mapConfig, gameParams);
        if (!result.success) {
            return {
                success: false,
                newState: state,
                error: `Action ${i} failed: ${result.error}`,
            };
        }
        currentState = result.newState;
    }

    // End-of-turn processing (Gamelogic.html L3492-3527)
    return endTurn(currentState, mapConfig);
}

/**
 * Process end-of-turn: capture bonus spaces, switch player, award income, reset units.
 * (Gamelogic.html L3492-3527 — `endTurnAction`)
 */
export function endTurn(state: GameState, mapConfig: MapConfig): ActionResult {
    const newState = cloneState(state);

    // Capture bonus spaces
    (mapConfig.parsedBonusSpaces ?? []).forEach(s => {
        const key = `${s.q},${s.r}`;
        const bs = newState.bonusSpaces[key];
        const u = getUnitAt(s.q, s.r, newState);
        if (u && u.player === newState.turn && bs) {
            if (bs.owner === null) bs.owner = u.player;
            else if (bs.owner !== u.player) bs.owner = null;
        }
    });

    // Switch active player
    newState.turn = newState.turn === 'P1' ? 'P2' : 'P1';
    newState.turnNumber++;
    newState.spawnsUsedThisTurn = [];
    newState.pendingSpawnType = null;

    // Reset units for the new active player
    newState.units.forEach(u => {
        if (u.player === newState.turn) {
            u.moved = false;
            u.attacked = false;
        }
    });

    // Award income (starts after turn 2)
    if (newState.turnNumber > INCOME_START_TURN) {
        let inc = BASE_INCOME;
        Object.values(newState.bonusSpaces).forEach(bs => {
            if (bs.owner === newState.turn) inc++;
        });
        newState.wits[newState.turn] = Math.min(MAX_WITS, newState.wits[newState.turn] + inc);
    }

    return { success: true, newState };
}


// ═══════════════════════════════════════════════════════════════
// WIN CONDITION
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a player is dead (base destroyed, or no units + can't spawn).
 * (Gamelogic.html L3529-3535)
 */
export function isPlayerDead(player: PlayerId, state: GameState, mapConfig: MapConfig): boolean {
    if (state.baseHp[player] <= 0) return true;
    if (state.units.filter(u => u.player === player).length > 0) return false;
    if (state.wits[player] < 1) return true;

    const openSpawns = (mapConfig.parsedSpawns[player] ?? []).filter(sp =>
        !getUnitAt(sp.q, sp.r, state) &&
        !state.spawnsUsedThisTurn.includes(`${sp.q},${sp.r}`)
    );
    return openSpawns.length === 0;
}

/**
 * Evaluate if the game has ended.
 * Returns null if game continues, or a WinResult.
 * (Gamelogic.html L3537-3553)
 */
export function evaluateWin(state: GameState, mapConfig: MapConfig): WinResult | null {
    const p1Dead = isPlayerDead('P1', state, mapConfig);
    const p2Dead = isPlayerDead('P2', state, mapConfig);

    if (p1Dead && p2Dead) return { winner: null, reason: 'draw' };
    if (p1Dead) return { winner: 'P2', reason: 'eliminated' };
    if (p2Dead) return { winner: 'P1', reason: 'eliminated' };
    return null;
}


// ═══════════════════════════════════════════════════════════════
// GAME INITIALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Create the initial game state for a new match.
 * (Gamelogic.html L2722-2746 — `initGame`)
 */
export function createInitialState(mapConfig: MapConfig, gameParams: GameParams): GameState {
    const units: Unit[] = [];

    // Place starting units from map definition
    for (const su of mapConfig.parsedStartUnits) {
        const rules = UNIT_RULES[su.type];
        if (!rules) continue;

        let maxHp = rules.maxHp;
        if (su.type === 'Mobi' && gameParams.pogNerfs) maxHp = 1;

        units.push({
            id: generateUnitId(),
            type: su.type,
            player: su.player,
            q: su.q, r: su.r,
            hp: maxHp, maxHp,
            moveRange: rules.moveRange,
            attackRange: rules.attackRange,
            damage: rules.damage ?? 0,
            heal: rules.heal ?? 0,
            moved: false, attacked: false,
        });
    }

    // Initialize bonus spaces
    const bonusSpaces: GameState['bonusSpaces'] = {};
    (mapConfig.parsedBonusSpaces ?? []).forEach(s => {
        bonusSpaces[`${s.q},${s.r}`] = { owner: null };
    });

    return {
        turn: 'P1',
        turnNumber: 1,
        wits: { P1: STARTING_WITS_P1, P2: STARTING_WITS_P2 },
        baseHp: { P1: STARTING_BASE_HP, P2: STARTING_BASE_HP },
        units,
        bonusSpaces,
        spawnsUsedThisTurn: [],
        pendingSpawnType: null,
    };
}

/**
 * Calculate a player's projected income at end of their turn.
 * (Gamelogic.html L3555-3572)
 */
export function calculateIncome(player: PlayerId, state: GameState, mapConfig: MapConfig): number {
    let inc = BASE_INCOME;
    if (!mapConfig.parsedBonusSpaces) return inc;

    const projectedOwners: Record<string, PlayerId | null> = {};

    mapConfig.parsedBonusSpaces.forEach(s => {
        const key = `${s.q},${s.r}`;
        const bs = state.bonusSpaces[key];
        projectedOwners[key] = bs ? bs.owner : null;
    });

    mapConfig.parsedBonusSpaces.forEach(s => {
        const key = `${s.q},${s.r}`;
        const bs = state.bonusSpaces[key];
        const currentOwner = bs ? bs.owner : null;
        const u = getUnitAt(s.q, s.r, state);
        if (u && u.player === state.turn) {
            if (currentOwner === null) projectedOwners[key] = u.player;
            else if (currentOwner !== u.player) projectedOwners[key] = null;
        }
    });

    Object.values(projectedOwners).forEach(owner => {
        if (owner === player) inc++;
    });
    return inc;
}
