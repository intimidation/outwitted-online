import {
    parseMapConfig,
    calculateValidMoves,
    calculateValidTargets,
    applyAction,
    hexToPixel,
    hexRound,
    isBase,
    isObstacle,
    isBonusSpace,
    getNeighbors,
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
import { OutwittersApiClient, getApiBaseUrl, setCustomApiBaseUrl } from './api/client.js';

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
let pendingMobiTeleport: { mobi: Unit; target: Unit } | null = null;
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

    const apiTargetEl = document.getElementById('current-api-target');
    if (apiTargetEl) {
        apiTargetEl.textContent = getApiBaseUrl();
    }

    setupCanvasEvents();
    await updateDevUserDisplay();
    await refreshActiveMatchesList();
});

(window as any).promptCustomApiUrl = () => {
    const current = getApiBaseUrl();
    const input = prompt('Enter your Google Cloud Backend API URL (e.g. https://outwitters-api-xxx.a.run.app/api):', current);
    if (input !== null && input.trim()) {
        setCustomApiBaseUrl(input.trim());
    }
};

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

let activeBattlesTab: 'my' | 'open' = 'my';

(window as any).switchBattlesTab = (tab: 'my' | 'open') => {
    activeBattlesTab = tab;
    document.getElementById('tab-my-battles')!.style.background = tab === 'my' ? 'var(--accent-green)' : '#272732';
    document.getElementById('tab-open-battles')!.style.background = tab === 'open' ? 'var(--accent-green)' : '#272732';
    refreshActiveMatchesList();
};

(window as any).toggleOpponentInput = () => {
    const oppType = (document.getElementById('opponent-type-select') as HTMLSelectElement).value;
    const group = document.getElementById('opponent-input-group')!;
    group.style.display = oppType === 'challenge' ? 'flex' : 'none';
};

// Refresh Active & Open Matches List
async function refreshActiveMatchesList() {
    const listDiv = document.getElementById('active-matches-list')!;
    listDiv.innerHTML = '<div style="font-size: 12px; color: var(--text-secondary); text-align: center;">Loading battles...</div>';

    try {
        if (activeBattlesTab === 'open') {
            // Load Open Games waiting for an opponent
            const res = await OutwittersApiClient.getOpenMatches(currentUserId);
            const matches = res.matches || [];

            if (matches.length === 0) {
                listDiv.innerHTML = '<div style="font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px;">No open games right now. Create one below!</div>';
                return;
            }

            listDiv.innerHTML = '';
            matches.forEach((m: any) => {
                const card = document.createElement('div');
                card.className = 'match-card your-turn';
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="font-size:13px; color:#fff;">${m.mapId} (Host: ${m.player1Id})</strong>
                        <span style="font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; background:var(--accent-green); color:#fff;">
                            OPEN
                        </span>
                    </div>
                    <div style="font-size:11px; color:var(--text-secondary);">
                        Host Race: ${m.p1Race} • ${m.pogNerfs ? 'PoG' : 'Standard'}
                    </div>
                    <button style="margin-top:4px; padding:6px; background:var(--accent-green); color:#fff; border:none; border-radius:6px; font-weight:800; text-transform:uppercase; font-size:10px; cursor:pointer;">
                        ⚔️ Join Battle Now
                    </button>
                `;
                card.querySelector('button')!.onclick = () => joinOpenMatch(m.id);
                listDiv.appendChild(card);
            });
        } else {
            // Load My Active Battles
            const res = await OutwittersApiClient.getMatches(currentUserId);
            const matches = res.matches || [];

            if (matches.length === 0) {
                listDiv.innerHTML = '<div style="font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px;">No active matches. Launch or join one below!</div>';
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
        }
    } catch (err: any) {
        listDiv.innerHTML = `<div style="font-size:12px; color:var(--accent-red);">Connection info: ${err.message}</div>`;
    }
}

// Join Open Match
async function joinOpenMatch(matchId: string) {
    try {
        await OutwittersApiClient.joinOpenMatch(matchId, currentUserId, selectedRace);
        alert('Successfully joined battle!');
        await loadOnlineMatch(matchId);
    } catch (err: any) {
        alert('Failed joining match: ' + err.message);
    }
}

// Automated Ranked Matchmaking Queue
(window as any).joinMatchmakingQueue = async () => {
    const pogNerfs = (document.getElementById('pog-toggle') as HTMLInputElement).checked;
    try {
        const res = await fetch(`${getApiBaseUrl()}/matchmaking/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                preferredRace: selectedRace,
                pogMode: pogNerfs,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Matchmaking failed');

        alert('Searching for ranked opponent... If another player is searching, game will start automatically!');
        await refreshActiveMatchesList();
    } catch (err: any) {
        alert('Matchmaking error: ' + err.message);
    }
};

// Create Online Match
(window as any).createNewOnlineMatch = async () => {
    const mapSelect = (document.getElementById('map-select') as HTMLSelectElement).value;
    const oppType = (document.getElementById('opponent-type-select') as HTMLSelectElement).value;
    const opponentInput = (document.getElementById('opponent-id-input') as HTMLInputElement).value.trim();
    const pogNerfs = (document.getElementById('pog-toggle') as HTMLInputElement).checked;
    const isRanked = (document.getElementById('ranked-toggle') as HTMLInputElement).checked;

    let targetOpponentId = 'open';
    if (oppType === 'challenge') {
        if (!opponentInput) {
            alert('Please enter opponent User ID or username');
            return;
        }
        const oppUser = await OutwittersApiClient.devLogin(opponentInput);
        targetOpponentId = oppUser.user.id;
    }

    const availableRaces: RaceId[] = ['Scallywags', 'Feedback', 'Adorables', 'Veggienauts'];
    const randomOpponentRace = availableRaces[Math.floor(Math.random() * availableRaces.length)];

    try {
        const res = await OutwittersApiClient.createMatch({
            creatorUserId: currentUserId,
            opponentUserId: targetOpponentId,
            mapId: mapSelect,
            isRanked,
            pogNerfs,
            creatorRace: selectedRace,
            opponentRace: randomOpponentRace,
        });

        alert(oppType === 'open' ? 'Open Battle published! Anyone can join now!' : 'Challenge sent!');
        await refreshActiveMatchesList();
        if (oppType === 'challenge') {
            await loadOnlineMatch(res.match.id);
        }
    } catch (err: any) {
        alert('Failed launching match: ' + err.message);
    }
};

// Load Online Match
async function loadOnlineMatch(matchId: string) {
    try {
        const res = await OutwittersApiClient.getMatchState(matchId, currentUserId);
        currentMatchData = res.match;
        activeMatchId = matchId;

        const rawMap = MAPS[currentMatchData.mapId] || MAPS['SweetTooth'];
        mapConfig = parseMapConfig(rawMap, currentMatchData.sideSwap || false);

        serverBaselineState = currentMatchData.gameState;
        currentLocalState = JSON.parse(JSON.stringify(serverBaselineState));
        actionQueue = [];

        // Correctly populate match gameParams from server response
        gameParams = {
            mapId: currentMatchData.mapId,
            p1Race: currentMatchData.p1Race || 'Scallywags',
            p2Race: currentMatchData.p2Race || 'Scallywags',
            p1ColorKey: currentMatchData.p1ColorKey || 'blue',
            p2ColorKey: currentMatchData.p2ColorKey || 'red',
            sideSwap: currentMatchData.sideSwap || false,
            pogNerfs: currentMatchData.pogNerfs || false,
        };

        selectedUnit = null;
        pendingSpawnType = null;
        pendingMobiTeleport = null;
        validMoves = [];
        validTargets = [];

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
        await OutwittersApiClient.submitTurn(
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
    pendingMobiTeleport = null;
    validMoves = [];

    const avail = mapConfig!.parsedSpawns[currentLocalState.turn].filter(sp =>
        !currentLocalState!.units.some(u => u.q === sp.q && u.r === sp.r)
    );
    validTargets = avail.map(sp => ({ q: sp.q, r: sp.r, special: 'Spawn' }));
    draw();
};

// Spawn Special Unit Action (race-aware)
(window as any).spawnSpecial = () => {
    if (!currentLocalState || !gameParams) return;
    const currentRace = currentLocalState.turn === 'P1' ? gameParams.p1Race : gameParams.p2Race;
    const specialType = RACE_SPECIAL[currentRace] || 'Bombshell';
    (window as any).spawnUnit(specialType);
};

// Canvas & UI logic
function updateUI() {
    if (!currentLocalState || !currentMatchData || !gameParams) return;

    const isYourTurn = currentMatchData.yourTurn;
    const p1C = COLORS[gameParams.p1ColorKey || 'blue'];
    const p2C = COLORS[gameParams.p2ColorKey || 'red'];

    document.getElementById('p1-name')!.textContent = `${p1C.emoji} P1 (${RACE_EMOJI[gameParams.p1Race] || ''})`;
    document.getElementById('p2-name')!.textContent = `${p2C.emoji} P2 (${RACE_EMOJI[gameParams.p2Race] || ''})`;

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
        if (!currentLocalState || !mapConfig || !currentMatchData || !currentMatchData.yourTurn || !gameParams) return;

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
                const res = applyAction(currentLocalState, action, mapConfig, gameParams);
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

        // Handle Mobi Teleport Destination Click
        if (pendingMobiTeleport) {
            const tgt = validTargets.find(t => t.q === hex.q && t.r === hex.r && t.special === 'MobiExecuteTeleport');
            const mobiData = pendingMobiTeleport;
            pendingMobiTeleport = null;

            if (tgt) {
                const action: GameAction = {
                    action: 'ACT',
                    fromQ: mobiData.mobi.q,
                    fromR: mobiData.mobi.r,
                    toQ: hex.q,
                    toR: hex.r,
                    targetQ: mobiData.target.q,
                    targetR: mobiData.target.r,
                    special: 'MobiTeleport',
                };
                const res = applyAction(currentLocalState, action, mapConfig, gameParams);
                if (res.success) {
                    currentLocalState = res.newState;
                    actionQueue.push(action);
                }
            }
            selectedUnit = null;
            validMoves = [];
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
            const res = applyAction(currentLocalState, action, mapConfig, gameParams);
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

        // Handle Act Target Click (Attack, Heal, Scramble, ToggleSiege, MobiSelectTarget)
        const tgt = validTargets.find(t => t.q === hex.q && t.r === hex.r);
        if (tgt && selectedUnit) {
            if (tgt.special === 'MobiSelectTarget') {
                const targetUnit = currentLocalState.units.find(u => u.q === hex.q && u.r === hex.r);
                if (targetUnit) {
                    pendingMobiTeleport = { mobi: selectedUnit, target: targetUnit };
                    validTargets = [];
                    validMoves = [];
                    getNeighbors(selectedUnit.q, selectedUnit.r, mapConfig.geomGrid).forEach(n => {
                        const occ = currentLocalState!.units.find(u => u.q === n.q && u.r === n.r);
                        if (!isObstacle(n.q, n.r, mapConfig!) && (!occ || occ === targetUnit)) {
                            validTargets.push({ q: n.q, r: n.r, special: 'MobiExecuteTeleport' });
                        }
                    });
                    draw();
                    return;
                }
            }

            const action: GameAction = {
                action: 'ACT',
                fromQ: selectedUnit.q,
                fromR: selectedUnit.r,
                toQ: hex.q,
                toR: hex.r,
                special: tgt.special as any,
            };
            const res = applyAction(currentLocalState, action, mapConfig, gameParams);
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
            validTargets = calculateValidTargets(u, currentLocalState, mapConfig, gameParams, false);
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
    if (!mapConfig || !currentLocalState || !gameParams) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    const p1C = COLORS[gameParams.p1ColorKey || 'blue'];
    const p2C = COLORS[gameParams.p2ColorKey || 'red'];

    // Draw Hex Grid with Bases, Obstacles, Bonus Spaces
    mapConfig.geomGrid.forEach(hex => {
        const p = hexToPixel(hex.q, hex.r, hexRadius);
        p.x += offsetX; p.y += offsetY;

        const isP1Base = isBase(hex.q, hex.r, 'P1', mapConfig!);
        const isP2Base = isBase(hex.q, hex.r, 'P2', mapConfig!);
        const isObs = isObstacle(hex.q, hex.r, mapConfig!);
        const isBonus = isBonusSpace(hex.q, hex.r, mapConfig!);

        let f = '#1c1c24', s = '#3f3f46', w = 1;

        if (isP1Base) {
            f = p1C.dark; s = p1C.stroke; w = 2;
        } else if (isP2Base) {
            f = p2C.dark; s = p2C.stroke; w = 2;
        } else if (isObs) {
            f = '#064e3b'; s = '#022c22'; w = 2;
        } else if (isBonus) {
            f = '#2d2a1e'; s = '#ffd700'; w = 2;
        }

        if (validMoves.some(m => m.q === hex.q && m.r === hex.r)) {
            f = '#155e37'; s = '#86efac'; w = 2;
        } else if (validTargets.some(t => t.q === hex.q && t.r === hex.r)) {
            f = '#501c1c'; s = '#ef4444'; w = 2;
        }

        drawHex(p.x, p.y, hexRadius, f, s, w);
    });

    // Draw Units & Health Badges
    currentLocalState.units.forEach(u => {
        const p = hexToPixel(u.q, u.r, hexRadius);
        p.x += offsetX; p.y += offsetY;

        ctx.beginPath();
        ctx.arc(p.x, p.y, hexRadius * 0.75, 0, 2 * Math.PI);
        ctx.fillStyle = u.player === 'P1' ? p1C.base : p2C.base;
        ctx.fill();

        ctx.lineWidth = selectedUnit === u ? 3 : 1.5;
        ctx.strokeStyle = selectedUnit === u ? '#facc15' : '#ffffff';
        ctx.stroke();

        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        const rules = UNIT_RULES[u.type] || UNIT_RULES.Soldier;
        ctx.fillText(rules.emoji, p.x, p.y);

        // Draw HP Badge
        const hpOffset = Math.round(hexRadius * 0.4);
        ctx.font = 'bold 9px sans-serif';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        ctx.strokeText(String(u.hp), p.x + hpOffset, p.y + hpOffset);
        ctx.fillStyle = u.hp > u.maxHp ? '#4ade80' : '#facc15';
        ctx.fillText(String(u.hp), p.x + hpOffset, p.y + hpOffset);
    });

    ctx.restore();
}
