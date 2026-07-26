import type { UnitRules, UnitType, PlayerColor, ColorKey, RaceId } from './types.js';

// ─── Unit Rules ────────────────────────────────────────────────
// Ported from Gamelogic.html L1274-1287

export const UNIT_RULES: Record<UnitType, UnitRules> = {
    Runner:          { cost: 1, moveRange: 5, attackRange: 1, damage: 1, maxHp: 1, emoji: '🏃' },
    Soldier:         { cost: 2, moveRange: 3, attackRange: 1, damage: 2, maxHp: 3, emoji: '⚔️' },
    Medic:           { cost: 2, moveRange: 3, attackRange: 1, heal: 2, maxHp: 1, emoji: '✚' },
    Sniper:          { cost: 3, moveRange: 1, attackRange: 3, damage: 3, maxHp: 1, emoji: '🏹' },
    Heavy:           { cost: 4, moveRange: 2, attackRange: 1, damage: 3, maxHp: 4, emoji: '💪' },
    Scrambler:       { cost: 7, moveRange: 3, attackRange: 1, maxHp: 1, emoji: '🧠' },
    Mobi:            { cost: 7, moveRange: 3, attackRange: 1, maxHp: 2, emoji: '🐳' },
    Bombshell:       { cost: 7, moveRange: 3, attackRange: 0, damage: 0, maxHp: 1, emoji: '🐚' },
    BombshellSieged: { cost: 0, moveRange: 0, attackRange: 3, damage: 3, maxHp: 3, emoji: '🧨' },
    Bramble:         { cost: 7, moveRange: 4, attackRange: 0, damage: 0, maxHp: 1, emoji: '🌱' },
    BrambleSieged:   { cost: 0, moveRange: 0, attackRange: 2, damage: 0, maxHp: 2, emoji: '🌳' },
    Thorn:           { cost: 1, moveRange: 0, attackRange: 1, damage: 1, maxHp: 2, emoji: '🌵' },
};

// ─── Player Colors ─────────────────────────────────────────────
// Ported from Gamelogic.html L1269-1272

export const COLORS: Record<ColorKey, PlayerColor> = {
    red: {
        base: '#b91c1c', stroke: '#fca5a5', banner: '#b32424',
        light: 'rgba(220, 38, 38, 0.1)', dark: '#7f1d1d',
        text: '#ff4d4d', emoji: '🔴',
    },
    blue: {
        base: '#1d4ed8', stroke: '#93c5fd', banner: '#2463b3',
        light: 'rgba(37, 99, 235, 0.1)', dark: '#1e3a8a',
        text: '#4da6ff', emoji: '🔵',
    },
};

// ─── Race → Special Unit Mapping ───────────────────────────────

export const RACE_SPECIAL: Record<RaceId, UnitType> = {
    Scallywags: 'Bombshell',
    Feedback: 'Scrambler',
    Adorables: 'Mobi',
    Veggienauts: 'Bramble',
};

export const RACE_EMOJI: Record<RaceId, string> = {
    Scallywags: '🐚',
    Feedback: '🧠',
    Adorables: '🐳',
    Veggienauts: '🌱',
};

// ─── PoG Mode Alternate Names ──────────────────────────────────

export const POG_RACE_NAMES: Record<RaceId, string> = {
    Scallywags: 'Elspar',
    Feedback: 'Blix',
    Adorables: 'Worp',
    Veggienauts: 'Rynn-Ceph',
};

export const POG_MAP_NAMES: Record<string, string> = {
    SweetTooth: 'Habudabi Trench',
    SharkfoodIsland: 'Zarzara Desert',
    Foundry: 'Gormley Wood',
    SkullDuggery: 'Desolation Pass',
    Glitch: 'Kraskia',
};

// ─── Game Constants ────────────────────────────────────────────

/** Base income per turn (before bonus spaces) */
export const BASE_INCOME = 5;

/** Starting wits for P1 (first move disadvantage) */
export const STARTING_WITS_P1 = 5;

/** Starting wits for P2 */
export const STARTING_WITS_P2 = 8;

/** Starting base HP for each player */
export const STARTING_BASE_HP = 5;

/** Maximum wits a player can have */
export const MAX_WITS = 99;

/** Income kicks in after this turn number */
export const INCOME_START_TURN = 2;
