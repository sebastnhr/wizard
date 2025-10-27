// ============================================
// CONFIGURACIÃ"N DE GOOGLE SHEETS
// ============================================
const SHEET_CONFIG = {
    spreadsheetId: '1zyjiWR4HAuHGGJ7eVrRhupZtWyEu1HCrcWpk9zafWvE', // Cámbialo por el ID de tu hoja
    apiKey: 'AIzaSyB2vuBFaetJsTaoXFJpLdeNLQPvg5PlJsc', // Cámbialo por tu API Key de Google
    characterRange: 'Character!A2:Z100',
    spellsRange: 'Spells!A2:Z100'
};

// Variables globales
let characterData = window.characterData || {};
let spellsData = window.spellsData || {};

// Tabla de experiencia
const XP_TABLE = {
    1: 0, 2: 1000, 3: 3000, 4: 6000, 5: 10000,
    6: 15000, 7: 21000, 8: 28000, 9: 36000, 10: 45000,
    11: 55000, 12: 66000, 13: 78000, 14: 91000, 15: 105000,
    16: 120000, 17: 136000, 18: 153000, 19: 171000, 20: 190000
};

// Mapeo de habilidades a características
const SKILL_ABILITIES = {
    'Abrir cerraduras': 'dex',
    'Artesanía': 'int',
    'Averiguar intenciones': 'wis',
    'Avistar': 'wis',
    'Buscar': 'int',
    'Concentración': 'con',
    'Conocimiento de conjuros': 'int',
    'Conocimiento (Arcano)': 'int',
    'Conocimiento (Historia)': 'int',
    'Conocimiento (Geografía)': 'int',
    'Conocimiento (Ingeniería)': 'int',
    'Conocimiento (Local)': 'int',
    'Descifrar escritura': 'int',
    'Diplomacia': 'car',
    'Disfrazarse': 'car',
    'Engañar': 'car',
    'Equilibrio': 'dex',
    'Escapismo': 'dex',
    'Esconderse': 'dex',
    'Escuchar': 'wis',
    'Falsificar': 'int',
    'Interpretar': 'car',
    'Intimidar': 'car',
    'Inutilizar mecanismo': 'int',
    'Juego de manos': 'dex',
    'Montar': 'dex',
    'Moverse sigilosamente': 'dex',
    'Nadar': 'str',
    'Oficio': 'wis',
    'Oficio (Bibliotecario)': 'wis',
    'Oficio (Alquimia)': 'wis',
    'Piruetas': 'dex',
    'Reunir información': 'car',
    'Saber': 'int',
    'Saltar': 'str',
    'Sanar': 'wis',
    'Supervivencia': 'wis',
    'Tasación': 'int',
    'Trato con animales': 'car',
    'Trepar': 'str',
    'Usar objeto mágico': 'car',
    'Uso de cuerdas': 'dex'
};

// ============================================
// FUNCIONES DE GOOGLE SHEETS
// ============================================

async function loadFromGoogleSheets() {
    try {
        showMessage('🔄 Cargando datos de Google Sheets...', 'info');
        
        // Cargar datos de personaje
        const characterUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.spreadsheetId}/values/${SHEET_CONFIG.characterRange}?key=${SHEET_CONFIG.apiKey}`;
        const characterResponse = await fetch(characterUrl);
        const characterJson = await characterResponse.json();
        
        if (characterJson.values) {
            parseCharacterData(characterJson.values);
        }
        
        // Cargar datos de hechizos
        const spellsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.spreadsheetId}/values/${SHEET_CONFIG.spellsRange}?key=${SHEET_CONFIG.apiKey}`;
        const spellsResponse = await fetch(spellsUrl);
        const spellsJson = await spellsResponse.json();
        
        if (spellsJson.values) {
            parseSpellsData(spellsJson.values);
        }
        
        renderAllSections();
        calculateDependentStats();
        showMessage('✅ Datos cargados correctamente', 'success');
    } catch (error) {
        console.error('Error al cargar de Google Sheets:', error);
        showMessage('❌ Error al cargar datos. Usando datos locales.', 'error');
        loadAllData(); // Fallback a localStorage
    }
}

function parseCharacterData(rows) {
    // Parsear los datos del sheet Character
    // Formato esperado: [Campo, Valor]
    rows.forEach(row => {
        const [field, value] = row;
        
        if (!field) return;
        
        switch(field.toLowerCase()) {
            case 'name':
                characterData.name = value;
                break;
            case 'level':
                characterData.level = parseInt(value) || 1;
                break;
            case 'str':
                characterData.stats.str = { score: parseInt(value) || 10, mod: Math.floor((parseInt(value) - 10) / 2) };
                break;
            case 'dex':
                characterData.stats.dex = { score: parseInt(value) || 10, mod: Math.floor((parseInt(value) - 10) / 2) };
                break;
            case 'con':
                characterData.stats.con = { score: parseInt(value) || 10, mod: Math.floor((parseInt(value) - 10) / 2) };
                break;
            case 'int':
                characterData.stats.int = { score: parseInt(value) || 10, mod: Math.floor((parseInt(value) - 10) / 2) };
                break;
            case 'wis':
                characterData.stats.wis = { score: parseInt(value) || 10, mod: Math.floor((parseInt(value) - 10) / 2) };
                break;
            case 'cha':
                characterData.stats.cha = { score: parseInt(value) || 10, mod: Math.floor((parseInt(value) - 10) / 2) };
                break;
            case 'hp_current':
                characterData.hp.current = parseInt(value) || 0;
                break;
            case 'hp_max':
                characterData.hp.max = parseInt(value) || 0;
                break;
            case 'xp':
                characterData.experience.current = parseInt(value) || 0;
                break;
            case 'gold':
                characterData.wealth.gold = parseInt(value) || 0;
                break;
            // Agregar más campos según tu estructura
        }
    });
}

function parseSpellsData(rows) {
    // Parsear los datos del sheet Spells
    // Formato esperado: [Nivel, Nombre, Escuela, Preparado]
    spellsData.spellbook.forEach(level => level.spells = []);
    
    rows.forEach(row => {
        const [level, name, school, prepared] = row;
        
        if (!name) return;
        
        const spellLevel = parseInt(level) || 0;
        const levelIndex = spellsData.spellbook.findIndex(l => l.level === spellLevel);
        
        if (levelIndex !== -1) {
            spellsData.spellbook[levelIndex].spells.push({
                name: name,
                school: school || '',
                prepared: prepared === 'TRUE' || prepared === 'Sí'
            });
        }
    });
}

async function saveToGoogleSheets() {
    try {
        showMessage('🔄 Guardando en Google Sheets...', 'info');
        
        // Preparar datos de personaje para el formato de sheets
        const characterRows = [
            ['name', characterData.name],
            ['level', characterData.level],
            ['str', characterData.stats.str.score],
            ['dex', characterData.stats.dex.score],
            ['con', characterData.stats.con.score],
            ['int', characterData.stats.int.score],
            ['wis', characterData.stats.wis.score],
            ['cha', characterData.stats.cha.score],
            ['hp_current', characterData.hp.current],
            ['hp_max', characterData.hp.max],
            ['xp', characterData.experience.current],
            ['gold', characterData.wealth.gold]
            // Agregar más campos según necesites
        ];
        
        // Preparar datos de hechizos
        const spellRows = [];
        spellsData.spellbook.forEach(level => {
            level.spells.forEach(spell => {
                spellRows.push([
                    level.level,
                    spell.name,
                    spell.school,
                    spell.prepared ? 'TRUE' : 'FALSE'
                ]);
            });
        });
        
        // NOTA: Para escribir en Google Sheets necesitas usar OAuth2
        // Este ejemplo requiere configuración adicional
        alert('Para guardar en Google Sheets necesitas configurar OAuth2. Por ahora se guardará localmente.');
        
        saveAllData(); // Fallback a localStorage
        
    } catch (error) {
        console.error('Error al guardar en Google Sheets:', error);
        showMessage('❌ Error al guardar. Guardando localmente.', 'error');
        saveAllData();
    }
}

// ============================================
// FUNCIONES ORIGINALES (con soporte mixto)
// ============================================

function init() {
    // Intentar cargar de Google Sheets primero
    if (SHEET_CONFIG.spreadsheetId !== 'TU_ID_DE_HOJA_AQUI' && 
        SHEET_CONFIG.apiKey !== 'TU_API_KEY_AQUI') {
        loadFromGoogleSheets();
    } else {
        // Usar localStorage si no hay configuración de Sheets
        loadAllData();
        renderAllSections();
        calculateDependentStats();
    }
}

function loadAllData() {
    const saved = localStorage.getItem('wizardData');
    if (saved) {
        const data = JSON.parse(saved);
        characterData = data.character || window.characterData;
        spellsData = data.spells || window.spellsData;
    }
    
    // Inicializar modificadores si no existen
    if (!characterData.combatMods) {
        characterData.combatMods = { baseAttack: 0, ac: 0, initiative: 0 };
    }
    if (!characterData.saveMods) {
        characterData.saveMods = { fort: 0, ref: 0, will: 0 };
    }
}

function saveAllData() {
    collectAllData();
    
    const dataToSave = {
        character: characterData,
        spells: spellsData
    };
    localStorage.setItem('wizardData', JSON.stringify(dataToSave));
    
    // Generar archivo JS de respaldo
    const jsContent = `// DATOS DEL PERSONAJE - Generado automáticamente
window.characterData = ${JSON.stringify(characterData, null, 2)};

window.spellsData = ${JSON.stringify(spellsData, null, 2)};`;

    const blob = new Blob([jsContent], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'character-data.js';
    a.click();
    URL.revokeObjectURL(url);
    
    showMessage('✅ Datos guardados localmente y archivo descargado', 'success');
}

function showMessage(msg, type = 'success') {
    const msgEl = document.getElementById('saveMessage');
    msgEl.textContent = msg;
    msgEl.className = `save-message ${type}`;
    msgEl.style.display = 'block';
    setTimeout(() => {
        msgEl.style.display = 'none';
    }, 5000);
}

// ============================================
// RESTO DE FUNCIONES ORIGINALES
// ============================================
// [Incluir todas las demás funciones del app.js original aquí]

function calculateLevel() {
    const xp = parseInt(document.getElementById('currentXP').value) || 0;
    let level = 1;
    
    for (let lvl = 20; lvl >= 1; lvl--) {
        if (xp >= XP_TABLE[lvl]) {
            level = lvl;
            break;
        }
    }
    
    characterData.level = level;
    characterData.experience = {
        current: xp,
        nextLevel: XP_TABLE[level + 1] || 190000
    };
    
    document.getElementById('currentLevel').value = level;
    document.getElementById('nextLevelXP').value = characterData.experience.nextLevel;
    document.getElementById('charLevelDisplay').textContent = level;
    
    calculateDependentStats();
    updateQuickStats();
}

function calculateDependentStats() {
    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(stat => {
        const scoreInput = document.getElementById(`${stat}Score`);
        if (scoreInput) {
            const score = parseInt(scoreInput.value || 10);
            const mod = Math.floor((score - 10) / 2);
            characterData.stats[stat] = { score, mod };
            const modDisplay = document.getElementById(`${stat}Mod`);
            if (modDisplay) {
                modDisplay.textContent = `${mod >= 0 ? '+' : ''}${mod}`;
            }
        }
    });

    const level = characterData.level || 1;
    characterData.baseAttack = Math.floor(level / 2);
    
    const dexMod = characterData.stats?.dex?.mod || 0;
    characterData.ac = 10 + dexMod;
    characterData.initiative = dexMod;

    const conMod = characterData.stats?.con?.mod || 0;
    const wisMod = characterData.stats?.wis?.mod || 0;
    
    const fortBase = Math.floor(level / 3);
    const refBase = Math.floor(level / 3);
    const willBase = 2 + Math.floor(level / 2);
    
    characterData.saves = {
        fort: fortBase + conMod,
        ref: refBase + dexMod,
        will: willBase + wisMod
    };

    calculateCombatStats();
}

function calculateCombatStats() {
    const baseAttackMod = parseInt(document.getElementById('baseAttackMod')?.value || 0);
    const acMod = parseInt(document.getElementById('acMod')?.value || 0);
    const initiativeMod = parseInt(document.getElementById('initiativeMod')?.value || 0);
    
    characterData.combatMods = { baseAttack: baseAttackMod, ac: acMod, initiative: initiativeMod };
    
    if (document.getElementById('baseAttack')) {
        document.getElementById('baseAttack').value = characterData.baseAttack;
    }
    if (document.getElementById('ac')) {
        document.getElementById('ac').value = characterData.ac;
    }
    if (document.getElementById('initiative')) {
        document.getElementById('initiative').value = characterData.initiative;
    }
    
    const fortMod = parseInt(document.getElementById('fortMod')?.value || 0);
    const refMod = parseInt(document.getElementById('refMod')?.value || 0);
    const willMod = parseInt(document.getElementById('willMod')?.value || 0);
    
    characterData.saveMods = { fort: fortMod, ref: refMod, will: willMod };
    
    if (document.getElementById('fortSave')) {
        document.getElementById('fortSave').value = characterData.saves.fort;
    }
    if (document.getElementById('refSave')) {
        document.getElementById('refSave').value = characterData.saves.ref;
    }
    if (document.getElementById('willSave')) {
        document.getElementById('willSave').value = characterData.saves.will;
    }
    
    updateQuickStats();
}

function collectAllData() {
    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(stat => {
        const score = parseInt(document.getElementById(`${stat}Score`)?.value || 10);
        const mod = Math.floor((score - 10) / 2);
        characterData.stats[stat] = { score, mod };
    });

    characterData.hp.current = parseInt(document.getElementById('hpCurrent')?.value || 0);
    characterData.hp.max = parseInt(document.getElementById('hpMax')?.value || 0);
    characterData.speed = document.getElementById('speed')?.value || "30'";
    characterData.spellResistance = parseInt(document.getElementById('spellResistance')?.value || 0);
    characterData.damageReduction = document.getElementById('damageReduction')?.value || "0";

    const xp = parseInt(document.getElementById('currentXP')?.value || 0);
    characterData.experience = {
        current: xp,
        nextLevel: characterData.experience?.nextLevel || 0
    };

    characterData.specialization = document.getElementById('specialization')?.value || "";
    const prohibited = document.getElementById('prohibitedSchools')?.value || "";
    characterData.prohibitedSchools = prohibited.split(',').map(s => s.trim()).filter(s => s);

    const langs = document.getElementById('languages')?.value || "";
    characterData.languages = langs.split(',').map(s => s.trim()).filter(s => s);

    characterData.wealth = {
        gold: parseInt(document.getElementById('gold')?.value || 0),
        silver: parseInt(document.getElementById('silver')?.value || 0),
        copper: parseInt(document.getElementById('copper')?.value || 0),
        platinum: parseInt(document.getElementById('platinum')?.value || 0),
        treasures: document.getElementById('treasures')?.value || ""
    };
}

function renderAllSections() {
    renderStats();
    renderSaves();
    renderCombat();
    renderSkills();
    renderSpells();
    renderFeats();
    renderEquipment();
    renderLanguages();
    renderWealth();
    updateQuickStats();
}

function renderStats() {
    const container = document.getElementById('statsContainer');
    const stats = characterData.stats || {};
    
    container.innerHTML = Object.entries(stats).map(([key, value]) => `
        <div class="stat-row">
            <span class="stat-name">${key.toUpperCase()}</span>
            <div class="stat-values">
                <input type="number" class="input" id="${key}Score" value="${value.score}" onchange="updateStatMod('${key}')">
                <span class="stat-mod" id="${key}Mod">${value.mod >= 0 ? '+' : ''}${value.mod}</span>
            </div>
        </div>
    `).join('');
}

function updateStatMod(stat) {
    const score = parseInt(document.getElementById(`${stat}Score`).value);
    const mod = Math.floor((score - 10) / 2);
    document.getElementById(`${stat}Mod`).textContent = `${mod >= 0 ? '+' : ''}${mod}`;
    calculateDependentStats();
    updateQuickStats();
    renderSkills();
}

function renderSaves() {
    const container = document.getElementById('savesContainer');
    const saves = characterData.saves || {};
    const saveMods = characterData.saveMods || { fort: 0, ref: 0, will: 0 };
    
    container.innerHTML = `
        <div class="stat-row">
            <span class="stat-name">Fortaleza</span>
            <div class="save-row">
                <input type="number" class="input" id="fortSave" value="${saves.fort || 0}" readonly style="cursor: not-allowed; opacity: 0.7; width: 70px;">
                <span style="color: #5eead4;">+</span>
                <input type="number" class="input" id="fortMod" value="${saveMods.fort || 0}" placeholder="Mod" style="width: 70px;" onchange="calculateCombatStats()">
                <span class="stat-score" style="font-size: 1.2rem;">= ${(saves.fort || 0) + (saveMods.fort || 0)}</span>
            </div>
        </div>
        <div class="stat-row">
            <span class="stat-name">Reflejos</span>
            <div class="save-row">
                <input type="number" class="input" id="refSave" value="${saves.ref || 0}" readonly style="cursor: not-allowed; opacity: 0.7; width: 70px;">
                <span style="color: #5eead4;">+</span>
                <input type="number" class="input" id="refMod" value="${saveMods.ref || 0}" placeholder="Mod" style="width: 70px;" onchange="calculateCombatStats()">
                <span class="stat-score" style="font-size: 1.2rem;">= ${(saves.ref || 0) + (saveMods.ref || 0)}</span>
            </div>
        </div>
        <div class="stat-row">
            <span class="stat-name">Voluntad</span>
            <div class="save-row">
                <input type="number" class="input" id="willSave" value="${saves.will || 0}" readonly style="cursor: not-allowed; opacity: 0.7; width: 70px;">
                <span style="color: #5eead4;">+</span>
                <input type="number" class="input" id="willMod" value="${saveMods.will || 0}" placeholder="Mod" style="width: 70px;" onchange="calculateCombatStats()">
                <span class="stat-score" style="font-size: 1.2rem;">= ${(saves.will || 0) + (saveMods.will || 0)}</span>
            </div>
        </div>
    `;
    
    document.getElementById('specialization').value = characterData.specialization || "";
    document.getElementById('prohibitedSchools').value = (characterData.prohibitedSchools || []).join(', ');
}

function renderCombat() {
    const combatMods = characterData.combatMods || { baseAttack: 0, ac: 0, initiative: 0 };
    
    document.getElementById('baseAttack').value = characterData.baseAttack || 0;
    document.getElementById('baseAttackMod').value = combatMods.baseAttack || 0;
    document.getElementById('ac').value = characterData.ac || 10;
    document.getElementById('acMod').value = combatMods.ac || 0;
    document.getElementById('initiative').value = characterData.initiative || 0;
    document.getElementById('initiativeMod').value = combatMods.initiative || 0;
    document.getElementById('speed').value = characterData.speed || "30'";
    document.getElementById('spellResistance').value = characterData.spellResistance || 0;
    document.getElementById('damageReduction').value = characterData.damageReduction || "0";
    document.getElementById('currentXP').value = characterData.experience?.current || 0;
    document.getElementById('currentLevel').value = characterData.level || 1;
    document.getElementById('nextLevelXP').value = characterData.experience?.nextLevel || 0;
}

function getAbilityMod(skillName) {
    const abilityKey = SKILL_ABILITIES[skillName] || 'int';
    return characterData.stats?.[abilityKey]?.mod || 0;
}

function renderSkills() {
    const container = document.getElementById('skillsContainer');
    const skills = characterData.skills || [];
    
    container.innerHTML = skills.map((skill, index) => {
        const abilityMod = getAbilityMod(skill.name);
        const total = (skill.ranks || 0) + abilityMod + (skill.misc || 0);
        
        return `
            <div class="item-row">
                <div style="flex: 1;">
                    <input type="text" class="input input-wide" value="${skill.name || ''}" 
                           onchange="characterData.skills[${index}].name = this.value; renderSkills();" 
                           placeholder="Nombre de habilidad" style="margin-bottom: 8px;">
                    <div class="skill-inputs">
                        <div>
                            <label style="color: #5eead4; font-size: 0.85rem; display: block; margin-bottom: 3px;">Rangos</label>
                            <input type="number" class="input" value="${skill.ranks || 0}" 
                                   onchange="characterData.skills[${index}].ranks = parseInt(this.value); renderSkills()" 
                                   style="width: 70px;">
                        </div>
                        <div>
                            <label style="color: #5eead4; font-size: 0.85rem; display: block; margin-bottom: 3px;">Mod Hab</label>
                            <input type="number" class="input" value="${abilityMod}" 
                                   readonly style="cursor: not-allowed; opacity: 0.7; width: 70px;">
                        </div>
                        <div>
                            <label style="color: #5eead4; font-size: 0.85rem; display: block; margin-bottom: 3px;">Varios</label>
                            <input type="number" class="input" value="${skill.misc || 0}" 
                                   onchange="characterData.skills[${index}].misc = parseInt(this.value); renderSkills()" 
                                   style="width: 70px;">
                        </div>
                        <div>
                            <label style="color: #5eead4; font-size: 0.85rem; display: block; margin-bottom: 3px;">Total</label>
                            <span class="stat-score" style="display: inline-block; padding: 8px 12px; min-width: 60px; text-align: center;">
                                ${total >= 0 ? '+' : ''}${total}
                            </span>
                        </div>
                    </div>
                </div>
                <button class="btn btn-secondary btn-small" onclick="removeSkill(${index})">✖</button>
            </div>
        `;
    }).join('');
}

function addSkill() {
    if (!characterData.skills) characterData.skills = [];
    characterData.skills.push({ name: "", ranks: 0, misc: 0 });
    renderSkills();
}

function removeSkill(index) {
    characterData.skills.splice(index, 1);
    renderSkills();
}

function renderSpells() {
    const container = document.getElementById('spellsContainer');
    const spellbook = spellsData.spellbook || [];
    
    container.innerHTML = spellbook.map((level, levelIndex) => `
        <div class="spell-level">
            <div class="spell-level-header">
                <h3 class="spell-level-title">Nivel ${level.level}</h3>
                <button class="btn btn-secondary btn-small" onclick="addSpell(${levelIndex})">+ Agregar Hechizo</button>
            </div>
            ${(level.spells || []).map((spell, spellIndex) => `
                <div class="spell-item ${spell.prepared ? 'prepared' : ''}">
                    <input type="checkbox" class="spell-checkbox" ${spell.prepared ? 'checked' : ''} 
                           onchange="toggleSpell(${levelIndex}, ${spellIndex})">
                    <div class="spell-info">
                        <input type="text" class="input input-wide" value="${spell.name || ''}" 
                               onchange="spellsData.spellbook[${levelIndex}].spells[${spellIndex}].name = this.value" 
                               placeholder="Nombre del hechizo" style="margin-bottom: 5px;">
                        <input type="text" class="input input-wide" value="${spell.school || ''}" 
                               onchange="spellsData.spellbook[${levelIndex}].spells[${spellIndex}].school = this.value" 
                               placeholder="Escuela">
                    </div>
                    <div class="spell-actions">
                        ${spell.prepared ? '<span style="color: #10b981; font-size: 1.5rem;">✨</span>' : ''}
                        <button class="btn btn-secondary btn-small" onclick="removeSpell(${levelIndex}, ${spellIndex})">✖</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');
}

function addSpell(levelIndex) {
    if (!spellsData.spellbook[levelIndex].spells) {
        spellsData.spellbook[levelIndex].spells = [];
    }
    spellsData.spellbook[levelIndex].spells.push({
        name: "",
        school: "",
        prepared: false
    });
    renderSpells();
}

function removeSpell(levelIndex, spellIndex) {
    spellsData.spellbook[levelIndex].spells.splice(spellIndex, 1);
    renderSpells();
}

function toggleSpell(levelIndex, spellIndex) {
    const spell = spellsData.spellbook[levelIndex].spells[spellIndex];
    spell.prepared = !spell.prepared;
    renderSpells();
}

function renderFeats() {
    const container = document.getElementById('featsContainer');
    const feats = characterData.feats || [];
    
    container.innerHTML = feats.map((feat, index) => `
        <div class="item-row">
            <div style="flex: 1;">
                <input type="text" class="input input-wide" value="${feat.name || ''}" 
                       onchange="characterData.feats[${index}].name = this.value" 
                       placeholder="Nombre de la dote" style="margin-bottom: 5px;">
                <textarea class="textarea" 
                          onchange="characterData.feats[${index}].description = this.value" 
                          placeholder="Descripción">${feat.description || ''}</textarea>
            </div>
            <button class="btn btn-secondary btn-small" onclick="removeFeat(${index})">✖</button>
        </div>
    `).join('');
}

function addFeat() {
    if (!characterData.feats) characterData.feats = [];
    characterData.feats.push({ name: "", description: "" });
    renderFeats();
}

function removeFeat(index) {
    characterData.feats.splice(index, 1);
    renderFeats();
}

function renderEquipment() {
    const container = document.getElementById('equipmentContainer');
    const equipment = characterData.equipment || [];
    
    container.innerHTML = equipment.map((item, index) => `
        <div class="item-row">
            <div style="flex: 1;">
                <input type="text" class="input input-wide" value="${item.name || ''}" 
                       onchange="characterData.equipment[${index}].name = this.value" 
                       placeholder="Nombre del objeto" style="margin-bottom: 8px;">
                <div style="display: flex; gap: 10px;">
                    <div>
                        <label style="color: #5eead4; font-size: 0.85rem; display: block; margin-bottom: 3px;">Cantidad</label>
                        <input type="number" class="input" value="${item.quantity || 1}" 
                               onchange="characterData.equipment[${index}].quantity = parseInt(this.value); renderEquipment()" 
                               style="width: 80px;">
                    </div>
                    <div>
                        <label style="color: #5eead4; font-size: 0.85rem; display: block; margin-bottom: 3px;">Peso (lb)</label>
                        <input type="number" class="input" value="${item.weight || 0}" 
                               onchange="characterData.equipment[${index}].weight = parseFloat(this.value); renderEquipment()" 
                               style="width: 80px;">
                    </div>
                </div>
            </div>
            <button class="btn btn-secondary btn-small" onclick="removeItem(${index})">✖</button>
        </div>
    `).join('');
}

function addItem() {
    if (!characterData.equipment) characterData.equipment = [];
    characterData.equipment.push({ name: "", quantity: 1, weight: 0 });
    renderEquipment();
}

function removeItem(index) {
    characterData.equipment.splice(index, 1);
    renderEquipment();
}

function renderLanguages() {
    document.getElementById('languages').value = (characterData.languages || []).join(', ');
}

function renderWealth() {
    const wealth = characterData.wealth || {};
    document.getElementById('gold').value = wealth.gold || 0;
    document.getElementById('silver').value = wealth.silver || 0;
    document.getElementById('copper').value = wealth.copper || 0;
    document.getElementById('platinum').value = wealth.platinum || 0;
    document.getElementById('treasures').value = wealth.treasures || "";
}

function updateHP() {
    const current = parseInt(document.getElementById('hpCurrent').value);
    const max = parseInt(document.getElementById('hpMax').value);
    
    characterData.hp.current = current;
    characterData.hp.max = max;
    
    const percentage = Math.max(0, (current / max) * 100);
    document.getElementById('hpBar').style.width = percentage + '%';
    document.getElementById('hpBar').textContent = `${current}/${max}`;
    
    updateQuickStats();
}

function updateQuickStats() {
    const hp = characterData.hp || { current: 0, max: 0 };
    document.getElementById('hpDisplay').textContent = `${hp.current}/${hp.max}`;
    
    const combatMods = characterData.combatMods || { baseAttack: 0, ac: 0, initiative: 0 };
    const saveMods = characterData.saveMods || { fort: 0, ref: 0, will: 0 };
    
    document.getElementById('acDisplay').textContent = (characterData.ac || 10) + (combatMods.ac || 0);
    document.getElementById('initDisplay').textContent = `+${(characterData.initiative || 0) + (combatMods.initiative || 0)}`;
    document.getElementById('baseAttackDisplay').textContent = `+${(characterData.baseAttack || 0) + (combatMods.baseAttack || 0)}`;
    
    const xp = characterData.experience || { current: 0, nextLevel: 0 };
    document.getElementById('xpDisplay').textContent = `${xp.current} / ${xp.nextLevel}`;
    
    document.getElementById('hpCurrent').value = hp.current;
    document.getElementById('hpMax').value = hp.max;
    const percentage = Math.max(0, (hp.current / hp.max) * 100);
    document.getElementById('hpBar').style.width = percentage + '%';
    document.getElementById('hpBar').textContent = `${hp.current}/${hp.max}`;
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tab + 'Tab').classList.add('active');
}

window.addEventListener('load', init)