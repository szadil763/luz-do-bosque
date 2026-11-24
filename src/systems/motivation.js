// Mensagens motivacionais que aparecem em momentos especiais da exploração:
// ao entrar em lugares misteriosos, ao concluir objetivos e, de vez em quando,
// enquanto o jogador explora longe do acampamento.

import { rand } from '../core/state.js';

export const MOTIVATION_LINES = [
  'A coragem começa quando você decide dar o primeiro passo.',
  'Mesmo na noite mais escura, existe uma estrela brilhando.',
  'Não tenha medo de descobrir o desconhecido.',
  'Sua luz interior é mais forte do que qualquer sombra.',
  'Cada desafio superado torna você mais forte.',
  'O medo pode acompanhar você, mas não precisa controlar seus passos.',
];

export class Motivation {
  constructor({ events, audio, settings }) {
    this.events = events;
    this.audio = audio;
    this.settings = settings;
    this.timer = rand(80, 120);
    this.last = '';
  }

  /** Mostra uma frase (usada por zonas, missões e descobertas). */
  say(text) {
    if (!text || text === this.last) return;
    this.last = text;
    this.events?.emit('ui:motto', { text });
    this.audio?.sfx('quest');
  }

  random() {
    const options = MOTIVATION_LINES.filter((line) => line !== this.last);
    return options[Math.floor(Math.random() * options.length)] || MOTIVATION_LINES[0];
  }

  update(dt, ctx = {}) {
    if (ctx.paused) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = rand(85, 135);
    if (ctx.exploring !== false) this.say(this.random());
  }
}
