const TILE = 32;
const WORLD_W = 240;
const WORLD_H = 95;
const GRAVITY = 0.42;
const DAY_LENGTH = 4200;

const BLOCKS = {
  air: { solid: false, color: null, hp: 0 },
  grass: { solid: true, color: '#58b84d', hp: 2, drop: 'dirt' },
  dirt: { solid: true, color: '#8a5f3c', hp: 2, drop: 'dirt' },
  stone: { solid: true, color: '#70747e', hp: 4, drop: 'stone' },
  sand: { solid: true, color: '#dfcc8f', hp: 2, drop: 'sand' },
  wood: { solid: true, color: '#915f2d', hp: 3, drop: 'wood' },
  leaves: { solid: true, color: '#2f8f33', hp: 1, drop: 'leaves' },
  water: { solid: false, color: '#3379e8aa', hp: 1, drop: null, fluid: true },
  coalOre: { solid: true, color: '#3d3d3f', hp: 4, drop: 'coal' },
  ironOre: { solid: true, color: '#9a9da5', hp: 5, drop: 'ironOre' },
  furnace: { solid: true, color: '#55525f', hp: 6, drop: 'furnace' },
  plank: { solid: true, color: '#c99761', hp: 2, drop: 'plank' },
  torch: { solid: false, color: '#ffc766', hp: 1, drop: 'torch' },
  cactus: { solid: true, color: '#30a456', hp: 2, drop: 'cactus' },
};

const BIOMES = ['plains', 'forest', 'desert', 'mountains'];
const BIOME_FR = {
  plains: 'Plaines',
  forest: 'Forêt',
  desert: 'Désert',
  mountains: 'Montagnes',
};

const PLACEABLE = Object.keys(BLOCKS).filter((k) => k !== 'air');
const RECIPES = [
  { name: 'Planches x4', in: { wood: 1 }, out: { plank: 4 } },
  { name: 'Four', in: { stone: 8 }, out: { furnace: 1 } },
  { name: 'Torches x4', in: { coal: 1, wood: 1 }, out: { torch: 4 } },
  { name: 'Terre x2', in: { sand: 1, dirt: 1 }, out: { dirt: 2 } },
];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const blockSelect = document.getElementById('blockSelect');
const inventoryList = document.getElementById('inventoryList');
const recipesList = document.getElementById('recipesList');
const biomeLabel = document.getElementById('biomeLabel');
const healthLabel = document.getElementById('healthLabel');
const hungerLabel = document.getElementById('hungerLabel');
const timeLabel = document.getElementById('timeLabel');

let keys = {};
let world = [];
let breakMap = new Map();
let projectiles = [];
let mobs = [];
let selectedBlock = 'dirt';
let tick = 0;
let day = 1;

const player = {
  x: 16,
  y: 16,
  w: 0.82,
  h: 1.75,
  vx: 0,
  vy: 0,
  onGround: false,
  health: 100,
  hunger: 100,
  facing: 1,
  inventory: { dirt: 25, stone: 8, wood: 7, coal: 2, torch: 8 },
};

function rand(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getBlock(x, y) {
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return 'air';
  return world[y][x];
}

function setBlock(x, y, id) {
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return;
  world[y][x] = id;
}

function findSurface(x) {
  for (let y = 0; y < WORLD_H; y++) {
    if (BLOCKS[getBlock(x, y)]?.solid) return y;
  }
  return WORLD_H - 1;
}

function spawnTree(x, y) {
  const h = 3 + Math.floor(rand(x * 8.1) * 3);
  for (let i = 0; i < h; i++) setBlock(x, y - i, 'wood');
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 1; dy++) {
      if (Math.abs(dx) + Math.abs(dy) < 4 && rand((x + dx) * 13 + (y - h + dy) * 31) > 0.12) {
        setBlock(x + dx, y - h + dy, 'leaves');
      }
    }
  }
}

function spawnCactus(x, y) {
  const h = 2 + Math.floor(rand(x * 1.9) * 3);
  for (let i = 0; i < h; i++) setBlock(x, y - i, 'cactus');
}

function carveCaves() {
  for (let i = 0; i < 40; i++) {
    let x = Math.floor(rand(i * 30) * WORLD_W);
    let y = 50 + Math.floor(rand(i * 60) * 30);
    for (let s = 0; s < 115; s++) {
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) setBlock(x + ox, y + oy, 'air');
      }
      x += Math.floor(rand(s * 13 + i) * 3) - 1;
      y += Math.floor(rand(s * 17 + i) * 3) - 1;
    }
  }
}

function spawnMobs() {
  mobs = [];
  for (let i = 0; i < 28; i++) {
    const x = 10 + Math.floor(rand(i * 17) * (WORLD_W - 20));
    const y = findSurface(x) - 1;
    const type = rand(i * 33) > 0.4 ? 'slime' : 'skeleton';
    mobs.push({ x, y, vx: 0, vy: 0, hp: type === 'slime' ? 20 : 14, type, cooldown: 0, onGround: false });
  }
}

function generateWorld() {
  world = Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill('air'));
  for (let x = 0; x < WORLD_W; x++) {
    const biome = BIOMES[Math.floor(rand(x * 0.173) * BIOMES.length)];
    const wave = Math.sin(x / 14) * 3 + Math.sin(x / 5) * 1.6;
    let base = 40;
    if (biome === 'mountains') base = 33 + Math.sin(x / 3) * 4;
    else if (biome === 'desert') base = 43 + Math.sin(x / 15) * 1.2;
    else base = 40 + Math.sin(x / 12) * 2;
    const top = Math.floor(base + wave);

    for (let y = top; y < WORLD_H; y++) {
      if (biome === 'desert') world[y][x] = 'sand';
      else if (y === top) world[y][x] = 'grass';
      else if (y < top + 3) world[y][x] = 'dirt';
      else world[y][x] = 'stone';

      if (world[y][x] === 'stone' && rand(x * 919 + y * 151) < 0.03) world[y][x] = 'coalOre';
      if (world[y][x] === 'stone' && y > 55 && rand(x * 523 + y * 83) < 0.02) world[y][x] = 'ironOre';
    }

    if (biome === 'forest' && rand(x * 77) < 0.09) spawnTree(x, top - 1);
    if (biome === 'desert' && rand(x * 91) < 0.04) spawnCactus(x, top - 1);

    if (top < 38 && rand(x * 3.1) < 0.12) {
      for (let y = top; y < 39; y++) if (world[y][x] === 'air') world[y][x] = 'water';
    }
  }
  carveCaves();
  spawnMobs();
}

function collides(ent) {
  const minX = Math.floor(ent.x);
  const maxX = Math.floor(ent.x + ent.w);
  const minY = Math.floor(ent.y);
  const maxY = Math.floor(ent.y + ent.h);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) if (BLOCKS[getBlock(x, y)]?.solid) return true;
  return false;
}

function moveEntity(ent) {
  ent.x += ent.vx;
  if (collides(ent)) {
    ent.x -= ent.vx;
    ent.vx *= -0.2;
  }
  ent.y += ent.vy;
  if (collides(ent)) {
    ent.y -= ent.vy;
    if (ent.vy > 0) ent.onGround = true;
    ent.vy = 0;
  } else ent.onGround = false;
}

function isInWater(ent) {
  const b = getBlock(Math.floor(ent.x + ent.w / 2), Math.floor(ent.y + ent.h / 2));
  return b === 'water';
}

function updatePlayer() {
  player.vx *= 0.84;
  if (keys.q) { player.vx -= 0.12; player.facing = -1; }
  if (keys.d) { player.vx += 0.12; player.facing = 1; }
  if ((keys.z || keys[' ']) && player.onGround) player.vy = -0.82;

  player.vy += GRAVITY * (isInWater(player) ? 0.25 : 1);
  if (isInWater(player) && (keys.z || keys[' '])) player.vy -= 0.2;
  if (isInWater(player) && keys.s) player.vy += 0.12;

  moveEntity(player);

  if (player.y > WORLD_H - 1) {
    player.health -= 1;
    player.y = 5;
    player.x = 12;
  }

  if (tick % 160 === 0) {
    player.hunger = Math.max(0, player.hunger - 1);
    if (player.hunger === 0) player.health = Math.max(0, player.health - 1);
    else if (player.hunger > 60) player.health = Math.min(100, player.health + 0.4);
  }
}

function updateMobs() {
  for (const m of mobs) {
    if (m.hp <= 0) continue;
    m.vy += GRAVITY;
    const dx = player.x - m.x;
    if (Math.abs(dx) < 18) {
      m.vx += Math.sign(dx) * (m.type === 'slime' ? 0.03 : 0.04);
      if (m.cooldown <= 0 && m.type === 'skeleton' && Math.abs(dx) < 14) {
        projectiles.push({ x: m.x + 0.5, y: m.y + 0.4, vx: Math.sign(dx) * 0.23, vy: -0.05, dmg: 8, from: 'mob' });
        m.cooldown = 120;
      }
    }
    m.cooldown -= 1;
    m.vx *= 0.92;
    const tmp = { ...m, w: 0.9, h: 0.9, onGround: m.onGround };
    moveEntity(tmp);
    m.x = tmp.x; m.y = tmp.y; m.vx = tmp.vx; m.vy = tmp.vy; m.onGround = tmp.onGround;

    if (Math.abs(m.x - player.x) < 1 && Math.abs(m.y - player.y) < 1.3 && tick % 20 === 0) {
      player.health = Math.max(0, player.health - (m.type === 'slime' ? 4 : 7));
    }
  }
}

function updateProjectiles() {
  for (const p of projectiles) {
    p.vy += 0.008;
    p.x += p.vx;
    p.y += p.vy;
    if (BLOCKS[getBlock(Math.floor(p.x), Math.floor(p.y))]?.solid) p.dead = true;
    if (p.from === 'mob' && Math.abs(p.x - (player.x + 0.4)) < 0.6 && Math.abs(p.y - (player.y + 0.8)) < 0.8) {
      player.health = Math.max(0, player.health - p.dmg);
      p.dead = true;
    }
  }
  projectiles = projectiles.filter((p) => !p.dead);
}

function updateTime() {
  tick++;
  if (tick % DAY_LENGTH === 0) day++;
  const t = tick % DAY_LENGTH;
  const hours = 6 + Math.floor((t / DAY_LENGTH) * 24);
  const mins = Math.floor((((t / DAY_LENGTH) * 24) % 1) * 60);
  timeLabel.textContent = `Jour ${day} · ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function lightLevel() {
  const t = tick % DAY_LENGTH;
  const f = Math.sin((t / DAY_LENGTH) * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
  return 0.14 + f * 0.78;
}

function drawBlockPattern(b, x, y) {
  ctx.fillStyle = BLOCKS[b].color;
  ctx.fillRect(x, y, TILE, TILE);
  if (b === 'grass') {
    ctx.fillStyle = '#7ddb70';
    ctx.fillRect(x, y, TILE, 6);
  }
  if (b === 'stone' || b === 'coalOre' || b === 'ironOre') {
    ctx.fillStyle = b === 'coalOre' ? '#1f1f20' : b === 'ironOre' ? '#c4ac8f' : '#5d6069';
    for (let i = 0; i < 5; i++) ctx.fillRect(x + ((i * 7) % (TILE - 4)) + 2, y + ((i * 11) % (TILE - 4)) + 2, 3, 3);
  }
  if (b === 'wood') {
    ctx.fillStyle = '#7b4f27';
    for (let i = 5; i < TILE; i += 6) ctx.fillRect(x, y + i, TILE, 1);
  }
  if (b === 'leaves') {
    ctx.fillStyle = '#52ba55';
    for (let i = 0; i < 6; i++) ctx.fillRect(x + ((i * 5) % (TILE - 2)), y + ((i * 9) % (TILE - 2)), 2, 2);
  }
  if (b === 'water') {
    ctx.fillStyle = '#9dd5ff66';
    ctx.fillRect(x, y + 4, TILE, 4);
  }

  ctx.fillStyle = '#ffffff14';
  ctx.fillRect(x, y, TILE, 1);
  ctx.fillRect(x, y, 1, TILE);
  ctx.fillStyle = '#00000026';
  ctx.fillRect(x, y + TILE - 1, TILE, 1);
  ctx.fillRect(x + TILE - 1, y, 1, TILE);
}

function drawSky(camX, camY) {
  const sky = lightLevel();
  const topR = 24 + 88 * sky;
  const topG = 46 + 144 * sky;
  const topB = 82 + 160 * sky;
  const botR = 12 + 40 * sky;
  const botG = 18 + 80 * sky;
  const botB = 42 + 130 * sky;

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, `rgb(${topR | 0},${topG | 0},${topB | 0})`);
  grad.addColorStop(1, `rgb(${botR | 0},${botG | 0},${botB | 0})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const celestialX = ((tick % DAY_LENGTH) / DAY_LENGTH) * canvas.width;
  const celestialY = 90 + Math.sin((tick / DAY_LENGTH) * Math.PI * 2) * 55;
  ctx.fillStyle = sky > 0.48 ? '#ffe89f' : '#d8ddff';
  ctx.beginPath();
  ctx.arc(celestialX, celestialY, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff22';
  for (let i = 0; i < 8; i++) {
    const cx = ((i * 220 - camX * 0.25) % (canvas.width + 240)) - 120;
    const cy = 60 + (i % 4) * 40;
    ctx.fillRect(cx, cy, 55, 16);
    ctx.fillRect(cx + 20, cy - 8, 35, 16);
  }
}

function draw() {
  const camX = Math.floor(player.x * TILE - canvas.width / 2);
  const camY = Math.floor(player.y * TILE - canvas.height / 2);

  drawSky(camX, camY);

  const minX = Math.max(0, Math.floor(camX / TILE));
  const maxX = Math.min(WORLD_W - 1, Math.ceil((camX + canvas.width) / TILE));
  const minY = Math.max(0, Math.floor(camY / TILE));
  const maxY = Math.min(WORLD_H - 1, Math.ceil((camY + canvas.height) / TILE));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const b = getBlock(x, y);
      if (b === 'air') continue;
      const bx = x * TILE - camX;
      const by = y * TILE - camY;
      drawBlockPattern(b, bx, by);
      const dmg = breakMap.get(`${x},${y}`) || 0;
      if (dmg > 0) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 2, by + 2, TILE - 4, TILE - 4);
      }
    }
  }

  for (const p of projectiles) {
    ctx.fillStyle = '#fff0b5';
    ctx.beginPath();
    ctx.arc(p.x * TILE - camX, p.y * TILE - camY, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const m of mobs) {
    if (m.hp <= 0) continue;
    ctx.fillStyle = m.type === 'slime' ? '#53d769' : '#dfdfdf';
    ctx.fillRect(m.x * TILE - camX, m.y * TILE - camY, TILE * 0.9, TILE * 0.9);
    ctx.fillStyle = '#000';
    ctx.fillRect(m.x * TILE - camX, m.y * TILE - camY - 8, (m.hp / (m.type === 'slime' ? 20 : 14)) * TILE * 0.9, 5);
  }

  const px = player.x * TILE - camX;
  const py = player.y * TILE - camY;
  ctx.fillStyle = '#f7c87f';
  ctx.fillRect(px, py, TILE * player.w, TILE * player.h);
  ctx.fillStyle = '#714f26';
  ctx.fillRect(px + 6, py + 6, 6, 6);
}

function worldAtMouse(evt) {
  const rect = canvas.getBoundingClientRect();
  const mx = evt.clientX - rect.left;
  const my = evt.clientY - rect.top;
  const camX = player.x * TILE - canvas.width / 2;
  const camY = player.y * TILE - canvas.height / 2;
  return { x: Math.floor((mx + camX) / TILE), y: Math.floor((my + camY) / TILE) };
}

function addItem(name, qty) {
  player.inventory[name] = (player.inventory[name] || 0) + qty;
}

function consumeItem(name, qty) {
  player.inventory[name] = (player.inventory[name] || 0) - qty;
  if (player.inventory[name] <= 0) delete player.inventory[name];
}

function mineBlock(x, y) {
  const b = getBlock(x, y);
  if (b === 'air' || b === 'water') return;
  if (Math.hypot(x - player.x, y - player.y) > 6) return;
  const key = `${x},${y}`;
  const next = (breakMap.get(key) || 0) + 1;
  breakMap.set(key, next);
  if (next >= BLOCKS[b].hp) {
    const drop = BLOCKS[b].drop;
    setBlock(x, y, 'air');
    breakMap.delete(key);
    if (drop) addItem(drop, 1);
  }
}

function placeBlock(x, y) {
  if (getBlock(x, y) !== 'air') return;
  if (Math.hypot(x - player.x, y - player.y) > 6) return;
  if (!player.inventory[selectedBlock]) return;
  if (x >= Math.floor(player.x) && x <= Math.floor(player.x + player.w) && y >= Math.floor(player.y) && y <= Math.floor(player.y + player.h)) return;
  setBlock(x, y, selectedBlock);
  consumeItem(selectedBlock, 1);
}

function craft(recipe) {
  for (const [k, v] of Object.entries(recipe.in)) if ((player.inventory[k] || 0) < v) return;
  for (const [k, v] of Object.entries(recipe.in)) consumeItem(k, v);
  for (const [k, v] of Object.entries(recipe.out)) addItem(k, v);
  renderUI();
}

function playerAttack() {
  for (const m of mobs) {
    if (m.hp <= 0) continue;
    if (Math.abs((m.x + 0.5) - (player.x + 0.4 + player.facing * 1.2)) < 1.6 && Math.abs((m.y + 0.4) - (player.y + 0.8)) < 1.1) {
      m.hp -= 7;
      if (m.hp <= 0) {
        addItem('wood', 1);
        if (Math.random() < 0.4) addItem('coal', 1);
      }
    }
  }
}

function currentBiome() {
  const x = Math.floor(player.x);
  const h = findSurface(x);
  const top = getBlock(x, h);
  if (top === 'sand' || getBlock(x, h + 1) === 'sand') return 'desert';
  if (h < 33) return 'mountains';
  if (getBlock(x, h - 1) === 'wood' || getBlock(x + 1, h - 1) === 'wood') return 'forest';
  return 'plains';
}

function renderUI() {
  healthLabel.textContent = `❤️ ${Math.floor(player.health)}`;
  hungerLabel.textContent = `🍗 ${Math.floor(player.hunger)}`;
  biomeLabel.textContent = `Biome : ${BIOME_FR[currentBiome()]}`;

  inventoryList.innerHTML = '';
  Object.entries(player.inventory).sort((a, b) => a[0].localeCompare(b[0])).forEach(([item, qty]) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<span>${item}</span><strong>x${qty}</strong>`;
    inventoryList.appendChild(div);
  });

  recipesList.innerHTML = '';
  for (const recipe of RECIPES) {
    const div = document.createElement('div');
    div.className = 'card';
    const can = Object.entries(recipe.in).every(([k, v]) => (player.inventory[k] || 0) >= v);
    const req = Object.entries(recipe.in).map(([k, v]) => `${k}:${v}`).join(', ');
    div.innerHTML = `<span>${recipe.name}<br><small>${req}</small></span>`;
    const btn = document.createElement('button');
    btn.textContent = 'Fabriquer';
    btn.disabled = !can;
    btn.onclick = () => craft(recipe);
    div.appendChild(btn);
    recipesList.appendChild(div);
  }

  const current = blockSelect.value;
  blockSelect.innerHTML = '';
  for (const b of PLACEABLE) {
    const opt = document.createElement('option');
    opt.value = b;
    opt.textContent = `${b} (${player.inventory[b] || 0})`;
    blockSelect.appendChild(opt);
  }
  blockSelect.value = player.inventory[current] ? current : (player.inventory[selectedBlock] ? selectedBlock : 'dirt');
  selectedBlock = blockSelect.value;
}

function saveGame() {
  localStorage.setItem('luccraft-save', JSON.stringify({ world, player, tick, day, mobs, projectiles }));
}

function loadGame() {
  const raw = localStorage.getItem('luccraft-save');
  if (!raw) return false;
  const data = JSON.parse(raw);
  world = data.world;
  Object.assign(player, data.player);
  tick = data.tick;
  day = data.day;
  mobs = data.mobs;
  projectiles = data.projectiles || [];
  return true;
}

function loop() {
  if (player.health <= 0) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '44px sans-serif';
    ctx.fillText('Partie perdue — R pour recommencer', 150, 320);
    requestAnimationFrame(loop);
    return;
  }
  updatePlayer();
  updateMobs();
  updateProjectiles();
  updateTime();
  draw();

  if (tick % 20 === 0) renderUI();
  if (tick % 300 === 0) saveGame();

  requestAnimationFrame(loop);
}

document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;
  if (key === 'i') {
    const p = document.getElementById('inventoryPanel');
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
  }
  if (key === 'k') saveGame();
  if (key === 'l') loadGame();
  if (key === 'f') playerAttack();
  if (key === 'r' && player.health <= 0) {
    player.health = 100;
    player.hunger = 100;
    player.x = 14;
    player.y = 10;
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousedown', (e) => {
  const { x, y } = worldAtMouse(e);
  if (e.button === 0) mineBlock(x, y);
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const { x, y } = worldAtMouse(e);
  placeBlock(x, y);
});

blockSelect.addEventListener('change', () => {
  selectedBlock = blockSelect.value;
});

document.getElementById('newWorldBtn').addEventListener('click', () => {
  generateWorld();
  player.x = 14;
  player.y = 9;
  player.health = 100;
  player.hunger = 100;
  renderUI();
});

if (!loadGame()) generateWorld();
renderUI();
loop();
