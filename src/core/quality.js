// Qualidade gráfica: predefinições + resolução dinâmica automática.
//
// Nada aqui mexe na jogabilidade: só decide QUANTOS pixels são desenhados,
// o tamanho/frequência das sombras, o antisserrilhado do pós-processamento e
// a densidade da grama/flores decorativas.
//
// Modos (opção "Qualidade gráfica"):
//   auto  → escolhe um ponto de partida pelo aparelho e ajusta a resolução
//           sozinho conforme o FPS medido (desce se travar, sobe se sobrar).
//   alta / media / baixa → valores fixos.

import * as THREE from 'three';

export const QUALITY_LABELS = { auto: 'Automática', alta: 'Alta', media: 'Média', baixa: 'Baixa' };

export const PRESETS = {
  alta: {
    maxRatio: 1.5, minRatio: 0.85,
    msaa: 2, bloomIterations: 2,
    shadowSize: 2048, softShadows: true, shadowEvery: 1, tinyCasters: true,
    decor: 1,
  },
  media: {
    maxRatio: 1.0, minRatio: 0.7,
    msaa: 0, bloomIterations: 1,
    shadowSize: 1024, softShadows: false, shadowEvery: 2, tinyCasters: false,
    decor: 0.7,
  },
  baixa: {
    maxRatio: 1.0, minRatio: 0.6,
    msaa: 0, bloomIterations: 1,
    shadowSize: 1024, softShadows: false, shadowEvery: 3, tinyCasters: false,
    decor: 0.45,
  },
};

const ORDER = ['alta', 'media', 'baixa'];
const TINY_RADIUS = 0.35; // objetos menores que isto deixam de projetar sombra nos modos leves

export function detectDevice(renderer) {
  let gpuName = '';
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    gpuName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  } catch { /* sem info */ }
  const software = /swiftshader|llvmpipe|software|basic render/i.test(gpuName);
  const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent))
    || Math.min(window.innerWidth, window.innerHeight) < 620;
  const cores = navigator.hardwareConcurrency || 8;
  const integrated = /intel|uhd|iris|mali|adreno|powervr|apple gpu/i.test(gpuName);
  return { gpuName, software, mobile, cores, integrated };
}

export class QualityManager {
  constructor(game) {
    this.game = game;
    this.device = detectDevice(game.renderer);
    this.mode = 'auto';
    this.presetId = 'media';
    this.preset = PRESETS.media;
    this.ratio = 1;
    this._frame = 0;
    this._acc = 0;
    this._frames = 0;
    this._slowWindows = 0;
    this._fastWindows = 0;
    this._last = performance.now();
    this._cooldown = 2; // segundos sem medir após uma mudança
  }

  /** Ponto de partida do modo automático conforme o aparelho. */
  autoPreset() {
    const d = this.device;
    if (d.software || d.mobile || d.cores <= 4) return 'baixa';
    if (d.integrated) return 'media';
    return 'alta';
  }

  /** Aplica o modo salvo nas opções (chamado no início e quando a opção muda). */
  setMode(mode) {
    this.mode = (PRESETS[mode] || mode === 'auto') ? mode : 'auto';
    const id = this.mode === 'auto' ? this.autoPreset() : this.mode;
    this.applyPreset(id, { ratio: PRESETS[id].maxRatio });
  }

  applyPreset(id, { ratio } = {}) {
    const g = this.game;
    const p = PRESETS[id];
    this.presetId = id;
    this.preset = p;

    // pós-processamento: antisserrilhado e passes de bloom
    g.postfx?.setQuality?.({ samples: p.msaa, bloomIterations: p.bloomIterations, quality: id === 'alta' ? 'high' : 'low' });

    // sombras do sol
    const r = g.renderer;
    const type = p.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    const typeChanged = r.shadowMap.type !== type;
    r.shadowMap.type = type;
    r.shadowMap.autoUpdate = p.shadowEvery <= 1;
    r.shadowMap.needsUpdate = true;
    const sun = g.atmosphere?.sun;
    if (sun && sun.shadow.mapSize.x !== p.shadowSize) {
      sun.shadow.mapSize.set(p.shadowSize, p.shadowSize);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
    if (typeChanged) this._refreshMaterials();

    // reavalia quem projeta sombra (objetos minúsculos ficam de fora nos modos leves)
    g._shadowSeen = new WeakSet();
    g.applyShadowFlags?.();

    // grama e flores decorativas
    this._applyDecor(p.decor);

    this.setRatio(ratio ?? p.maxRatio);
    this._cooldown = 2;
    this._slowWindows = 0;
    this._fastWindows = 0;
  }

  setRatio(ratio) {
    const g = this.game;
    const dpr = window.devicePixelRatio || 1;
    // nunca desenha acima da resolução real da tela
    const target = Math.min(ratio, dpr);
    this.ratio = Math.round(target * 100) / 100;
    g.renderer.setPixelRatio(this.ratio);
    g.renderer.setSize(window.innerWidth, window.innerHeight);
    g.postfx?.setSize(window.innerWidth, window.innerHeight);
  }

  /** Objetos pequenos (pedrinhas, folhas, partes de roupa) não precisam de sombra nos modos leves. */
  castsShadow(mesh) {
    if (this.preset.tinyCasters) return true;
    if (mesh.isInstancedMesh) return true;
    const geo = mesh.geometry;
    if (!geo) return true;
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const s = mesh.matrixWorld.getMaxScaleOnAxis();
    return geo.boundingSphere.radius * s >= TINY_RADIUS;
  }

  _applyDecor(fraction) {
    const w = this.game.world;
    const sets = [w?.grass?.meshes, w?.flowers?.meshes];
    for (const meshes of sets) {
      if (!meshes) continue;
      for (const m of meshes) {
        if (m.userData.fullCount === undefined) m.userData.fullCount = m.count;
        m.count = Math.max(1, Math.floor(m.userData.fullCount * fraction));
      }
    }
  }

  _refreshMaterials() {
    this.game.scene.traverse((o) => {
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      mats.forEach((m) => { m.needsUpdate = true; });
    });
  }

  /** Chamado uma vez por quadro, antes de desenhar. */
  update() {
    const r = this.game.renderer;
    this._frame++;
    if (!r.shadowMap.autoUpdate && this._frame % this.preset.shadowEvery === 0) r.shadowMap.needsUpdate = true;

    const now = performance.now();
    const dt = (now - this._last) / 1000;
    this._last = now;
    if (this.mode !== 'auto') return;
    if (dt > 0.25 || document.hidden) return; // aba escondida / travada pontual: ignora
    if (this._cooldown > 0) { this._cooldown -= dt; return; }

    this._acc += dt;
    this._frames++;
    if (this._acc < 1) return;
    const fps = this._frames / this._acc;
    this._acc = 0;
    this._frames = 0;
    this._adapt(fps);
  }

  _adapt(fps) {
    const p = this.preset;
    if (fps < 45) {
      this._fastWindows = 0;
      this._slowWindows++;
      if (this.ratio > p.minRatio + 0.001) {
        // queda proporcional: muito lento → desce mais rápido
        const step = fps < 30 ? 0.15 : 0.08;
        this.setRatio(Math.max(p.minRatio, this.ratio - step));
        this._cooldown = 1;
      } else if (this._slowWindows >= 3) {
        const next = ORDER[ORDER.indexOf(this.presetId) + 1];
        if (next) this.applyPreset(next, { ratio: Math.min(this.ratio, PRESETS[next].maxRatio) });
      }
    } else if (fps > 57) {
      this._slowWindows = 0;
      this._fastWindows++;
      // sobe devagar e só depois de alguns segundos estáveis
      if (this._fastWindows >= 4 && this.ratio < p.maxRatio - 0.001 && this.ratio < (window.devicePixelRatio || 1)) {
        this.setRatio(Math.min(p.maxRatio, this.ratio + 0.05));
        this._fastWindows = 0;
        this._cooldown = 1;
      }
    } else {
      this._slowWindows = 0;
      this._fastWindows = 0;
    }
  }
}
