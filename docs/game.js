const SNAKES  = {16:6, 47:26, 49:11, 56:53, 62:19, 64:60, 87:24, 93:73, 95:75, 99:78};
const LADDERS = {1:38, 4:14, 9:31, 20:38, 28:84, 40:59, 51:67, 63:81, 71:91};
const PLAYER_COLOURS = ['#00bcd4', '#ffeb3b', '#e040fb', '#42a5f5'];
const PLAYER_SYMBOLS = ['●', '■', '▲', '◆'];
const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let _audioCtx = null;
function getAudioCtx() { if(!_audioCtx) _audioCtx = new AudioCtx(); return _audioCtx; }
function playTone(freq, type, dur, vol, delay) {
  try {
    const ctx=getAudioCtx(), osc=ctx.createOscillator(), gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type=type; osc.frequency.setValueAtTime(freq,ctx.currentTime+(delay||0));
    gain.gain.setValueAtTime(vol||0.25,ctx.currentTime+(delay||0));
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+(delay||0)+dur);
    osc.start(ctx.currentTime+(delay||0)); osc.stop(ctx.currentTime+(delay||0)+dur);
  } catch(e) {}
}
function soundDiceRoll() { playTone(300,'square',0.06,0.12); playTone(450,'square',0.06,0.10,0.07); playTone(200,'square',0.06,0.08,0.14); }
function soundSnake() { [440,392,349,311,277].forEach((f,i)=>playTone(f,'sawtooth',0.12,0.18,i*0.09)); }
function soundLadder() { [261,329,392,523].forEach((f,i)=>playTone(f,'sine',0.18,0.22,i*0.09)); }
function soundWin() { [523,659,784,1047,1568].forEach((f,i)=>playTone(f,'sine',0.35,0.3,i*0.12)); }

// Haptics — paired with each sound so every event lands across senses at once.
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function haptic(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch(e) {} }
const HAPTIC = {
  roll:   12,                 // a single crisp tick as the dice tumbles
  ladder: [18, 30, 18],       // light, lifting taps
  snake:  [55, 35, 55, 35],   // heavier, sinking buzz
  win:    [70, 40, 70, 40, 160]
};

const state = {
  names: [],
  positions: {},
  turns: {},
  currentIdx: 0,
  phase: 'setup'
};

function loadScores() { try{return JSON.parse(localStorage.getItem("snl-scores")||"[]");}catch{return[];} }
function saveScore(name,turns) {
  const scores=loadScores();
  scores.push({name,turns});
  scores.sort((a,b)=>a.turns-b.turns);
  localStorage.setItem("snl-scores",JSON.stringify(scores.slice(0,5)));
  renderLeaderboard();
}
function renderLeaderboard() {
  const el=document.getElementById("leaderboard");
  if(!el) return;
  const scores=loadScores();
  if(!scores.length){el.innerHTML='<p class="no-scores">No scores yet!</p>';return;}
  el.innerHTML='<table class="score-table"><thead><tr><th>#</th><th>Player</th><th>Turns</th></tr></thead><tbody>'+
    scores.map((s,i)=>'<tr'+(i===0?' class="top-score"':'')+"><td>"+(i+1)+"</td><td>"+s.name+"</td><td>"+s.turns+"</td></tr>").join('')+
    '</tbody></table>';
}

// Stores SVG path elements indexed by snake-head square so animation can follow them
const snakePathMap = {};

// --- Setup screen ---

let selectedCount = 1;

document.querySelectorAll('.count-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedCount = parseInt(btn.dataset.count);
    document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderNameInputs();
  });
});

function renderNameInputs() {
  const container = document.getElementById('name-inputs');
  container.innerHTML = '';
  for (let i = 0; i < selectedCount; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Player ${i + 1} name`;
    input.value = `Player ${i + 1}`;
    input.style.borderLeft = `4px solid ${PLAYER_COLOURS[i]}`;
    container.appendChild(input);
  }
}

function startGame() {
  if (state.phase === 'playing') return;
  const inputs = document.querySelectorAll('#name-inputs input');
  state.names = Array.from(inputs).map(el => el.value.trim() || el.placeholder);
  state.names.forEach(name => { state.positions[name] = 0; state.turns[name] = 0; });
  state.currentIdx = 0;
  state.phase = 'playing';

  document.getElementById('setup-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');

  buildBoard();
  const boardEl=document.getElementById("board"); const svg=document.getElementById("overlay"); const sz=boardEl.offsetWidth; svg.setAttribute("width",sz); svg.setAttribute("height",sz);
  drawConnections();
  initTokens();
  buildRoster();
  updatePanel();
}

document.getElementById('start-btn').addEventListener('click', startGame);

renderNameInputs();
renderLeaderboard();

// --- Board ---

function squareToGrid(sq) {
  const row = Math.floor((sq - 1) / 10);
  const colInRow = (sq - 1) % 10;
  const col = (row % 2 === 0) ? colInRow : (9 - colInRow);
  return { gridCol: col + 1, gridRow: 10 - row };
}

function getCellSize() { return document.getElementById("sq-1") ? document.getElementById("sq-1").offsetWidth : 56; }
function squareToCentre(sq) { const {gridCol,gridRow}=squareToGrid(sq); const cs=getCellSize(); return {x:(gridCol-0.5)*cs, y:(gridRow-0.5)*cs}; }

function drawConnections() {
  const svg = document.getElementById('overlay');
  Array.from(svg.children).forEach(el => {
    if (el.tagName !== 'defs') svg.removeChild(el);
  });

  const NS = 'http://www.w3.org/2000/svg';

  Object.entries(SNAKES).forEach(([head, tail]) => {
    const from = squareToCentre(Number(head));
    const to   = squareToCentre(Number(tail));
    const dx = to.x - from.x, dy = to.y - from.y;
    const cx1 = from.x + dx * 0.25 + dy * 0.4;
    const cy1 = from.y + dy * 0.25 - dx * 0.4;
    const cx2 = from.x + dx * 0.75 - dy * 0.4;
    const cy2 = from.y + dy * 0.75 + dx * 0.4;

    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', `M${from.x},${from.y} C${cx1},${cy1} ${cx2},${cy2} ${to.x},${to.y}`);
    path.setAttribute('stroke', '#e94560');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', '0.85');
    path.setAttribute('marker-end', 'url(#snake-arrow)');
    svg.appendChild(path);
    snakePathMap[Number(head)] = path;
  });

  Object.entries(LADDERS).forEach(([bottom, top]) => {
    const from = squareToCentre(Number(bottom));
    const to   = squareToCentre(Number(top));
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', from.x); line.setAttribute('y1', from.y);
    line.setAttribute('x2', to.x);   line.setAttribute('y2', to.y);
    line.setAttribute('stroke', '#69f0ae');
    line.setAttribute('stroke-width', '2.5');
    line.setAttribute('opacity', '0.85');
    line.setAttribute('marker-end', 'url(#ladder-arrow)');
    svg.appendChild(line);
  });
}

function buildBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  for (let sq = 1; sq <= 100; sq++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.id = `sq-${sq}`;
    const num = document.createElement('span');
    num.className = 'sq-num';
    num.textContent = sq;
    cell.appendChild(num);
    if (SNAKES[sq])  cell.classList.add('snake-head');
    if (LADDERS[sq]) cell.classList.add('ladder-bottom');
    const { gridCol, gridRow } = squareToGrid(sq);
    cell.style.gridColumn = gridCol;
    cell.style.gridRow = gridRow;
    board.appendChild(cell);
  }
}

// --- Tokens ---

function initTokens() {
  state.names.forEach((_, i) => {
    const token = document.getElementById(`token-${i}`);
    token.style.background = PLAYER_COLOURS[i];
    token.textContent = PLAYER_SYMBOLS[i];
    token.style.display = 'flex';
    token.style.top = '-40px';
    token.style.left = '-40px';
  });
}

function positionToken(playerIdx) {
  const name = state.names[playerIdx];
  const sq = state.positions[name];
  const token = document.getElementById(`token-${playerIdx}`);

  if (sq === 0) { token.style.top = '-40px'; token.style.left = '-40px'; return; }

  const cell = document.getElementById(`sq-${sq}`);
  const boardWrapper = document.getElementById('board-wrapper');
  const cellRect = cell.getBoundingClientRect();
  const wrapperRect = boardWrapper.getBoundingClientRect();
  const offset = playerIdx * 14;
  token.style.top  = `${cellRect.top  - wrapperRect.top  + 4 + (offset % 28)}px`;
  token.style.left = `${cellRect.left - wrapperRect.left + 4 + Math.floor(offset / 28) * 14}px`;
}

// --- Path-following animation ---

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Animate token along an SVG path element using getPointAtLength
function animateAlongPath(token, svgPath, duration, playerIdx, onComplete) {
  const totalLength = svgPath.getTotalLength();
  const start = performance.now();
  const offset = playerIdx * 14;

  token.style.transition = 'none';

  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const point = svgPath.getPointAtLength(easeInOut(t) * totalLength);
    token.style.left = `${point.x - 11 + Math.floor(offset / 28) * 14}px`;
    token.style.top  = `${point.y - 11 + (offset % 28)}px`;
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      token.style.transition = '';
      onComplete();
    }
  }
  requestAnimationFrame(step);
}

// Animate token linearly from one square to another (for ladders)
function animateAlongLine(token, fromSq, toSq, duration, playerIdx, onComplete) {
  const from = squareToCentre(fromSq);
  const to   = squareToCentre(toSq);
  const start = performance.now();
  const offset = playerIdx * 14;

  token.style.transition = 'none';

  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const e = easeInOut(t);
    const x = from.x + (to.x - from.x) * e;
    const y = from.y + (to.y - from.y) * e;
    token.style.left = `${x - 11 + Math.floor(offset / 28) * 14}px`;
    token.style.top  = `${y - 11 + (offset % 28)}px`;
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      token.style.transition = '';
      onComplete();
    }
  }
  requestAnimationFrame(step);
}

// --- Game logic ---

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function movePlayer(position, roll) {
  const newPos = position + roll;
  if (newPos >= 100) return { pos: 100, event: null };   // landing on or past 100 wins
  if (SNAKES[newPos])  return { pos: SNAKES[newPos],  event: 'snake',  from: newPos };
  if (LADDERS[newPos]) return { pos: LADDERS[newPos], event: 'ladder', from: newPos };
  return { pos: newPos, event: null };
}

// --- Turn handling ---

document.getElementById('roll-btn').addEventListener('click', handleRoll);

function animateDice(finalFace, callback) {
  soundDiceRoll();
  haptic(HAPTIC.roll);
  const el = document.getElementById("dice-result");
  el.classList.remove("placeholder");
  const faces = ["⚀","⚁","⚂","⚃","⚄","⚅"];
  let ticks = 0;
  const iv = setInterval(() => {
    el.classList.remove("dice-pop");
    void el.offsetWidth;
    el.textContent = faces[Math.floor(ticks * 7 % 6)];
    el.classList.add("dice-pop");
    ticks++;
    if (ticks >= 8) {
      clearInterval(iv);
      setTimeout(() => {
        el.classList.remove("dice-pop");
        void el.offsetWidth;
        el.textContent = finalFace;
        el.classList.add("dice-pop");
        callback();
      }, 80);
    }
  }, 60);
}

function handleRoll() {
  if (state.phase !== 'playing') return;

  const rollBtn = document.getElementById('roll-btn');
  rollBtn.disabled = true;

  const playerIdx = state.currentIdx;
  const name = state.names[playerIdx];
  const roll = rollDice();

  animateDice(DICE_FACES[roll], () => {
    const result = movePlayer(state.positions[name], roll);
    state.turns[name]++;
    addLog(name, roll, result);

    if (!result.event) {
      // Normal move — CSS transition handles the slide
      state.positions[name] = result.pos;
      positionToken(playerIdx);
      setTimeout(() => finishTurn(playerIdx, name, result.pos, rollBtn), 420);
    } else {
      // Phase 1: slide token to the snake head / ladder bottom
      state.positions[name] = result.from;
      positionToken(playerIdx);

      // Phase 2: animate along the path after the CSS transition lands
      setTimeout(() => {
        const token = document.getElementById(`token-${playerIdx}`);
        if (result.event === 'snake') {
          soundSnake();
          haptic(HAPTIC.snake);
          animateAlongPath(token, snakePathMap[result.from], 700, playerIdx, () => {
            state.positions[name] = result.pos;
            positionToken(playerIdx);
            setTimeout(() => finishTurn(playerIdx, name, result.pos, rollBtn), 200);
          });
        } else {
          soundLadder();
          haptic(HAPTIC.ladder);
          animateAlongLine(token, result.from, result.pos, 600, playerIdx, () => {
            state.positions[name] = result.pos;
            positionToken(playerIdx);
            setTimeout(() => finishTurn(playerIdx, name, result.pos, rollBtn), 200);
          });
        }
      }, 440);
    }
  });
}

function finishTurn(playerIdx, name, finalPos, rollBtn) {
  if (finalPos >= 100) { showWin(name); return; }
  state.currentIdx = (state.currentIdx + 1) % state.names.length;
  updatePanel();
  rollBtn.disabled = false;
}

function addLog(name, roll, result) {
  const log = document.getElementById('move-log');
  const li = document.createElement('li');
  let text = `${name} rolled ${roll} → square ${result.pos}`;
  if (result.event === 'snake') {
    text = `${name} rolled ${roll} — snake at ${result.from}! Back to ${result.pos}`;
    li.classList.add('snake');
  } else if (result.event === 'ladder') {
    text = `${name} rolled ${roll} — ladder at ${result.from}! Up to ${result.pos}`;
    li.classList.add('ladder');
  }
  li.textContent = text;
  log.insertBefore(li, log.firstChild);
}

// --- Panel ---

function buildRoster() {
  const el = document.getElementById('player-roster');
  el.innerHTML = '';
  state.names.forEach((name, i) => {
    const row = document.createElement('div');
    row.className = 'roster-row';
    row.id = `roster-${i}`;
    row.innerHTML =
      `<span class="roster-symbol" style="color:${PLAYER_COLOURS[i]}">${PLAYER_SYMBOLS[i]}</span>` +
      `<span class="roster-name">${name}</span>` +
      `<span class="roster-turn">Now</span>` +
      `<span class="roster-pos" id="roster-pos-${i}">${state.positions[name]}</span>`;
    el.appendChild(row);
  });
}

function updateRoster() {
  state.names.forEach((name, i) => {
    const row = document.getElementById(`roster-${i}`);
    if (!row) return;
    document.getElementById(`roster-pos-${i}`).textContent = state.positions[name];
    row.classList.toggle('active', i === state.currentIdx);
  });
}

// Glow the active player's token in their own colour so it's easy to find.
function highlightActiveToken() {
  state.names.forEach((_, i) => {
    const token = document.getElementById(`token-${i}`);
    if (!token) return;
    if (i === state.currentIdx) {
      token.style.setProperty('--glow', PLAYER_COLOURS[i]);
      token.classList.add('active-token');
    } else {
      token.classList.remove('active-token');
    }
  });
}

function updatePanel() {
  const name = state.names[state.currentIdx];
  const colour = PLAYER_COLOURS[state.currentIdx];
  const symbol = PLAYER_SYMBOLS[state.currentIdx];
  document.getElementById('turn-indicator').innerHTML =
    `<span style="color:${colour}; font-size:1.2rem">${symbol}</span>  <strong>${name}</strong>'s turn`;
  updateRoster();
  highlightActiveToken();
}

// --- Win ---

function showWin(winner) {
  saveScore(winner, state.turns[winner]);
  soundWin();
  haptic(HAPTIC.win);
  launchConfetti();
  state.phase = 'finished';
  document.getElementById('win-title').textContent = `🎉 ${winner} wins!`;
  const tbody = document.getElementById('summary-body');
  tbody.innerHTML = '';
  state.names.forEach(name => {
    const tr = document.createElement('tr');
    if (name === winner) tr.classList.add('winner-row');
    tr.innerHTML = `<td>${name}${name === winner ? ' 🏆' : ''}</td><td>${state.turns[name]}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('win-overlay').classList.remove('hidden');
}

window.addEventListener("resize",()=>{ if(state.phase!=="playing")return; const sz=document.getElementById("board").offsetWidth; const svg=document.getElementById("overlay"); svg.setAttribute("width",sz); svg.setAttribute("height",sz); drawConnections(); state.names.forEach((_,i)=>positionToken(i)); });

// --- Confetti (win celebration) ---
// Particles are tinted with the player colours + gold so the burst matches
// the game's palette rather than being a generic rainbow.
function launchConfetti() {
  const canvas = document.getElementById('confetti');
  if (reduceMotion) return;  // honour reduced-motion preference
  canvas.classList.remove('hidden');
  const ctx = canvas.getContext('2d');
  const W = canvas.width = window.innerWidth;
  const H = canvas.height = window.innerHeight;
  const colours = PLAYER_COLOURS.concat(['#ffd700']);
  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * W,
    y: -20 - Math.random() * H * 0.5,
    r: 4 + Math.random() * 5,
    c: colours[Math.floor(Math.random() * colours.length)],
    vy: 2 + Math.random() * 3.5,
    vx: -1.5 + Math.random() * 3,
    rot: Math.random() * Math.PI,
    vr: -0.2 + Math.random() * 0.4
  }));

  const end = performance.now() + 2600;
  function frame(now) {
    ctx.clearRect(0, 0, W, H);
    pieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
      ctx.restore();
    });
    if (now < end) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, W, H);
      canvas.classList.add('hidden');
    }
  }
  requestAnimationFrame(frame);
}

// --- Keyboard controls ---
document.addEventListener('keydown', (e) => {
  if (state.phase === 'setup') {
    // Enter from anywhere on the setup screen starts the game.
    if (e.key === 'Enter') { e.preventDefault(); startGame(); }
    return;
  }
  if (state.phase === 'playing' && (e.code === 'Space' || e.key === 'Enter')) {
    const rollBtn = document.getElementById('roll-btn');
    // If the button already has focus, let its native click fire (avoids a double roll).
    if (document.activeElement === rollBtn) return;
    e.preventDefault();
    if (!rollBtn.disabled) handleRoll();
  }
});
