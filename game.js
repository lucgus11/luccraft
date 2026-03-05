const TILE = 24;
const WORLD_W = 260;
const WORLD_H = 90;
const GRAVITY = 0.44;

const BLOCKS = {
  air: { solid: false, color: null, hp: 0 },
  grass: { solid: true, color: '#4ea93b', hp: 2, drop: 'dirt' },
  dirt: { solid: true, color: '#825632', hp: 2, drop: 'dirt' },
  stone: { solid: true, color: '#6e7078', hp: 4, drop: 'stone' },
  sand: { solid: true, color: '#dcc78b', hp: 2, drop: 'sand' },
  wood: { solid: true, color: '#8f6233', hp: 3, drop: 'wood' },
  leaves: { solid: true, color: '#2e7f2e', hp: 1, drop: 'leaves' },
  water: { solid: false, color: '#3f7ad6aa', hp: 1, drop: null, fluid: true },
  coalOre: { solid: true, color: '#343434', hp: 4, drop: 'coal' },
  ironOre: { solid: true, color: '#8f8f94', hp: 5, drop: 'ironOre' },
  furnace: { solid: true, color: '#55525f', hp: 6, drop: 'furnace' },
  plank: { solid: true, color: '#c08f58', hp: 2, drop: 'plank' },
  torch: { solid: false, color: '#ffcc66', hp: 1, drop: 'torch', light: 80 },
  cactus: { solid: true, color: '#2b9d4f', hp: 2, drop: 'cactus' },
};

const BIOMES = ['plains', 'forest', 'desert', 'mountains'];
const PLACEABLE = Object.keys(BLOCKS).filter((k) => k !== 'air');

const RECIPES = [
  { name: 'Planches x4', in: { wood: 1 }, out: { plank: 4 } },
  { name: 'Four', in: { stone: 8 }, out: { furnace: 1 } },
  { name: 'Torche x4', in: { coal: 1, wood: 1 }, out: { torch: 4 } },
  { name: 'Bloc de terre x2', in: { sand: 1, dirt: 1 }, out: { dirt: 2 } },
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
  x: 18,
  y: 18,
  w: 0.8,
  h: 1.7,
  vx: 0,
  vy: 0,
  health: 100,
  hunger: 100,
  facing: 1,
  inventory: {
    dirt: 25,
    stone: 8,
    wood: 7,
    coal: 2,
    torch: 8,
  },
};

function rand(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateWorld() {
  world = Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill('air'));
  const biomeMap = Array(WORLD_W).fill('plains');
  for (let x = 0; x < WORLD_W; x++) {
    const b = BIOMES[Math.floor(rand(x * 0.173) * BIOMES.length)];
    biomeMap[x] = b;
  }

  let base = 40;
  for (let x = 0; x < WORLD_W; x++) {
    const biome = biomeMap[x];
    const wave = Math.sin(x / 14) * 3 + Math.sin(x / 5) * 1.6;
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

    if (top < 38 && rand(x * 3.1) < 0.1) {
      for (let y = top; y < 39; y++) {
        if (world[y][x] === 'air') world[y][x] = 'water';
      }
    }
  }

  carveCaves();
  spawnMobs();
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
    let y = 48 + Math.floor(rand(i * 60) * 30);
    for (let s = 0; s < 110; s++) {
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          setBlock(x + ox, y + oy, 'air');
        }
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
    mobs.push({ x, y, vx: 0, vy: 0, hp: type === 'slime' ? 20 : 14, type, cooldown: 0 });
  }
}

function findSurface(x) {
  for (let y = 0; y < WORLD_H; y++) {
    const b = getBlock(x, y);
    if (BLOCKS[b]?.solid) return y;
  }
  return WORLD_H - 1;
}

function getBlock(x, y) {
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return 'air';
  return world[y][x];
}

function setBlock(x, y, id) {
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return;
  world[y][x] = id;
}

function isSolidAt(x, y) {
  const b = getBlock(Math.floor(x), Math.floor(y));
  return BLOCKS[b]?.solid;
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

function collides(ent) {
  const minX = Math.floor(ent.x);
  const maxX = Math.floor(ent.x + ent.w);
  const minY = Math.floor(ent.y);
  const maxY = Math.floor(ent.y + ent.h);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (BLOCKS[getBlock(x, y)]?.solid) return true;
    }
  }
  return false;
}

function updatePlayer() {
  player.vx *= 0.84;
  if (keys['a']) { player.vx -= 0.12; player.facing = -1; }
  if (keys['d']) { player.vx += 0.12; player.facing = 1; }
  if (keys[' '] && player.onGround) player.vy = -0.82;

  player.vy += GRAVITY * (isInWater(player) ? 0.25 : 1);
  if (isInWater(player) && keys[' ']) player.vy -= 0.2;

  moveEntity(player);

  if (player.y > WORLD_H - 1) {
    player.health -= 1;
    player.y = 5;
    player.x = 12;
  }

  if (tick % 150 === 0) {
    player.hunger = Math.max(0, player.hunger - 1);
    if (player.hunger === 0) player.health = Math.max(0, player.health - 1);
    else if (player.hunger > 60) player.health = Math.min(100, player.health + 0.4);
  }
}

function isInWater(ent) {
  const b = getBlock(Math.floor(ent.x + ent.w / 2), Math.floor(ent.y + ent.h / 2));
  return b === 'water';
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
  if (tick % 1600 === 0) day++;
  const t = tick % 1600;
  const hours = 6 + Math.floor((t / 1600) * 24);
  const mins = Math.floor((((t / 1600) * 24) % 1) * 60);
  timeLabel.textContent = `Jour ${day} · ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function lightLevel() {
  const t = tick % 1600;
  const f = Math.sin((t / 1600) * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
  return 0.15 + f * 0.75;
}

function draw() {
  const camX = Math.floor((player.x * TILE) - canvas.width / 2);
  const camY = Math.floor((player.y * TILE) - canvas.height / 2);

  const sky = lightLevel();
  ctx.fillStyle = `rgba(${30 + 100 * sky}, ${55 + 150 * sky}, ${90 + 150 * sky}, 1)`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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
      ctx.fillStyle = BLOCKS[b].color;
      ctx.fillRect(bx, by, TILE, TILE);
      if (b === 'water') {
        ctx.fillStyle = '#c2e8ff55';
        ctx.fillRect(bx, by, TILE, 4);
      }
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
    ctx.arc(p.x * TILE - camX, p.y * TILE - camY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const m of mobs) {
    if (m.hp <= 0) continue;
    ctx.fillStyle = m.type === 'slime' ? '#53d769' : '#dfdfdf';
    ctx.fillRect(m.x * TILE - camX, m.y * TILE - camY, TILE * 0.9, TILE * 0.9);
    ctx.fillStyle = '#000';
    ctx.fillRect(m.x * TILE - camX, m.y * TILE - camY - 6, (m.hp / (m.type === 'slime' ? 20 : 14)) * TILE * 0.9, 4);
  }

  ctx.fillStyle = '#f6c26f';
  ctx.fillRect(player.x * TILE - camX, player.y * TILE - camY, TILE * player.w, TILE * player.h);
}

function worldAtMouse(evt) {
  const rect = canvas.getBoundingClientRect();
  const mx = evt.clientX - rect.left;
  const my = evt.clientY - rect.top;
  const camX = (player.x * TILE) - canvas.width / 2;
  const camY = (player.y * TILE) - canvas.height / 2;
  return {
    x: Math.floor((mx + camX) / TILE),
    y: Math.floor((my + camY) / TILE),
  };
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

function addItem(name, qty) {
  player.inventory[name] = (player.inventory[name] || 0) + qty;
}

function consumeItem(name, qty) {
  player.inventory[name] = (player.inventory[name] || 0) - qty;
  if (player.inventory[name] <= 0) delete player.inventory[name];
}

function craft(recipe) {
  for (const [k, v] of Object.entries(recipe.in)) {
    if ((player.inventory[k] || 0) < v) return;
  }
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
  biomeLabel.textContent = `Biome: ${currentBiome()}`;

  inventoryList.innerHTML = '';
  Object.entries(player.inventory)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([item, qty]) => {
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
    btn.textContent = 'Crafter';
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
  const data = { world, player, tick, day, mobs, projectiles };
  localStorage.setItem('luccraft-save', JSON.stringify(data));
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
    ctx.fillText('Game Over — R pour recommencer', 180, 320);
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
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'i') {
    const p = document.getElementById('inventoryPanel');
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
  }
  if (e.key.toLowerCase() === 'k') saveGame();
  if (e.key.toLowerCase() === 'l') loadGame();
  if (e.key.toLowerCase() === 'f') playerAttack();
  if (e.key.toLowerCase() === 'r' && player.health <= 0) {
    player.health = 100; player.hunger = 100; player.x = 14; player.y = 10;
  }
});
document.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

canvas.addEventListener('mousedown', (e) => {
  const { x, y } = worldAtMouse(e);
  if (e.button === 0) mineBlock(x, y);
});
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const { x, y } = worldAtMouse(e);
  placeBlock(x, y);
});

blockSelect.addEventListener('change', () => selectedBlock = blockSelect.value);
document.getElementById('newWorldBtn').addEventListener('click', () => {
  generateWorld();
  player.x = 14; player.y = 9; player.health = 100; player.hunger = 100;
  renderUI();
});

if (!loadGame()) generateWorld();
renderUI();
loop();
