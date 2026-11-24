// NPCs com personalidade, diálogos com escolhas e retratos, missões com
// objetivos verificáveis (progresso salvo) e reações às manobras da lanterna.
//
// Cada nó de diálogo pode ser:
//   - string                                   → uma fala
//   - string[]                                 → várias falas em sequência
//   - { mood, text } | { mood, text: string[] } → fala com expressão facial
//   - função (ctx) => string | string[]        → fala dinâmica (progresso/escolhas)
//
// As escolhas aceitam: next (nó), reply (fala curta), action (nome no ctx.actions
// ou função), quest (aceitar missão), trait (marca a personalidade do jogador).

import * as THREE from 'three';
import { clamp, rand } from '../core/state.js';

// ------------------------------------------------------------------ missões
export const QUEST_ORDER = [
  'floresta_sem_luz', 'coragem_do_heroi', 'luzes_perdidas', 'segredo_da_noite',
];

export class QuestManager {
  constructor(events) {
    this.events = events;
    this.defs = {
      luz_do_bosque: {
        title: 'A origem da escuridão',
        desc: 'Lumi sente que o bosque esqueceu como brilhar. Ajude o vagalume-guia a acender o Altar da Clareira Antiga.',
        steps: [
          { id: 'falar', text: 'Converse com Lumi, o vagalume-guia', on: 'talk', match: (p) => p.id === 'lumi' },
          { id: 'fragmentos', text: 'Encontre 3 fragmentos mágicos', goal: 3, on: 'fragmento' },
          { id: 'altar', text: 'Acenda o Altar da Clareira Antiga', on: 'altar' },
        ],
      },
      teo_perdido: {
        title: 'O explorador perdido',
        desc: 'Téo se perdeu nas ruínas da torre. Leve-o de volta ao acampamento.',
        steps: [
          { id: 'encontrar', text: 'Converse com Téo nas ruínas', on: 'talk', match: (p) => p.id === 'teo' },
          { id: 'levar', text: 'Leve Téo de volta ao acampamento', on: 'escort' },
        ],
      },
      flores_da_clareira: {
        title: 'Flores da clareira',
        desc: 'As flores luminosas da clareira esqueceram de desabrochar.',
        steps: [{ id: 'flores', text: 'Faça 5 flores luminosas desabrocharem', goal: 5, on: 'flower' }],
      },

      // -------------------------------------------------- missões de coragem
      floresta_sem_luz: {
        title: 'A Floresta Sem Luz',
        desc: 'O vilarejo de Clareira Alta perdeu a luz que morava nas árvores. As crianças têm medo do escuro e o Velho Guardião precisa de ajuda para descobrir o que apagou a floresta.',
        giver: 'guardiao',
        steps: [
          { id: 'moradores', text: 'Converse com 3 moradores sobre a floresta sem luz', goal: 3, on: 'talk', match: (p) => ['mila', 'lyra', 'lumi'].includes(p.id) },
          { id: 'lanterna', text: 'Encontre a Lanterna Antiga no Bosque Sem Luz', on: 'lanterna' },
          { id: 'noite', text: 'Explore o Bosque Sem Luz', on: 'zone', match: (p) => p.id === 'dark_grove' },
          { id: 'origem', text: 'Descubra a origem da escuridão na pedra antiga', on: 'origem' },
          { id: 'cristal', text: 'Encontre o Cristal Luminoso', on: 'cristal_luz' },
        ],
        rewards: [['cristal_magico', 1], ['acessorio_luminoso', 1]],
        xp: 120,
        rewardText: 'Cristal mágico · Acessório luminoso · 120 de experiência',
        motivation: 'A coragem começa quando você decide dar o primeiro passo.',
      },
      coragem_do_heroi: {
        title: 'A Coragem do Herói',
        desc: 'O Cavaleiro Aldric acredita que você precisa aprender a enfrentar seus medos. Prove seu valor na Caverna Sem Fim.',
        giver: 'cavaleiro',
        requires: 'floresta_sem_luz',
        steps: [
          { id: 'caverna', text: 'Entre na Caverna Sem Fim', on: 'zone', match: (p) => p.id === 'dark_cave' },
          { id: 'simbolos', text: 'Encontre os 3 Símbolos Antigos', goal: 3, on: 'symbol' },
          { id: 'enigma', text: 'Resolva o enigma da Pedra Sussurrante', on: 'riddle', match: (p) => p.id === 'cave_riddle' },
          { id: 'retorno', text: 'Retorne e converse com o Cavaleiro Aldric', on: 'talk', match: (p) => p.id === 'cavaleiro' },
        ],
        rewards: [['escudo_corajoso', 1], ['titulo_coracao', 1]],
        xp: 150,
        rewardText: 'Escudo especial · Título "Coração Corajoso" · 150 de experiência',
        motivation: 'O medo pode acompanhar você, mas não precisa controlar seus passos.',
      },
      luzes_perdidas: {
        title: 'As Luzes Perdidas',
        desc: 'Cinco luzinhas mágicas fugiram das ruínas antigas. Ajude a Pequena Fada a trazê-las de volta e restaurar o Altar de Luz.',
        giver: 'fada',
        requires: 'coragem_do_heroi',
        steps: [
          { id: 'fragmentos', text: 'Encontre os 5 fragmentos luminosos', goal: 5, on: 'luz_perdida' },
          { id: 'ruinas', text: 'Explore as Ruínas Antigas da torre', on: 'zone', match: (p) => p.id === 'ruins' },
          { id: 'criatura', text: 'Ajude a criatura mágica presa nas ruínas', on: 'criatura' },
          { id: 'altar', text: 'Restaure o Altar de Luz', on: 'altar_luz' },
        ],
        rewards: [['amuleto_luz', 1], ['moeda_magica', 30]],
        xp: 180,
        rewardText: 'Amuleto da Luz · 30 moedas mágicas · 180 de experiência',
        motivation: 'Sua luz interior é mais forte do que qualquer sombra.',
      },
      segredo_da_noite: {
        title: 'O Segredo da Noite',
        desc: 'Uma entidade antiga protege um segredo escondido nas montanhas ao norte. Encontre o Templo Noturno e descubra o que a noite guarda.',
        giver: 'sabio',
        requires: 'luzes_perdidas',
        steps: [
          { id: 'templo', text: 'Encontre o Templo Noturno', on: 'zone', match: (p) => p.id === 'night_temple' },
          { id: 'guardiao', text: 'Converse com o Guardião da Noite', on: 'talk', match: (p) => p.id === 'noite' },
          { id: 'enigmas', text: 'Resolva os 2 enigmas do templo', goal: 2, on: 'night_riddle' },
          { id: 'segredo', text: 'Descubra o segredo da entidade', on: 'secret', match: (p) => p.id === 'night' },
        ],
        rewards: [['armadura_noite', 1], ['cristal_raro', 1]],
        xp: 220,
        rewardText: 'Armadura especial · Cristal raro · Acesso ao Bosque da Noite Estrelada · 220 de experiência',
        motivation: 'Mesmo na noite mais escura, existe uma estrela brilhando.',
      },
    };
    this.active = new Map(); // id -> { step, progress }
    this.completed = new Set();
  }

  isActive(id) { return this.active.has(id) && !this.completed.has(id); }

  has(id) { return this.active.has(id) || this.completed.has(id); }

  canStart(id) {
    const def = this.defs[id];
    if (!def || this.has(id)) return false;
    return !def.requires || this.completed.has(def.requires);
  }

  start(id) {
    const def = this.defs[id];
    if (!def) return false;
    if (this.has(id)) return false;
    if (def.requires && !this.completed.has(def.requires)) {
      this.events?.emit('ui:toast', { text: `Primeiro conclua: ${this.defs[def.requires]?.title}`, icon: '🔒' });
      return false;
    }
    this.active.set(id, { step: 0, progress: 0 });
    this.events?.emit('quest:started', { id, title: def.title });
    this.events?.emit('ui:toast', { text: `Nova missão: ${def.title}`, icon: '📜' });
    return true;
  }

  currentStep(id) {
    const state = this.active.get(id);
    const def = this.defs[id];
    if (!state || !def) return null;
    return def.steps[state.step] || null;
  }

  /** Avança para o próximo passo e devolve o texto atualizado. */
  advance(id) {
    const state = this.active.get(id);
    const def = this.defs[id];
    if (!state || !def) return null;
    state.step += 1;
    state.progress = 0;
    if (state.step >= def.steps.length) {
      this.completed.add(id);
      this.events?.emit('quest:completed', { id, title: def.title, rewards: def.rewards, xp: def.xp });
      this.events?.emit('ui:toast', { text: `Missão concluída: ${def.title}!`, icon: '🏅' });
      return null;
    }
    const step = def.steps[state.step];
    this.events?.emit('quest:advanced', { id, step });
    this.events?.emit('ui:toast', { text: step.text, icon: '➡️' });
    return step;
  }

  setProgress(id, value) {
    const state = this.active.get(id);
    const step = this.currentStep(id);
    if (!state || !step?.goal) return;
    state.progress = Math.max(state.progress, value);
  }

  /** Eventos do mundo alimentam os objetivos das missões ativas. */
  event(type, payload = {}) {
    // a primeira flor desabrochada revela a missão secundária da clareira
    if (type === 'flower' && !this.has('flores_da_clareira')) this.start('flores_da_clareira');
    for (const [id, state] of [...this.active]) {
      if (this.completed.has(id)) continue;
      const def = this.defs[id];
      const step = def?.steps?.[state.step];
      if (!step || step.on !== type) continue;
      if (step.match && !step.match(payload)) continue;
      const goal = step.goal || 1;
      state.progress = Math.min(goal, state.progress + (payload.amount || 1));
      if (state.progress >= goal) {
        this.advance(id);
      } else {
        this.events?.emit('ui:toast', { text: `${step.text} (${state.progress}/${goal})`, icon: '➡️' });
      }
    }
  }

  /** Texto mostrado no HUD. */
  trackerText() {
    for (const [id, state] of this.active) {
      if (this.completed.has(id)) continue;
      const step = this.defs[id]?.steps[state.step];
      if (!step) continue;
      const goal = step.goal ? ` (${Math.min(state.progress, step.goal)}/${step.goal})` : '';
      return { title: this.defs[id].title, text: step.text + goal };
    }
    return null;
  }

  serialize() {
    return { active: [...this.active.entries()], completed: [...this.completed] };
  }

  load(data = {}) {
    this.active = new Map(data.active || []);
    this.completed = new Set(data.completed || []);
  }
}

// ------------------------------------------------------------------ retratos
// Paletas usadas tanto pelo modelo 3D quanto pelo retrato 2D do diálogo.
const SKIN = '#f2c79b';
const SKIN_DARK = '#d9a877';

// ------------------------------------------------------------------ NPCs
export const NPC_DEFS = {
  lumi: {
    name: 'Lumi, o vagalume-guia', color: '#ffe98a', kind: 'firefly', quest: 'luz_do_bosque', autoStart: true,
    portrait: { kind: 'firefly', skin: '#ffef9f', hair: '#ffe066', cloth: '#6d5a9a', accent: '#fff6c2' },
    lines: {
      intro: [
        'Oi! Eu sou Lumi. Eu ilumino o caminho, mas ultimamente ando sem pilha… quer dizer, sem magia!',
        'A escuridão que caiu no bosque não é má. Ela só guardou coisas antigas e criaturas que esqueceram como brincar.',
        'Sua lanterna consegue ver o que ela esconde. Se juntar 3 fragmentos mágicos, você acende o Altar da Clareira Antiga e abre a passagem para outros lugares.',
      ],
      repeat: [
        'Cada fragmento aparece quando você ajuda alguém ou abre um baú bem escondido. Nada de pressa, tá?',
        'Toque uma manobra com R de vez em quando — as criaturas adoram!',
      ],
      story: [
        'Antes o bosque tinha lampiões vivos em cada árvore. Um dia a escuridão chegou devagarinho e todos dormiram.',
        'Ela não é má: guarda lembranças. A sua lanterna é a única que consegue conversar com essas lembranças.',
      ],
      help: [
        'M1 atira luz, segure M1 para um disparo carregado, M3 solta o pulso luminoso e segure M2 para o escudo.',
        'Aperte M4 para trocar de poder e R para fazer manobras divertidas. Ah, e Q é o dash: serve para desviar e atravessar vãos!',
      ],
      fragments: ['Você sente quando o fragmento está perto: ele faísca em volta da lanterna. Continue!'],
      altar: ['Agora é só acender o altar na clareira antiga, no meio das ruínas. A luz verde faz o resto.'],
      done: ['A passagem despertou! Outros biomas esperam por você — mas primeiro, aproveite o bosque.'],
    },
    choices: [
      { label: 'O que aconteceu com o bosque?', next: 'story' },
      { label: 'Como uso a lanterna?', next: 'help' },
      { label: 'Vou explorar!', next: null },
    ],
  },
  teo: {
    name: 'Téo, o explorador', color: '#ffb27a', kind: 'kid', quest: 'teo_perdido', autoStart: true,
    portrait: { kind: 'kid', skin: '#ffd8a8', hair: '#8a5a36', cloth: '#6fb7e8', accent: '#ffb27a' },
    lines: {
      intro: [
        'Ah! Uma luz! Eu vim explorar a torre e… bem, a escada quebrou e meu mapa virou morcego.',
        'Você me leva até o acampamento? Lá tem fogueira e a Mila faz um chá de folha brilhante.',
      ],
      following: ['Só um pouquinho mais devagar, tá?', 'Essas ruínas guardam um cristal que reflete luz. Sério!'],
      story: [
        'Eu vim atrás do mapa do meu avô. Ele dizia que a torre guarda um Guardião que só quer voltar a dormir em paz.',
        'O cristal do peito dele brilha quando ele baixa os braços. Foi o que meu avô escreveu, pelo menos!',
      ],
      safe: ['Chegamos! Muito obrigado! Toma, achei isso na torre.', 'Se um dia encontrar a Mila por aí, diga que estou bem.'],
      repeat: ['Eu já ando pelas sombras sem tremer tanto. Ainda tremo um pouco, mas ando!'],
    },
    choices: [
      { label: 'Vem comigo!', action: 'follow', next: null },
      { label: 'Como você chegou aqui?', next: 'story' },
      { label: 'Depois eu volto.', next: null },
    ],
  },
  mila: {
    name: 'Mila, guardiã do acampamento', color: '#9ee7ff', kind: 'keeper',
    portrait: { kind: 'keeper', skin: '#f0c39a', hair: '#5b3f2a', cloth: '#4a6fa8', accent: '#9ee7ff' },
    lines: {
      intro: [
        'Bem-vindo ao acampamento. Aqui a escuridão é só um cobertor grande.',
        'Moedas compram enfeites; cristais melhoram a lanterna. E se quiser, eu guardo seu progresso.',
      ],
      shop: ['Olhe as melhorias no menu: a lanterna fica cada vez mais brilhante!'],
      repeat: ['Descanse na fogueira sempre que precisar. Coragem também pede pausa.'],
    },
    choices: [
      { label: 'Ver melhorias da lanterna', action: 'upgrades' },
      { label: 'Salvar meu progresso', action: 'save' },
      { label: 'Obrigado!', next: null },
    ],
  },

  // -------------------------------------------------- novos habitantes
  guardiao: {
    name: 'Velho Guardião', color: '#ffd479', kind: 'elder', quest: 'floresta_sem_luz',
    portrait: { kind: 'elder', skin: SKIN, hair: '#eae4d6', cloth: '#4b5f8a', accent: '#ffd479' },
    lines: {
      intro: {
        mood: 'warm',
        text: [
          'Ah… uma lanterna acesa por aqui. Faz tanto tempo que eu não vejo uma dessas.',
          'Eu cuido do vilarejo de Clareira Alta. A floresta perdeu a luz que morava nas árvores, e as crianças agora têm medo do escuro.',
          'Eu já fui mais corajoso. Hoje eu só sei contar histórias e acender a fogueira.',
        ],
      },
      offer: 'Você tem medo da escuridão? Então lembre-se: até a menor chama consegue iluminar uma noite inteira.',
      locked: 'Primeiro termine o que já começou. A pressa apaga mais lanternas do que a noite.',
      active_moradores: {
        mood: 'hopeful',
        text: [
          'Converse com Mila, com Lyra do lago e com Lumi. Cada um guarda uma pista sobre o que apagou a floresta.',
        ],
      },
      active_lanterna: 'A Lanterna Antiga dorme no Bosque Sem Luz, a oeste do vilarejo. Siga o cheiro de resina queimada.',
      active_noite: 'Entre no Bosque Sem Luz. Deixe a escuridão te ver primeiro — ela não morde, só observa.',
      active_origem: 'A pedra rachada no coração do bosque conta o que aconteceu. Chegue perto e ilumine as runas.',
      active_cristal: 'O Cristal Luminoso pulsa perto da pedra. Quando você chegar, ele vai piscar mais forte.',
      after: {
        mood: 'happy',
        text: [
          'Você devolveu a luz ao bosque, criança. Eu sabia que a menor chama podia iluminar a noite inteira.',
          'Agora as crianças dormem olhando para as estrelas em vez de contar monstros.',
        ],
      },
      repeat: [
        'A coragem não é não sentir medo. É continuar mesmo sentindo.',
        'Quando eu era jovem, eu tinha medo do escuro até perceber que era eu quem apagava a lanterna.',
      ],
      story: [
        'Dizem que a escuridão veio de uma criança que desistiu de olhar. Ela chamou o vazio, e o vazio veio brincar.',
        'Mas memórias boas pesam mais que o medo. É por isso que o bosque ainda respira.',
      ],
    },
    choices: (ctx) => {
      const out = [];
      if (ctx.quests?.canStart('floresta_sem_luz')) out.push({ label: 'Vou devolver a luz à floresta', action: 'acceptQuest', quest: 'floresta_sem_luz', next: 'offer', trait: 'brave' });
      out.push({ label: 'Por que a floresta apagou?', next: 'story' });
      out.push({ label: 'O que eu faço agora?', next: null, reply: ctx.quests?.isActive('floresta_sem_luz') ? 'Siga as pistas do diário de missões. Eu acredito em você.' : 'Explore o bosque. Ele gosta de curiosos.' });
      out.push({ label: 'Até logo', next: null });
      return out;
    },
  },

  lyra: {
    name: 'Lyra, a jovem aventureira', color: '#7cf0a8', kind: 'adventurer',
    portrait: { kind: 'adventurer', skin: SKIN, hair: '#b8452f', cloth: '#2f7a5f', accent: '#7cf0a8' },
    lines: {
      intro: {
        mood: 'happy',
        text: [
          'Oi! Eu sou Lyra. Eu também tinha medo de caminhar sozinha pela floresta à noite.',
          'Mas descobri que a coragem não é não sentir medo. É continuar mesmo sentindo.',
        ],
      },
      story: [
        'Meu primeiro passo noturno foi até o lago. Eu contei até três, subi na pedra e fiquei olhando os vaga-lumes até o medo cansar.',
        'Agora eu corro até lá só para ver o reflexo da lua. O escuro não ficou menos escuro — eu fiquei mais curiosa.',
      ],
      repeat: [
        'Se o coração acelerar, respira fundo e olha em volta: o escuro também guarda coisas bonitas.',
        'Já reparou que as estrelas só aparecem quando o céu fica escuro?',
      ],
      help: 'Se um monstro aparecer, não corra de costas. Aponte a lanterna e respire. Eles sentem quando a gente acredita na própria luz.',
      after: 'O bosque voltou a brilhar! Agora eu quero explorar as ruínas com você. Só espera eu pegar meu mapa…',
    },
    choices: [
      { label: 'Como você venceu o medo?', next: 'story' },
      { label: 'Algum conselho para mim?', next: 'help' },
      { label: 'Vamos explorar juntos algum dia!', next: null, reply: 'Combinado! Eu levo os mapas e você leva a coragem.', trait: 'brave' },
      { label: 'Até logo', next: null },
    ],
  },

  cavaleiro: {
    name: 'Cavaleiro Aldric', color: '#8fb6ff', kind: 'knight', quest: 'coragem_do_heroi',
    portrait: { kind: 'knight', skin: SKIN_DARK, hair: '#3a2c22', cloth: '#8792a8', accent: '#8fb6ff' },
    lines: {
      intro: {
        mood: 'proud',
        text: [
          'Eu sou Aldric, cavaleiro de uma ordem que já não existe. Vi você enfrentar a escuridão — e vi você hesitar.',
          'Um verdadeiro herói não é aquele que nunca sente medo. É aquele que não permite que o medo decida seu destino.',
          'Existe uma Caverna Sem Fim a leste, que engoliu minha tocha. Lá dentro dormem três símbolos antigos e um enigma. Quer provar seu valor?',
        ],
      },
      offer: 'A caverna não pede força. Ela pede que você entre mesmo com as mãos tremendo.',
      locked: 'Antes de encarar a caverna, ajude o Velho Guardião a devolver a luz ao bosque. Todo herói começa pequeno.',
      active_caverna: 'A Caverna Sem Fim fica a leste, entre as pedras altas. Entre sem correr e sem fechar os olhos.',
      active_simbolos: 'Três símbolos dormem nas paredes. Ilumine cada um de perto com a lanterna.',
      active_enigma: 'A Pedra Sussurrante, no centro da caverna, faz a pergunta final. Responda com a memória, não com a espada.',
      active_retorno: 'Volte para mim. Quero ver o que o escuro te ensinou.',
      after: {
        mood: 'proud',
        text: [
          'Coração Corajoso. Esse título não é meu — é seu.',
          'O escudo que eu te dou não bloqueia tudo. Ele só lembra que você escolheu ficar.',
        ],
      },
      repeat: [
        'Coragem não ruge. Coragem respira fundo e dá o próximo passo.',
        'Já vi heróis maiores que eu correrem de um besouro. Ninguém precisa saber disso.',
      ],
      story: 'Coragem é uma lanterna que se acende por dentro. Ela treme, mas não se apaga. E às vezes é só isso: tremendo e brilhando ao mesmo tempo.',
    },
    choices: (ctx) => {
      const out = [];
      if (ctx.quests?.canStart('coragem_do_heroi')) out.push({ label: 'Aceito o desafio da caverna', action: 'acceptQuest', quest: 'coragem_do_heroi', next: 'offer', trait: 'brave' });
      out.push({ label: 'O que é coragem para você?', next: 'story' });
      out.push({ label: 'Algum conselho sobre o escuro?', next: null, reply: 'O escuro não tem pressa. Você também não precisa ter.' });
      out.push({ label: 'Até logo', next: null });
      return out;
    },
  },

  fada: {
    name: 'Faísca, a pequena fada', color: '#d59bff', kind: 'fairy', quest: 'luzes_perdidas',
    portrait: { kind: 'fairy', skin: '#ffe6f5', hair: '#ffd0f4', cloth: '#a78bfa', accent: '#f0abfc' },
    lines: {
      intro: {
        mood: 'surprised',
        text: [
          'Não deixe o medo apagar sua luz! Você é muito mais forte do que imagina!',
          'Cinco luzinhas fugiram das ruínas antigas. São medrosas, mas voltam se você chegar perto com carinho.',
          'Tem também uma criatura mágica presa numa gaiola de raízes. E o Altar de Luz está apagado… Ai, é muita coisa!',
        ],
      },
      offer: 'Ajuda a gente? Prometo que as luzinhas fazem cócegas no nariz, não medo.',
      locked: 'Primeiro ajude o guardião e o cavaleiro. O Altar de Luz só acende quando o coração está pronto.',
      active_fragmentos: 'Procure cinco brilhos perto das ruínas da torre. Eles piscam quando você passa.',
      active_ruinas: 'Entre nas Ruínas Antigas da torre, ao sul-oeste. As pedras guardam ecos que fazem barulho de vento.',
      active_criatura: 'A criatura está numa gaiola de raízes perto das ruínas. Solte com luz, não com força!',
      active_altar: 'O Altar de Luz fica entre as flores e a clareira. Acenda-o quando as cinco luzinhas voltarem.',
      after: {
        mood: 'happy',
        text: [
          'Você fez a noite sorrir de novo! Olha como as luzinhas estão dançando!',
          'O Amuleto da Luz é seu. Ele vai deixar uma aureolinha de coragem em volta de você.',
        ],
      },
      repeat: ['As luzinhas contam histórias sobre você quando dormem. Coisas boas!', 'Fada pequena também tem medo. Eu só finjo menos.'],
      story: 'A gente mora dentro das flores quando elas fecham. É escuro ali, mas é quentinho. Escuro quentinho é diferente de escuro frio.',
    },
    choices: (ctx) => {
      const out = [];
      if (ctx.quests?.canStart('luzes_perdidas')) out.push({ label: 'Vou trazer as luzinhas de volta', action: 'acceptQuest', quest: 'luzes_perdidas', next: 'offer', trait: 'kind' });
      out.push({ label: 'Onde moram as fadas?', next: 'story' });
      out.push({ label: 'Posso fazer uma manobra de luz?', next: null, reply: 'Pode! Eu fecho os olhos e faço "uuuuh" de admiração!', trait: 'playful' });
      out.push({ label: 'Até logo', next: null });
      return out;
    },
  },

  sabio: {
    name: 'Sábio da Montanha', color: '#bff6ff', kind: 'sage', quest: 'segredo_da_noite',
    portrait: { kind: 'sage', skin: SKIN, hair: '#f2ecdc', cloth: '#5b4a8a', accent: '#bff6ff' },
    lines: {
      intro: {
        mood: 'calm',
        text: [
          'A escuridão não significa que algo ruim está esperando por você. Às vezes, ela apenas esconde maravilhas que ainda não descobrimos.',
          'Eu sou o Sábio desta montanha. No alto ao norte dorme o Templo Noturno, onde uma entidade antiga guarda um segredo.',
          'Se você já ajudou o cavaleiro e a fada, seu coração está pronto. Se não, volte quando estiver.',
        ],
      },
      offer: 'O templo abre para quem chega com perguntas, não com espadas. Leve sua curiosidade.',
      locked: 'Volte quando as luzes perdidas voltarem ao altar. O templo não abre para pressa.',
      active_templo: 'Siga para o norte, até as colunas que apontam para a lua.',
      active_guardiao: 'Fale com o Guardião da Noite. Ele não é um monstro: é uma memória usando armadura.',
      active_enigmas: 'Duas pedras do templo guardam enigmas. Responda os dois — errar faz parte, insistir também.',
      active_segredo: 'Depois dos enigmas, o pedestal central revela o segredo da entidade.',
      after: {
        mood: 'calm',
        text: [
          'O segredo da noite é simples: ela não é o contrário da luz. É o lugar onde a luz descansa.',
          'A passagem para o Bosque da Noite Estrelada está aberta. Vá quando quiser — as estrelas não têm hora.',
        ],
      },
      repeat: [
        'Não tenha medo de descobrir o desconhecido. Ele costuma ser mais curioso do que assustador.',
        'Cada desafio superado torna você mais forte. Até os que você acha que não venceu.',
      ],
      story: 'Quando eu era jovem, eu gritava com o escuro. Ele nunca respondeu. Um dia eu sussurrei, e ele me mostrou um céu inteiro de estrelas.',
    },
    choices: (ctx) => {
      const out = [];
      if (ctx.quests?.canStart('segredo_da_noite')) out.push({ label: 'Quero descobrir o segredo da noite', action: 'acceptQuest', quest: 'segredo_da_noite', next: 'offer', trait: 'curious' });
      out.push({ label: 'O que há nas montanhas?', next: 'story' });
      out.push({ label: 'E se eu errar os enigmas?', next: null, reply: 'Então você aprende. O escuro não guarda erros, só memórias.' });
      out.push({ label: 'Até logo', next: null });
      return out;
    },
  },

  noite: {
    name: 'Guardião da Noite', color: '#b9a7ff', kind: 'spirit',
    portrait: { kind: 'spirit', skin: '#d9d2ff', hair: '#9b8bff', cloth: '#2f2a5a', accent: '#b9a7ff' },
    lines: {
      intro: {
        mood: 'calm',
        text: [
          'Eu sou o Guardião da Noite. Não vim para assustar: vim para lembrar.',
          'As crianças desenham monstros no escuro porque não conseguem ver. Eu sou feito do que elas imaginam.',
          'Você chegou até aqui com uma lanterna e um coração que treme. Isso é mais raro do que parece.',
        ],
      },
      active_enigmas: 'Duas pedras do templo esperam suas respostas. Errar não é vergonha: é aprender.',
      active_segredo: 'As pedras se calaram. Toque o pedestal central e receba o que a noite guarda.',
      after: {
        mood: 'warm',
        text: [
          'O segredo que eu guardo é este: o escuro é um abraço grande, não uma boca.',
          'Quem acende a própria luz nunca está sozinho. Vá em paz — e volta quando quiser conversar com a noite.',
        ],
      },
      repeat: [
        'Eu não apago luzes. Eu só descanso os olhos de quem precisa.',
        'A noite não é vazia. É cheia de coisas que só aparecem quando ninguém está olhando.',
      ],
      story: 'Quando o sol se põe, eu cubro o mundo com um cobertor azul para que ele possa sonhar. Alguns chamam isso de escuridão.',
    },
    choices: [
      { label: 'Por que você vive no templo?', next: 'story' },
      { label: 'O escuro é perigoso?', next: null, reply: 'Só quando você esquece que pode acender uma luz. E você nunca esquece.' },
      { label: 'Até logo', next: null },
    ],
  },
};

// ------------------------------------------------------------------ modelo 3D
const MOODS = {
  neutral: { brow: 0.0, browY: 0, mouth: 0.0, mouthW: 1.0, eye: 1.0 },
  happy: { brow: 0.16, browY: 0.012, mouth: 0.55, mouthW: 1.1, eye: 0.9 },
  warm: { brow: 0.08, browY: 0.006, mouth: 0.35, mouthW: 1.0, eye: 0.95 },
  calm: { brow: 0.02, browY: 0.004, mouth: 0.12, mouthW: 0.9, eye: 0.95 },
  sad: { brow: -0.28, browY: 0.014, mouth: -0.35, mouthW: 0.9, eye: 0.85 },
  afraid: { brow: 0.34, browY: 0.02, mouth: 0.1, mouthW: 0.62, eye: 1.25 },
  surprise: { brow: 0.4, browY: 0.024, mouth: 0.05, mouthW: 0.55, eye: 1.3 },
  proud: { brow: 0.2, browY: 0.01, mouth: 0.28, mouthW: 1.05, eye: 0.92 },
};

export class NPC {
  constructor(id, def, position, { effects }) {
    this.id = id;
    this.def = def;
    this.position = position.clone();
    this.effects = effects;
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.radius = 3;
    this.talked = false;
    this.reactionCooldown = 0;
    this.state = 'idle';
    this.expression = 'neutral';
    this.moodTarget = 'neutral';
    this.moodTimer = 0;
    this.blinkTimer = rand(2, 5);
    this.baseRotY = 0;
    this._build();
  }

  // ---------------------------------------------------------------- helpers
  _mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color), roughness: 0.78, metalness: 0.06, flatShading: true, ...opts,
    });
  }

  _mesh(geo, color, opts) {
    const mesh = new THREE.Mesh(geo, this._mat(color, opts));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  /** Rosto com olhos, sobrancelhas e boca animáveis. */
  _face(y, z, scale = 1) {
    const g = new THREE.Group();
    g.position.set(0, y, z);
    g.scale.setScalar(scale);
    const eyeMat = this._mat('#20263a', { roughness: 0.4 });
    const whiteMat = this._mat('#fdfbff', { roughness: 0.5 });
    const face = {};
    for (const sx of [-1, 1]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), whiteMat);
      white.position.set(sx * 0.1, 0.02, 0);
      white.scale.set(1, 1.1, 0.6);
      g.add(white);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), eyeMat);
      eye.position.set(sx * 0.1, 0.02, 0.03);
      g.add(eye);
      face[sx < 0 ? 'eyeL' : 'eyeR'] = { group: eye, white };
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.022, 0.026), this._mat(this.def.portrait?.hair || '#3a2c22', { roughness: 0.9 }));
      brow.position.set(sx * 0.1, 0.1, 0.03);
      g.add(brow);
      face[sx < 0 ? 'browL' : 'browR'] = brow;
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 4, 10, Math.PI), this._mat('#7a3b3b', { roughness: 0.7 }));
    mouth.position.set(0, -0.09, 0.035);
    mouth.rotation.z = Math.PI;
    g.add(mouth);
    face.mouth = mouth;
    this.group.add(g);
    this.face = face;
    return g;
  }

  _build() {
    const color = this.def.color;
    const p = this.def.portrait || {};
    const cloth = p.cloth || '#4a6fa8';
    const accent = p.accent || color;
    const hair = p.hair || '#3a2c22';
    const skin = p.skin || SKIN;

    if (this.def.kind === 'firefly') {
      const body = this._mesh(new THREE.SphereGeometry(0.34, 12, 10), '#3d3355');
      body.position.y = 1.1;
      this.group.add(body);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(color) }));
      bulb.position.y = 0.82;
      this.group.add(bulb);
      this.wings = [];
      for (const sx of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.CircleGeometry(0.4, 8), new THREE.MeshBasicMaterial({ color: 0xd9f6ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
        wing.position.set(sx * 0.22, 1.2, 0.05);
        wing.rotation.y = sx * 0.6;
        this.group.add(wing);
        this.wings.push(wing);
      }
      this._face(1.15, -0.3, 0.9);
      this.group.position.y = 0.8 + Math.sin(rand(0, 6)) * 0.1;
      this.effects?.attachGlow(bulb, color, 1.6);
      this.floatBase = this.group.position.y;
      return;
    }

    if (this.def.kind === 'kid') {
      const legs = this._mesh(new THREE.CapsuleGeometry(0.1, 0.32, 4, 8), '#4a5568');
      for (const sx of [-1, 1]) {
        const leg = legs.clone();
        leg.position.set(sx * 0.13, 0.32, 0);
        this.group.add(leg);
      }
      const body = this._mesh(new THREE.CapsuleGeometry(0.3, 0.5, 4, 10), cloth);
      body.position.y = 0.95;
      this.group.add(body);
      this.torso = body;
      const head = this._mesh(new THREE.SphereGeometry(0.3, 14, 12), skin);
      head.position.y = 1.5;
      this.group.add(head);
      const hat = this._mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 12), '#e8b45c');
      hat.position.y = 1.74;
      this.group.add(hat);
      this._face(1.5, 0.25, 1);
      const backpack = this._mesh(new THREE.BoxGeometry(0.34, 0.4, 0.2), '#d97a4a');
      backpack.position.set(0, 1.0, -0.32);
      this.group.add(backpack);
      return;
    }

    if (this.def.kind === 'keeper') {
      const robe = this._mesh(new THREE.ConeGeometry(0.5, 1.5, 12), cloth);
      robe.position.y = 0.75;
      this.group.add(robe);
      this.torso = robe;
      const head = this._mesh(new THREE.SphereGeometry(0.3, 14, 12), skin);
      head.position.y = 1.6;
      this.group.add(head);
      const hood = this._mesh(new THREE.SphereGeometry(0.36, 14, 12, 0, Math.PI * 2, 0, Math.PI / 1.6), '#3a5a90');
      hood.position.y = 1.63;
      this.group.add(hood);
      this._face(1.6, 0.27, 1);
      const lantern = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(color) }));
      lantern.position.set(0.55, 1.0, 0);
      this.group.add(lantern);
      this.effects?.attachGlow(lantern, color, 1.1);
      return;
    }

    if (this.def.kind === 'elder') {
      const robe = this._mesh(new THREE.ConeGeometry(0.58, 1.55, 12), cloth);
      robe.position.y = 0.78;
      this.group.add(robe);
      this.torso = robe;
      const mantle = this._mesh(new THREE.ConeGeometry(0.62, 0.5, 12), '#39507a');
      mantle.position.y = 1.32;
      this.group.add(mantle);
      const head = this._mesh(new THREE.SphereGeometry(0.29, 14, 12), skin);
      head.position.y = 1.66;
      this.group.add(head);
      // barba comprida e bigode
      const beard = this._mesh(new THREE.ConeGeometry(0.24, 0.72, 8), hair);
      beard.position.set(0, 1.32, 0.14);
      beard.rotation.x = Math.PI;
      this.group.add(beard);
      const moustache = this._mesh(new THREE.BoxGeometry(0.26, 0.06, 0.08), hair);
      moustache.position.set(0, 1.55, 0.26);
      this.group.add(moustache);
      // cabelo nas laterais
      for (const sx of [-1, 1]) {
        const tuft = this._mesh(new THREE.SphereGeometry(0.13, 8, 8), hair);
        tuft.position.set(sx * 0.24, 1.72, 0.02);
        this.group.add(tuft);
      }
      this._face(1.68, 0.26, 1);
      // cajado com orbe de luz
      const staff = this._mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.1, 6), '#6b4a2c');
      staff.position.set(0.62, 1.05, 0.1);
      staff.rotation.z = -0.06;
      this.group.add(staff);
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(accent) }));
      orb.position.set(0.66, 2.12, 0.1);
      this.group.add(orb);
      this.effects?.attachGlow(orb, accent, 1.5);
      return;
    }

    if (this.def.kind === 'adventurer') {
      for (const sx of [-1, 1]) {
        const leg = this._mesh(new THREE.CapsuleGeometry(0.1, 0.34, 4, 8), '#5a4634');
        leg.position.set(sx * 0.12, 0.34, 0);
        this.group.add(leg);
        const boot = this._mesh(new THREE.BoxGeometry(0.2, 0.16, 0.3), '#8a5a3a');
        boot.position.set(sx * 0.12, 0.1, 0.04);
        this.group.add(boot);
      }
      const tunic = this._mesh(new THREE.CapsuleGeometry(0.27, 0.48, 4, 10), cloth);
      tunic.position.y = 0.92;
      this.group.add(tunic);
      this.torso = tunic;
      const belt = this._mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 10), '#7a5232');
      belt.position.y = 0.85;
      this.group.add(belt);
      // capa curta nas costas
      const cape = this._mesh(new THREE.ConeGeometry(0.4, 0.9, 8, 1, true), '#2c6650', { side: THREE.DoubleSide });
      cape.position.set(0, 1.0, -0.16);
      this.group.add(cape);
      const head = this._mesh(new THREE.SphereGeometry(0.28, 14, 12), skin);
      head.position.y = 1.5;
      this.group.add(head);
      // cabelo + rabo de cavalo
      const hairCap = this._mesh(new THREE.SphereGeometry(0.29, 12, 10, 0, Math.PI * 2, 0, Math.PI / 1.9), hair);
      hairCap.position.y = 1.55;
      this.group.add(hairCap);
      const ponytail = this._mesh(new THREE.CapsuleGeometry(0.07, 0.42, 4, 6), hair);
      ponytail.position.set(0, 1.34, -0.26);
      ponytail.rotation.x = 0.35;
      this.group.add(ponytail);
      this._face(1.52, 0.25, 1);
      // bolsa
      const bag = this._mesh(new THREE.BoxGeometry(0.22, 0.24, 0.14), '#9b6b3f');
      bag.position.set(-0.28, 0.8, 0.1);
      this.group.add(bag);
      return;
    }

    if (this.def.kind === 'sage') {
      const robe = this._mesh(new THREE.ConeGeometry(0.52, 1.62, 12), cloth);
      robe.position.y = 0.81;
      this.group.add(robe);
      this.torso = robe;
      // estrelas no manto
      for (let i = 0; i < 6; i++) {
        const star = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(accent) }));
        const a = rand(0, Math.PI * 2);
        star.position.set(Math.cos(a) * 0.36, 0.45 + Math.random() * 0.8, Math.sin(a) * 0.34);
        this.group.add(star);
      }
      const head = this._mesh(new THREE.SphereGeometry(0.29, 14, 12), skin);
      head.position.y = 1.68;
      this.group.add(head);
      const beard = this._mesh(new THREE.ConeGeometry(0.22, 0.62, 8), hair);
      beard.position.set(0, 1.36, 0.14);
      beard.rotation.x = Math.PI;
      this.group.add(beard);
      this._face(1.7, 0.26, 1);
      // chapéu de aba larga
      const brim = this._mesh(new THREE.CylinderGeometry(0.52, 0.55, 0.05, 14), '#463a6a');
      brim.position.y = 1.9;
      this.group.add(brim);
      const hat = this._mesh(new THREE.ConeGeometry(0.28, 0.7, 12), '#463a6a');
      hat.position.y = 2.22;
      this.group.add(hat);
      const tip = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(accent) }));
      tip.position.y = 2.58;
      this.group.add(tip);
      this.effects?.attachGlow(tip, accent, 1.2);
      const staff = this._mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.2, 6), '#5a432c');
      staff.position.set(0.6, 1.1, 0.08);
      this.group.add(staff);
      return;
    }

    if (this.def.kind === 'fairy') {
      const body = this._mesh(new THREE.SphereGeometry(0.17, 12, 10), skin, { emissive: new THREE.Color(accent), emissiveIntensity: 0.35 });
      body.position.y = 0.42;
      this.group.add(body);
      const dress = this._mesh(new THREE.ConeGeometry(0.2, 0.34, 10), cloth);
      dress.position.y = 0.24;
      this.group.add(dress);
      this.torso = dress;
      for (const sx of [-1, 1]) {
        const wing = new THREE.Mesh(
          new THREE.CircleGeometry(0.26, 10),
          new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.42, side: THREE.DoubleSide }),
        );
        wing.position.set(sx * 0.17, 0.5, -0.06);
        wing.rotation.y = sx * 0.7;
        this.group.add(wing);
        this.wings = this.wings || [];
        this.wings.push(wing);
      }
      // antenas com pontos de luz
      for (const sx of [-1, 1]) {
        const antenna = this._mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 4), '#f7e2ff');
        antenna.position.set(sx * 0.07, 0.64, 0.02);
        antenna.rotation.z = sx * 0.4;
        this.group.add(antenna);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6c2') }));
        dot.position.set(sx * 0.11, 0.74, 0.02);
        this.group.add(dot);
      }
      this._face(0.44, 0.14, 0.55);
      this.floatBase = this.group.position.y;
      this.effects?.attachGlow(body, accent, 1.4);
      return;
    }

    if (this.def.kind === 'spirit') {
      // entidade da noite: manto flutuante com olhos de estrela
      const cloak = this._mesh(new THREE.ConeGeometry(0.62, 1.7, 10), '#2f2a5a', { transparent: true, opacity: 0.94 });
      cloak.position.y = 0.95;
      this.group.add(cloak);
      this.torso = cloak;
      const hood = this._mesh(new THREE.SphereGeometry(0.38, 14, 12, 0, Math.PI * 2, 0, Math.PI / 1.7), '#241f46');
      hood.position.y = 1.72;
      this.group.add(hood);
      const head = this._mesh(new THREE.SphereGeometry(0.27, 12, 10), '#3a3466');
      head.position.y = 1.66;
      this.group.add(head);
      this._face(1.66, 0.24, 1);
      // olhos luminosos
      for (const sx of [-1, 1]) {
        const star = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(accent) }));
        star.position.set(sx * 0.1, 1.68, 0.28);
        this.group.add(star);
        this.effects?.attachGlow(star, accent, 1.1);
      }
      // fitas de névoa girando ao redor
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const wisp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(accent), transparent: true, opacity: 0.6 }));
        wisp.position.set(Math.cos(a) * 0.75, 0.6 + i * 0.25, Math.sin(a) * 0.75);
        this.group.add(wisp);
      }
      this.effects?.attachGlow?.(cloak, accent, 1.8);
      this.floatBase = this.group.position.y + 0.2;
      return;
    }
  }

  /** Expressão facial (também usada durante o diálogo). */
  setExpression(mood = 'neutral', duration = 0) {
    this.moodTarget = MOODS[mood] ? mood : 'neutral';
    this.expression = this.moodTarget;
    this.moodTimer = duration;
  }

  _updateFace(dt) {
    if (!this.face) return;
    const target = MOODS[this.moodTarget] || MOODS.neutral;
    const current = this._faceState || (this._faceState = { brow: 0, browY: 0, mouth: 0, mouthW: 1, eye: 1 });
    const k = 1 - Math.exp(-8 * dt);
    for (const key of ['brow', 'browY', 'mouth', 'mouthW', 'eye']) {
      current[key] += (target[key] - current[key]) * k;
    }
    const { browL, browR, mouth, eyeL, eyeR } = this.face;
    if (browL) browL.rotation.z = -current.brow;
    if (browR) browR.rotation.z = current.brow;
    if (browL) browL.position.y = 0.1 + current.browY;
    if (browR) browR.position.y = 0.1 + current.browY;
    if (mouth) {
      mouth.rotation.z = Math.PI + current.mouth;
      mouth.scale.set(current.mouthW, 1 + Math.abs(current.mouth) * 0.8, 1);
    }
    if (eyeL) {
      const s = current.eye * (this._blinkScale ?? 1);
      eyeL.group.scale.set(1, s, 1);
      eyeR.group.scale.set(1, s, 1);
    }
  }

  /** Reação divertida quando o jogador faz manobras por perto. */
  reactToTrick(name, ctx) {
    if (this.reactionCooldown > 0) return;
    this.reactionCooldown = 3.5;
    this.setExpression('surprise', 1.6);
    const reactions = {
      lumi: ['Uau! Faz de novo!', 'Ai, que brilho bonito!', 'Eu tentava isso e caía no chão.'],
      teo: ['Como você fez isso?!', 'Isso foi incrível!', 'Depois me ensina!'],
      mila: ['Hahaha, a lanterna está feliz hoje!', 'Cuidado para não queimar o cachecol!'],
      guardiao: ['Ah! A juventude tem luz nos pés!', 'Cuidado com meu cajado, criança!', 'Isso me lembrou dos festivais antigos.'],
      lyra: ['Quero aprender essa!', 'Isso foi coragem em forma de giro!', 'Uau, o escuro nem viu você passar!'],
      cavaleiro: ['Hmpf. Nada mal, recruta.', 'A técnica é boa. A ousadia, melhor ainda.'],
      fada: ['Uhuuu! Faz de novo!', 'Minhas asas ficaram tontas!', 'Isso é mágica de verdade!'],
      sabio: ['Interessante… a luz dança quando você acredita.', 'Há sabedoria nesse movimento.'],
      noite: ['A noite aplaude em silêncio.', 'Belo. Você brilha sem pedir licença.'],
    };
    const text = reactions[this.id]?.[Math.floor(Math.random() * 3)] || 'Que legal!';
    this.effects?.burst(this.group.position.clone().add(new THREE.Vector3(0, 1.4, 0)), { color: this.def.color, count: 18, speed: 3.4, size: 0.3, life: 0.9, gravity: 1 });
    ctx?.events?.emit('ui:toast', { text: `${this.def.name.split(',')[0]}: “${text}”`, icon: '💬' });
    this.talked = true;
  }

  update(dt, ctx) {
    this.reactionCooldown = Math.max(0, this.reactionCooldown - dt);
    this.moodTimer = Math.max(0, this.moodTimer - dt);
    if (this.moodTimer <= 0 && this.moodTarget !== 'neutral') this.moodTarget = 'neutral';
    const t = performance.now() / 1000;

    // piscar de olhos
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = rand(2.5, 5.5);
      this._blink = 0.14;
    }
    if (this._blink > 0) {
      this._blink = Math.max(0, this._blink - dt);
      this._blinkScale = Math.max(0.12, this._blink / 0.14);
    } else {
      this._blinkScale = 1;
    }
    this._updateFace(dt);

    if (this.wings) {
      this.wings.forEach((w, i) => { w.rotation.z = Math.sin(t * 18 + i) * 0.5; });
    }
    if (this.floatBase !== undefined) {
      this.group.position.y = this.floatBase + Math.sin(t * 1.6) * 0.16;
    }

    // balanço suave e respiração
    if (this.torso) {
      const breathe = 1 + Math.sin(t * 1.8) * 0.012;
      this.torso.scale.setScalar(breathe);
    }

    const player = ctx?.player;
    const near = player ? this.position.distanceTo(player.position) : 99;

    // segue o jogador quando a missão pede (Téo)
    if (this.state === 'following' && player) {
      const dir = new THREE.Vector3().subVectors(player.position, this.position);
      dir.y = 0;
      const d = dir.length();
      if (d > 3.2) {
        dir.normalize();
        const speed = d > 8 ? 6.4 : 3.6;
        this.position.addScaledVector(dir, speed * dt);
        this.group.position.x = this.position.x;
        this.group.position.z = this.position.z;
        this.group.position.y = this.position.y + Math.abs(Math.sin(t * 9)) * 0.08;
      }
      this.group.rotation.y = Math.atan2(dir.x, dir.z);
      return;
    }

    // olha para o jogador quando ele se aproxima
    if (player && near < 9) {
      const dx = player.position.x - this.position.x;
      const dz = player.position.z - this.position.z;
      const targetY = Math.atan2(dx, dz);
      let diff = ((targetY - this.group.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y += diff * Math.min(1, dt * 4);
      if (this.def.kind !== 'firefly' && this.def.kind !== 'fairy') {
        this.group.position.y = this.position.y + Math.sin(t * 1.4) * 0.012;
      }
    } else {
      this.group.rotation.y += dt * 0.25 * Math.sin(t * 0.7 + this.position.x);
    }
  }

  follow() { this.state = 'following'; }

  stopFollowing() {
    this.state = 'idle';
    this.group.position.x = this.position.x;
    this.group.position.z = this.position.z;
    this.group.position.y = this.position.y;
  }
}

// ------------------------------------------------------------------ diálogos
const asLines = (node, ctx) => {
  const value = typeof node === 'function' ? node(ctx) : node;
  if (value == null) return { lines: [], mood: 'neutral' };
  if (Array.isArray(value)) return { lines: value.map(String), mood: 'neutral' };
  if (typeof value === 'string') return { lines: [value], mood: 'neutral' };
  const mood = value.mood || 'neutral';
  if (Array.isArray(value.text)) return { lines: value.text.map(String), mood };
  return { lines: [String(value.text ?? '')], mood };
};

export class DialogueSystem {
  constructor(events, audio) {
    this.events = events;
    this.audio = audio;
    this.openData = null;
    this.npc = null;
    this.ctx = null;
    this.lines = [];
    this.index = 0;
    this.mood = 'neutral';
    this.choices = [];
  }

  get isOpen() { return !!this.openData; }

  /** Abre um diálogo avulso (inscrições, pedras de enigma, avisos). */
  open(data) {
    this.openData = data;
    this.choices = data.choices || [];
    this.events?.emit('dialogue:open', data);
    this.audio?.sfx('ui');
  }

  /** Abre a fala de um NPC, escolhendo o nó conforme o progresso das missões. */
  startFor(npc, ctx) {
    this.npc = npc;
    this.ctx = ctx;
    const def = npc.def;
    const quest = def.quest;
    const lines = def.lines;
    const done = quest && ctx.quests?.completed?.has(quest);
    const active = quest && ctx.quests?.isActive(quest);
    const locked = quest && !done && !active && ctx.quests && !ctx.quests.canStart(quest);
    let key = 'intro';
    if (locked) key = 'locked';
    else if (active) key = `active_${ctx.quests.currentStep(quest)?.id || 'x'}`;
    else if (done) key = 'after';
    else if (npc.talked) key = 'repeat';
    if (!lines[key]) key = active ? 'repeat' : done ? 'after' : npc.talked ? 'repeat' : 'intro';

    npc.talked = true;
    if (quest && def.autoStart && !ctx.quests?.has(quest)) ctx.quests?.start(quest);
    ctx.quests?.event('talk', { id: npc.id });
    this.play(key, lines[key], this.resolveChoices(def, ctx));
    return key;
  }

  resolveChoices(def, ctx) {
    const base = typeof def.choices === 'function' ? def.choices(ctx) : def.choices;
    return (base || []).map((c) => ({ ...c }));
  }

  play(key, node, choices = []) {
    this.key = key;
    const { lines, mood } = asLines(node, this.ctx);
    this.lines = lines;
    this.index = 0;
    this.mood = mood;
    this.choices = choices;
    if (this.npc) this.npc.setExpression(mood, 4);
    if (!lines.length) { this.close(); return; }
    this._emitLine();
  }

  _emitLine() {
    const def = this.npc?.def;
    const last = this.index >= this.lines.length - 1;
    const data = {
      name: def?.name || '—',
      portrait: def?.portrait || { kind: 'stone', accent: '#d4af37' },
      mood: this.mood,
      text: this.lines[this.index],
      choices: last ? this.choices : [],
      canContinue: !last,
      isLast: last,
    };
    this.openData = data;
    this.events?.emit('dialogue:open', data);
    this.audio?.sfx('talk', { soft: true });
  }

  /** Avança para a próxima fala; devolve false quando só restam escolhas/fim. */
  next() {
    if (!this.openData) return false;
    if (this.index < this.lines.length - 1) {
      this.index += 1;
      this._emitLine();
      return true;
    }
    return false;
  }

  choose(index, ctx) {
    const choice = this.openData?.choices?.[index] || this.choices?.[index];
    if (!choice) { this.close(); return; }
    this.audio?.sfx('ui');
    const before = this.openData;
    if (choice.trait && ctx?.traits) ctx.traits[choice.trait] = (ctx.traits[choice.trait] || 0) + 1;
    if (choice.quest) ctx?.actions?.acceptQuest?.(choice.quest);
    if (typeof choice.action === 'function') choice.action(ctx, this);
    else if (choice.action) ctx?.actions?.[choice.action]?.(choice, ctx);
    // a ação pode ter aberto outra conversa (enigmas): não feche por cima dela
    if (this.openData !== before && this.openData) return;

    if (choice.reply) {
      this.play(null, { mood: choice.mood || 'warm', text: choice.reply }, []);
      return;
    }
    if (choice.next) {
      const node = this.npc?.def?.lines?.[choice.next] ?? choice.next;
      this.play(choice.next, node, this.resolveChoices(this.npc?.def || {}, ctx));
      return;
    }
    this.close();
  }

  close() {
    const npc = this.npc;
    this.lastNpc = npc;
    this.openData = null;
    this.npc = null;
    this.ctx = null;
    this.lines = [];
    this.choices = [];
    npc?.setExpression('neutral');
    this.events?.emit('dialogue:close', {});
  }
}
