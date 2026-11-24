// Telas e menus: início, pausa, opções/acessibilidade, melhorias da lanterna,
// mochila, missões, mapa completo, diálogo, morte e ajuda com remapeamento.

import { clamp } from '../core/state.js';
import { UPGRADES, TRICK_DEFS, BIOME_POWERS } from '../player/lantern.js';
import { ITEMS } from '../systems/loot.js';
import { BIOME_LIST } from '../world/biome.js';
import { ACTIONS, ACTION_LABELS } from '../core/input.js';
import { QUALITY_LABELS } from '../core/quality.js';

const $ = (id) => document.getElementById(id);
const TOUCH_LABELS = { auto: 'Automático', on: 'Sempre visível', off: 'Desligado' };

export class Menus {
  constructor({ events, settings, input, audio, save, hud }) {
    this.events = events;
    this.settings = settings;
    this.input = input;
    this.audio = audio;
    this.save = save;
    this.hud = hud;
    this.current = null; // id da tela aberta
    this.game = null;    // referência injetada pelo main

    this.screens = {
      title: $('title'), pause: $('screen-pause'), settings: $('screen-settings'), help: $('screen-help'),
      upgrades: $('screen-upgrades'), inventory: $('screen-inventory'), quests: $('screen-quests'),
      map: $('screen-map'), dead: $('screen-dead'), loading: $('loading'),
    };
    this.dialogueEl = $('dialogue');
    this.dialogueOpen = false;

    this.wireStatic();
    this.events.on('dialogue:open', (data) => this.showDialogue(data));
    this.events.on('dialogue:close', () => this.hideDialogue());
    this.events.on('settings:change', () => { if (this.current === 'settings') this.renderSettings(); });
    this.events.on('input:capture', () => { if (this.current === 'settings') this.renderSettings(); });
  }

  wireStatic() {
    $('btn-new')?.addEventListener('click', () => this.audio?.sfx('ui') || this.events.emit('game:new', {}));
    $('btn-continue')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.events.emit('game:continue', {}); });
    $('btn-help-title')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.open('help'); });
    $('btn-settings-title')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.open('settings'); });
    $('btn-wipe')?.addEventListener('click', () => {
      this.save.clear();
      this.audio?.sfx('ui');
      this.events.emit('ui:toast', { text: 'Progresso apagado.', icon: '🗑' });
      this.updateTitleButtons();
    });

    $('btn-resume')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.events.emit('game:resume', {}); });
    $('btn-avatar')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.events.emit('ui:avatar-request', {}); });
    $('btn-avatar-pause')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.events.emit('ui:avatar-request', {}); });
    $('btn-upgrades')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.open('upgrades'); });
    $('btn-inventory')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.open('inventory'); });
    $('btn-quests')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.open('quests'); });
    $('btn-map-full')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.open('map'); });
    $('btn-settings')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.open('settings'); });
    $('btn-help-pause')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.open('help'); });
    $('btn-save')?.addEventListener('click', () => { this.audio?.sfx('save'); this.events.emit('game:save', { manual: true }); });
    $('btn-load')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.events.emit('game:load', {}); });
    $('btn-quit')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.events.emit('game:quit', {}); });
    $('btn-respawn')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.events.emit('game:respawn', {}); });

    // delegação: as telas de melhorias/mochila/missões/mapa/opções são
    // desenhadas dinamicamente, então o botão "Voltar" precisa ser capturado aqui.
    document.addEventListener('click', (e) => {
      const btn = e.target?.closest?.('[data-close]');
      if (!btn) return;
      this.audio?.sfx('ui');
      this.back();
    });
    $('btn-dialogue-close')?.addEventListener('click', () => { this.audio?.sfx('ui'); this.events.emit('dialogue:closed', {}); });
    $('btn-dialogue-next')?.addEventListener('click', () => this.advanceDialogue());
    $('dialogue-text')?.addEventListener('click', () => this.advanceDialogue());
    $('dialogue-portrait')?.addEventListener('click', () => this.advanceDialogue());
  }

  /** "Continuar": completa a digitação ou pede a próxima fala. */
  advanceDialogue() {
    if (!this.dialogueOpen) return;
    if (this._typer) { this.finishTyping(); return; }
    this.events.emit('dialogue:next', {});
  }

  updateTitleButtons() {
    const has = this.save.has();
    $('btn-continue')?.classList.toggle('hidden', !has);
  }

  /** Abre uma tela; guarda de onde veio para voltar corretamente. */
  open(id) {
    const previous = this.current;
    if (previous && ['settings', 'help', 'upgrades', 'inventory', 'quests', 'map'].includes(previous) && ['settings', 'help', 'upgrades', 'inventory', 'quests', 'map'].includes(id)) {
      this.returnTo = this.returnTo || previous;
    } else {
      this.returnTo = previous;
    }
    this.hideAll();
    const screen = this.screens[id];
    if (screen) screen.classList.remove('hidden');
    this.current = id;
    if (id === 'settings') this.renderSettings();
    if (id === 'help') this.renderHelp();
    if (id === 'upgrades') this.renderUpgrades();
    if (id === 'inventory') this.renderInventory();
    if (id === 'quests') this.renderQuests();
    if (id === 'map') this.renderMap();
    this.events.emit('ui:screen', { id });
  }

  back() {
    const target = this.returnTo;
    this.returnTo = null;
    if (target && this.screens[target]) this.open(target);
    else this.hideAll();
  }

  hideAll() {
    Object.values(this.screens).forEach((s) => s?.classList.add('hidden'));
    this.current = null;
  }

  show(id) {
    this.hideAll();
    this.screens[id]?.classList.remove('hidden');
    this.current = id;
  }

  get isOpen() { return !!this.current || this.dialogueOpen; }

  // ------------------------------------------------------------ opções
  renderSettings() {
    const s = this.settings;
    const panel = $('settings-panel');
    if (!panel) return;
    const slider = (key, label, min, max, step, fmt) => `
      <label class="field">
        <span class="lab"><span>${label}</span><span id="val-${key}">${fmt(s.get(key))}</span></span>
        <input type="range" id="set-${key}" min="${min}" max="${max}" step="${step}" value="${s.get(key)}">
      </label>`;
    const toggle = (key, label, hint) => `
      <div class="switch">
        <div><div>${label}</div><span class="hint">${hint}</span></div>
        <button class="btn small ${s.get(key) ? 'primary' : 'ghost'}" data-toggle="${key}">${s.get(key) ? 'Ligado' : 'Desligado'}</button>
      </div>`;
    const diff = s.get('difficulty') <= 0.7 ? 'facil' : s.get('difficulty') >= 1.3 ? 'desafiador' : 'normal';

    panel.innerHTML = `
      <div class="eyebrow">Ajustes do jogo</div>
      <h2>⚙ Opções e acessibilidade</h2>
      <h3>Conforto visual</h3>
      ${slider('brightness', 'Brilho da cena', 0.6, 1.6, 0.05, (v) => `${Math.round(v * 100)}%`)}
      ${slider('fx', 'Intensidade dos efeitos', 0, 1.5, 0.1, (v) => `${Math.round(v * 100)}%`)}
      ${slider('textScale', 'Tamanho do texto', 0.9, 1.4, 0.05, (v) => `${Math.round(v * 100)}%`)}
      <h3>Desempenho</h3>
      <p class="hint">Se o jogo estiver lento, escolha <b>Média</b> ou <b>Baixa</b>. Na <b>Automática</b> o jogo ajusta a resolução sozinho para ficar fluido.</p>
      <div class="row">
        ${Object.entries(QUALITY_LABELS).map(([id, label]) => `<button class="btn small ${s.get('quality') === id ? 'primary' : 'ghost'}" data-quality="${id}">${label}</button>`).join('')}
      </div>
      <h3>Som</h3>
      ${slider('music', 'Música', 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`)}
      ${slider('sfx', 'Efeitos sonoros', 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`)}
      ${slider('ambient', 'Ambiente', 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`)}
      <p class="hint">Nada de sustos sonoros: o volume ambiente começa baixinho e sobe devagar.</p>
      <h3>Controle e conforto</h3>
      ${toggle('calm', 'Exploração tranquila', 'Inimigos mais gentis, menos dano e mais tolerância a erros.')}
      ${toggle('tutorials', 'Dicas de tutorial', 'Mostra dicas curtas durante a aventura.')}
      ${toggle('invertY', 'Inverter eixo vertical', 'Para quem prefere a câmera invertida.')}
      <div class="switch">
        <div><div>Controles de toque</div><span class="hint">Botões na tela para jogar sem teclado.</span></div>
        <button class="btn small ghost" data-touch-cycle>${TOUCH_LABELS[s.get('touch')] || TOUCH_LABELS.auto}</button>
      </div>
      ${slider('sensitivity', 'Sensibilidade da câmera', 0.4, 2, 0.1, (v) => `${Math.round(v * 100)}%`)}
      <h3>Dificuldade do combate</h3>
      <div class="row">
        <button class="btn small ${diff === 'facil' ? 'primary' : 'ghost'}" data-diff="0.6">Tranquilo</button>
        <button class="btn small ${diff === 'normal' ? 'primary' : 'ghost'}" data-diff="1">Normal</button>
        <button class="btn small ${diff === 'desafiador' ? 'primary' : 'ghost'}" data-diff="1.5">Desafiador</button>
      </div>
      <h3>Comandos</h3>
      <p class="hint">Toque em um comando e pressione a tecla ou o botão do mouse que quiser usar. M1–M4 funcionam em mouses com botões extras e podem ser remapeados para o teclado.</p>
      <div id="bind-list"></div>
      <div class="row" style="margin-top:12px">
        <button class="btn small ghost" id="btn-reset-settings">Restaurar padrões</button>
      </div>
      <div class="closebar"><button class="btn" data-close>Voltar</button></div>`;

    const bindList = panel.querySelector('#bind-list');
    for (const action of ACTIONS) {
      const row = document.createElement('div');
      row.className = 'kv';
      const capturing = this.input.capture === action;
      row.innerHTML = `<span>${ACTION_LABELS[action] || action}</span>
        <button class="btn small ${capturing ? 'gold' : 'ghost'}" data-bind="${action}">${capturing ? 'Pressione…' : s.label(action)}</button>`;
      bindList.appendChild(row);
    }

    panel.querySelectorAll('[data-bind]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.input.beginCapture(btn.dataset.bind);
        this.renderSettings();
      });
    });
    panel.querySelector('[data-touch-cycle]')?.addEventListener('click', () => {
      const order = ['auto', 'on', 'off'];
      const next = order[(order.indexOf(String(this.settings.get('touch'))) + 1) % order.length];
      this.settings.set('touch', next);
      this.hud?.applyTouchPreference();
      this.audio?.sfx('ui');
      this.renderSettings();
    });
    panel.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.toggle;
        this.settings.set(key, !this.settings.get(key));
        this.audio?.sfx('ui');
        this.renderSettings();
      });
    });
    panel.querySelectorAll('[data-quality]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.settings.set('quality', btn.dataset.quality);
        this.audio?.sfx('ui');
        this.renderSettings();
      });
    });
    panel.querySelectorAll('[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.settings.set('difficulty', Number(btn.dataset.diff));
        this.settings.set('calm', Number(btn.dataset.diff) <= 0.7);
        this.audio?.sfx('ui');
        this.renderSettings();
      });
    });
    panel.querySelector('#btn-reset-settings')?.addEventListener('click', () => {
      this.settings.reset();
      this.audio?.sfx('ui');
      this.renderSettings();
    });
    ['brightness', 'fx', 'textScale', 'music', 'sfx', 'ambient', 'sensitivity'].forEach((key) => {
      const input = panel.querySelector(`#set-${key}`);
      input?.addEventListener('input', () => {
        const value = Number(input.value);
        this.settings.set(key, value);
        const label = panel.querySelector(`#val-${key}`);
        if (label) label.textContent = `${Math.round(value * 100)}%`;
      });
    });
  }

  // ------------------------------------------------------------ ajuda
  renderHelp() {
    const body = $('help-body');
    if (!body) return;
    const s = this.settings;
    body.innerHTML = `
      <div class="eyebrow">Aprenda a jogar</div>
      <h2>🎮 Controles</h2>
      <div class="kv"><span>Mover</span><span><span class="key">W</span> <span class="key">A</span> <span class="key">S</span> <span class="key">D</span></span></div>
      <div class="kv"><span>Dash (desviar e passar por espaços)</span><span class="key">${s.keyLabel('dash')}</span></div>
      <div class="kv"><span>Pular</span><span class="key">${s.keyLabel('jump')}</span></div>
      <div class="kv"><span>Ataque da lanterna (M1) — segure para carregar</span><span class="key">${s.keyLabel('attack')}</span></div>
      <div class="kv"><span>Defesa / mira com escudo de luz (M2)</span><span class="key">${s.keyLabel('defense')}</span></div>
      <div class="kv"><span>Pulso luminoso (M3)</span><span class="key">${s.keyLabel('special')}</span></div>
      <div class="kv"><span>Alternar poder (M4)</span><span class="key">${s.keyLabel('toggle')}</span></div>
      <div class="kv"><span>Manobras divertidas com a lanterna</span><span class="key">${s.keyLabel('trick')}</span></div>
      <div class="kv"><span>Interagir (baús, portas, NPCs, placas)</span><span class="key">${s.keyLabel('interact')}</span></div>
      <div class="kv"><span>Mapa</span><span class="key">${s.keyLabel('map')}</span></div>
      <div class="kv"><span>Pausa</span><span class="key">${s.keyLabel('pause')}</span></div>
      <p style="margin-top:10px">Mouse: <b>M1</b> ataque, <b>M2</b> defesa/mira, <b>M3</b> especial, <b>M4</b> alternar poder. Sem esses botões? Remapeie tudo em <b>Opções → Comandos</b> ou use os controles de toque.</p>
      <h3>Dicas para explorar o escuro</h3>
      <p>• A luz da lanterna revela passagens, inscrições e objetos escondidos.<br>
         • Criaturas corrompidas ficam em paz quando iluminadas com purificação (modo Revelação).<br>
         • Cristais refletem a luz: use-os para atingir alvos distantes.<br>
         • O pulso luminoso (M3) cresce raízes, abre flores e afasta criaturas.<br>
         • Use R perto de amigos: eles adoram manobras!</p>
      <h3>Missões e progressão</h3>
      <p>Converse com todos, abra baús, purifique criaturas e acenda o Altar da Clareira Antiga para despertar a passagem entre biomas.</p>`;
  }

  // ------------------------------------------------------------ melhorias
  renderUpgrades() {
    const panel = $('upgrades-panel');
    const game = this.game;
    if (!panel || !game) return;
    const lantern = game.lantern;
    const crystals = game.inventory.count('cristal');
    const rows = UPGRADES.map((u) => {
      const lv = lantern.upgradeLevel(u.id);
      const cost = lantern.nextUpgradeCost(u.id);
      const pips = Array.from({ length: u.max }, (_, i) => `<span class="pill ${i < lv ? '' : 'off'}">${i < lv ? '●' : '○'}</span>`).join(' ');
      const canBuy = cost !== null && crystals >= cost;
      return `<div class="item">
        <div class="ico">${u.icon}</div>
        <div class="grow"><div class="t">${u.name} ${pips}</div><div class="d">${u.desc}</div></div>
        ${cost === null
          ? '<span class="pill">Máximo</span>'
          : `<button class="btn small ${canBuy ? 'primary' : 'ghost'}" data-upgrade="${u.id}" ${canBuy ? '' : 'disabled'}>🔷 ${cost}</button>`}
      </div>`;
    }).join('');

    const relics = game.inventory.list().filter((i) => i.def?.kind === 'relic');
    const skins = game.inventory.list().filter((i) => i.def?.kind === 'skin');
    const modes = Object.entries(BIOME_POWERS).map(([id, p]) => `
      <div class="item">
        <div class="ico">${id === 'floresta' ? '🌲' : id === 'cristal' ? '💎' : id === 'deserto' ? '🏜' : id === 'pantano' ? '🍄' : id === 'gelo' ? '❄️' : id === 'ruinas' ? '🏛' : '🌑'}</div>
        <div class="grow"><div class="t" style="color:${p.color}">${p.name}</div><div class="d">${p.locked ? '🔒 Bioma adormecido — desperte o Altar para explorar.' : p.desc}</div></div>
      </div>`).join('');

    panel.innerHTML = `
      <div class="eyebrow">Sua lanterna mágica</div>
      <h2>🏮 Melhorias da lanterna</h2>
      <p>Cristais disponíveis: <b>🔷 ${crystals}</b> · Fragmentos: <b>✨ ${game.inventory.count('fragmento')}</b></p>
      <div class="list" style="margin-top:10px">${rows}</div>
      <h3>Relíquias encontradas</h3>
      <div class="list">${relics.length ? relics.map((r) => `<div class="item"><div class="ico">${r.def.icon}</div><div class="grow"><div class="t">${r.def.name}</div><div class="d">${r.def.desc}</div></div><span class="pill">${r.amount}</span></div>`).join('') : '<p>Nenhuma ainda. Explore baús secretos!</p>'}</div>
      <h3>Aparência da lanterna</h3>
      <div class="list">
        ${skins.length ? skins.map((s) => `<div class="item"><div class="ico">${s.def.icon}</div><div class="grow"><div class="t">${s.def.name}</div><div class="d">${s.def.desc}</div></div><button class="btn small" data-skin="${s.def.skin}">Usar</button></div>`).join('') : '<p>Nenhuma cor extra ainda.</p>'}
      </div>
      <h3>Poderes dos biomas</h3>
      <div class="list">${modes}</div>
      <div class="closebar"><button class="btn" data-close>Voltar</button></div>`;

    panel.querySelectorAll('[data-upgrade]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.events.emit('game:upgrade', { id: btn.dataset.upgrade });
        this.renderUpgrades();
      });
    });
    panel.querySelectorAll('[data-skin]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.events.emit('game:skin', { skin: btn.dataset.skin });
        this.renderUpgrades();
      });
    });
  }

  // ------------------------------------------------------------ mochila
  renderInventory() {
    const panel = $('inventory-panel');
    const game = this.game;
    if (!panel || !game) return;
    const items = game.inventory.list();
    const tricks = Object.entries(TRICK_DEFS).map(([id, def]) => `
      <div class="item">
        <div class="ico">${def.icon}</div>
        <div class="grow"><div class="t">${def.name}</div><div class="d">${def.desc}</div></div>
        <span class="pill ${game.lantern.unlockedTricks.has(id) ? '' : 'off'}">${game.lantern.unlockedTricks.has(id) ? 'Aprendida' : 'Bloqueada'}</span>
      </div>`).join('');

    panel.innerHTML = `
      <div class="eyebrow">O que você encontrou</div>
      <h2>🎒 Mochila</h2>
      <p>Itens coletados explorando o bosque.</p>
      <div class="list" style="margin-top:10px">
        ${items.length ? items.map((i) => `<div class="item"><div class="ico">${i.def?.icon || '•'}</div><div class="grow"><div class="t">${i.def?.name || i.id}</div><div class="d">${i.def?.desc || ''}</div></div><span class="pill">×${i.amount}</span></div>`).join('') : '<p>Sua mochila está vazia. Procure baús e criaturas!</p>'}
      </div>
      <h3>Manobras da lanterna (R)</h3>
      <div class="list">${tricks}</div>
      <div class="closebar"><button class="btn" data-close>Voltar</button></div>`;
  }

  // ------------------------------------------------------------ missões
  renderQuests() {
    const panel = $('quests-panel');
    const game = this.game;
    if (!panel || !game) return;
    const q = game.quests;
    const active = [...q.active.entries()].filter(([id]) => !q.completed.has(id));
    const done = [...q.completed];
    const xp = game.inventory.count('experiencia');
    const level = game.level ? game.level() : 1;

    const rewards = (def) => {
      const names = (def.rewards || []).map(([id, n]) => `${ITEMS[id]?.icon || '✦'} ${ITEMS[id]?.name || id}${n > 1 ? ` ×${n}` : ''}`);
      if (def.xp) names.push(`⭐ ${def.xp} de experiência`);
      if (!names.length) return '<p class="hint">Recompensas: experiência da aventura.</p>';
      return `<div class="quest-rewards">${names.map((n) => `<span class="pill">${n}</span>`).join('')}</div>`;
    };
    const renderSteps = (id) => {
      const def = q.defs[id];
      const state = q.active.get(id) || { step: 0, progress: 0 };
      return def.steps.map((s, i) => {
        const status = i < state.step ? '✔' : i === state.step ? '▶' : '•';
        const pct = s.goal ? Math.min(100, Math.round((Math.min(state.progress, s.goal) / s.goal) * 100)) : (i < state.step ? 100 : 0);
        const goal = s.goal && i === state.step ? ` (${Math.min(state.progress, s.goal)}/${s.goal})` : '';
        return `<div class="objective ${i < state.step ? 'done' : i === state.step ? 'current' : ''}">
          <div class="obj-text"><span>${status} ${s.text}${goal}</span>${s.goal && i === state.step ? `<span class="obj-pct">${pct}%</span>` : ''}</div>
          ${s.goal && i === state.step ? `<div class="obj-bar"><div style="transform:scaleX(${pct / 100})"></div></div>` : ''}
        </div>`;
      }).join('');
    };
    const card = (id, isDone) => {
      const def = q.defs[id];
      return `<div class="quest-card ${isDone ? 'done' : ''}">
        <div class="quest-head"><h3>${isDone ? '🏅' : '📜'} ${def.title}</h3>${isDone ? '<span class="pill">Concluída</span>' : def.giver ? `<span class="pill">${def.giver}</span>` : ''}</div>
        <p>${def.desc || ''}</p>
        ${isDone ? '' : renderSteps(id)}
        <div class="quest-rewards-label">Recompensas</div>
        ${rewards(def)}
      </div>`;
    };

    panel.innerHTML = `
      <div class="eyebrow">Diário de aventura</div>
      <h2>📜 Missões</h2>
      <p>Nível <b>${level}</b> · ⭐ ${xp} de experiência · ${game.flags?.title ? `Título: <b>${game.flags.title}</b>` : 'Converse com os NPCs para ganhar títulos.'}</p>
      ${active.length ? active.map(([id]) => card(id, false)).join('') : '<p>Nenhuma missão ativa. Converse com Lumi, o Velho Guardião, o Cavaleiro Aldric, a fada Faísca e o Sábio da Montanha.</p>'}
      ${done.length ? `<h3>Concluídas</h3>${done.map((id) => card(id, true)).join('')}` : ''}
      <h3>Onde ir agora</h3>
      <p>Acampamento (🔥) · Bosque Sem Luz (🌑, a oeste) · Caverna Sem Fim (🜁, a leste) · Ruínas e Altar de Luz (🏛) · Templo Noturno (🌙, ao norte) · Clareira Antiga (💫)</p>
      <div class="closebar"><button class="btn" data-close>Voltar</button></div>`;
  }

  // ------------------------------------------------------------ mapa
  renderMap() {
    const panel = $('map-panel');
    const game = this.game;
    if (!panel || !game) return;
    const biomes = BIOME_LIST.map((b) => `
      <div class="item">
        <div class="ico">${b.icon}</div>
        <div class="grow"><div class="t" style="color:${b.color}">${b.name}</div><div class="d">${b.locked ? '🔒 Adormecido — acenda o altar e ajude o bosque.' : b.desc}</div></div>
        <span class="pill ${b.locked ? 'off' : ''}">${b.locked ? 'Em breve' : 'Explorando'}</span>
      </div>`).join('');
    panel.innerHTML = `
      <div class="eyebrow">Explore sem se perder</div>
      <h2>🗺 Mapa do bosque</h2>
      <canvas id="map-canvas" width="640" height="640" style="width:100%;max-width:420px;display:block;margin:0 auto;border-radius:16px;background:#0a0e15;border:1px solid rgba(255,255,255,.1)"></canvas>
      <p style="text-align:center">Bússola: <b>N</b> aponta para o topo. Os ícones mostram baús, NPCs, flores e o altar.</p>
      <h3>Biomas do mundo</h3>
      <div class="list">${biomes}</div>
      <div class="closebar"><button class="btn" data-close>Voltar</button></div>`;
    this.drawFullMap(panel.querySelector('#map-canvas'));
  }

  drawFullMap(canvas) {
    const game = this.game;
    if (!canvas || !game) return;
    const g = canvas.getContext('2d');
    const size = canvas.width;
    const scale = size / 130;
    const toX = (x) => size / 2 + x * scale;
    const toY = (z) => size / 2 + z * scale;
    g.clearRect(0, 0, size, size);
    // terreno
    g.strokeStyle = 'rgba(140,200,255,.10)';
    for (let r = 10; r < 60; r += 12) {
      g.beginPath(); g.arc(size / 2, size / 2, r * scale, 0, Math.PI * 2); g.stroke();
    }
    // zona segura
    for (const z of game.world.safeZones || []) {
      g.beginPath(); g.arc(toX(z.x), toY(z.z), z.radius * scale, 0, Math.PI * 2);
      g.fillStyle = 'rgba(126,242,176,.16)'; g.fill();
      g.strokeStyle = 'rgba(126,242,176,.5)'; g.stroke();
    }
    // rio/lago
    g.beginPath(); g.arc(toX(-16), toY(9), 7 * scale, 0, Math.PI * 2);
    g.fillStyle = 'rgba(60,150,190,.35)'; g.fill();
    // torre
    g.beginPath(); g.arc(toX(-24), toY(-22), 7.4 * scale, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(200,200,255,.4)'; g.setLineDash([6, 5]); g.stroke(); g.setLineDash([]);
    // pontos
    g.font = '18px serif'; g.textAlign = 'center';
    for (const p of game.world.mapData()) {
      if (p.hidden) continue;
      g.fillText(p.icon, toX(p.x), toY(p.z) + 6);
    }
    // jogador
    g.save();
    g.translate(toX(game.player.position.x), toY(game.player.position.z));
    g.rotate(-game.player.facing + Math.PI);
    g.beginPath(); g.moveTo(0, -12); g.lineTo(9, 10); g.lineTo(0, 5); g.lineTo(-9, 10); g.closePath();
    g.fillStyle = '#bff6ff'; g.fill();
    g.restore();
    // norte
    g.fillStyle = '#cfe8ff'; g.font = 'bold 16px sans-serif';
    g.fillText('N', size / 2, 20);
  }

  // ------------------------------------------------------------ diálogo
  showDialogue(data) {
    this.dialogueOpen = true;
    this.dialogueEl.classList.remove('hidden');
    this._dialogueData = data;
    const dlg = this.dialogueEl.querySelector('.dlg');
    const mood = data.mood || 'neutral';
    if (dlg) dlg.dataset.mood = mood;
    $('dialogue-name').textContent = data.name || '—';
    this.drawPortrait($('dialogue-portrait'), data.portrait || {}, mood);
    this._pendingChoices = data.choices || [];
    this.typeText(data.text || '');
    $('btn-dialogue-next').classList.toggle('hidden', !data.canContinue && (data.choices || []).length > 0);
    $('btn-dialogue-close').classList.remove('hidden');
    this.events.emit('ui:dialogue', { open: true });
  }

  /** Texto aparecendo gradualmente, com um som suave de fala. */
  typeText(text) {
    const el = $('dialogue-text');
    if (!el) return;
    clearInterval(this._typer);
    this._typer = null;
    this._fullText = text;
    el.textContent = '';
    el.classList.add('typing');
    $('dialogue-choices').innerHTML = '';
    this._choicesShown = false;
    let i = 0;
    if (!text) { this.finishTyping(); return; }
    this._typer = setInterval(() => {
      i += 1;
      el.textContent = text.slice(0, i);
      if (i % 4 === 0) this.audio?.sfx('talk', { soft: true });
      if (i >= text.length) this.finishTyping();
    }, 24);
  }

  finishTyping() {
    clearInterval(this._typer);
    this._typer = null;
    const el = $('dialogue-text');
    if (el) { el.textContent = this._fullText || ''; el.classList.remove('typing'); }
    this.showChoices(this._pendingChoices || []);
  }

  showChoices(choices) {
    const box = $('dialogue-choices');
    if (!box) return;
    box.innerHTML = '';
    this._choicesShown = true;
    choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'btn choice';
      btn.textContent = choice.label;
      btn.addEventListener('click', () => this.events.emit('dialogue:choice', { index: i }));
      box.appendChild(btn);
    });
    $('btn-dialogue-next').classList.toggle('hidden', choices.length > 0 || !this._dialogueData?.canContinue);
    $('btn-dialogue-close').classList.toggle('hidden', false);
  }

  hideDialogue() {
    this.dialogueOpen = false;
    clearInterval(this._typer);
    this._typer = null;
    this.dialogueEl.classList.add('hidden');
    this._pendingChoices = [];
    this.events.emit('ui:dialogue', { open: false });
  }

  /** Retrato 2D desenhado no canvas conforme o humor da fala. */
  drawPortrait(canvas, spec = {}, mood = 'neutral') {
    if (!canvas) return;
    const g = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const accent = spec.accent || '#d4af37';
    const rgba = (hex, a) => {
      const n = parseInt(hex.replace('#', ''), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    };
    g.clearRect(0, 0, W, H);
    const bg = g.createRadialGradient(W * 0.5, H * 0.35, 6, W * 0.5, H * 0.55, W * 0.72);
    bg.addColorStop(0, rgba(accent, 0.55));
    bg.addColorStop(1, 'rgba(10,13,22,0.96)');
    g.fillStyle = bg;
    g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = rgba(accent, 0.65); g.lineWidth = 3;
    g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 4, 0, Math.PI * 2); g.stroke();

    const cx = W / 2, cy = H * 0.54;
    const skin = spec.skin || '#f2c79b';
    const hair = spec.hair || '#3a2c22';
    const cloth = spec.cloth || '#4a6fa8';
    const kind = spec.kind || 'stone';

    if (kind === 'stone') {
      g.fillStyle = '#4a4560';
      g.beginPath();
      g.moveTo(cx - 30, cy + 34); g.lineTo(cx - 24, cy - 26); g.lineTo(cx + 6, cy - 36);
      g.lineTo(cx + 30, cy - 6); g.lineTo(cx + 22, cy + 36); g.closePath(); g.fill();
      g.strokeStyle = accent; g.lineWidth = 3;
      g.beginPath(); g.moveTo(cx - 8, cy - 16); g.lineTo(cx + 10, cy + 2); g.lineTo(cx - 4, cy + 20); g.stroke();
      g.fillStyle = rgba(accent, 0.9);
      g.beginPath(); g.arc(cx + 8, cy - 12, 4, 0, Math.PI * 2); g.fill();
      return;
    }

    // ombros / roupa
    g.fillStyle = cloth;
    g.beginPath();
    g.moveTo(cx - 44, H - 6);
    g.quadraticCurveTo(cx - 34, cy + 22, cx, cy + 24);
    g.quadraticCurveTo(cx + 34, cy + 22, cx + 44, H - 6);
    g.closePath(); g.fill();
    // gola / detalhe dourado
    g.strokeStyle = rgba(accent, 0.75); g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx - 14, cy + 22); g.quadraticCurveTo(cx, cy + 34, cx + 14, cy + 22); g.stroke();

    // cabeça
    g.fillStyle = skin;
    g.beginPath(); g.ellipse(cx, cy - 4, 26, 29, 0, 0, Math.PI * 2); g.fill();
    // orelhas
    g.beginPath(); g.ellipse(cx - 26, cy - 2, 5, 8, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx + 26, cy - 2, 5, 8, 0, 0, Math.PI * 2); g.fill();

    // cabelo / chapéus por tipo
    g.fillStyle = hair;
    if (kind === 'knight') {
      g.fillStyle = '#9aa4b8';
      g.beginPath(); g.arc(cx, cy - 10, 30, Math.PI, 0); g.fill();
      g.fillRect(cx - 30, cy - 12, 60, 16);
      g.fillStyle = rgba(accent, 0.85);
      g.beginPath(); g.moveTo(cx, cy - 42); g.quadraticCurveTo(cx + 22, cy - 34, cx + 8, cy - 22); g.quadraticCurveTo(cx + 2, cy - 32, cx, cy - 42); g.fill();
      g.fillStyle = '#0d1119'; g.fillRect(cx - 20, cy - 6, 40, 8);
      g.fillStyle = '#bfe9ff';
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(cx + sx * 10, cy - 2, 3.2, 0, Math.PI * 2); g.fill(); }
    } else if (kind === 'sage' || kind === 'elder') {
      g.beginPath(); g.arc(cx, cy - 8, 28, Math.PI, 0); g.fill();
      // barba
      g.fillStyle = hair;
      g.beginPath();
      g.moveTo(cx - 20, cy + 8);
      g.quadraticCurveTo(cx, cy + 46, cx + 20, cy + 8);
      g.quadraticCurveTo(cx, cy + 18, cx - 20, cy + 8);
      g.fill();
      // bigode
      g.beginPath(); g.ellipse(cx, cy + 10, 12, 4, 0, 0, Math.PI * 2); g.fill();
    } else if (kind === 'adventurer') {
      g.beginPath(); g.arc(cx, cy - 8, 28, Math.PI, 0); g.fill();
      g.beginPath(); g.moveTo(cx - 24, cy - 8); g.quadraticCurveTo(cx - 42, cy + 24, cx - 30, cy + 40);
      g.quadraticCurveTo(cx - 26, cy + 16, cx - 24, cy - 8); g.fill();
      g.fillStyle = rgba(accent, 0.85);
      g.beginPath(); g.arc(cx + 22, cy - 18, 4, 0, Math.PI * 2); g.fill();
    } else if (kind === 'fairy') {
      g.fillStyle = hair;
      g.beginPath(); g.arc(cx, cy - 10, 26, Math.PI, 0); g.fill();
      g.fillStyle = rgba(accent, 0.35);
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 36, cy + 4, 12, 20, sx * 0.5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = rgba(accent, 0.95);
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(cx + sx * 12, cy - 32, 3.5, 0, Math.PI * 2); g.fill(); }
    } else if (kind === 'spirit') {
      g.fillStyle = 'rgba(40,36,80,0.92)';
      g.beginPath(); g.arc(cx, cy - 6, 32, Math.PI * 1.05, Math.PI * 1.95); g.lineTo(cx + 26, cy + 30);
      g.quadraticCurveTo(cx, cy + 42, cx - 26, cy + 30); g.closePath(); g.fill();
      g.fillStyle = rgba(accent, 0.9);
      g.beginPath(); g.arc(cx, cy - 22, 7, 0, Math.PI * 2); g.fill();
    } else if (kind === 'firefly') {
      g.fillStyle = rgba(accent, 0.95);
      g.beginPath(); g.arc(cx, cy + 2, 20, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath(); g.arc(cx - 6, cy - 4, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(180,240,255,0.4)';
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 30, cy - 6, 12, 18, sx * 0.6, 0, Math.PI * 2); g.fill(); }
    } else {
      // kid / keeper
      g.beginPath(); g.arc(cx, cy - 8, 28, Math.PI, 0); g.fill();
    }

    // olhos
    const wide = mood === 'afraid' || mood === 'surprise';
    const eyeY = cy - 4;
    g.fillStyle = '#1d2433';
    for (const sx of [-1, 1]) {
      g.beginPath(); g.ellipse(cx + sx * 10, eyeY, 4.4, wide ? 5.4 : 4.2, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath(); g.arc(cx + sx * 10 - 1.5, eyeY - 1.6, 1.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1d2433';
    }
    // sobrancelhas
    g.strokeStyle = hair; g.lineWidth = 2.4; g.lineCap = 'round';
    for (const sx of [-1, 1]) {
      g.beginPath();
      const tilt = mood === 'sad' ? -4 : mood === 'happy' || mood === 'warm' ? 2 : wide ? 3 : 0;
      g.moveTo(cx + sx * 10 - 6, eyeY - 10 + (mood === 'sad' ? sx * 2 : 0));
      g.lineTo(cx + sx * 10 + 6, eyeY - 10 - tilt);
      g.stroke();
    }
    // boca
    g.strokeStyle = '#8a4a4a'; g.lineWidth = 2.6;
    g.beginPath();
    if (mood === 'happy' || mood === 'warm' || mood === 'proud') {
      g.arc(cx, cy + 12, 8, 0.2, Math.PI - 0.2);
    } else if (mood === 'sad') {
      g.arc(cx, cy + 20, 8, Math.PI + 0.3, Math.PI * 2 - 0.3);
    } else if (wide) {
      g.ellipse(cx, cy + 14, 4, 6, 0, 0, Math.PI * 2);
    } else {
      g.moveTo(cx - 6, cy + 14); g.lineTo(cx + 6, cy + 14);
    }
    g.stroke();
  }

  updatePauseStats(game) {
    const el = $('pause-stats');
    if (!el || !game) return;
    el.innerHTML = `❤️ ${Math.ceil(game.player.health)}/${game.player.maxHealth} · ⚡ ${Math.ceil(game.player.energy)}/${game.player.maxEnergy}
      · 🪙 ${game.inventory.count('moeda')} · 🔷 ${game.inventory.count('cristal')} · ✨ ${game.inventory.count('fragmento')}
      · ⭐ Nível ${game.level ? game.level() : 1}${game.flags?.title ? ` · 🏅 ${game.flags.title}` : ''}`;
    $('btn-load')?.classList.toggle('hidden', !this.save.has());
  }
}
