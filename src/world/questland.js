// Conteúdo das missões de coragem: o Bosque Sem Luz, a Caverna Sem Fim, as
// Luzes Perdidas das ruínas e o Templo Noturno. Tudo é construído com
// primitivas (sem assets binários), tem objetivos verificáveis e é salvo junto
// com o mundo (flags + estado dos interativos).

import * as THREE from 'three';
import { rand } from '../core/state.js';
import { Interactable } from '../systems/interactables.js';

const ZONES = [
  { id: 'dark_grove', name: 'Bosque Sem Luz', x: -40, z: -6, radius: 12, motivation: 'Mesmo na noite mais escura, existe uma estrela brilhando.' },
  { id: 'dark_cave', name: 'Caverna Sem Fim', x: 38, z: 12, radius: 8, motivation: 'A coragem começa quando você decide dar o primeiro passo.' },
  { id: 'ruins', name: 'Ruínas Antigas', x: -24, z: -22, radius: 10, motivation: 'Não tenha medo de descobrir o desconhecido.' },
  { id: 'night_temple', name: 'Templo Noturno', x: -4, z: 40, radius: 10.5, motivation: 'Sua luz interior é mais forte do que qualquer sombra.' },
  { id: 'star_grove', name: 'Bosque da Noite Estrelada', x: 26, z: 40, radius: 8, motivation: 'Cada desafio superado torna você mais forte.' },
];

export class QuestLand {
  constructor(world) {
    this.world = world;
    this.scene = world.scene;
    this.deps = world.deps;
    this.zones = ZONES;
    this.riddleSteles = [];
    this.nightSteles = [];
    this.fragments = [];
    this.symbols = [];
  }

  // -------------------------------------------------------------- helpers
  _mat(color, opts = {}) { return this.world._mat(color, opts); }

  _mesh(geo, color, opts) {
    const mesh = new THREE.Mesh(geo, this._mat(color, opts));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  _glow(pos, color, size) { return this.world.addGlowPoint(pos, color, size); }

  _y(x, z) { return this.world.terrainHeight(x, z); }

  _questObject(def) {
    const obj = new Interactable(def);
    this.world.interactions.add(obj);
    return obj;
  }

  _pillar(x, z, h, color = '#5b6274', radius = 0.5) {
    const y = this._y(x, z);
    const mesh = this._mesh(new THREE.CylinderGeometry(radius * 0.82, radius, h, 8), color);
    mesh.position.set(x, y + h / 2, z);
    return mesh;
  }

  // -------------------------------------------------------------- construção
  build() {
    this.buildDarkGrove();
    this.buildCave();
    this.buildLostLights();
    this.buildNightTemple();
  }

  /** Missão 1 — o vilarejo sem luz. */
  buildDarkGrove() {
    const cx = -40, cz = -6;
    // chão de terra escura
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(13, 28),
      new THREE.MeshStandardMaterial({ color: new THREE.Color('#1b1730'), roughness: 1, transparent: true, opacity: 0.85 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cx, this._y(cx, cz) + 0.06, cz);
    ground.userData.noShadow = true;
    this.scene.add(ground);

    // árvores retorcidas e sem folhas
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + rand(-0.15, 0.15);
      const r = rand(9, 14);
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      const h = rand(3.2, 6);
      const trunk = this._mesh(new THREE.CylinderGeometry(0.12, 0.34, h, 6), '#2b2138');
      trunk.position.set(x, this._y(x, z) + h / 2, z);
      trunk.rotation.z = rand(-0.14, 0.14);
      const branch = this._mesh(new THREE.ConeGeometry(0.5, 1.2, 5), '#241c33');
      branch.position.set(x + 0.2, this._y(x, z) + h * 0.8, z);
      branch.rotation.z = 0.4;
    }
    // névoa violeta baixa
    for (let i = 0; i < 10; i++) {
      const a = rand(0, Math.PI * 2), r = rand(2, 11);
      this._glow(new THREE.Vector3(cx + Math.cos(a) * r, this._y(cx, cz) + rand(0.4, 1.6), cz + Math.sin(a) * r), '#7b5bd6', rand(1.4, 3));
    }

    // Lanterna Antiga
    const lx = -37, lz = 2, ly = this._y(lx, lz);
    const lanternGroup = new THREE.Group();
    const post = this._mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.3, 6), '#5b4630');
    post.position.y = 0.65;
    lanternGroup.add(post);
    const cage = this._mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.5, 8, 1, true), '#b08a4e', { side: THREE.DoubleSide });
    cage.position.y = 1.35;
    lanternGroup.add(cage);
    this.oldLanternCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd479') }));
    this.oldLanternCore.position.y = 1.35;
    lanternGroup.add(this.oldLanternCore);
    lanternGroup.position.set(lx, ly, lz);
    this.scene.add(lanternGroup);
    this.deps.effects?.attachGlow(this.oldLanternCore, '#ffd479', 1.6);
    const lantern = this._questObject({ id: 'q-old-lantern', type: 'lantern', position: new THREE.Vector3(lx, ly, lz), radius: 3, label: 'Examinar a Lanterna Antiga' });
    lantern.mesh = lanternGroup;
    lantern.interact = (ctx) => {
      if (lantern.done) {
        ctx.toast?.('A lanterna antiga ainda guarda uma faísca. Você a leva no coração.', '🏮');
        return true;
      }
      lantern.done = true;
      ctx.give?.('lanterna_antiga', 1);
      ctx.quests?.event('lanterna', { id: 'q-old-lantern' });
      ctx.audio?.sfx('quest');
      ctx.effects?.burst(new THREE.Vector3(lx, ly + 1.4, lz), { color: '#ffd479', count: 26, speed: 4, size: 0.3, life: 1, gravity: 0.6 });
      ctx.toast?.('Você encontrou a Lanterna Antiga! Ela ainda tem uma faísca.', '🏮');
      if (this.oldLanternCore) this.oldLanternCore.material.color.set('#fff6d0');
      return true;
    };

    // Pedra rachada — origem da escuridão
    const sx = -44, sz = -6, sy = this._y(sx, sz);
    const stele = this._mesh(new THREE.BoxGeometry(1.4, 2.6, 0.7), '#3a3550');
    stele.position.set(sx, sy + 1.3, sz);
    stele.rotation.y = 0.4;
    this._glow(new THREE.Vector3(sx, sy + 2.2, sz), '#8b6bff', 2.4);
    const origin = this._questObject({ id: 'q-origin', type: 'story', position: new THREE.Vector3(sx, sy, sz), radius: 3, label: 'Ler a pedra rachada' });
    origin.interact = (ctx) => {
      if (origin.done) { ctx.toast?.('A pedra repete: “A luz não se perdeu. Só esperou alguém voltar.”', '📜'); return true; }
      origin.done = true;
      ctx.dialogue?.open?.({
        name: 'Pedra Rachada', portrait: { kind: 'stone', accent: '#8b6bff' }, mood: 'calm',
        text: 'A pedra conta, em runas que só a luz revela: a floresta não perdeu a luz. Ela a guardou dentro de si quando as crianças começaram a temer o escuro. Basta alguém lembrar que a noite também é um lugar bonito.',
        choices: [{ label: 'Entendi o que aconteceu', next: null }],
      });
      ctx.quests?.event('origem', { id: 'q-origin' });
      ctx.give?.('fragmento', 1);
      ctx.audio?.sfx('secret');
      return true;
    };

    // Cristal Luminoso
    const qx = -40, qz = -14, qy = this._y(qx, qz);
    const crystalMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#bff6ff') });
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), crystalMat);
    crystal.position.set(qx, qy + 1.1, qz);
    crystal.castShadow = true;
    this.scene.add(crystal);
    this.deps.effects?.attachGlow(crystal, '#bff6ff', 2.6);
    const radiant = this._questObject({ id: 'q-radiant-crystal', type: 'quest', position: new THREE.Vector3(qx, qy, qz), radius: 3, label: 'Recolher o Cristal Luminoso' });
    radiant.interact = (ctx) => {
      if (radiant.done) { ctx.toast?.('O cristal luminoso já está com você.', '🔮'); return true; }
      radiant.done = true;
      crystal.visible = false;
      ctx.give?.('fragmento', 2);
      ctx.quests?.event('cristal_luz', { id: 'q-radiant-crystal' });
      ctx.audio?.sfx('crystal');
      ctx.effects?.burst(new THREE.Vector3(qx, qy + 1.1, qz), { color: '#bff6ff', count: 40, speed: 5, size: 0.34, life: 1.2, gravity: 0.4 });
      ctx.toast?.('O Cristal Luminoso pulsa na sua mão. O bosque já parece mais claro!', '🔮');
      return true;
    };

    this.zones.find((z) => z.id === 'dark_grove').center = new THREE.Vector3(cx, this._y(cx, cz), cz);
    return { cx, cz };
  }

  /** Missão 2 — a caverna da coragem. */
  buildCave() {
    const cx = 38, cz = 12;
    const baseY = this._y(cx, cz);
    // anel de rochas com abertura a oeste
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      if (Math.abs(a - Math.PI) < 0.45) continue; // entrada
      const r = 7.4 + rand(-0.6, 0.6);
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      const s = rand(1.4, 2.6);
      const rock = this._mesh(new THREE.DodecahedronGeometry(s, 0), '#4a4558');
      rock.position.set(x, this._y(x, z) + s * 0.7, z);
      rock.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    }
    // teto baixo e escuro
    const roof = new THREE.Mesh(
      new THREE.SphereGeometry(8.2, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: new THREE.Color('#0e0b1c'), roughness: 1, side: THREE.BackSide, transparent: true, opacity: 0.96 }),
    );
    roof.position.set(cx, baseY + 0.2, cz);
    roof.userData.noShadow = true;
    this.scene.add(roof);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(7.6, 26),
      new THREE.MeshStandardMaterial({ color: new THREE.Color('#191428'), roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, baseY + 0.07, cz);
    floor.userData.noShadow = true;
    this.scene.add(floor);
    // arco de entrada
    const arch = this._mesh(new THREE.TorusGeometry(2.4, 0.45, 6, 12, Math.PI), '#565068');
    arch.position.set(cx - 7.2, this._y(cx - 7.2, cz) + 1.6, cz);
    arch.rotation.y = Math.PI / 2;
    this._glow(new THREE.Vector3(cx - 7.2, this._y(cx - 7.2, cz) + 2.6, cz), '#8b6bff', 2.2);

    // tochas frias dentro
    for (const [ox, oz] of [[-4, -3], [4, -3], [-4, 4], [4, 4]]) {
      const x = cx + ox, z = cz + oz;
      const post = this._mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.1, 5), '#3b3648');
      post.position.set(x, this._y(x, z) + 0.55, z);
      const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#9b8bff') }));
      flame.position.set(x, this._y(x, z) + 1.2, z);
      this.scene.add(flame);
      this.deps.effects?.attachGlow(flame, '#9b8bff', 1.4);
    }

    // três símbolos antigos
    const spots = [[cx - 2, cz - 3], [cx + 2.5, cz - 1], [cx, cz + 3.5]];
    spots.forEach(([x, z], i) => {
      const y = this._y(x, z);
      const ped = this._mesh(new THREE.BoxGeometry(0.8, 0.9, 0.8), '#45405a');
      ped.position.set(x, y + 0.45, z);
      const emblemMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#5f5a7d') });
      const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), emblemMat);
      emblem.position.set(x, y + 1.15, z);
      this.scene.add(emblem);
      const obj = this._questObject({ id: `q-symbol-${i}`, type: 'symbol', position: new THREE.Vector3(x, y, z), radius: 2.8, label: 'Iluminar o símbolo antigo' });
      obj.mesh = emblem;
      obj.onLoadedDone = () => { emblemMat.color.set('#ffd479'); };
      obj.interact = (ctx) => {
        if (obj.done) { ctx.toast?.('Este símbolo já brilha com a sua coragem.', '🜁'); return true; }
        obj.done = true;
        emblemMat.color.set('#ffd479');
        ctx.give?.('simbolo_antigo', 1);
        ctx.quests?.event('symbol', { id: obj.id });
        ctx.audio?.sfx('crystal');
        ctx.effects?.burst(new THREE.Vector3(x, y + 1.2, z), { color: '#ffd479', count: 22, speed: 4, size: 0.28, life: 0.9 });
        return true;
      };
      this.symbols.push(obj);
    });

    // Pedra Sussurrante (enigma)
    const rx = cx, rz = cz, ry = this._y(rx, rz);
    const stone = this._mesh(new THREE.ConeGeometry(0.7, 1.7, 6), '#3d3852');
    stone.position.set(rx, ry + 0.85, rz);
    this._glow(new THREE.Vector3(rx, ry + 2, rz), '#b9a7ff', 2.6);
    const riddle = this._questObject({ id: 'q-cave-riddle', type: 'riddle', position: new THREE.Vector3(rx, ry, rz), radius: 3, label: 'Ouvir a Pedra Sussurrante' });
    riddle.interact = (ctx) => {
      if (riddle.done) { ctx.toast?.('A pedra sussurra: “Você já respondeu. Agora só falta voltar.”', '🜂'); return true; }
      this.openRiddle(ctx, {
        title: 'Pedra Sussurrante',
        intro: 'A pedra sussurra: “Eu apago tudo o que vejo, mas não apago o que você lembra. O que eu sou?”',
        options: [
          { label: 'A memória', correct: true, reply: 'A pedra brilha: “Isso. O escuro apaga formas, mas não apaga o que você viveu.”' },
          { label: 'O vento', correct: false, reply: 'A pedra range: “O vento faz barulho. Eu faço silêncio. Tente de novo.”' },
          { label: 'A chuva', correct: false, reply: 'A pedra ri baixinho: “A chuva cai. Eu fico. Escute de novo.”' },
        ],
        onSolve: () => {
          riddle.done = true;
          ctx.quests?.event('riddle', { id: 'q-cave-riddle' });
          ctx.give?.('fragmento', 1);
          ctx.audio?.sfx('secret');
          stone.material.color.set('#6b5aa0');
        },
      });
      return true;
    };

    this.zones.find((z) => z.id === 'dark_cave').center = new THREE.Vector3(cx, baseY, cz);
    return { cx, cz };
  }

  /** Missão 3 — as luzes perdidas. */
  buildLostLights() {
    // cinco fragmentos espalhados pelas ruínas
    const spots = [[-29, -14], [-17, -16], [-31, -29], [-16, -29], [-25, -33]];
    spots.forEach(([x, z], i) => {
      const y = this._y(x, z);
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe9b0') }));
      mesh.position.set(x, y + 0.75, z);
      this.scene.add(mesh);
      this.deps.effects?.attachGlow(mesh, '#ffe9b0', 1.5);
      const obj = this._questObject({ id: `q-light-${i}`, type: 'light', position: new THREE.Vector3(x, y, z), radius: 2.7, label: 'Recolher fragmento luminoso' });
      obj.mesh = mesh;
      obj.onLoadedDone = () => { mesh.visible = false; };
      obj.update = (dt) => { if (!obj.done) { mesh.rotation.y += dt * 1.4; mesh.position.y = y + 0.75 + Math.sin(performance.now() / 620 + i) * 0.1; } };
      obj.interact = (ctx) => {
        if (obj.done) return true;
        obj.done = true;
        mesh.visible = false;
        ctx.give?.('fragmento_luz', 1);
        ctx.quests?.event('luz_perdida', { id: obj.id });
        ctx.audio?.sfx('coin');
        ctx.effects?.burst(new THREE.Vector3(x, y + 0.8, z), { color: '#ffe9b0', count: 16, speed: 3, size: 0.24, life: 0.7 });
        return true;
      };
      this.fragments.push(obj);
    });

    // criatura mágica presa numa gaiola de raízes
    const cx = -19, cz = -14, cy = this._y(cx, cz);
    const cage = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const bar = this._mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.6, 5), '#4a3b2c');
      bar.position.set(Math.cos(a) * 0.62, 0.8, Math.sin(a) * 0.62);
      cage.add(bar);
    }
    const topRing = this._mesh(new THREE.TorusGeometry(0.66, 0.07, 5, 12), '#5a4630');
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = 1.6;
    cage.add(topRing);
    const critterMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c6a8ff'), emissive: new THREE.Color('#7b5bd6'), emissiveIntensity: 0.4, flatShading: true });
    const critter = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), critterMat);
    critter.position.y = 0.7;
    cage.add(critter);
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 5), critterMat);
      ear.position.set(sx * 0.2, 1.0, 0);
      ear.rotation.z = sx * 0.35;
      cage.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color('#0d0b1a') }));
      eye.position.set(sx * 0.12, 0.76, 0.28);
      cage.add(eye);
    }
    cage.position.set(cx, cy, cz);
    this.scene.add(cage);
    this.deps.effects?.attachGlow(critter, '#b9a7ff', 1.6);
    this.critterGroup = cage;
    const creature = this._questObject({ id: 'q-critter', type: 'creature', position: new THREE.Vector3(cx, cy, cz), radius: 3, label: 'Libertar a criatura mágica' });
    creature.interact = (ctx) => {
      if (creature.done) { ctx.toast?.('A criatura mágica ainda te segue com os olhos, agradecida.', '🦋'); return true; }
      creature.done = true;
      cage.visible = false;
      ctx.quests?.event('criatura', { id: 'q-critter' });
      ctx.give?.('moeda_magica', 5);
      ctx.audio?.sfx('purify');
      ctx.effects?.burst(new THREE.Vector3(cx, cy + 1, cz), { color: '#c6a8ff', count: 36, speed: 4, size: 0.3, life: 1.1, gravity: 0.2 });
      ctx.toast?.('A criatura mágica saiu da gaiola e te agradeceu com luzinhas!', '🦋');
      return true;
    };

    // Altar de Luz
    const ax = 10, az = -12, ay = this._y(ax, az);
    const base = this._mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.5, 12), '#5f6478');
    base.position.set(ax, ay + 0.25, az);
    const pillar = this._mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.8, 8), '#6b7186');
    pillar.position.set(ax, ay + 1.2, az);
    this.lightAltarMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#3a3552') });
    const altarCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), this.lightAltarMat);
    altarCrystal.position.set(ax, ay + 2.4, az);
    this.scene.add(altarCrystal);
    this.lightAltarGlow = this._glow(new THREE.Vector3(ax, ay + 2.4, az), '#ffe9b0', 1.2);
    this.lightAltarGlow.material.opacity = 0.1;
    const altar = this._questObject({ id: 'q-light-altar', type: 'altar_light', position: new THREE.Vector3(ax, ay, az + 1.4), radius: 3.2, label: 'Restaure o Altar de Luz' });
    altar.interact = (ctx) => {
      if (altar.done) { ctx.toast?.('O Altar de Luz brilha sereno. As luzinhas estão em casa.', '🌟'); return true; }
      const quest = ctx.quests;
      const onStep = quest?.isActive('luzes_perdidas') && quest.currentStep('luzes_perdidas')?.id === 'altar';
      if (!onStep) {
        ctx.toast?.('O altar está apagado. As cinco luzinhas ainda estão perdidas pelas ruínas.', '🌟');
        ctx.audio?.sfx('hurtSoft');
        return true;
      }
      altar.done = true;
      this.lightAltarMat.color.set('#ffe9b0');
      this.lightAltarGlow.material.opacity = 0.9;
      quest.event('altar_luz', { id: 'q-light-altar' });
      ctx.give?.('cristal', 6);
      ctx.audio?.sfx('levelup');
      ctx.effects?.burst(new THREE.Vector3(ax, ay + 2.4, az), { color: '#ffe9b0', count: 70, speed: 7, size: 0.4, life: 1.6, gravity: 0.5 });
      ctx.effects?.ring(new THREE.Vector3(ax, ay + 0.4, az), { color: '#ffe9b0', from: 1, to: 14, life: 1.1 });
      ctx.toast?.('O Altar de Luz despertou! As luzinhas voltaram para casa.', '🌟');
      return true;
    };
  }

  /** Missão 4 — o templo noturno. */
  buildNightTemple() {
    const cx = -4, cz = 40, baseY = this._y(cx, cz);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(9, 28),
      new THREE.MeshStandardMaterial({ color: new THREE.Color('#171a34'), roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cx, baseY + 0.06, cz);
    ground.userData.noShadow = true;
    this.scene.add(ground);

    // colunas em círculo
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = cx + Math.cos(a) * 7.2, z = cz + Math.sin(a) * 7.2;
      this._pillar(x, z, rand(3.4, 5.2), '#4b4a6b', 0.45);
    }
    // arco da lua
    const arch = this._mesh(new THREE.TorusGeometry(3.2, 0.32, 6, 16, Math.PI), '#5a5a86');
    arch.position.set(cx, baseY + 3, cz - 6.6);
    // lua crescente flutuante
    const moon = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.18, 6, 14, Math.PI * 1.3), new THREE.MeshBasicMaterial({ color: new THREE.Color('#dfe6ff') }));
    moon.position.set(cx, baseY + 5.2, cz);
    moon.rotation.z = 0.6;
    this.scene.add(moon);
    this.deps.effects?.attachGlow(moon, '#dfe6ff', 2.6);
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2), r = rand(3, 8.6);
      const star = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.04, 0.09), 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8ecff') }));
      star.position.set(cx + Math.cos(a) * r, baseY + rand(2.4, 6.6), cz + Math.sin(a) * r);
      this.scene.add(star);
      this.deps.effects?.attachGlow(star, '#e8ecff', 0.8);
    }

    // duas pedras de enigma
    const spots = [[cx - 5, cz - 2], [cx + 5, cz - 2]];
    spots.forEach(([x, z], i) => {
      const y = this._y(x, z);
      const stone = this._mesh(new THREE.ConeGeometry(0.55, 1.5, 6), '#3d3a60');
      stone.position.set(x, y + 0.75, z);
      this._glow(new THREE.Vector3(x, y + 1.8, z), '#9b8bff', 2);
      const obj = this._questObject({ id: `q-night-riddle-${i}`, type: 'riddle', position: new THREE.Vector3(x, y, z), radius: 2.8, label: 'Escutar a pedra da noite' });
      const data = [
        {
          title: 'Pedra da Lua',
          intro: 'A pedra canta: “Eu chego sem barulho, cubro o mundo com um cobertor azul e trago as estrelas. Quem sou eu?”',
          options: [
            { label: 'A noite', correct: true, reply: 'A pedra canta mais alto: “Sim. Eu não apago o mundo, eu o faço descansar.”' },
            { label: 'O inverno', correct: false, reply: 'A pedra sussurra: “O inverno esfria. Eu acordo estrelas.”' },
            { label: 'O sono', correct: false, reply: 'A pedra ri: “Eu venho antes do sono. Tente outra vez.”' },
          ],
        },
        {
          title: 'Pedra das Estrelas',
          intro: 'A pedra pergunta: “Sou pequena, mas só apareço quando tudo fica escuro. Os corajosos me usam para navegar. O que sou?”',
          options: [
            { label: 'Uma estrela', correct: true, reply: 'A pedra brilha: “Isso. Até a menor luz encontra o caminho.”' },
            { label: 'Uma vela', correct: false, reply: 'A pedra responde: “A vela é acesa por mãos. Eu apareço sozinha.”' },
            { label: 'Um vaga-lume', correct: false, reply: 'A pedra sorri: “Perto! Mas eu fico no céu, não no bosque.”' },
          ],
        },
      ][i];
      obj.interact = (ctx) => {
        if (obj.done) { ctx.toast?.('Esta pedra já guarda a sua resposta.', '🌙'); return true; }
        this.openRiddle(ctx, {
          ...data,
          onSolve: () => {
            obj.done = true;
            stone.material.color.set('#7b6bc0');
            ctx.quests?.event('night_riddle', { id: obj.id });
            ctx.audio?.sfx('secret');
            this.refreshNightPedestal(ctx);
          },
        });
        return true;
      };
      this.nightSteles.push(obj);
    });

    // pedestal do segredo
    const px = cx, pz = cz + 3, py = this._y(px, pz);
    const pedestal = this._mesh(new THREE.CylinderGeometry(0.8, 1, 0.8, 10), '#46446b');
    pedestal.position.set(px, py + 0.4, pz);
    this.secretOrb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#3a3552') }));
    this.secretOrb.position.set(px, py + 1.2, pz);
    this.scene.add(this.secretOrb);
    this.secretGlow = this._glow(new THREE.Vector3(px, py + 1.2, pz), '#b9a7ff', 1.4);
    this.secretGlow.material.opacity = 0.12;
    const pedestalObj = this._questObject({ id: 'q-night-secret', type: 'secret', position: new THREE.Vector3(px, py, pz), radius: 3, label: 'Tocar o pedestal do segredo' });
    pedestalObj.interact = (ctx) => {
      if (pedestalObj.done) { ctx.toast?.('O segredo da noite já é seu: o escuro é um abraço grande, não uma boca.', '🌌'); return true; }
      const solved = this.nightSteles.filter((s) => s.done).length;
      if (solved < 2) {
        ctx.toast?.(`O pedestal ainda está mudo. Resolva os enigmas do templo (${solved}/2).`, '🔒');
        ctx.audio?.sfx('hurtSoft');
        return true;
      }
      pedestalObj.done = true;
      this.secretOrb.material.color.set('#dfe6ff');
      this.secretGlow.material.opacity = 0.95;
      ctx.quests?.event('secret', { id: 'night' });
      ctx.give?.('cristal', 8);
      ctx.audio?.sfx('levelup');
      ctx.effects?.burst(new THREE.Vector3(px, py + 1.2, pz), { color: '#b9a7ff', count: 60, speed: 6, size: 0.36, life: 1.5, gravity: 0.2 });
      ctx.toast?.('O segredo da noite foi revelado!', '🌌');
      this.openNightGate(ctx);
      return true;
    };

    this._buildNightGate(cx, cz);
    this.zones.find((z) => z.id === 'night_temple').center = new THREE.Vector3(cx, baseY, cz);
  }

  refreshNightPedestal(ctx) {
    const solved = this.nightSteles.filter((s) => s.done).length;
    if (solved >= 2) {
      this.secretGlow.material.opacity = 0.5;
      ctx?.toast?.('Os dois enigmas se calaram. O pedestal central agora brilha.', '🌌');
    }
  }

  _buildNightGate(cx, cz) {
    // passagem selada entre o templo e o Bosque da Noite Estrelada
    const gx = 9, gz = cz;
    const gy = this._y(gx, gz);
    for (const sz of [-1, 1]) {
      this._pillar(gx, gz + sz * 3, 4.6, '#4b4a6b', 0.4);
    }
    const veilMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#2b2a5a'), transparent: true, opacity: 0.72, side: THREE.DoubleSide });
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.4), veilMat);
    veil.position.set(gx, gy + 2.4, gz);
    veil.rotation.y = Math.PI / 2;
    this.scene.add(veil);
    this.nightVeil = veil;
    this.nightVeilMat = veilMat;
    this.nightGateWall = this.world._wall('night-gate', gx, gz, 0.5, 3.2, 4.6, '#2b2a5a');
    this.nightGateWall.mesh.visible = false; // a parede é só física (o véu é o visual)
    const gate = this._questObject({ id: 'q-night-gate', type: 'night_gate', position: new THREE.Vector3(gx, gy, gz), radius: 3.2, label: 'Atravessar o véu da noite' });
    gate.interact = (ctx) => {
      if (this.world.flags.nightGateOpen) {
        ctx.toast?.('O caminho para o Bosque da Noite Estrelada está aberto. As estrelas não têm hora.', '🌠');
        ctx.audio?.sfx('secret');
      } else {
        ctx.toast?.('O véu da noite está selado. Resolva os enigmas do templo.', '🌌');
        ctx.audio?.sfx('hurtSoft');
      }
      return true;
    };

    // Bosque da Noite Estrelada (nova região)
    const sx = 26, sz = cz, sy = this._y(sx, sz);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const x = sx + Math.cos(a) * 5.6, z = sz + Math.sin(a) * 5.6;
      const trunk = this._mesh(new THREE.CylinderGeometry(0.16, 0.3, rand(2.4, 3.8), 6), '#2f2a4a');
      trunk.position.set(x, this._y(x, z) + 1.5, z);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#b9c8ff'), transparent: true, opacity: 0.28 }));
      crown.position.set(x, this._y(x, z) + 3.3, z);
      this.scene.add(crown);
      this.deps.effects?.attachGlow(crown, '#b9c8ff', 2.2);
    }
    this.world._addChest('chest-night-grove', new THREE.Vector3(sx, 0, sz), 'secreto', { y: sy + 0.1 });
    this._glow(new THREE.Vector3(sx, sy + 2.4, sz), '#dfe6ff', 4);
    this.zones.find((z) => z.id === 'star_grove').center = new THREE.Vector3(sx, sy, sz);
  }

  openNightGate(ctx) {
    if (this.world.flags.nightGateOpen) return;
    this.world.flags.nightGateOpen = true;
    if (this.nightGateWall) { this.nightGateWall.removed = true; this.nightGateWall.mesh.visible = false; }
    if (this.nightVeilMat) this.nightVeilMat.opacity = 0.18;
    this.world.scene.background = new THREE.Color('#0a1126');
    ctx?.toast?.('A passagem para o Bosque da Noite Estrelada se abriu!', '🌠');
    ctx?.audio?.sfx('secret');
    ctx?.effects?.ring(new THREE.Vector3(9, this._y(9, 40) + 0.5, 40), { color: '#b9a7ff', from: 1, to: 12, life: 1 });
  }

  /** Enigma com escolhas: a resposta certa avança a missão. */
  openRiddle(ctx, { title, intro, options, onSolve }) {
    const open = (text, choices) => ctx.dialogue?.open?.({ name: title, portrait: { kind: 'stone', accent: '#b9a7ff' }, mood: 'calm', text, choices });
    const build = () => options.map((opt) => ({
      label: opt.label,
      next: null,
      action: () => {
        if (opt.correct) {
          onSolve?.();
          open(opt.reply, [{ label: 'Continuar', next: null }]);
        } else {
          open(opt.reply, [
            ...build(),
            { label: 'Deixar para depois', next: null },
          ]);
        }
      },
    }));
    open(intro, [...build(), { label: 'Deixar para depois', next: null }]);
  }

  /** Reaplica o visual de portões e altares depois de carregar um save. */
  applyFlags() {
    const byId = (id) => this.world.interactions.byId(id);
    const open = !!this.world.flags.nightGateOpen;
    if (this.nightGateWall) this.nightGateWall.removed = open;
    if (this.nightVeilMat) this.nightVeilMat.opacity = open ? 0.18 : 0.72;
    const altar = byId('q-light-altar')?.done;
    if (this.lightAltarMat) this.lightAltarMat.color.set(altar ? '#ffe9b0' : '#3a3552');
    if (this.lightAltarGlow) this.lightAltarGlow.material.opacity = altar ? 0.9 : 0.1;
    const secret = byId('q-night-secret')?.done;
    if (this.secretOrb) this.secretOrb.material.color.set(secret ? '#dfe6ff' : '#3a3552');
    if (this.secretGlow) this.secretGlow.material.opacity = secret ? 0.95 : 0.12;
    if (this.critterGroup) this.critterGroup.visible = !byId('q-critter')?.done;
    if (this.oldLanternCore) this.oldLanternCore.material.color.set(byId('q-old-lantern')?.done ? '#fff6d0' : '#ffd479');
    for (const sym of this.symbols) if (sym.mesh?.material) sym.mesh.material.color.set(sym.done ? '#ffd479' : '#5f5a7d');
  }

  // -------------------------------------------------------------- atualização
  update(dt, ctx) {
    const player = ctx?.player;
    if (!player) return;
    for (const zone of this.zones) {
      const center = zone.center || new THREE.Vector3(zone.x, 0, zone.z);
      const inside = Math.hypot(player.position.x - center.x, player.position.z - center.z) < zone.radius;
      const flag = `zone_${zone.id}`;
      if (!inside) { zone._t = 0; continue; }
      if (!this.world.flags[flag]) {
        this.world.flags[flag] = true;
        ctx.events?.emit('world:zone', { id: zone.id, name: zone.name, motivation: zone.motivation });
      }
      // o objetivo "explore a zona" é verificado enquanto o jogador está dentro
      zone._t = (zone._t || 0) - dt;
      if (zone._t <= 0) { zone._t = 0.7; ctx.quests?.event('zone', { id: zone.id }); }
    }
    // brilho do cristal da lanterna antiga pulsa devagar
    if (this.oldLanternCore) {
      const s = 1 + Math.sin(performance.now() / 700) * 0.08;
      this.oldLanternCore.scale.setScalar(s);
    }
  }
}

export function buildQuestLand(world) {
  const land = new QuestLand(world);
  world.questLand = land;
  land.build();
  return land;
}
