// Pós-processamento cinematográfico do bosque.
//
// A cena é desenhada em um render target HDR (linear, sem tone mapping), passa
// por extração de brilho + blur separável (bloom), raios de luz radiais
// (god rays a partir da posição do sol na tela) e um passe final com tone
// mapping ACES, color grading, vinheta e grão sutil.
//
// Tudo com shaders próprios — sem dependências externas (o three é vendado sem
// os addons de EffectComposer).

import * as THREE from 'three';

const QUAD_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const BRIGHT_FRAG = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform float uThreshold;
  uniform float uKnee;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float luma = max(c.r, max(c.g, c.b));
    float soft = clamp(luma - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 1e-4);
    float contribution = max(luma - uThreshold, soft) / max(luma, 1e-4);
    gl_FragColor = vec4(c * contribution, 1.0);
  }
`;

const BLUR_FRAG = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform vec2 uDirection;
  varying vec2 vUv;
  void main() {
    // gaussiano de 9 amostras (5 coefs + simetria)
    float w0 = 0.2270270270;
    float w1 = 0.1945945946;
    float w2 = 0.1216216216;
    float w3 = 0.0540540541;
    float w4 = 0.0162162162;
    vec3 acc = texture2D(tDiffuse, vUv).rgb * w0;
    acc += texture2D(tDiffuse, vUv + uDirection * 1.0).rgb * w1;
    acc += texture2D(tDiffuse, vUv - uDirection * 1.0).rgb * w1;
    acc += texture2D(tDiffuse, vUv + uDirection * 2.0).rgb * w2;
    acc += texture2D(tDiffuse, vUv - uDirection * 2.0).rgb * w2;
    acc += texture2D(tDiffuse, vUv + uDirection * 3.0).rgb * w3;
    acc += texture2D(tDiffuse, vUv - uDirection * 3.0).rgb * w3;
    acc += texture2D(tDiffuse, vUv + uDirection * 4.0).rgb * w4;
    acc += texture2D(tDiffuse, vUv - uDirection * 4.0).rgb * w4;
    gl_FragColor = vec4(acc, 1.0);
  }
`;

const RAYS_FRAG = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform vec2 uSun;
  uniform float uDensity;
  uniform float uDecay;
  uniform float uWeight;
  varying vec2 vUv;
  const int STEPS = 24;
  void main() {
    vec2 delta = (vUv - uSun) * (uDensity / float(STEPS));
    vec2 uv = vUv;
    vec3 acc = vec3(0.0);
    float decay = 1.0;
    for (int i = 0; i < STEPS; i++) {
      uv -= delta;
      vec2 clamped = clamp(uv, vec2(0.0), vec2(1.0));
      acc += texture2D(tDiffuse, clamped).rgb * decay;
      decay *= uDecay;
    }
    acc /= float(STEPS);
    gl_FragColor = vec4(acc * uWeight, 1.0);
  }
`;

const COMPOSITE_FRAG = /* glsl */`
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform sampler2D tRays;
  uniform vec2 uResolution;
  uniform vec3 uSunColor;
  uniform float uExposure;
  uniform float uBloom;
  uniform float uRays;
  uniform float uTime;
  uniform float uVignette;
  uniform float uSaturation;
  uniform float uWarmth;
  uniform float uNight;
  uniform float uGrain;
  varying vec2 vUv;

  vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
  vec3 toSRGB(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)); }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec2 centered = vUv - 0.5;
    float r2 = dot(centered, centered);

    // aberração cromática bem discreta nas bordas (lente de cinema)
    float ca = 0.0022 * r2;
    vec3 col;
    col.r = texture2D(tScene, vUv + centered * ca).r;
    col.g = texture2D(tScene, vUv).g;
    col.b = texture2D(tScene, vUv - centered * ca).b;

    col += texture2D(tBloom, vUv).rgb * uBloom;
    col += texture2D(tRays, vUv).rgb * uRays * uSunColor;

    col *= uExposure;

    // grading: sombras frias à noite, altas-luzes douradas no crepúsculo
    col = mix(col, col * vec3(0.93, 0.99, 1.12), uNight * 0.6);
    col = mix(col, col * vec3(1.10, 1.01, 0.90), uWarmth * 0.7);

    col = aces(col);

    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(luma), col, uSaturation);
    col = clamp((col - 0.5) * 1.055 + 0.5, 0.0, 1.0);

    float vig = 1.0 - smoothstep(0.16, 0.86, r2 * 1.9);
    col *= mix(1.0, 0.55 + vig * 0.45, uVignette);

    col = toSRGB(col);

    float grain = hash(vUv * uResolution + fract(uTime) * 57.0) - 0.5;
    col += grain * uGrain;

    gl_FragColor = vec4(col, 1.0);
  }
`;

class FullScreenQuad {
  constructor(material) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  render(renderer, target) {
    renderer.setRenderTarget(target || null);
    renderer.render(this.scene, this.camera);
  }
}

const makeTarget = (w, h, { samples = 0, type = THREE.HalfFloatType } = {}) => {
  const target = new THREE.WebGLRenderTarget(Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h)), {
    type,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
    samples,
  });
  target.texture.generateMipmaps = false;
  return target;
};

export class PostFX {
