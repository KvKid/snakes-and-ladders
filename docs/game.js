const SNAKES  = {16:6, 47:26, 49:11, 56:53, 62:19, 64:60, 87:24, 93:73, 95:75, 99:78};
const LADDERS = {1:38, 4:14, 9:31, 20:38, 28:84, 40:59, 51:67, 63:81, 71:91};
const PLAYER_COLOURS = ['#00bcd4', '#ffeb3b', '#e040fb', '#42a5f5'];
const PLAYER_SYMBOLS = ['●', '■', '▲', '◆'];
const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const state = {
  names: [],
  positions: {},
  turns: {},
  currentIdx: 0,
  phase: 'setup'
};

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

document.getElementById('start-btn').addEventListener('click', () => {
  const inputs = document.querySelectorAll('#name-inputs input');
  state.names = Array.from(inputs).map(el => el.value.trim() || el.placeholder);
  state.names.forEach(name => { state.positions[name] = 0; state.turns[name] = 0; });
  state.currentIdx = 0;
  state.phase = 'playing';

  document.getElementById('setup-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');

  buildBoard();
  drawConnections();
  initTokens();
  updatePanel();
});

renderNameInputs();

// --- Board ---

function squareToGrid(sq) {
  const row = Math.floor((sq - 1) / 10);
  const colInRow = (sq - 1) % 10;
  const col = (row % 2 === 0) ? colInRow : (9 - colInRow);
  return { gridCol: col + 1, gridRow: 10 - row };
}

function squareToCentre(sq) {
  const { gridCol, gridRow } = squareToGrid(sq);
  return { x: (gridCol - 0.5) * 56, y: (gridRow - 0.5) * 56 };
}

function drawConnections() {
  const svg = document.getElementById('overlay');
  // Remove any previously drawn connections (keep <defs>)
  Array.from(svg.children).forEach(el => {
    if (el.tagName !== 'defs') svg.removeChild(el);
  });

  const NS = 'http://www.w3.org/2000/svg';

  // Draw snakes: red cubic bezier from head to tail
  Object.entries(SNAKES).forEach(([head, tail]) => {
    const from = squareToCentre(Number(head));
    const to   = squareToCentre(Number(tail));

    // Control points perpendicular to the line to create a visible curve
    const dx = to.x - from.x;
    const dy = to.y - from.y;
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
  });

  // Draw ladders: green straight line from bottom to top
  Object.entries(LADDERS).forEach(([bottom, top]) => {
    const from = squareToCentre(Number(bottom));
    const to   = squareToCentre(Number(top));

    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', from.x);
    line.setAttribute('y1', from.y);
    line.setAttribute('x2', to.x);
    line.setAttribute('y2', to.y);
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
    // Start off-board (hidden off to side)
    token.style.top = '-40px';
    token.style.left = '-40px';
  });
}

function positionToken(playerIdx) {
  const name = state.names[playerIdx];
  const sq = state.positions[name];
  const token = document.getElementById(`token-${playerIdx}`);

  if (sq === 0) {
    token.style.top = '-40px';
    token.style.left = '-40px';
    return;
  }

  const cell = document.getElementById(`sq-${sq}`);
  const boardWrapper = document.getElementById('board-wrapper');
  const cellRect = cell.getBoundingClientRect();
  const wrapperRect = boardWrapper.getBoundingClientRect();

  // Offset tokens slightly so multiple on same square don't fully overlap
  const offset = playerIdx * 14;
  const top = cellRect.top - wrapperRect.top + 4 + (offset % 28);
  const left = cellRect.left - wrapperRect.left + 4 + Math.floor(offset / 28) * 14;

  token.style.top = `${top}px`;
  token.style.left = `${left}px`;
}

// --- Game logic ---

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function movePlayer(position, roll) {
  const newPos = position + roll;
  if (newPos > 100) return { pos: position, event: null };
  if (SNAKES[newPos])  return { pos: SNAKES[newPos],  event: 'snake',  from: newPos };
  if (LADDERS[newPos]) return { pos: LADDERS[newPos], event: 'ladder', from: newPos };
  return { pos: newPos, event: null };
}

// --- Turn handling ---

document.getElementById('roll-btn').addEventListener('click', handleRoll);

function handleRoll() {
  if (state.phase !== 'playing') return;

  const rollBtn = document.getElementById('roll-btn');
  rollBtn.disabled = true;

  const name = state.names[state.currentIdx];
  const roll = rollDice();

  document.getElementById('dice-result').textContent = DICE_FACES[roll];

  const result = movePlayer(state.positions[name], roll);
  state.positions[name] = result.pos;
  state.turns[name]++;

  addLog(name, roll, result);
  positionToken(state.currentIdx);

  setTimeout(() => {
    if (result.pos === 100) {
      showWin(name);
      return;
    }
    state.currentIdx = (state.currentIdx + 1) % state.names.length;
    updatePanel();
    rollBtn.disabled = false;
  }, 380);
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

function updatePanel() {
  const name = state.names[state.currentIdx];
  const colour = PLAYER_COLOURS[state.currentIdx];
  const symbol = PLAYER_SYMBOLS[state.currentIdx];
  const indicator = document.getElementById('turn-indicator');
  indicator.innerHTML = `<span style="color:${colour}; font-size:1.2rem">${symbol}</span>  <strong>${name}</strong>'s turn`;
}

// --- Win ---

function showWin(winner) {
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
