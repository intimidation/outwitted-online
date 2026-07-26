/**
 * @outwitters/shared — Shared game engine, types, and constants
 *
 * This package is imported by both the server (for validation) and
 * the client (for local prediction / rendering).
 */

// Type definitions
export type {
    HexCoord, GridHex, PlayerId, ColorKey, PlayerColor,
    RaceId, BaseUnitType, SpecialUnitType, SiegedUnitType, DerivedUnitType, UnitType,
    UnitRules, Unit,
    RawMapDefinition, RawStartUnit, MapConfig, ParsedStartUnit,
    BonusSpaceState, GameState, GameParams,
    AddWitAction, SpawnAction, MoveAction, ActAction, ActSpecial, GameAction,
    TurnSubmission, ActionResult, WinResult, ValidTarget, DamageEvent,
} from './types.js';

export { HEX_DIRECTIONS } from './types.js';

// Constants
export {
    UNIT_RULES, COLORS, RACE_SPECIAL, RACE_EMOJI,
    POG_RACE_NAMES, POG_MAP_NAMES,
    BASE_INCOME, STARTING_WITS_P1, STARTING_WITS_P2, STARTING_BASE_HP,
    MAX_WITS, INCOME_START_TURN,
} from './constants.js';

// Map data
export { MAPS } from './maps.js';

// Map parser
export { generateLayoutFromConnections, parseMapConfig } from './mapParser.js';

// Game engine
export {
    // Hex math
    hexToPixel, hexRound, getDistance, getNeighbors, getNeighborCoords,
    // Grid queries
    isObstacle, isBonusSpace, getUnitAt, isBase,
    // Line of sight
    hasLoS,
    // Vision / Fog of War
    calculateVision, getVisibleState,
    // Move & target validation
    calculateValidMoves, calculateValidTargets,
    // State management
    cloneState,
    // Action execution
    applyAction, applyTurn, endTurn,
    // Win condition
    isPlayerDead, evaluateWin,
    // Game initialization
    createInitialState,
    // Income
    calculateIncome,
} from './engine.js';
