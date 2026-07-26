/**
 * Map Parser — converts RawMapDefinition (string-based hex IDs) into MapConfig (axial coordinates).
 *
 * Ported from Gamelogic.html L2468-2623 (generateLayoutFromConnections + parseMapGeom).
 * Made pure — no globals, no side effects.
 */

import type {
    HexCoord, GridHex, PlayerId, MapConfig,
    RawMapDefinition, ParsedStartUnit,
} from './types.js';
import { getNeighborCoords } from './engine.js';


/**
 * Parse a raw layout + connections definition into an axial coordinate grid.
 * (Gamelogic.html L2468-2573 — `generateLayoutFromConnections`)
 */
export function generateLayoutFromConnections(rawMap: RawMapDefinition): {
    axialLookup: Record<string, HexCoord>;
    grid: GridHex[];
} {
    const layoutRules = rawMap.layout;
    const firstHexConns = rawMap.connections;

    // Parse all hex IDs from layout strings
    const existingHexes: string[] = [];
    layoutRules.forEach(rule => {
        const parts = rule.split(':');
        const col = parts[0];
        parts[1].split(',').forEach(range => {
            if (range.includes('-')) {
                const bounds = range.split('-');
                for (let r = parseInt(bounds[0]); r <= parseInt(bounds[1]); r++) {
                    existingHexes.push(`${col}${r}`);
                }
            } else {
                existingHexes.push(`${col}${range}`);
            }
        });
    });

    // Group by column
    const colHexes: Record<number, string[]> = {};
    existingHexes.forEach(name => {
        const colStr = name.match(/[A-Z]+/)![0];
        const q = colStr.charCodeAt(0) - 65;
        if (!colHexes[q]) colHexes[q] = [];
        colHexes[q].push(name);
    });

    const maxQ = Math.max(...Object.keys(colHexes).map(Number));

    // Sort each column by row number
    for (let q = 0; q <= maxQ; q++) {
        if (colHexes[q]) {
            colHexes[q].sort((a, b) =>
                parseInt(a.match(/[0-9]+/)![0]) - parseInt(b.match(/[0-9]+/)![0])
            );
        }
    }

    // Expand connections for all hexes (not just first hex of each column)
    const connections: Record<string, string[]> = {};
    for (let q = 0; q < maxQ; q++) {
        const colChar = String.fromCharCode(q + 65);
        const nextColChar = String.fromCharCode(q + 66);
        const firstHexTargets = firstHexConns[`${colChar}1`] || [];
        const currentHexes = colHexes[q] || [];

        currentHexes.forEach(hexName => {
            const rowIdx = parseInt(hexName.match(/[0-9]+/)![0]);
            const expandedTargets: string[] = [];
            firstHexTargets.forEach(target => {
                const targetIdx = parseInt(target.match(/-?[0-9]+/)![0]);
                expandedTargets.push(`${nextColChar}${targetIdx + (rowIdx - 1)}`);
            });
            if (expandedTargets.length > 0) connections[hexName] = expandedTargets;
        });
    }

    // Assign axial coordinates starting from column 0
    const axialLookup: Record<string, HexCoord & { id: string }> = {};

    const col0 = colHexes[0] || [];
    col0.forEach(name => {
        const index = parseInt(name.match(/[0-9]+/)![0]);
        axialLookup[name] = { q: 0, r: index - 1, id: name };
    });

    for (let q = 1; q <= maxQ; q++) {
        const currentHexes = colHexes[q] || [];
        if (currentHexes.length === 0) continue;

        const prevQ = q - 1;
        const prevHexes = colHexes[prevQ] || [];
        const tempCoords: Record<string, { q: number; r: number }> = {};

        prevHexes.forEach(prevName => {
            const prevCoord = axialLookup[prevName];
            if (!prevCoord) return;
            const targets = connections[prevName] || [];
            const colQTgts = targets
                .filter(t => (t.match(/[A-Z]+/)![0].charCodeAt(0) - 65) === q)
                .sort((a, b) =>
                    parseInt(a.match(/[0-9]+/)![0]) - parseInt(b.match(/[0-9]+/)![0])
                );

            if (colQTgts.length === 2) {
                tempCoords[colQTgts[0]] = { q, r: prevCoord.r - 1 };
                tempCoords[colQTgts[1]] = { q, r: prevCoord.r };
            } else if (colQTgts.length === 1) {
                const tgt = colQTgts[0];
                const tgtIdx = parseInt(tgt.match(/[0-9]+/)![0]);
                const prevIdx = parseInt(prevName.match(/[0-9]+/)![0]);
                const isEvenToOdd = (prevQ % 2 === 0);
                if (isEvenToOdd) {
                    tempCoords[tgt] = (tgtIdx < prevIdx)
                        ? { q, r: prevCoord.r - 1 }
                        : { q, r: prevCoord.r };
                } else {
                    tempCoords[tgt] = (tgtIdx > prevIdx)
                        ? { q, r: prevCoord.r }
                        : { q, r: prevCoord.r - 1 };
                }
            }
        });

        let col1R = 0;
        const determinedHex = currentHexes.find(h => tempCoords[h] !== undefined);
        if (determinedHex) {
            col1R = tempCoords[determinedHex].r - (parseInt(determinedHex.match(/[0-9]+/)![0]) - 1);
        }

        currentHexes.forEach(name => {
            const index = parseInt(name.match(/[0-9]+/)![0]);
            axialLookup[name] = { q, r: col1R + (index - 1), id: name };
        });
    }

    return {
        axialLookup,
        grid: Object.values(axialLookup),
    };
}


/**
 * Parse a raw map definition into a fully resolved MapConfig.
 * Handles side swapping when sideSwap is true.
 * (Gamelogic.html L2575-2623 — `parseMapGeom`)
 */
export function parseMapConfig(
    rawMap: RawMapDefinition,
    sideSwap: boolean = false
): MapConfig {
    // Handle custom maps (already have axial coords)
    if (rawMap.custom && (rawMap as any).geomGrid) {
        const customData = rawMap as any;
        const axialLookup: Record<string, HexCoord> = {};
        (customData.geomGrid || []).forEach((g: GridHex) => {
            axialLookup[g.id] = g;
            axialLookup[`${g.q},${g.r}`] = g;
        });

        return {
            name: customData.name || 'Custom Map',
            geomGrid: customData.geomGrid || [],
            axialLookup,
            parsedBases: customData.parsedBases || { P1: null, P2: null },
            parsedSpawns: customData.parsedSpawns || { P1: [], P2: [] },
            parsedBonusSpaces: customData.parsedBonusSpaces || [],
            parsedObstacles: customData.parsedObstacles || [],
            parsedP1Surround: customData.parsedP1Surround || [],
            parsedP2Surround: customData.parsedP2Surround || [],
            parsedStartUnits: customData.parsedStartUnits || [],
        };
    }

    // Standard maps: generate layout from connections
    const geom = generateLayoutFromConnections(rawMap);
    const axialLookup = geom.axialLookup;

    function nameToAxial(name: string): HexCoord | null {
        return axialLookup[name] ?? null;
    }

    // Handle side swapping
    const p1Key: PlayerId = sideSwap ? 'P2' : 'P1';
    const p2Key: PlayerId = sideSwap ? 'P1' : 'P2';
    const p1SurrKey = sideSwap ? 'p2Surround' : 'p1Surround';
    const p2SurrKey = sideSwap ? 'p1Surround' : 'p2Surround';

    const parsedBases = {
        P1: nameToAxial(rawMap.bases[p1Key]),
        P2: nameToAxial(rawMap.bases[p2Key]),
    };

    const parsedSpawns = {
        P1: rawMap.spawns[p1Key].map(id => nameToAxial(id)).filter(Boolean) as HexCoord[],
        P2: rawMap.spawns[p2Key].map(id => nameToAxial(id)).filter(Boolean) as HexCoord[],
    };

    const parsedBonusSpaces = rawMap.bonusSpaces
        .map(id => nameToAxial(id))
        .filter(Boolean) as HexCoord[];

    const parsedP1Surround = rawMap[p1SurrKey as keyof RawMapDefinition] as string[];
    const parsedP2Surround = rawMap[p2SurrKey as keyof RawMapDefinition] as string[];

    const p1SurrCoords = (parsedP1Surround ?? [])
        .map(id => nameToAxial(id))
        .filter(Boolean) as HexCoord[];
    const p2SurrCoords = (parsedP2Surround ?? [])
        .map(id => nameToAxial(id))
        .filter(Boolean) as HexCoord[];

    // Obstacles include: explicit obstacles + base surround hexes + base center hexes
    const parsedObstacles = (rawMap.obstacles ?? [])
        .map(id => nameToAxial(id))
        .filter(Boolean) as HexCoord[];

    const allObstacles = [
        ...parsedObstacles,
        ...p1SurrCoords,
        ...p2SurrCoords,
        ...[parsedBases.P1, parsedBases.P2].filter(Boolean) as HexCoord[],
    ];

    // Parse starting units with side swap applied
    const parsedStartUnits: ParsedStartUnit[] = (rawMap.startUnits ?? [])
        .map(u => {
            const coord = nameToAxial(u.pos);
            if (!coord) return null;
            return {
                ...u,
                player: sideSwap ? (u.player === 'P1' ? 'P2' as PlayerId : 'P1' as PlayerId) : u.player,
                q: coord.q,
                r: coord.r,
            };
        })
        .filter(Boolean) as ParsedStartUnit[];

    return {
        name: rawMap.name || 'Unknown Map',
        geomGrid: geom.grid as GridHex[],
        axialLookup,
        parsedBases,
        parsedSpawns,
        parsedBonusSpaces,
        parsedObstacles: allObstacles,
        parsedP1Surround: p1SurrCoords,
        parsedP2Surround: p2SurrCoords,
        parsedStartUnits,
    };
}
