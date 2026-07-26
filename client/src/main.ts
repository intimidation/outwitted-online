import {
    parseMapConfig,
    calculateValidMoves,
    calculateValidTargets,
    applyAction,
    hexToPixel,
    hexRound,
    MAPS,
    UNIT_RULES,
    COLORS,
    RACE_SPECIAL,
    RACE_EMOJI,
    type GameState,
    type GameParams,
    type GameAction,
    type Unit,
    type MapConfig,
    type ValidTarget,
    type RaceId,
    type ColorKey,
} from '@outwitters/shared';
import { OutwittersApiClient } from './api/client.js';

// App State
let currentUserId = 'usr_player1';
let currentUsername = 'player1';
let activeMatchId: string | null = null;
let currentMatchData: any = null;

let selectedRace: RaceId = 'Scallywags';
let gameParams: GameParams | null = null;
let mapConfig: MapConfig | null = null;

// Live game state (authoritative baseline + pending local actions)
let serverBaselineState: GameState | null = null;
let currentLocalState: GameState | null = null;
let actionQueue: GameAction[] = [];

// Selection & Interaction
let selectedUnit: Unit | null = null;
let pendingSpawnType: any = null;
let validMoves: any[] = [];
let validTargets: ValidTarget[] = [];

// Canvas Rendering
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let hexRadius = 19;
let offsetX = 0, offsetY = 0;
let panX = 0, panY = 0, zoom = 1.0;

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    ctx = canvas.getContext('2d')!;

    setupCanvasEvents();
    await updateDevUserDisplay();
    await refreshActiveMatchesList();
});

// User Dev Login
(window as any).switchUserPrompt = async () => {
    const name = prompt('Enter username (e.g. player1 or player2):', currentUsername);
    if (name) {
        currentUsername = name.trim();
        const user = await OutwittersApiClient.devLogin(currentUsername);
        currentUserId = user.user.id;
        await updateDevUserDisplay();
        await refreshActiveMatchesList();
    }
};

async function updateDevUserDisplay() {
    const user = await OutwittersApiClient.devLogin(currentUsername);
    currentUserId = user.user.id;
    document.getElementById('user-display-name')!.textContent = `${user.user.displayName} (${currentUserId})`;
}

// Lobby Race Selection
(window as any).selectRace = (race: RaceId) => {
    selectedRace = race;
    document.querySelectorAll('.race-card').forEach(card => {
        if (card.getAttribute('data-race') === race) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
};

// Refresh Active Matches List
async function refreshActiveMatchesList() {
    const listDiv = document.getElementById('active-matches-list')!;
    listDiv.innerHTML = '<div style="font-size: 12px; color: var(--text-secondary); text-align: center;">Loading...</div>';

    try {
        const res = await OutwittersApiClient.getMatches(currentUserId);
        const matches = res.matches || [];

        if (matches.length === 0) {
            listDiv.innerHTML = '<div style="font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px;">No active matches. Launch one below!</div>';
            return;
        }

        listDiv.innerHTML = '';
        matches.forEach((m: any) => {
            const isYourTurn = m.currentPlayer === (m.player1Id === currentUserId ? 'P1' : 'P2');
            const card = document.createElement('div');
            card.className = `match-card ${isYourTurn ? 'your-turn' : ''}`;
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size:13px; color:#fff;">${m.mapId} (${m.pogNerfs ? 'PoG' : 'Standard'})</strong>
                    <span style="font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; background:${isYourTurn ? 'var(--accent-green)' : '#272732'}; color:#fff;">
                        ${isYourTurn ? 'YOUR TURN' : 'WAITING'}
                    </span>
                </div>
                <div style="font-size:11px; color:var(--text-secondary);">
                    Turn ${m.currentTurnNumber} • ${m.status.toUpperCase()}
                </div>
                <button style="margin-top:4px; padding:6px; background:var(--accent-blue); color:#fff; border:none; border-radius:6px; font-weight:800; text-transform:uppercase; font-size:10px; cursor:pointer;">
                    Enter Battle
                </button>
            `;
            card.querySelector('button')!.onclick = () => loadOnlineMatch(m.id);
            listDiv.appendChild(card);
        });
    } catch (err: any) {
        listDiv.innerHTML = `<div style="font-size:12px; color:var(--accent-red);">Error: ${err.message}</div>`;
    }
}

// Create Online Match
(window as any).createNewOnlineMatch = async () => {
    const mapSelect = (document.getElementById('map-select') as HTMLSelectElement).value;
    const opponentInput = (document.getElementById('opponent-id-input') as HTMLInputElement).value.trim();
    const pogNerfs = (document.getElementById('pog-toggle') as HTMLInputElement).checked;
    const isRanked = (document.getElementById('ranked-toggle') as HTMLInputElement).checked;

    if (!opponentInput) {
        alert('Please enter opponent User ID');
        return;
    }

    try {
        const oppUser = await OutwittersApiClient.devLogin(opponentInput);
        const opponentUserId = oppUser.user.id;

        const res = await OutwittersApiClient.createMatch({
            creatorUserId: currentUserId,
            opponentUserId,
            mapId: mapSelect,
            isRanked,
            pogNerfs,
            creatorRace: selectedRace,
            opponentRace: 'Scallywags',
        });

        alert('Match launched!');
        await refreshActiveMatchesList();
        await loadOnlineMatch(res.match.id);
    } catch (err: any) {
        alert('Failed creating match: ' + err.message);
    }
};

// Load Online Match
async function loadOnlineMatch(matchId: string) {
    try {
        const res = await OutwittersApiClient.getMatchState(matchId, currentUserId);
        currentMatchData = res.match;
        activeMatchId = matchId;

        const rawMap = MAPS[currentMatchData.mapId] || MAPS['SweetTooth'];
        mapConfig = parseMapConfig(rawMap, false);

        serverBaselineState = currentMatchData.gameState;
        currentLocalState = JSON.parse(JSON.stringify(serverBaselineState));
        actionQueue = [];

        gameParams = {
            mapId: currentMatchData.mapId,
            p1Race: 'Scallywags',
            p2Race: 'Scallywags',
            p1ColorKey: 'blue',
            p2ColorKey: 'red',
            sideSwap: false,
            pogNerfs: currentMatchData.pogNerfs,
        };

        document.getElementById('lobby-screen')!.style.display = 'none';
        document.getElementById('app-container')!.style.display = 'flex';

        resizeCanvas();
        centerGrid();
        updateUI();
        draw();
    } catch (err: any) {
        alert('Failed loading match: ' + err.message);
    }
}

// Return to Menu
(window as any).returnToMenu = () => {
    activeMatchId = null;
    document.getElementById('app-container')!.style.display = 'none';
    document.getElementById('lobby-screen')!.style.display = 'flex';
    refreshActiveMatchesList();
};

// Submit Current Turn
(window as any).submitCurrentTurn = async () => {
    if (!activeMatchId || !currentMatchData || !currentMatchData.yourTurn) {
        alert('It is not your turn!');
        return;
    }

    try {
        const res = await OutwittersApiClient.submitTurn(
            activeMatchId,
            currentUserId,
            currentMatchData.currentTurnNumber,
            actionQueue
        );
        alert('Turn submitted successfully!');
        (window as any).returnToMenu();
    } catch (err: any) {
        alert('Submission failed: ' + err.message);
    }
};

// Spawn Unit Action
(window as any).spawnUnit = (type: any) => {
    if (!currentLocalState || !currentMatchData || !currentMatchData.yourTurn) return;
    pendingSpawnType = type;
    selectedUnit = null;
    validMoves = [];

    const avail = mapConfig!.parsedSpawns[currentLocalState.turn].filter(sp =>
        !currentLocalState!.units.some(u => u.q === sp.q && u.r === sp.r)
    );
    validTargets = avail.map(sp => ({ q: sp.q, r: sp.r, special: 'Spawn' }));
    draw();
};

(window as any).spawnSpecial = () => {
    (window as any).spawnUnit('Bombshell');
};

// Canvas & UI logic
function updateUI() {
    if (!currentLocalState || !currentMatchData) return;

    const role = currentMatchData.playerRole;
    const isYourTurn = currentMatchData.yourTurn;

    document.getElementById('turn-banner')!.textContent =
        `TURN ${currentMatchData.currentTurnNumber} : ${isYourTurn ? 'YOUR TURN' : 'WAITING FOR OPPONENT'}`;

    // Wits display (opponent wits hidden as sentinel -1)
    document.getElementById('p1-wits')!.textContent =
        currentLocalState.wits.P1 === -1 ? '?' : String(currentLocalState.wits.P1);
    document.getElementById('p2-wits')!.textContent =
        currentLocalState.wits.P2 === -1 ? '?' : String(currentLocalState.wits.P2);

    const submitBtn = document.getElementById('submit-turn-btn') as HTMLButtonElement;
    submitBtn.disabled = !isYourTurn;
}

function resizeCanvas() {
    const wrapper = document.getElementById('canvas-wrapper')!;
    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
}

function centerGrid() {
    if (!mapConfig || mapConfig.geomGrid.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    mapConfig.geomGrid.forEach(hex => {
        const px = hexRadius * 3 / 2 * hex.q;
        const py = hexRadius * Math.sqrt(3) * (hex.r + hex.q / 2);
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
    });
    offsetX = (canvas.width / (window.devicePixelRatio || 1) - (maxX + minX)) / 2;
    offsetY = (canvas.height / (window.devicePixelRatio || 1) - (maxY + minY)) / 2;
}

function setupCanvasEvents() {
    canvas.addEventListener('click', (e) => {
        if (!currentLocalState || !mapConfig || !currentMatchData || !currentMatchData.yourTurn) return;

        const rect = canvas.getBoundingClientRect();
        const logicalX = (e.clientX - rect.left);
        const logicalY = (e.clientY - rect.top);

        const worldX = (logicalX - panX) / zoom;
        const worldY = (logicalY - panY) / zoom;
        const hex = pixelToHex(worldX, worldY);

        // Handle Spawn Click
        if (pendingSpawnType) {
            const tgt = validTargets.find(t => t.q === hex.q && t.r === hex.r && t.special === 'Spawn');
            if (tgt) {
                const action: GameAction = {
                    action: 'SPAWN',
                    unitType: pendingSpawnType,
                    toQ: hex.q,
                    toR: hex.r,
                };
                const res = applyAction(currentLocalState, action, mapConfig, gameParams!);
                if (res.success) {
                    currentLocalState = res.newState;
                    actionQueue.push(action);
                }
            }
            pendingSpawnType = null;
            validTargets = [];
            updateUI();
            draw();
            return;
        }

        // Handle Move Click
        if (selectedUnit && validMoves.some(m => m.q === hex.q && m.r === hex.r)) {
            const action: GameAction = {
                action: 'MOVE',
                fromQ: selectedUnit.q,
                fromR: selectedUnit.r,
                toQ: hex.q,
                toR: hex.r,
            };
            const res = applyAction(currentLocalState, action, mapConfig, gameParams!);
            if (res.success) {
                currentLocalState = res.newState;
                actionQueue.push(action);
            }
            selectedUnit = null;
            validMoves = [];
            validTargets = [];
            updateUI();
            draw();
            return;
        }

        // Handle Unit Selection
        const u = currentLocalState.units.find(unit => unit.q === hex.q && unit.r === hex.r);
        if (u && u.player === currentLocalState.turn) {
            selectedUnit = u;
            validMoves = calculateValidMoves(u, currentLocalState, mapConfig, false);
            validTargets = calculateValidTargets(u, currentLocalState, mapConfig, gameParams!, false);
        } else {
            selectedUnit = null;
            validMoves = [];
            validTargets = [];
        }

        draw();
    });
}

function pixelToHex(x: number, y: number) {
    const ptX = x - offsetX, ptY = y - offsetY;
    return hexRound((2 / 3 * ptX) / hexRadius, (-1 / 3 * ptX + Math.sqrt(3) / 3 * ptY) / hexRadius);
}

function drawHex(x: number, y: number, r: number, f: string, s: string, w: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = f; ctx.fill();
    ctx.lineWidth = w; ctx.strokeStyle = s; ctx.stroke();
}

function draw() {
    if (!mapConfig || !currentLocalState) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Draw Hex Grid
    mapConfig.geomGrid.forEach(hex => {
        const p = hexToPixel(hex.q, hex.r, hexRadius);
        p.x += offsetX; p.y += offsetY;

        let f = '#1c1c24', s = '#3f3f46', w = 1;

        if (validMoves.some(m => m.q === hex.q && m.r === hex.r)) {
            f = '#155e37'; s = '#86efac'; w = 2;
        } else if (validTargets.some(t => t.q === hex.q && t.r === hex.r)) {
            f = '#501c1c'; s = '#ef4444'; w = 2;
        }

        drawHex(p.x, p.y, hexRadius, f, s, w);
    });

    // Draw Units
    currentLocalState.units.forEach(u => {
        const p = hexToPixel(u.q, u.r, hexRadius);
        p.x += offsetX; p.y += offsetY;

        ctx.beginPath();
        ctx.arc(p.x, p.y, hexRadius * 0.75, 0, 2 * Math.PI);
        ctx.fillStyle = u.player === 'P1' ? '#1d4ed8' : '#b91c1c';
        ctx.fill();

        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        const rules = UNIT_RULES[u.type] || UNIT_RULES.Soldier;
        ctx.fillText(rules.emoji, p.x, p.y);
    });

    ctx.restore();
}
