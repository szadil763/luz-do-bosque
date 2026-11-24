# ANIMAÇÕES, CÂMERA, EFEITOS E ÁUDIO

Não existe nenhum arquivo de áudio ou animação no projeto. **Tudo é procedural**:
animações são funções trigonométricas sobre o rig; sons são sintetizados por WebAudio.

---

## 1. Animação do jogador (procedural, `Player`)

O corpo é montado por `buildAvatar()` e expõe `legL, legR, armL, armR, body, torso, head, face,
scarfTail, handSocket`. As animações são aplicadas por estado da FSM com interpolação exponencial
(`lerp(a, b, 1 - e^(-k·dt))`).

### `_animate(dt, speedRatio)` — idle / run / land / hurt / trick
```
t = tempo em segundos
run = clamp(speedRatio, 0, 1.3)
swing = sin(t · 11) · 0.75 · run
legL.rotation.x → swing      (k = 14)
legR.rotation.x → -swing     (k = 14)
armL.rotation.x → -swing·0.8 (k = 12)
body.position.y = 0.02 + |sin(t·11)| · 0.07 · run      // quique do passo
body.rotation.z → sin(t·11) · 0.035 · run              (k = 10)
torso.rotation.x → 0.1 · run                           (k = 8)
scarfTail.rotation.x = 0.3 + sin(t·6)·0.16 + run·0.4
head.rotation.z = sin(t·5.5) · 0.03                    // balanço da cabeça
```

### `_animateAir(dt, dir)` — jump (dir = −1) / fall (dir = +1)
```
alvo das pernas = dir<0 ? -0.9 : 0.5 ; perna oposta = -alvo·0.6
braços → -2.1 (para cima)
body.scale.y → dir<0 ? 1.06 : 0.97   (estica ao subir, achata ao cair)
body.scale.x = body.scale.z → dir<0 ? 0.95 : 1.02
```

### `_animateDash(dt)`
```
legL → -1.5 ; legR → -1.2 (pernas para trás) ; body.rotation.z → 0.2
body.scale = (0.94, 0.94, 1.12)   // esticado no sentido do movimento
body.position.y = 0.3
```

### Micro-animações permanentes
- **Piscada:** `_blink` decrementa; a cada ~3,5 s (2 % de chance por quadro) fecha os olhos por
  0,12 s (`face.scale.y` 1 → 0,06 com k = 18).
- **Flash de dano:** materiais com `emissive` recebem `(hurtK·0.55, 0, 0)`.
- **Sombra de contato:** escala `clamp(1 − altura·0.16, 0.45, 1)`, opacidade `0.34 × escala`.
- **Passos:** `stepPhase += dt·8.5·clamp(speedRatio,0.4,1.5)`; cada π de fase toca `sfx('step')`.
- **Poeira de pouso:** burst `#d8e8ff`, 10 partículas, quando cai com `v.y < −3`.

### Rig dos avatares (`avatar/builder.js`)
`rig.updaters` é uma lista de funções `(dt, t)` executadas por `rig.update(dt, t)`:
- gema da coroa gira (`gem.rotation.y += dt·2`, flutua `sin(t·2)·0.02`);
- `scouter` pisca (`opacity 0.5 + sin(t·6)·0.5`);
- asas/vassoura/capa/esferas têm updaters próprios (rotação, ondulação, órbitas);
- aura pulsa; esferas do dragão orbitam; estrela balança (`sin(t·0.8)·0.05`).

## 2. Animação de NPCs, inimigos e chefe

- **NPC** (`systems/npc.js`): construído por `_build()` com `_face(y,z,scale)` para olhos/boca;
  `setExpression(mood, duration)` troca a expressão (happy, warm, sad, afraid, surprise, calm,
  hopeful, proud, neutral); `_updateFace(dt)` interpola; flutuação suave no idle; `reactToTrick()`
  faz uma reação (pulo/giro) quando o jogador usa manobra por perto; `follow()`/`stopFollowing()`
  para a escolta do Téo.
- **Inimigos:** sombra flutua (`floats`), cogumelo salta (`hops`, `hopTimer rand(0.4,1.4)`),
  espírito paira e atira. Olhos são `MeshBasicMaterial` na cor `eye` (sempre visíveis no escuro).
- **Chefe:** `_walkAnim(dt, speed)`, braços `armL/armR.rotation.x` (−1,6 no slam; −2,4 no arremesso),
  cristal gira `dt·1.4` (normal) / `dt·5` (vulnerável) e escala 1 → 1,35; anel de aviso pulsa
  `0.4 + sin(now/90)·0.35`; morte: escala cai a 0 em 1,6 s girando `dt·3` com fade de opacidade.

## 3. Câmera (`core/camera.js`)

| Comportamento | Detalhe |
|---|---|
| Órbita por cursor | `lookFromPointer`: zona morta `0.14`; `yaw -= sign(nx)·(|nx|−0.14)·3.4·sens·dt·0.7`; `pitch` limitado a `[-0.35, 1.15]` |
| Setas | `yaw ±2.4·sens·dt`; `pitch ±1.8·dt` (com `invertY`) |
| Arraste no toque | `input.addLookDelta` → `addLook(dx,dy)`: `yaw -= dx·0.0022·sens`, `pitch += dy·0.0018·sens` |
| Zoom | roda do mouse altera `targetDistance` (padrão `8.2`) |
| Auto-align | após `2.2 s` sem entrada manual (`manualTimer`), alinha o yaw atrás do movimento com `damp` |
| Colisão com terreno | a câmera nunca desce abaixo de `terrainHeight + 0.7` |
| Tremor | `shake(amount)` acumula até `0.6`, decai com o tempo |
| Título | `spinCameraAtTitle`: `yaw += dt·0.06` (giro lento ao redor do acampamento) |

## 4. Efeitos (`world/effects.js`)

- Textura de brilho gerada em canvas 128×128 (gradiente radial branco).
- **Pool de 900 partículas** em `BufferGeometry` com `ShaderMaterial` aditivo
  (`gl_PointSize = size · 320 / -mv.z`), atributos `position, color, size, alpha`.
- API: `burst(pos, {color,count,speed,size,life,gravity})`, `ring(pos, {color,from,to,life,opacity})`,
  `trail(pos, color, size, offset?)`, `beam(from, to, color, life)`, `flash(pos, color, intensity, radius)`,
  `attachGlow(mesh|group, color, size)`, `_sprite(color, size)`.
- Intensidade global multiplicada por `settings.fx` (0–1,5).

| Momento | Efeito |
|---|---|
| Raio de luz | burst branco 6 partículas + rastro |
| Disparo carregado | anel 0,3→3,4 + burst 26 partículas |
| Pulso | anel até `pulseRadius·2` + 34 partículas + flash + anel de tela |
| Revelação | anel roxo-claro 0,5→15 + brilho persistente por 2,6 s |
| Escudo | rastro no peito a cada quadro + esfera pulsante |
| Dash | anel ciano 0,4→2,2 + rastro |
| Dano recebido | vinheta vermelha + flash emissivo |
| Baú | burst dourado 30 + flash |
| Purificação | sons ascendentes + partículas na cor do poder |
| Chefe | anel de aviso no chão, poeira no slam, projéteis com rastro |

## 5. Transições de tela

| Transição | Duração | Implementação |
|---|---|---|
| Toast | `.25 s` | `@keyframes pop` (translateY 8px → 0, opacidade 0 → 1) |
| Diálogo abre | `.28 s` | `@keyframes dlgIn` (translate(-50%,14px) → 0) |
| Escolhas | `.25 s` | `choiceIn` (translateX(-6px) → 0), em cascata por `animation-delay` |
| Frase motivacional | `.6 s` + fade `.5 s` | `mottoIn` (scale .97 → 1) |
| Retrato | 3,4 s loop | `portraitFloat` (sobe 3 px) |
| Cursor de digitação | .8 s steps(1) | `caret` (opacidade 0/1) |
| Selo mítico | 3 s loop | `mythicGlow` (brilho rosa ↔ azul) |
| Telas | instantâneo | troca de classe `.hidden` (`display:none !important`) |

## 6. Áudio (`core/audio.js`)

### 6.1 Arquitetura
- `AudioContext` criado no **primeiro gesto** (`unlock()` em `pointerdown`/`keydown`, `once`).
- Cadeia: `master (0.9)` → `musicGain (music·0.6)`, `sfxGain (sfx·0.85)`, `ambientGain (ambient·0.35)`.
- **Ambiente:** buffer de ruído marrom de 4 s em loop, filtro lowpass 420 Hz com LFO de 0,06 Hz
  (profundidade 180) — “vento do bosque”.
- Sintetizadores: `_tone({freq, to, dur, type, gain, when, attack, delay})` (oscilador + envelope) e
  `_noise({dur, gain, freq, q})` (ruído filtrado).

### 6.2 Trilhas musicais (step = `60/bpm/4`, 16 passos, notação MIDI)

| id | BPM | Pad | Onda do pad | Baixo (16 passos) | Melodia | Onda | Percussão |
|---|---|---|---|---|---|---|---|
| `explore` | 82 | 57,64,69 | triangle | 45,-1,45,-1,43,-1,43,-1,41,-1,41,-1,43,-1,45,-1 | 69,-1,72,76,-1,74,72,-1,69,-1,67,69,-1,71,72,-1 | sine | soft |
| `safe` | 66 | 60,64,67 | sine | 48,-1,-1,-1,55,-1,-1,-1,53,-1,-1,-1,48,-1,-1,-1 | 72,74,76,-1,79,-1,76,74,72,-1,74,-1,76,-1,-1,-1 | triangle | none |
| `combat` | 124 | 50,57 | sawtooth | 38,38,-1,38,41,41,-1,41,36,36,-1,36,43,43,41,41 | 74,-1,77,74,79,-1,77,74,72,-1,74,77,-1,76,74,-1 | square | beat |
| `boss` | 132 | 45,52 | sawtooth | 33,33,40,33,35,35,42,35,33,33,40,33,31,31,38,38 | 69,72,76,79,76,72,69,72,71,74,78,81,78,74,71,74 | square | beat |
| `secret` | 92 | 60,67,72 | triangle | 48,-1,53,-1,55,-1,53,-1,52,-1,55,-1,57,-1,52,-1 | 84,86,88,91,88,86,84,86,83,86,88,91,88,91,93,96 | sine | none |

Regras: baixo em `step` (dur 1,8 step, triangle, gain 0,11); melodia (dur 1,4 step, ganho por
trilha 0,055–0,075); pad a cada 8 passos (dur 16 steps, attack 0,6, ganho 0,035–0,06);
`perc:'beat'` toca ruído em `step%4==2` e `step%8==0` (160 Hz); `perc:'soft'` em `step%8==4` (900 Hz).
`setTrack(name)` reinicia o passo; se o áudio não estiver pronto, guarda `pendingTrack`.
`update(dt)` consome até 4 passos por quadro (guarda contra lag).

### 6.3 Escolha automática de trilha (`Game.updateMusicTrack`, a cada 0,8 s)
```
chefe acordado e vivo → boss
inimigos engajados      → combat
área segura             → safe
interação secreta revelada a < 10 u → secret
caso contrário          → explore
```

### 6.4 Efeitos sonoros (33 nomes)

| nome | síntese |
|---|---|
| `beam` | sine 900→300 Hz, 0,22 s |
| `charge` | triangle 220→1200, 1,1 s |
| `chargedShot` | sawtooth 1400→180, 0,5 s |
| `pulse` | sine 300→90, 0,5 s |
| `shield` | sine 520→780, 0,35 s |
| `shieldHit` | triangle 1200→600, 0,18 s |
| `dash` | ruído 0,28 s (1200 Hz) + sine 700→1500 |
| `jump` | sine 420→760, 0,18 s |
| `land` | ruído 0,12 s (300 Hz) |
| `hit` | square 260→120, 0,16 s |
| `hurt` | sawtooth 180→90, 0,4 s |
| `coin` | sine 1180 Hz + 1560 Hz (delay 0,07) |
| `crystal` | sine 1320 Hz + 1980 Hz (delay 0,05) |
| `chest` | arpejo 523/659/784/1046 (triangle, delay 0,09) |
| `secret` | arpejo 784/988/1174/1568 (sine, delay 0,12) |
| `purify` | arpejo 660/880/1100 (sine, delay 0,1) |
| `trick` | triangle 900→1800, 0,3 s |
| `step` | ruído 0,07 s (500 Hz) |
| `ui` | sine 660 Hz, 0,09 s |
| `door` | ruído 0,7 s (200 Hz) + sawtooth 120→70 |
| `lever` | square 300→500, 0,2 s |
| `crystalHit` | sine 1800→900, 0,35 s |
| `grapple` | triangle 500→1400, 0,3 s |
| `quest` | arpejo 659/784/1046 (triangle, delay 0,12) |
| `heal` | arpejo 523/698/880 (sine, delay 0,1) |
| `levelup` | arpejo 523/659/784/1046/1318 (triangle, delay 0,1) |
| `bossAlert` | sawtooth 140→90, 1,1 s |
| `bossSlam` | ruído 0,4 s (120 Hz) |
| `save` | sine 880 Hz + 1320 Hz (delay 0,12) |
| `hurtSoft` | sine 400→240, 0,2 s |
| `talk` | sine 720→900, 0,055 s (620 Hz se `soft`) — “voz” da digitação |
| `talkLow` | triangle 300→340, 0,06 s — vozes graves |

### 6.5 Sincronização
- A digitação do diálogo toca `talk`/`talkLow` a cada caractere (`typeText`), criando a “voz”.
- `step` é disparado pela fase da caminhada (π), não por timer.
- O `hitStop` do combate **não** afeta o áudio (`audio.update(dt)` usa o `dt` real).
- Música para de tocar quando `TRACKS[track]` não existe (`'none'` antes do desbloqueio).

## 7. Regras de ouro para a reconstrução

1. Não substituir animações procedurais por clipes importados: os números acima (frequências,
   fatores, constantes de amortecimento) são a identidade do movimento.
2. Não trocar o áudio por arquivos: as trilhas e efeitos são dados (BPM, MIDI, ondas, ganhos).
3. Manter `settings.music/sfx/ambient` como ganhos independentes e o `unlock()` no primeiro gesto.
4. Manter a ordem `boss > combat > safe > secret > explore` na escolha da trilha.
