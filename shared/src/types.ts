// ─── Hex Grid Primitives ───────────────────────────────────────

/** Axial hex coordinate */
export interface HexCoord {
    q: number;
    r: number;
}

/** A hex on the grid with an optional string ID like "A1", "B3" */
export interface GridHex extends HexCoord {
    id: string;
}

/** The six axial directions for hex neighbor traversal */
export const HEX_DIRECTIONS: readonly HexCoord[] = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
] as const;

// ─── Players & Colors ──────────────────────────────────────────

export type PlayerId = 'P1' | 'P2';

export type ColorKey = 'red' | 'blue';

export interface PlayerColor {
    base: string;
    stroke: string;
    banner: string;
    light: string;
    dark: string;
    text: string;
    emoji: string;
}

// ─── Races & Units ─────────────────────────────────────────────

export type RaceId = 'Scallywags' | 'Feedback' | 'Adorables' | 'Veggienauts';

export type BaseUnitType = 'Runner' | 'Soldier' | 'Medic' | 'Sniper' | 'Heavy';

export type SpecialUnitType = 'Scrambler' | 'Mobi' | 'Bombshell' | 'Bramble';

export type SiegedUnitType = 'BombshellSieged' | 'BrambleSieged';

export type DerivedUnitType = 'Thorn';

export type UnitType = BaseUnitType | SpecialUnitType | SiegedUnitType | DerivedUnitType;

export interface UnitRules {
    cost: number;
    moveRange: number;
    attackRange: number;
    damage?: number;
    heal?: number;
    maxHp: number;
    emoji: string;
}

export interface Unit {
    id: string;
    type: UnitType;
    player: PlayerId;
    q: number;
    r: number;
    hp: number;
    maxHp: number;
    moveRange: number;
    attackRange: number;
    damage: number;
    heal: number;
    moved: boolean;
    attacked: boolean;
    /** For Thorns: ID of the parent BrambleSieged unit */
    parentId?: string;
}

// ─── Map Configuration ─────────────────────────────────────────

/** Raw map definition as stored in MAPS constant (string-based IDs) */
export interface RawMapDefinition {
    name?: string;
    custom?: boolean;
    layout: string[];
    connections: Record<string, string[]>;
    bases: Record<PlayerId, string>;
    spawns: Record<PlayerId, string[]>;
    bonusSpaces: string[];
    obstacles: string[];
    p1Surround: string[];
    p2Surround: string[];
    startUnits: RawStartUnit[];
}

export interface RawStartUnit {
    player: PlayerId;
    type: UnitType;
    pos: string;
}

/** Parsed map config with axial coordinates resolved */
export interface MapConfig {
    name: string;
    geomGrid: GridHex[];
    axialLookup: Record<string, HexCoord>;
    parsedBases: Record<PlayerId, HexCoord | null>;
    parsedSpawns: Record<PlayerId, HexCoord[]>;
    parsedBonusSpaces: HexCoord[];
    parsedObstacles: HexCoord[];
    parsedP1Surround: HexCoord[];
    parsedP2Surround: HexCoord[];
    parsedStartUnits: ParsedStartUnit[];
}

export interface ParsedStartUnit {
    player: PlayerId;
    type: UnitType;
    pos: string;
    q: number;
    r: number;
}

// ─── Bonus Spaces ──────────────────────────────────────────────

export interface BonusSpaceState {
    owner: PlayerId | null;
}

// ─── Game State ────────────────────────────────────────────────

/** The complete, authoritative game state — what the server stores */
export interface GameState {
    turn: PlayerId;
    turnNumber: number;
    wits: Record<PlayerId, number>;
    baseHp: Record<PlayerId, number>;
    units: Unit[];
    bonusSpaces: Record<string, BonusSpaceState>;
    spawnsUsedThisTurn: string[];
    pendingSpawnType: UnitType | null;
}

/** Game parameters set at match creation time (immutable during game) */
export interface GameParams {
    mapId: string;
    p1Race: RaceId;
    p2Race: RaceId;
    p1ColorKey: ColorKey;
    p2ColorKey: ColorKey;
    sideSwap: boolean;
    pogNerfs: boolean;
}

// ─── Actions / Commands ────────────────────────────────────────

export interface AddWitAction {
    action: 'ADD_WIT';
    player: PlayerId;
}

export interface SpawnAction {
    action: 'SPAWN';
    unitType: UnitType;
    toQ: number;
    toR: number;
}

export interface MoveAction {
    action: 'MOVE';
    fromQ: number;
    fromR: number;
    toQ: number;
    toR: number;
}

export type ActSpecial =
    | 'Scramble'
    | 'MobiTeleport'
    | 'ToggleSiege'
    | 'Bramble'
    | undefined;

export interface ActAction {
    action: 'ACT';
    fromQ: number;
    fromR: number;
    toQ: number;
    toR: number;
    special?: ActSpecial;
    /** For MobiTeleport: the unit being teleported */
    targetQ?: number;
    targetR?: number;
}

export type GameAction = AddWitAction | SpawnAction | MoveAction | ActAction;

// ─── Turn Submission (Client → Server) ─────────────────────────

export interface TurnSubmission {
    matchId: string;
    turnNumber: number;
    actions: GameAction[];
    submittedAt: number;
}

// ─── Engine Results ────────────────────────────────────────────

export interface ActionResult {
    success: boolean;
    newState: GameState;
    error?: string;
}

export type WinResult = {
    winner: PlayerId;
    reason: 'base_destroyed' | 'eliminated';
} | {
    winner: null;
    reason: 'draw';
};

/** A valid target for a unit to act on */
export interface ValidTarget extends HexCoord {
    special?: string;
}

/** Damage event to be applied to a hex */
export interface DamageEvent {
    q: number;
    r: number;
    amt: number;
}
