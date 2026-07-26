import type { RawMapDefinition } from './types.js';

/**
 * All built-in map definitions.
 * Ported from Gamelogic.html L1289-1537.
 *
 * Map IDs match the original select option values.
 * Layout strings encode column ranges (e.g. 'A:1-5' = column A, rows 1-5).
 * Connections define how the first hex of each column connects to the next column
 * (the engine extrapolates the rest).
 */
export const MAPS: Record<string, RawMapDefinition> = {
    Peekaboo2: {
        layout: ['A:1-5', 'B:1-7', 'C:1-4,6-7', 'D:1-7', 'E:1-8', 'F:1-8', 'G:1-9', 'H:1-8', 'I:1-8', 'J:1-7', 'K:1-2,4-7', 'L:1-7', 'M:1-5'],
        connections: {
            'A1': ['B2', 'B3'], 'B1': ['C1', 'C2'], 'C1': ['D1', 'D2'], 'D1': ['E1', 'E2'],
            'E1': ['F1', 'F2'], 'F1': ['G1', 'G2'], 'G1': ['H0', 'H1'], 'H1': ['I1', 'I2'],
            'I1': ['J0', 'J1'], 'J1': ['K1', 'K2'], 'K1': ['L1', 'L2'], 'L1': ['M0', 'M1'],
        },
        bases: { P1: 'B6', P2: 'L2' },
        spawns: { P1: ['F8'], P2: ['H1'] },
        bonusSpaces: ['B2', 'L6'],
        obstacles: ['A1', 'C2', 'E5', 'E8', 'G2', 'G5', 'G8', 'I1', 'I4', 'K6', 'M5'],
        p1Surround: ['A4', 'A5', 'B5', 'B7', 'C6', 'C7'],
        p2Surround: ['K1', 'K2', 'L1', 'L3', 'M1', 'M2'],
        startUnits: [
            { player: 'P2', type: 'Heavy', pos: 'L4' }, { player: 'P2', type: 'Medic', pos: 'J1' }, { player: 'P2', type: 'Soldier', pos: 'J3' },
            { player: 'P1', type: 'Heavy', pos: 'B4' }, { player: 'P1', type: 'Medic', pos: 'D7' }, { player: 'P1', type: 'Soldier', pos: 'D5' },
        ],
    },
    SkullDuggery: {
        layout: ['A:1-6', 'B:1-7', 'C:1-8', 'D:1-8', 'E:1-8', 'F:1-7', 'G:1-2,4-8', 'H:1-7', 'I:1-8', 'J:1-8', 'K:1-8', 'L:1-7', 'M:1-6'],
        connections: {
            'A1': ['B1', 'B2'], 'B1': ['C1', 'C2'], 'C1': ['D0', 'D1'], 'D1': ['E0', 'E1'],
            'E1': ['F0', 'F1'], 'F1': ['G1', 'G2'], 'G1': ['H0', 'H1'], 'H1': ['I1', 'I2'],
            'I1': ['J1', 'J2'], 'J1': ['K1', 'K2'], 'K1': ['L0', 'L1'], 'L1': ['M0', 'M1'],
        },
        bases: { P1: 'K2', P2: 'C2' },
        spawns: { P1: ['M2', 'K8'], P2: ['A2', 'C8'] },
        bonusSpaces: ['E5', 'E7', 'I5', 'I7'],
        obstacles: ['A4', 'A5', 'A6', 'B5', 'B6', 'C6', 'M4', 'M5', 'M6', 'L5', 'L6', 'K6', 'F2', 'H2', 'G6'],
        p1Surround: ['J1', 'J2', 'K1', 'L1', 'L2', 'K3'],
        p2Surround: ['B1', 'B2', 'C1', 'D1', 'D2', 'C3'],
        startUnits: [
            { player: 'P1', type: 'Heavy', pos: 'J6' }, { player: 'P1', type: 'Medic', pos: 'J5' }, { player: 'P1', type: 'Soldier', pos: 'K4' },
            { player: 'P2', type: 'Heavy', pos: 'D6' }, { player: 'P2', type: 'Medic', pos: 'D5' }, { player: 'P2', type: 'Soldier', pos: 'C4' },
        ],
    },
    Foundry: {
        layout: ['A:1-8', 'B:1-10', 'C:1,3-11', 'D:1-7,9-11', 'E:1,3-11', 'F:1-12', 'G:1-11', 'H:1-12', 'I:1-9,11', 'J:1-3,5-11', 'K:1-9,11', 'L:1-10', 'M:1-8'],
        connections: {
            'A1': ['B2', 'B3'], 'B1': ['C1', 'C2'], 'C1': ['D1', 'D2'], 'D1': ['E0', 'E1'],
            'E1': ['F1', 'F2'], 'F1': ['G0', 'G1'], 'G1': ['H1', 'H2'], 'H1': ['I0', 'I1'],
            'I1': ['J0', 'J1'], 'J1': ['K1', 'K2'], 'K1': ['L0', 'L1'], 'L1': ['M0', 'M1'],
        },
        bases: { P1: 'K2', P2: 'C10' },
        spawns: { P1: ['J3', 'M7'], P2: ['A2', 'D9'] },
        bonusSpaces: ['G4', 'G8', 'L9', 'B2'],
        obstacles: ['A1', 'B3', 'C3', 'C8', 'D1', 'E3', 'E10', 'F1', 'F10', 'F12', 'G6', 'H1', 'H3', 'H12', 'I2', 'I9', 'J11', 'K4', 'K9', 'L8', 'M8'],
        p1Surround: ['J1', 'J2', 'K1', 'K3', 'L1', 'L2'],
        p2Surround: ['B9', 'B10', 'C9', 'C11', 'D10', 'D11'],
        startUnits: [
            { player: 'P2', type: 'Heavy', pos: 'E8' }, { player: 'P2', type: 'Medic', pos: 'C7' }, { player: 'P2', type: 'Sniper', pos: 'A3' }, { player: 'P2', type: 'Soldier', pos: 'B1' }, { player: 'P2', type: 'Runner', pos: 'E11' },
            { player: 'P1', type: 'Heavy', pos: 'I4' }, { player: 'P1', type: 'Medic', pos: 'K5' }, { player: 'P1', type: 'Sniper', pos: 'M6' }, { player: 'P1', type: 'Soldier', pos: 'L10' }, { player: 'P1', type: 'Runner', pos: 'I1' },
        ],
    },
    SweetTooth: {
        layout: ['A:1-5', 'B:1-7', 'C:1-4,6-7', 'D:1-7', 'E:1-8', 'F:1-8', 'G:1-9', 'H:1-8', 'I:1-8', 'J:1-7', 'K:1-2,4-7', 'L:1-7', 'M:1-5'],
        connections: {
            'A1': ['B2', 'B3'], 'B1': ['C1', 'C2'], 'C1': ['D1', 'D2'], 'D1': ['E1', 'E2'],
            'E1': ['F1', 'F2'], 'F1': ['G1', 'G2'], 'G1': ['H0', 'H1'], 'H1': ['I1', 'I2'],
            'I1': ['J0', 'J1'], 'J1': ['K1', 'K2'], 'K1': ['L1', 'L2'], 'L1': ['M0', 'M1'],
        },
        bases: { P1: 'B6', P2: 'L2' },
        spawns: { P1: ['C2'], P2: ['K6'] },
        bonusSpaces: ['D5', 'E8', 'I1', 'J3'],
        obstacles: ['E3', 'E7', 'F5', 'G5', 'H4', 'I2', 'I6'],
        p1Surround: ['A4', 'A5', 'B5', 'C6', 'C7', 'B7'],
        p2Surround: ['K1', 'K2', 'L1', 'M1', 'M2', 'L3'],
        startUnits: [
            { player: 'P2', type: 'Heavy', pos: 'K5' }, { player: 'P2', type: 'Medic', pos: 'L4' }, { player: 'P2', type: 'Sniper', pos: 'K4' }, { player: 'P2', type: 'Soldier', pos: 'J1' },
            { player: 'P1', type: 'Heavy', pos: 'C3' }, { player: 'P1', type: 'Medic', pos: 'B4' }, { player: 'P1', type: 'Sniper', pos: 'C4' }, { player: 'P1', type: 'Soldier', pos: 'D7' },
        ],
    },
    GorgonHallow: {
        layout: ['A:1-8', 'B:1-5,7-10', 'C:1-12', 'D:1-13', 'E:1,3-14', 'F:1-14', 'G:1-13', 'H:1-14', 'I:1-12,14', 'J:1-13', 'K:1-12', 'L:1-4,6-10', 'M:1-8'],
        connections: {
            'A1': ['B1', 'B2'], 'B1': ['C1', 'C2'], 'C1': ['D0', 'D1'], 'D1': ['E1', 'E2'],
            'E1': ['F0', 'F1'], 'F1': ['G0', 'G1'], 'G1': ['H1', 'H2'], 'H1': ['I0', 'I1'],
            'I1': ['J0', 'J1'], 'J1': ['K-1', 'K0'], 'K1': ['L-1', 'L0'], 'L1': ['M-1', 'M0'],
        },
        bases: { P1: 'E8', P2: 'I7' },
        spawns: { P1: ['F5', 'C10'], P2: ['H10', 'K3'] },
        bonusSpaces: ['B2', 'F10', 'H5', 'L9'],
        obstacles: ['A1', 'A2', 'A3', 'C1', 'C3', 'C5', 'K12', 'M6', 'M7', 'M8', 'K8', 'K10', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'F4', 'H4', 'F11', 'H11'],
        p1Surround: ['D7', 'D8', 'E7', 'E9', 'F7', 'F8'],
        p2Surround: ['H7', 'H8', 'I6', 'I8', 'J7', 'J6'],
        startUnits: [
            { player: 'P1', type: 'Soldier', pos: 'D4' }, { player: 'P1', type: 'Runner', pos: 'C7' }, { player: 'P1', type: 'Medic', pos: 'C8' }, { player: 'P1', type: 'Sniper', pos: 'B8' }, { player: 'P1', type: 'Heavy', pos: 'D9' },
            { player: 'P2', type: 'Heavy', pos: 'J5' }, { player: 'P2', type: 'Medic', pos: 'K5' }, { player: 'P2', type: 'Sniper', pos: 'L3' }, { player: 'P2', type: 'Runner', pos: 'K6' }, { player: 'P2', type: 'Soldier', pos: 'J10' },
        ],
    },
    SerynnReach: {
        layout: ['A:1-2,7-8', 'B:1-9', 'C:1-10', 'D:1-11', 'E:1-12', 'F:1-5,9-13', 'G:1-5,10-14', 'H:1-6,10-15', 'I:1-5,10-14', 'J:1-5,9-13', 'K:1-12', 'L:1-11', 'M:1-10', 'N:1-9', 'O:1-2,7-8'],
        connections: {
            'A1': ['B1', 'B2'], 'B1': ['C1', 'C2'], 'C1': ['D1', 'D2'], 'D1': ['E1', 'E2'],
            'E1': ['F1', 'F2'], 'F1': ['G1', 'G2'], 'G1': ['H1', 'H2'], 'H1': ['I0', 'I1'],
            'I1': ['J0', 'J1'], 'J1': ['K0', 'K1'], 'K1': ['L0', 'L1'], 'L1': ['M0', 'M1'],
            'M1': ['N0', 'M1'], 'N1': ['O0', 'M1'],
        },
        bases: { P1: 'H2', P2: 'H14' },
        spawns: { P1: ['E2', 'N3'], P2: ['K11', 'B7'] },
        bonusSpaces: ['B3', 'G10', 'I5', 'N7'],
        obstacles: ['C1', 'C6', 'D2', 'D9', 'E3', 'E10', 'K3', 'K10', 'L3', 'L10', 'M10', 'M5'],
        p1Surround: ['G1', 'H1', 'G2', 'H3', 'I1', 'I2'],
        p2Surround: ['G13', 'H15', 'G14', 'H13', 'I13', 'I14'],
        startUnits: [
            { player: 'P2', type: 'Heavy', pos: 'J9' }, { player: 'P2', type: 'Medic', pos: 'D10' }, { player: 'P2', type: 'Soldier', pos: 'A8' }, { player: 'P2', type: 'Runner', pos: 'L11' },
            { player: 'P1', type: 'Heavy', pos: 'F5' }, { player: 'P1', type: 'Medic', pos: 'L2' }, { player: 'P1', type: 'Soldier', pos: 'O1' }, { player: 'P1', type: 'Runner', pos: 'D1' },
        ],
    },
    Glitch: {
        layout: ['A:1-6', 'B:1-7', 'C:1-8', 'D:1-6,8-9', 'E:1-5,7-9', 'F:1-9', 'G:1-3,5-9', 'H:1-2,4-9', 'I:1-8', 'J:1-7', 'K:1-6'],
        connections: {
            'A1': ['B1', 'B2'], 'B1': ['C1', 'C2'], 'C1': ['D1', 'D2'], 'D1': ['E0', 'E1'],
            'E1': ['F0', 'F1'], 'F1': ['G0', 'G1'], 'G1': ['H0', 'H1'], 'H1': ['I0', 'I1'],
            'I1': ['J0', 'J1'], 'J1': ['K0', 'K1'],
        },
        bases: { P1: 'B2', P2: 'J6' },
        spawns: { P1: ['C4'], P2: ['I5'] },
        bonusSpaces: ['E8', 'G2'],
        obstacles: ['B6', 'C5', 'E2', 'D2', 'D5', 'G8', 'H5', 'H8', 'I4', 'J2'],
        p1Surround: ['A1', 'A2', 'B1', 'B3', 'C2', 'C3'],
        p2Surround: ['I6', 'I7', 'J5', 'K5', 'K6', 'J7'],
        startUnits: [
            { player: 'P2', type: 'Heavy', pos: 'G7' }, { player: 'P2', type: 'Medic', pos: 'F9' }, { player: 'P2', type: 'Soldier', pos: 'K3' },
            { player: 'P1', type: 'Heavy', pos: 'E3' }, { player: 'P1', type: 'Medic', pos: 'F1' }, { player: 'P1', type: 'Soldier', pos: 'A4' },
        ],
    },
    SharkfoodIsland: {
        layout: ['A:1-6', 'B:1-7', 'C:1-8', 'D:1-8', 'E:1-8', 'F:1-7', 'G:1-2,4-5,7-8', 'H:1-7', 'I:1-8', 'J:1-8', 'K:1-8', 'L:1-7', 'M:1-6'],
        connections: {
            'A1': ['B1', 'B2'], 'B1': ['C1', 'C2'], 'C1': ['D0', 'D1'], 'D1': ['E0', 'E1'],
            'E1': ['F0', 'F1'], 'F1': ['G1', 'G2'], 'G1': ['H0', 'H1'], 'H1': ['I1', 'I2'],
            'I1': ['J1', 'J2'], 'J1': ['K1', 'K2'], 'K1': ['L0', 'L1'], 'L1': ['M0', 'M1'],
        },
        bases: { P1: 'K2', P2: 'C2' },
        spawns: { P1: ['K7'], P2: ['C7'] },
        bonusSpaces: ['D4', 'J4'],
        obstacles: ['A1', 'M1', 'C6', 'D6', 'K6', 'J6', 'E1', 'I1', 'E8', 'I8'],
        p1Surround: ['J1', 'J2', 'K1', 'L1', 'L2', 'K3'],
        p2Surround: ['B1', 'B2', 'C1', 'D1', 'D2', 'C3'],
        startUnits: [
            { player: 'P1', type: 'Soldier', pos: 'J7' }, { player: 'P1', type: 'Medic', pos: 'J5' }, { player: 'P1', type: 'Heavy', pos: 'L3' },
            { player: 'P2', type: 'Soldier', pos: 'D7' }, { player: 'P2', type: 'Medic', pos: 'D5' }, { player: 'P2', type: 'Heavy', pos: 'B3' },
        ],
    },
    WarGarden: {
        layout: ['A:1-4', 'B:1-5', 'C:1-8', 'D:1-9', 'E:1-10', 'F:1-11', 'G:1-12', 'H:1-11', 'I:1-10', 'J:1-9', 'K:1-8', 'L:1-5', 'M:1-4'],
        connections: {
            'A1': ['B1', 'B2'], 'B1': ['C2', 'C3'], 'C1': ['D1', 'D2'], 'D1': ['E1', 'E2'],
            'E1': ['F1', 'F2'], 'F1': ['G1', 'G2'], 'G1': ['H0', 'H1'], 'H1': ['I0', 'I1'],
            'I1': ['J0', 'J1'], 'J1': ['K0', 'K1'], 'K1': ['L-1', 'L0'], 'L1': ['M0', 'M1'],
        },
        bases: { P1: 'G11', P2: 'G2' },
        spawns: { P1: ['I9', 'M4'], P2: ['E2', 'A1'] },
        bonusSpaces: ['C7', 'D5', 'J5', 'K2'],
        obstacles: ['B5', 'C6', 'D7', 'D4', 'E5', 'G5', 'G8', 'I6', 'J6', 'J3', 'K3', 'L1'],
        p1Surround: ['F10', 'G10', 'H10', 'H11', 'G12', 'F11'],
        p2Surround: ['F1', 'G1', 'H1', 'H2', 'G3', 'F2'],
        startUnits: [
            { player: 'P1', type: 'Soldier', pos: 'F9' }, { player: 'P1', type: 'Heavy', pos: 'K6' }, { player: 'P1', type: 'Medic', pos: 'H9' },
            { player: 'P2', type: 'Medic', pos: 'F3' }, { player: 'P2', type: 'Soldier', pos: 'H3' }, { player: 'P2', type: 'Heavy', pos: 'C3' },
        ],
    },
    ThornGulley: {
        layout: ['A:1-8', 'B:1-9', 'C:1-10', 'D:1-3,6-11', 'E:1-4,7-12', 'F:1-3,6-11', 'G:1-12', 'H:1-6,9-11', 'I:1-6,9-12', 'J:1-6,9-11', 'K:1-10', 'L:1-9', 'M:1-8'],
        connections: {
            'A1': ['B1', 'B2'], 'B1': ['C1', 'C2'], 'C1': ['D1', 'D2'], 'D1': ['E1', 'E2'],
            'E1': ['F0', 'F1'], 'F1': ['G1', 'G2'], 'G1': ['H0', 'H1'], 'H1': ['I1', 'I2'],
            'I1': ['J0', 'J1'], 'J1': ['K0', 'K1'], 'K1': ['L0', 'L1'], 'L1': ['M0', 'M1'],
        },
        bases: { P1: 'G11', P2: 'G2' },
        spawns: { P1: ['J11', 'B8'], P2: ['D1', 'L2'] },
        bonusSpaces: ['A4', 'G9', 'G4', 'M5'],
        obstacles: ['A1', 'A8', 'D8', 'E9', 'I4', 'J4', 'M1', 'M8'],
        p1Surround: ['F10', 'G10', 'H10', 'H11', 'G12', 'F11'],
        p2Surround: ['F1', 'G1', 'H1', 'H2', 'G3', 'F2'],
        startUnits: [
            { player: 'P1', type: 'Soldier', pos: 'A6' }, { player: 'P1', type: 'Medic', pos: 'C10' }, { player: 'P1', type: 'Sniper', pos: 'E10' }, { player: 'P1', type: 'Runner', pos: 'E12' }, { player: 'P1', type: 'Heavy', pos: 'I10' },
            { player: 'P2', type: 'Heavy', pos: 'E3' }, { player: 'P2', type: 'Sniper', pos: 'I3' }, { player: 'P2', type: 'Runner', pos: 'I1' }, { player: 'P2', type: 'Medic', pos: 'K1' }, { player: 'P2', type: 'Soldier', pos: 'M3' },
        ],
    },
    SweetiePlains: {
        layout: ['A:1-9', 'B:1-10', 'C:1-3,5-11', 'D:1-12', 'E:1-13', 'F:1-12', 'G:1-13', 'H:1-12', 'I:1-13', 'J:1-12', 'K:1-7,9-11', 'L:1-10', 'M:1-9'],
        connections: {
            'A1': ['B1', 'B2'], 'B1': ['C1', 'C2'], 'C1': ['D1', 'D2'], 'D1': ['E1', 'E2'],
            'E1': ['F0', 'F1'], 'F1': ['G1', 'G2'], 'G1': ['H0', 'H1'], 'H1': ['I1', 'I2'],
            'I1': ['J0', 'J1'], 'J1': ['K0', 'K1'], 'K1': ['L0', 'L1'], 'L1': ['M0', 'M1'],
        },
        bases: { P1: 'G12', P2: 'G2' },
        spawns: { P1: ['B7', 'G10'], P2: ['L4', 'G4'] },
        bonusSpaces: ['F8', 'H5', 'A1', 'M9'],
        obstacles: ['C8', 'D4', 'D9', 'E2', 'E4', 'E10', 'E12', 'F6', 'G6', 'G8', 'H7', 'I2', 'I4', 'I10', 'I12', 'J4', 'J9', 'K4'],
        p1Surround: ['F11', 'G11', 'H11', 'H12', 'G13', 'F12'],
        p2Surround: ['F1', 'G1', 'H1', 'H2', 'G3', 'F2'],
        startUnits: [
            { player: 'P1', type: 'Medic', pos: 'D11' }, { player: 'P1', type: 'Heavy', pos: 'F10' }, { player: 'P1', type: 'Runner', pos: 'H10' }, { player: 'P1', type: 'Sniper', pos: 'I11' }, { player: 'P1', type: 'Soldier', pos: 'L9' },
            { player: 'P2', type: 'Soldier', pos: 'B2' }, { player: 'P2', type: 'Sniper', pos: 'E3' }, { player: 'P2', type: 'Runner', pos: 'F3' }, { player: 'P2', type: 'Heavy', pos: 'H3' }, { player: 'P2', type: 'Medic', pos: 'J2' },
        ],
    },
    Reaper: {
        layout: ['A:1-4', 'B:1-5', 'C:1-3,5-8', 'D:1-9', 'E:1-10', 'F:1-11', 'G:1-12', 'H:1-11', 'I:1-10', 'J:1-9', 'K:1-4,6-8', 'L:1-5', 'M:1-4'],
        connections: {
            'A1': ['B1', 'B2'], 'B1': ['C2', 'C3'], 'C1': ['D1', 'D2'], 'D1': ['E1', 'E2'],
            'E1': ['F1', 'F2'], 'F1': ['G1', 'G2'], 'G1': ['H0', 'H1'], 'H1': ['I0', 'I1'],
            'I1': ['J0', 'J1'], 'J1': ['K0', 'K1'], 'K1': ['L-1', 'L0'], 'L1': ['M0', 'M1'],
        },
        bases: { P1: 'G11', P2: 'G2' },
        spawns: { P1: ['E9'], P2: ['I2'] },
        bonusSpaces: ['B3', 'L3'],
        obstacles: ['C1', 'C8', 'D4', 'E1', 'E5', 'E6', 'F3', 'G5', 'G8', 'H9', 'I5', 'I6', 'I10', 'J6', 'K1', 'K8'],
        p1Surround: ['F10', 'G10', 'H10', 'H11', 'G12', 'F11'],
        p2Surround: ['F1', 'G1', 'H1', 'H2', 'G3', 'F2'],
        startUnits: [
            { player: 'P1', type: 'Sniper', pos: 'D5' }, { player: 'P1', type: 'Runner', pos: 'E8' }, { player: 'P1', type: 'Heavy', pos: 'I9' },
            { player: 'P2', type: 'Heavy', pos: 'E2' }, { player: 'P2', type: 'Runner', pos: 'I3' }, { player: 'P2', type: 'Sniper', pos: 'J5' },
        ],
    },
    LongNine: {
        layout: ['A:1-9', 'B:1-11', 'C:1-12', 'D:1-13', 'E:1-13', 'F:1-13', 'G:1-4,6-14', 'H:1-13', 'I:1-13', 'J:1-13', 'K:1-12', 'L:1-11', 'M:1-9'],
        connections: {
            'A1': ['B2', 'B3'], 'B1': ['C1', 'C2'], 'C1': ['D1', 'D2'], 'D1': ['E1', 'E2'],
            'E1': ['F0', 'F1'], 'F1': ['G1', 'G2'], 'G1': ['H0', 'H1'], 'H1': ['I1', 'I2'],
            'I1': ['J0', 'J1'], 'J1': ['K0', 'K1'], 'K1': ['L0', 'L1'], 'L1': ['M-1', 'M0'],
        },
        bases: { P1: 'C8', P2: 'K8' },
        spawns: { P1: ['A8', 'B4'], P2: ['L4', 'M8'] },
        bonusSpaces: ['C1', 'E13', 'K1', 'I13'],
        obstacles: ['B1', 'C2', 'D6', 'C5', 'C11', 'D13', 'E1', 'F2', 'F8', 'F9', 'F10', 'F13', 'G1', 'G14', 'H2', 'H8', 'H9', 'H10', 'H13', 'I1', 'J6', 'J13', 'K2', 'K5', 'K11', 'L1'],
        p1Surround: ['B7', 'C7', 'D8', 'D9', 'C9', 'B8'],
        p2Surround: ['J8', 'K7', 'L7', 'L8', 'K9', 'J9'],
        startUnits: [
            { player: 'P1', type: 'Medic', pos: 'A6' }, { player: 'P1', type: 'Heavy', pos: 'E10' }, { player: 'P1', type: 'Runner', pos: 'A2' }, { player: 'P1', type: 'Sniper', pos: 'D7' }, { player: 'P1', type: 'Soldier', pos: 'D10' },
            { player: 'P2', type: 'Soldier', pos: 'J10' }, { player: 'P2', type: 'Sniper', pos: 'J7' }, { player: 'P2', type: 'Runner', pos: 'M2' }, { player: 'P2', type: 'Heavy', pos: 'I10' }, { player: 'P2', type: 'Medic', pos: 'M6' },
        ],
    },
    TitheOfGeHenna: {
        layout: ['A:1-8', 'B:1-9', 'C:1-8,10', 'D:1-9,11', 'E:1-10', 'F:1-5,7-11', 'G:1-10', 'H:1,3-11', 'I:1,3-10', 'J:1-9', 'K:1-8'],
        connections: {
            'A1': ['B1', 'B2'], 'B1': ['C1', 'C2'], 'C1': ['D1', 'D2'], 'D1': ['E0', 'E1'],
            'E1': ['F1', 'F2'], 'F1': ['G0', 'G1'], 'G1': ['H1', 'H2'], 'H1': ['I0', 'I1'],
            'I1': ['J0', 'J1'], 'J1': ['K0', 'K1'],
        },
        bases: { P1: 'B2', P2: 'J8' },
        spawns: { P1: ['C4'], P2: ['I7'] },
        bonusSpaces: ['A6', 'E8', 'G3', 'K3'],
        obstacles: ['A8', 'B6', 'C5', 'C7', 'D2', 'D5', 'E2', 'F1', 'F11', 'G9', 'H10', 'H7', 'I4', 'I6', 'J4', 'K1'],
        p1Surround: ['A2', 'A1', 'B1', 'B3', 'C2', 'C3'],
        p2Surround: ['I8', 'I9', 'J7', 'J9', 'K7', 'K8'],
        startUnits: [
            { player: 'P1', type: 'Soldier', pos: 'A4' }, { player: 'P1', type: 'Runner', pos: 'D1' }, { player: 'P1', type: 'Medic', pos: 'E3' }, { player: 'P1', type: 'Heavy', pos: 'F2' },
            { player: 'P2', type: 'Heavy', pos: 'F10' }, { player: 'P2', type: 'Medic', pos: 'G8' }, { player: 'P2', type: 'Runner', pos: 'H11' }, { player: 'P2', type: 'Soldier', pos: 'K5' },
        ],
    },
};
