// ============================================
// GRIMORIO DEL HECHICERO — Lógica de la ficha
// ============================================

const ABILITY_LABELS = {
  str: 'FUE', dex: 'DES', con: 'CON',
  int: 'INT', wis: 'SAB', cha: 'CAR'
};

const SAVE_LABELS = {
  str: 'Fuerza', dex: 'Destreza', con: 'Constitución',
  int: 'Inteligencia', wis: 'Sabiduría', cha: 'Carisma'
};

const DEFAULT_SKILLS = [
  'Acrobacias', 'Arcana', 'Atletismo', 'Engaño', 'Historia',
  'Interpretación', 'Intimidación', 'Investigación', 'Juego de Manos',
  'Medicina', 'Naturaleza', 'Percepción', 'Persuasión', 'Religión',
  'Sigilo', 'Supervivencia', 'Trato con Animales'
];

const SKILL_ABILITIES = {
  'Acrobacias': 'dex', 'Arcana': 'int', 'Atletismo': 'str',
  'Engaño': 'cha', 'Historia': 'int', 'Interpretación': 'cha',
  'Intimidación': 'cha', 'Investigación': 'int', 'Juego de Manos': 'dex',
  'Medicina': 'wis', 'Naturaleza': 'int', 'Percepción': 'wis',
  'Persuasión': 'cha', 'Religión': 'int', 'Sigilo': 'dex',
  'Supervivencia': 'wis', 'Trato con Animales': 'wis'
};

let character = {};

const CHARACTER_JSON = 'data/character.json';

// Repositorio GitHub (se autodetecta en *.github.io)
const GITHUB_CONFIG = {
  owner: 'sebastnhr',
  repo: 'wizard',
  path: 'data/character.json',
  branch: 'main'
};

// ============================================
// CARGA Y GUARDADO — ruta fija del repositorio
// ============================================

function getGitHubConfig() {
  const host = location.hostname;
  if (host.endsWith('.github.io')) {
    const owner = host.replace('.github.io', '');
    const repo = location.pathname.split('/').filter(Boolean)[0] || owner;
    return { ...GITHUB_CONFIG, owner, repo };
  }
  return GITHUB_CONFIG;
}

function getGitHubToken() {
  let token = localStorage.getItem('github_token');
  if (!token) {
    token = prompt(
      'Introduce tu token de GitHub para guardar automáticamente.\n' +
      'Necesita permiso "Contents: Read and write" en el repositorio.\n' +
      'Se guarda solo en tu navegador.'
    );
    if (token) localStorage.setItem('github_token', token);
  }
  return token;
}

function toBase64Utf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

async function updateCharacterJsonFile(json) {
  const cfg = getGitHubConfig();
  const token = getGitHubToken();
  if (!token) throw new Error('Se necesita un token de GitHub para guardar');

  const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  let sha = null;
  const getRes = await fetch(`${apiUrl}?ref=${cfg.branch}`, { headers });
  if (getRes.ok) {
    sha = (await getRes.json()).sha;
  } else if (getRes.status !== 404) {
    if (getRes.status === 401) localStorage.removeItem('github_token');
    const err = await getRes.json().catch(() => ({}));
    throw new Error(err.message || 'No se pudo leer el archivo en GitHub');
  }

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Actualizar ficha de personaje',
      content: toBase64Utf8(json),
      sha,
      branch: cfg.branch
    })
  });

  if (!putRes.ok) {
    if (putRes.status === 401) localStorage.removeItem('github_token');
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.message || 'Error al guardar en GitHub');
  }
}

async function loadCharacter() {
  try {
    const res = await fetch(CHARACTER_JSON + '?t=' + Date.now());
    if (!res.ok) throw new Error();
    character = await res.json();
  } catch {
    character = getDefaultCharacter();
    showStatus('No se pudo cargar ' + CHARACTER_JSON, 'error');
  }
  renderAll();
}

async function saveGrimorio() {
  const datos = collectCharacter();
  const json = JSON.stringify(datos, null, 2);
  character = datos;

  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json
    });
    if (res.ok) {
      showStatus('Guardado en ' + CHARACTER_JSON, 'success');
      return;
    }
  } catch { /* sin servidor local */ }

  try {
    await updateCharacterJsonFile(json);
    showStatus('Guardado en ' + CHARACTER_JSON, 'success');
  } catch (e) {
    showStatus(e.message || 'Error al guardar', 'error');
  }
}

function collectCharacter() {
  character.name = val('charName');
  character.player = val('playerName');
  character.class = val('charClass');
  character.race = val('charRace');
  character.background = val('charBackground');
  character.alignment = val('charAlignment');
  character.experience = num('charXP');
  character.inspiration = document.getElementById('inspiration').checked;
  character.proficiencyBonus = num('profBonus');

  ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ab => {
    const score = num('ability_' + ab);
    character.stats[ab] = { score, mod: calcMod(score) };
  });

  ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ab => {
    if (!character.savingThrows[ab]) character.savingThrows[ab] = {};
    character.savingThrows[ab].proficient = document.getElementById('save_' + ab).checked;
    character.savingThrows[ab].bonus = num('saveBonus_' + ab);
  });

  character.combat.ac = num('ac');
  character.combat.initiative = val('initiative');
  character.combat.speed = val('speed');
  character.combat.hp.max = num('hpMax');
  character.combat.hp.current = num('hpCurrent');
  character.combat.hp.temp = num('hpTemp');
  character.combat.hitDice = val('hitDice');

  character.features = val('features');
  character.spellcasting.ability = val('spellAbility');
  character.spellcasting.sorceryPoints.current = num('sorceryCurrent');
  character.spellcasting.sorceryPoints.max = num('sorceryMax');
  character.spellcasting.origin = val('sorcererOrigin');

  character.traits.personality = val('traitPersonality');
  character.traits.ideals = val('traitIdeals');
  character.traits.bonds = val('traitBonds');
  character.traits.flaws = val('traitFlaws');
  character.appearance.age = val('appAge');
  character.appearance.height = val('appHeight');
  character.appearance.weight = val('appWeight');
  character.appearance.eyes = val('appEyes');
  character.appearance.skin = val('appSkin');
  character.appearance.hair = val('appHair');
  character.backstory = val('backstory');
  character.allies = val('allies');
  character.treasure = val('treasure');
  character.equipment = val('equipment');
  character.proficiencies = val('proficiencies');
  character.wealth.cp = num('coinCP');
  character.wealth.sp = num('coinSP');
  character.wealth.ep = num('coinEP');
  character.wealth.gp = num('coinGP');
  character.wealth.pp = num('coinPP');

  collectSkills();
  collectAttacks();
  collectCantrips();
  collectSpells();
  collectMetamagic();
  collectSlots();

  calculateSpellStats();
  return character;
}

// ============================================
// UTILIDADES
// ============================================

function val(id) { return document.getElementById(id)?.value ?? ''; }
function num(id) { return parseInt(document.getElementById(id)?.value) || 0; }
function calcMod(score) { return Math.floor((score - 10) / 2); }
function fmtMod(n) { return (n >= 0 ? '+' : '') + n; }

function showStatus(msg, type) {
  const el = document.getElementById('saveStatus');
  el.textContent = msg;
  el.className = 'save-status ' + (type || '');
  setTimeout(() => { el.textContent = ''; el.className = 'save-status'; }, 4000);
}

function getDefaultCharacter() {
  return {
    name: '', player: '', class: 'Hechicero', level: 1, race: '', background: '',
    alignment: '', experience: 0, inspiration: false, proficiencyBonus: 2,
    stats: Object.fromEntries(['str','dex','con','int','wis','cha'].map(a => [a, {score:10, mod:0}])),
    savingThrows: Object.fromEntries(['str','dex','con','int','wis','cha'].map(a => [a, {proficient:false, bonus:0}])),
    skills: [], combat: { ac:10, initiative:0, speed:'30 pies', hp:{current:8,max:8,temp:0}, hitDice:'1d6', deathSaves:{successes:0,failures:0} },
    attacks: [], spellcasting: {
      ability:'cha', saveDC:8, attackBonus:0,
      sorceryPoints:{current:0,max:0}, origin:'',
      slots: Object.fromEntries([1,2,3,4,5,6,7,8,9].map(l => [l, {total:0, used:0}])),
      cantrips: [], spells: Object.fromEntries([1,2,3,4,5,6,7,8,9].map(l => [l, []]))
    },
    metamagic: [], features:'', traits:{personality:'',ideals:'',bonds:'',flaws:''},
    appearance:{age:'',height:'',weight:'',eyes:'',skin:'',hair:''},
    backstory:'', allies:'', treasure:'', equipment:'', proficiencies:'',
    wealth:{cp:0,sp:0,ep:0,gp:0,pp:0}
  };
}

// ============================================
// CÁLCULOS
// ============================================

function calculateSpellStats() {
  const ab = character.spellcasting.ability || 'cha';
  const mod = character.stats[ab]?.mod ?? 0;
  const prof = character.proficiencyBonus || 2;
  const dc = 8 + prof + mod;
  const attack = prof + mod;
  character.spellcasting.saveDC = dc;
  character.spellcasting.attackBonus = attack;
  setVal('spellSaveDC', dc);
  setVal('spellAttackBonus', fmtMod(attack));
}

function updateHPBar() {
  const current = num('hpCurrent');
  const max = num('hpMax') || 1;
  const pct = Math.min(100, Math.max(0, (current / max) * 100));
  document.getElementById('hpFill').style.width = pct + '%';
}

function updatePassivePerception() {
  const wisMod = character.stats?.wis?.mod ?? 0;
  const prof = character.proficiencyBonus || 2;
  const skill = character.skills?.find(s => s.name === 'Percepción');
  let total = 10 + wisMod;
  if (skill?.proficient) total += prof;
  if (skill?.expertise) total += prof;
  total += skill?.bonus || 0;
  document.getElementById('passivePerception').textContent = total;
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v;
}

// ============================================
// RENDERIZADO
// ============================================

function renderAll() {
  populateFields();
  renderAbilities();
  renderSaves();
  renderSkills();
  renderAttacks();
  renderCantrips();
  renderSlots();
  renderSpells();
  renderMetamagic();
  renderDeathSaves();
  calculateSpellStats();
  updateHPBar();
  updatePassivePerception();
}

function populateFields() {
  setVal('charName', character.name);
  setVal('playerName', character.player);
  setVal('charClass', character.class + (character.level ? ' ' + character.level : ''));
  setVal('charRace', character.race);
  setVal('charBackground', character.background);
  setVal('charAlignment', character.alignment);
  setVal('charXP', character.experience);
  document.getElementById('inspiration').checked = character.inspiration;
  setVal('profBonus', character.proficiencyBonus);
  setVal('ac', character.combat?.ac);
  setVal('initiative', character.combat?.initiative);
  setVal('speed', character.combat?.speed);
  setVal('hpMax', character.combat?.hp?.max);
  setVal('hpCurrent', character.combat?.hp?.current);
  setVal('hpTemp', character.combat?.hp?.temp);
  setVal('hitDice', character.combat?.hitDice);
  setVal('features', character.features);
  setVal('spellAbility', character.spellcasting?.ability || 'cha');
  setVal('sorceryCurrent', character.spellcasting?.sorceryPoints?.current);
  setVal('sorceryMax', character.spellcasting?.sorceryPoints?.max);
  setVal('sorcererOrigin', character.spellcasting?.origin);
  setVal('traitPersonality', character.traits?.personality);
  setVal('traitIdeals', character.traits?.ideals);
  setVal('traitBonds', character.traits?.bonds);
  setVal('traitFlaws', character.traits?.flaws);
  setVal('appAge', character.appearance?.age);
  setVal('appHeight', character.appearance?.height);
  setVal('appWeight', character.appearance?.weight);
  setVal('appEyes', character.appearance?.eyes);
  setVal('appSkin', character.appearance?.skin);
  setVal('appHair', character.appearance?.hair);
  setVal('backstory', character.backstory);
  setVal('allies', character.allies);
  setVal('treasure', character.treasure);
  setVal('equipment', character.equipment);
  setVal('proficiencies', character.proficiencies);
  setVal('coinCP', character.wealth?.cp);
  setVal('coinSP', character.wealth?.sp);
  setVal('coinEP', character.wealth?.ep);
  setVal('coinGP', character.wealth?.gp);
  setVal('coinPP', character.wealth?.pp);
}

function renderAbilities() {
  const grid = document.getElementById('abilitiesGrid');
  grid.innerHTML = ['str','dex','con','int','wis','cha'].map(ab => {
    const s = character.stats[ab] || { score: 10, mod: 0 };
    return `<div class="ability-box">
      <div class="ability-name">${ABILITY_LABELS[ab]}</div>
      <div class="ability-score"><input type="number" id="ability_${ab}" value="${s.score}" min="1" max="30"></div>
      <div class="ability-mod" id="mod_${ab}">${fmtMod(s.mod)}</div>
    </div>`;
  }).join('');

  ['str','dex','con','int','wis','cha'].forEach(ab => {
    document.getElementById('ability_' + ab).addEventListener('input', () => {
      const score = num('ability_' + ab);
      character.stats[ab] = { score, mod: calcMod(score) };
      document.getElementById('mod_' + ab).textContent = fmtMod(calcMod(score));
      renderSaves();
      renderSkills();
      calculateSpellStats();
      updatePassivePerception();
    });
  });
}

function renderSaves() {
  const container = document.getElementById('savesContainer');
  const prof = character.proficiencyBonus || 2;
  container.innerHTML = ['str','dex','con','int','wis','cha'].map(ab => {
    const save = character.savingThrows[ab] || { proficient: false, bonus: 0 };
    const mod = character.stats[ab]?.mod ?? 0;
    const total = mod + (save.proficient ? prof : 0) + (save.bonus || 0);
    return `<div class="save-row">
      <input type="checkbox" id="save_${ab}" ${save.proficient ? 'checked' : ''}>
      <span class="save-name">${SAVE_LABELS[ab]}</span>
      <input type="number" class="skill-bonus" id="saveBonus_${ab}" value="${save.bonus || 0}" title="Bonificador extra">
      <span class="save-total">${fmtMod(total)}</span>
    </div>`;
  }).join('');

  ['str','dex','con','int','wis','cha'].forEach(ab => {
    document.getElementById('save_' + ab).addEventListener('change', renderSaves);
    document.getElementById('saveBonus_' + ab).addEventListener('input', renderSaves);
  });
}

function renderSkills() {
  const container = document.getElementById('skillsContainer');
  const prof = character.proficiencyBonus || 2;
  if (!character.skills?.length) {
    character.skills = [
      { name: 'Arcana', ability: 'int', proficient: false, expertise: false, bonus: 0 },
      { name: 'Percepción', ability: 'wis', proficient: false, expertise: false, bonus: 0 }
    ];
  }
  container.innerHTML = character.skills.map((sk, i) => {
    const ab = sk.ability || SKILL_ABILITIES[sk.name] || 'int';
    const mod = character.stats[ab]?.mod ?? 0;
    let total = mod + (sk.bonus || 0);
    if (sk.proficient) total += prof;
    if (sk.expertise) total += prof;
    return `<div class="skill-row" data-index="${i}">
      <input type="checkbox" class="skill-prof" ${sk.proficient ? 'checked' : ''} title="Competencia">
      <input type="checkbox" class="skill-exp" ${sk.expertise ? 'checked' : ''} title="Experiencia">
      <input type="text" class="skill-name-input" value="${esc(sk.name)}">
      <input type="number" class="skill-bonus" value="${sk.bonus || 0}">
      <span class="skill-total">${fmtMod(total)}</span>
      <button class="btn-remove skill-remove">✕</button>
    </div>`;
  }).join('');

  container.querySelectorAll('.skill-row').forEach(row => {
    const i = parseInt(row.dataset.index);
    row.querySelector('.skill-prof').addEventListener('change', e => {
      character.skills[i].proficient = e.target.checked;
      renderSkills();
      updatePassivePerception();
    });
    row.querySelector('.skill-exp').addEventListener('change', e => {
      character.skills[i].expertise = e.target.checked;
      renderSkills();
    });
    row.querySelector('.skill-name-input').addEventListener('input', e => {
      character.skills[i].name = e.target.value;
      character.skills[i].ability = SKILL_ABILITIES[e.target.value] || 'int';
    });
    row.querySelector('.skill-bonus').addEventListener('input', e => {
      character.skills[i].bonus = parseInt(e.target.value) || 0;
      renderSkills();
      updatePassivePerception();
    });
    row.querySelector('.skill-remove').addEventListener('click', () => {
      character.skills.splice(i, 1);
      renderSkills();
      updatePassivePerception();
    });
  });
}

function collectSkills() {
  document.querySelectorAll('.skill-row').forEach((row, i) => {
    if (!character.skills[i]) return;
    character.skills[i].name = row.querySelector('.skill-name-input').value;
    character.skills[i].proficient = row.querySelector('.skill-prof').checked;
    character.skills[i].expertise = row.querySelector('.skill-exp').checked;
    character.skills[i].bonus = parseInt(row.querySelector('.skill-bonus').value) || 0;
  });
}

function renderAttacks() {
  const container = document.getElementById('attacksContainer');
  if (!character.attacks) character.attacks = [];
  container.innerHTML = character.attacks.map((atk, i) => `
    <div class="attack-row" data-index="${i}">
      <input type="text" class="atk-name" value="${esc(atk.name)}">
      <input type="text" class="atk-bonus" value="${esc(atk.bonus)}">
      <input type="text" class="atk-damage" value="${esc(atk.damage)}">
      <button class="btn-remove atk-remove">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('.atk-remove').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      character.attacks.splice(i, 1);
      renderAttacks();
    });
  });
}

function collectAttacks() {
  character.attacks = [];
  document.querySelectorAll('.attack-row').forEach(row => {
    character.attacks.push({
      name: row.querySelector('.atk-name').value,
      bonus: row.querySelector('.atk-bonus').value,
      damage: row.querySelector('.atk-damage').value
    });
  });
}

function renderCantrips() {
  const container = document.getElementById('cantripsContainer');
  const cantrips = character.spellcasting?.cantrips || [];
  container.innerHTML = cantrips.map((c, i) => `
    <div class="cantrip-item" data-index="${i}">
      <input type="text" class="cantrip-name" value="${esc(c.name)}" placeholder="Nombre del truco">
      <button class="btn-remove cantrip-remove">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('.cantrip-remove').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      character.spellcasting.cantrips.splice(i, 1);
      renderCantrips();
    });
  });
}

function collectCantrips() {
  character.spellcasting.cantrips = [];
  document.querySelectorAll('.cantrip-item').forEach(row => {
    character.spellcasting.cantrips.push({ name: row.querySelector('.cantrip-name').value, notes: '' });
  });
}

function renderSlots() {
  const grid = document.getElementById('slotsGrid');
  const slots = character.spellcasting?.slots || {};
  grid.innerHTML = [1,2,3,4,5,6,7,8,9].map(lvl => {
    const s = slots[lvl] || { total: 0, used: 0 };
    return `<div class="slot-box">
      <div class="slot-level">Nivel ${lvl}</div>
      <div class="slot-inputs">
        <input type="number" class="slot-used" data-level="${lvl}" value="${s.used}" min="0" title="Gastados">
        <span>/</span>
        <input type="number" class="slot-total" data-level="${lvl}" value="${s.total}" min="0" title="Total">
      </div>
    </div>`;
  }).join('');
}

function collectSlots() {
  document.querySelectorAll('.slot-box').forEach(box => {
    const lvl = box.querySelector('.slot-used').dataset.level;
    character.spellcasting.slots[lvl] = {
      used: parseInt(box.querySelector('.slot-used').value) || 0,
      total: parseInt(box.querySelector('.slot-total').value) || 0
    };
  });
}

function renderSpells() {
  const container = document.getElementById('spellsByLevel');
  const spells = character.spellcasting?.spells || {};
  container.innerHTML = [1,2,3,4,5,6,7,8,9].map(lvl => {
    const list = spells[lvl] || spells[String(lvl)] || [];
    const items = list.map((sp, i) => `
      <div class="spell-item ${sp.prepared ? 'known' : ''}" data-level="${lvl}" data-index="${i}">
        <input type="checkbox" class="spell-check" ${sp.prepared ? 'checked' : ''} title="Conocido/Preparado">
        <input type="text" class="spell-name-input" value="${esc(sp.name)}">
        <button class="btn-remove spell-remove">✕</button>
      </div>
    `).join('');
    return `<div class="parchment-card spell-level-section">
      <div class="spell-level-header">
        <span class="spell-level-title">Hechizos de Nivel ${lvl}</span>
        <button class="btn btn-add btn-add-spell" data-level="${lvl}">+ Añadir</button>
      </div>
      <div class="spell-list" data-level="${lvl}">${items}</div>
    </div>`;
  }).join('');

  container.querySelectorAll('.btn-add-spell').forEach(btn => {
    btn.addEventListener('click', () => {
      const lvl = btn.dataset.level;
      if (!character.spellcasting.spells[lvl]) character.spellcasting.spells[lvl] = [];
      character.spellcasting.spells[lvl].push({ name: '', prepared: false });
      renderSpells();
    });
  });

  container.querySelectorAll('.spell-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.spell-item');
      const lvl = item.dataset.level;
      const idx = parseInt(item.dataset.index);
      character.spellcasting.spells[lvl].splice(idx, 1);
      renderSpells();
    });
  });

  container.querySelectorAll('.spell-check').forEach(chk => {
    chk.addEventListener('change', () => {
      chk.closest('.spell-item').classList.toggle('known', chk.checked);
    });
  });
}

function collectSpells() {
  [1,2,3,4,5,6,7,8,9].forEach(lvl => {
    character.spellcasting.spells[lvl] = [];
    document.querySelectorAll(`.spell-list[data-level="${lvl}"] .spell-item`).forEach(row => {
      character.spellcasting.spells[lvl].push({
        name: row.querySelector('.spell-name-input').value,
        prepared: row.querySelector('.spell-check').checked
      });
    });
  });
}

function renderMetamagic() {
  const container = document.getElementById('metamagicContainer');
  const list = character.metamagic || [];
  container.innerHTML = list.map((m, i) => `
    <div class="metamagic-item ${m.active ? 'active' : ''}" data-index="${i}">
      <div class="metamagic-header">
        <input type="checkbox" class="meta-active" ${m.active ? 'checked' : ''}>
        <input type="text" class="meta-name" value="${esc(m.name)}">
        <button class="btn-remove meta-remove">✕</button>
      </div>
      <textarea class="meta-desc">${esc(m.description)}</textarea>
    </div>
  `).join('');

  container.querySelectorAll('.meta-remove').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      character.metamagic.splice(i, 1);
      renderMetamagic();
    });
  });
  container.querySelectorAll('.meta-active').forEach((chk, i) => {
    chk.addEventListener('change', () => {
      chk.closest('.metamagic-item').classList.toggle('active', chk.checked);
    });
  });
}

function collectMetamagic() {
  character.metamagic = [];
  document.querySelectorAll('.metamagic-item').forEach(row => {
    character.metamagic.push({
      name: row.querySelector('.meta-name').value,
      description: row.querySelector('.meta-desc').value,
      active: row.querySelector('.meta-active').checked
    });
  });
}

function renderDeathSaves() {
  const ds = character.combat?.deathSaves || { successes: 0, failures: 0 };
  const succEl = document.getElementById('deathSuccesses');
  const failEl = document.getElementById('deathFailures');

  succEl.innerHTML = [0,1,2].map(i =>
    `<div class="death-dot ${i < ds.successes ? 'active' : ''}" data-type="success" data-val="${i+1}"></div>`
  ).join('');
  failEl.innerHTML = [0,1,2].map(i =>
    `<div class="death-dot failure ${i < ds.failures ? 'active' : ''}" data-type="failure" data-val="${i+1}"></div>`
  ).join('');

  document.querySelectorAll('.death-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const type = dot.dataset.type;
      const val = parseInt(dot.dataset.val);
      if (type === 'success') {
        character.combat.deathSaves.successes = character.combat.deathSaves.successes === val ? val - 1 : val;
      } else {
        character.combat.deathSaves.failures = character.combat.deathSaves.failures === val ? val - 1 : val;
      }
      renderDeathSaves();
    });
  });
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ============================================
// EVENTOS
// ============================================

function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
  });
}

function initButtons() {
  document.getElementById('btnSave').addEventListener('click', saveGrimorio);
  document.getElementById('btnReset').addEventListener('click', () => {
    if (confirm('¿Recargar datos desde character.json? Se perderán cambios no guardados.')) {
      loadCharacter();
    }
  });

  document.getElementById('btnAddSkill').addEventListener('click', () => {
    character.skills.push({ name: 'Nueva Habilidad', ability: 'int', proficient: false, expertise: false, bonus: 0 });
    renderSkills();
  });

  document.getElementById('btnAddAttack').addEventListener('click', () => {
    character.attacks.push({ name: '', bonus: '', damage: '' });
    renderAttacks();
  });

  document.getElementById('btnAddCantrip').addEventListener('click', () => {
    if (!character.spellcasting.cantrips) character.spellcasting.cantrips = [];
    character.spellcasting.cantrips.push({ name: '', notes: '' });
    renderCantrips();
  });

  document.getElementById('btnAddMetamagic').addEventListener('click', () => {
    if (!character.metamagic) character.metamagic = [];
    character.metamagic.push({ name: 'Nueva Metamagia', description: '', active: false });
    renderMetamagic();
  });

  document.getElementById('profBonus').addEventListener('input', () => {
    character.proficiencyBonus = num('profBonus');
    renderSaves();
    renderSkills();
    calculateSpellStats();
  });

  document.getElementById('spellAbility').addEventListener('change', calculateSpellStats);

  ['hpCurrent', 'hpMax'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateHPBar);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initButtons();
  loadCharacter();
});
