// Itens, baús, drops e mochila.

import { randInt } from '../core/state.js';

export const ITEMS = {
  moeda: { name: 'Moedas', icon: '🪙', kind: 'currency', desc: 'Servem para comprar cosméticos e enfeites.' },
  cristal: { name: 'Cristais', icon: '🔷', kind: 'currency', desc: 'Melhoram a lanterna mágica.' },
  fragmento: { name: 'Fragmentos mágicos', icon: '✨', kind: 'currency', desc: 'Desbloqueiam novos poderes da lanterna.' },
  experiencia: { name: 'Experiência', icon: '⭐', kind: 'xp', desc: 'A aventura deixa marcas boas: cada desafio superado te fortalece.' },
  moeda_magica: { name: 'Moedas mágicas', icon: '🪄', kind: 'currency', desc: 'Moedas que brilham no escuro. Um presente das fadas.' },
  cristal_raro: { name: 'Cristal raro', icon: '💎', kind: 'relic', desc: 'Um cristal que guarda a luz da noite.', effect: { lightRange: 8 } },
  cristal_magico: { name: 'Cristal mágico', icon: '🔮', kind: 'relic', desc: 'O cristal que devolveu a luz ao bosque. A lanterna brilha mais longe.', effect: { lightRange: 5, maxEnergy: 15 } },
  acessorio_luminoso: { name: 'Acessório luminoso', icon: '🎗', kind: 'relic', desc: 'Um adorno de fios de luz que ilumina ao redor do aventureiro.', effect: { lightRange: 4 } },
  escudo_corajoso: { name: 'Escudo Corajoso', icon: '🛡', kind: 'relic', desc: 'Dura mais tempo: um escudo não bloqueia o medo, mas dá tempo para respirar.', effect: { shieldDuration: 2.5 } },
  amuleto_luz: { name: 'Amuleto da Luz', icon: '📿', kind: 'relic', desc: 'Deixa uma aureola de coragem em volta do aventureiro.', effect: { lightRange: 3 }, aura: true },
  armadura_noite: { name: 'Armadura da Noite', icon: '🜲', kind: 'armor', desc: 'Reduz em 25% o dano recebido. Feita de sombra que aprendeu a proteger.', armor: 0.25 },
  titulo_coracao: { name: 'Título: Coração Corajoso', icon: '🏅', kind: 'title', title: 'Coração Corajoso', desc: 'Você não deixou o medo decidir seu destino.' },
  lanterna_antiga: { name: 'Lanterna Antiga', icon: '🏮', kind: 'key', desc: 'Uma lanterna esquecida no bosque sem luz. Ainda tem uma faísca dentro.' },
  simbolo_antigo: { name: 'Símbolo Antigo', icon: '🜁', kind: 'key', desc: 'Uma marca de coragem gravada por quem passou pelo escuro antes de você.' },
  fragmento_luz: { name: 'Fragmento luminoso', icon: '🌟', kind: 'key', desc: 'Uma luzinha perdida que voltou para casa.' },
  reliquia_vigor: { name: 'Relíquia do Vigor', icon: '❤️', kind: 'relic', desc: 'Aumenta a vida máxima.', effect: { maxHealth: 25 } },
  reliquia_foco: { name: 'Relíquia do Foco', icon: '💠', kind: 'relic', desc: 'Aumenta a energia mágica.', effect: { maxEnergy: 25 } },
  reliquia_leveza: { name: 'Relíquia da Leveza', icon: '🌀', kind: 'relic', desc: 'Recarrega o dash mais rápido.', effect: { dashCooldown: -0.3 } },
  reliquia_brilho: { name: 'Relíquia do Brilho', icon: '🌟', kind: 'relic', desc: 'Aumenta o alcance da luz.', effect: { lightRange: 6 } },
  chave_ruina: { name: 'Chave da Ruína', icon: '🗝', kind: 'key', desc: 'Abre portas antigas da torre.' },
  mapa_bosque: { name: 'Mapa do bosque', icon: '🗺', kind: 'map', desc: 'Revela pontos de interesse no minimapa.' },
  manobra_espiral: { name: 'Manobra: Espiral', icon: '🌪', kind: 'trick', trick: 'espiral', desc: 'Desenha uma espiral de luz com a lanterna.' },
  manobra_flutuar: { name: 'Manobra: Flutuar', icon: '🎈', kind: 'trick', trick: 'flutuar', desc: 'Faz a lanterna flutuar por alguns segundos.' },
  manobra_malabarismo: { name: 'Manobra: Malabarismo', icon: '🤹', kind: 'trick', trick: 'malabarismo', desc: 'Gira a lanterna sobre os dedos.' },
  cor_primaveril: { name: 'Cor: Primaveril', icon: '🟢', kind: 'skin', skin: 'primaveril', desc: 'Núcleo de luz verde-primavera.' },
  cor_oceano: { name: 'Cor: Oceano', icon: '🔵', kind: 'skin', skin: 'oceano', desc: 'Núcleo de luz azul-oceano.' },
  cor_aurora: { name: 'Cor: Aurora', icon: '🟣', kind: 'skin', skin: 'aurora', desc: 'Núcleo de luz multicolorida.' },
  lanterna_cogumelo: { name: 'Lanterna de Cogumelo', icon: '🍄', kind: 'skin', skin: 'cogumelo', desc: 'Uma aparência divertida de cogumelo.' },
};

export const CHEST_TIERS = {
  comum: {
    label: 'Baú comum', color: '#c9a06a',
    loot: [['moeda', 12, 26], ['cristal', 1, 3]],
    chance: [['fragmento', 0.25, 1, 1], ['manobra_malabarismo', 0.08, 1, 1]],
  },
  raro: {
    label: 'Baú raro', color: '#7ec8ff',
    loot: [['moeda', 30, 55], ['cristal', 4, 8]],
    chance: [['fragmento', 0.6, 1, 2], ['reliquia_leveza', 0.18, 1, 1], ['manobra_espiral', 0.3, 1, 1]],
  },
  secreto: {
    label: 'Baú secreto', color: '#d59bff',
    loot: [['moeda', 70, 110], ['cristal', 10, 16], ['fragmento', 2, 3]],
    chance: [
      ['reliquia_vigor', 0.6, 1, 1], ['reliquia_foco', 0.6, 1, 1], ['reliquia_brilho', 0.55, 1, 1],
      ['manobra_flutuar', 0.7, 1, 1], ['cor_aurora', 0.45, 1, 1],
    ],
  },
};

/** Sorteia o conteúdo de um baú. */
export function rollChest(tier, depth = 0) {
  const def = CHEST_TIERS[tier] || CHEST_TIERS.comum;
  const out = [];
  for (const [id, min, max] of def.loot) {
    const amount = randInt(min, max) + depth * 4;
    if (amount > 0) out.push({ id, amount });
  }
  for (const [id, chance, min, max] of def.chance) {
    if (Math.random() < chance) out.push({ id, amount: randInt(min, max) });
  }
  return out;
}

export class Inventory {
  constructor() {
    this.items = new Map();
  }

  add(id, amount = 1) {
    if (!ITEMS[id] || amount <= 0) return 0;
    const next = (this.items.get(id) || 0) + amount;
    this.items.set(id, next);
    return next;
  }

  remove(id, amount = 1) {
    const cur = this.items.get(id) || 0;
    if (cur < amount) return false;
    if (cur === amount) this.items.delete(id);
    else this.items.set(id, cur - amount);
    return true;
  }

  count(id) { return this.items.get(id) || 0; }
  has(id, amount = 1) { return this.count(id) >= amount; }

  list() {
    return [...this.items.entries()].map(([id, amount]) => ({ id, amount, def: ITEMS[id] }));
  }

  serialize() { return [...this.items.entries()]; }

  load(entries) {
    this.items = new Map(entries || []);
  }
}
