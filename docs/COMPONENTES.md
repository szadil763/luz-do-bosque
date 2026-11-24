# COMPONENTES — ficha técnica de cada módulo

24 módulos JS + `index.html`. Para cada um: papel, exportações, dependências, API principal e
observações de implementação. Linhas referem-se aos arquivos em `CODIGO_FONTE/`.

---

## `index.html` (517 linhas)

- **Papel:** documento único. `<canvas id="game">`, HUD, controles de toque, 9 telas, estúdio de
  avatar, diálogo, CSS completo (linhas 7–350) e importmap do Three.
- **Estrutura:** `#game` · `#hud` (barras, minimapa, gear, avatar, quest, prompt, bossbar, toasts,
  motivation, hint, safe-badge, vignette, ability-bar) · `#touch` (joy, lookzone, 9 tbtns) ·
  `#screens` (loading, title, pause, settings, help, upgrades, inventory, quests, map, dead) ·
  `#avatar-studio` · `#dialogue`.
- **Importmap:** `{"three": "./vendor/three/three.module.js"}`; entrada `./src/main.js`.
- **Meta viewport:** `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no`.

## `src/main.js` (847 linhas) — classe `Game`

| Membro | Descrição |
|---|---|
| `boot()` | 4 etapas assíncronas + `startLoop()` |
| `setupRenderer()` | WebGLRenderer, cena, câmera 58°, PostFX com qualidade detectada |
| `setupCore()` | Input, Audio, Effects, CameraRig, Inventory, AvatarState, QuestManager, DialogueSystem, Motivation, Combat |
| `setupWorld()` | World + build('floresta') + Atmosphere.build() |
| `setupEntities()` | Player, Lantern, AncientGuardian `(-24,·,-22)`, EnemyManager, populate, poderes iniciais, posição `(0,y,7)` |
| `setupUI()` | HUD, Menus, AvatarStudio, FSM, `bindEvents()`, `applySettings()` |
| `bindEvents()` | ~40 assinaturas de eventos (ver ARQUITETURA §6) |
| `startLoop()/frame(dt)/renderFrame(dt)` | loop, hit-stop, telas, pós-processamento, sombras |
| `updatePlaying/updateCamera/spinCameraAtTitle` | atualização de gameplay e câmera |
| `makeCtx()` | contexto único com getters e `actions` |
| `give(id, amount)` | entrega item aplicando efeitos por `kind` |
| `gainXp(amount, silent)` / `level()` | XP e nível (150 XP por nível) |
| `applyLightAura()` | auréola do Amuleto da Luz |
| `applyAvatar(config)` | aplica visual + autosave |
| `buyUpgrade(id)` | compra melhoria com cristais |
| `startNew()/continueGame()/onPlayerDown()/respawn()` | fluxo de partida |
| `chooseDialogue/advanceDialogue/onDialogueClosed` | ponte com o DialogueSystem |
| `acceptQuest/startEscort/updateEscort` | missões e escolta do Téo |
| `updateTutorials()` | 5 dicas contextuais por proximidade |
| `onQuestCompleted(id)` | recompensas e casos especiais |
| `updateMusicTrack()` | escolha da trilha |
| `buildState()/autosave()/loadFromSave()` | persistência |
| `onResize()` | câmera/renderer/postfx |

Expõe `window.__game` para depuração e `window.__game.boot()` no carregamento.

## `src/core/state.js` (75)

- `class StateMachine(initial, states)` — `define`, `is`, `on('change')`, `set(name, payload)`,
  `update(dt)`; chama `exit`/`enter` e guarda `previous`/`time`.
- `class Emitter` — `on/off/emit` com `Set` por tipo e try/catch por listener.
- Utilidades: `clamp`, `lerp`, `damp(a,b,lambda,dt)`, `rand`, `randInt`, `dist2D`, `angleLerp`.

## `src/core/settings.js` (139)

- `DEFAULT_BINDINGS` (19 ações), `DEFAULT_MOUSE {attack:0, defense:2, special:1, toggle:3}`,
  `ACTION_LABELS`, `DEFAULTS`, `class Settings`.
- `Settings`: `get/set/patch`, getters `bindings`/`mouse`, `setBinding`, `setMouseBinding`,
  `label(action)`, `shortLabel(action)` (ex. “M1·J”), `keyLabel`, `load`, `persist`, `reset`.
- `MOUSE_NAMES`/`MOUSE_SHORT` corrigem a ordem dos botões do navegador.

## `src/core/save.js` (46)

- `class SaveManager(events)`: `has`, `read`, `write` (adiciona `savedAt`), `writeThrottled(data, s=20)`,
  `clear`. Chave `luzdobosque.save.v1`. Emite `save:written`.

## `src/core/input.js` (197)

- `ACTIONS` (chaves de `DEFAULT_BINDINGS`), `ACTION_LABELS`, `MOUSE_ACTIONS`,
  `class Input(canvas, settings, events)`.
- Estado: `down`, `pressed`, `released`, `mouse {x,y,nx,ny,dx,dy,wheel}`, `touchAxis {x,z}`,
  `lookDelta`, `capture`.
- API: `isDown`, `justPressed`, `justReleased`, `consume(...actions)`, `moveAxis()`,
  `setTouchAxis`, `addLookDelta`/`consumeLookDelta`, `actionForCode`, `actionForButton`,
  `beginCapture(action)`, `endFrame()`, `enabled`.
- Eventos: `input:key`, `input:capture`, `input:rebound`.
- Trata `pointerdown/move/up/cancel` no canvas e nos botões de toque.

## `src/core/audio.js` (232)

- `TRACKS` (5 trilhas com BPM/pad/baixo/melodia/perc), `midiToFreq`, `class AudioManager`.
- `unlock()`, `applyVolumes()`, `_startAmbientBed()`, `setTrack(name)`, `update(dt)`,
  `_playStep`, `sfx(name, opts)`, `_tone`, `_noise`.
- 33 nomes de efeito (tabela em ANIMACOES_E_AUDIO §6.4).

## `src/core/camera.js` (143)

- `class CameraRig(camera, settings)`: `yaw π`, `pitch 0.34`, `distance 8.2`.
- `shake`, `addLook`, `lookFromPointer`, `keyboardLook`, `autoAlign`, `update(dt, target, input, opts)`,
  `forward(v?)`, `right(v?)`, proteção de terreno (`terrainHeight + 0.7`).

## `src/player/player.js` (390)

- `class Player(scene, {settings, events, effects, audio, avatar})`; FSM `idle/run/jump/fall/land/dash/hurt/trick`.
- Campos: `radius .45`, `height 1.8`, `maxHealth/maxEnergy 100`, `armor 0`, `dashTimer`,
  `dashCooldown`, `invulnerable`, `jumpBuffer`, `coyote`, `grounded`, `moveSpeedRatio`.
- Métodos: `update`, `tryDash`, `rememberCamera`, `startTrick`, `takeDamage`, `heal`,
  `restoreEnergy`, getters `chestPosition/handPosition/isAlive/isMoving`, `setShieldActive`,
  `setAvatar(config)`, `_applyRig(rig)`, `_updateMaterials`, `_animate`, `_animateAir`, `_animateDash`.
- Callback `onRigRebuilt` para reanexar a lanterna à mão.

## `src/player/lantern.js` (627)

- `BIOME_POWERS` (7 biomas), `UPGRADES` (8), `TRICK_DEFS` (7), `class Lantern`.
- Visual: `group`, `core`, `coreInner`, `glow`, `light` (PointLight), `spot` (SpotLight),
  `shieldMesh`, `revealRing`.
- API: getters `stats`/`mode`/`modeLabel`, `setBiome`, `applyColor`, `applySkin`, `unlockMode`,
  `unlockTrick`, `upgradeLevel`, `nextUpgradeCost`, `applyUpgrade`, `applyRelic`, `_syncLight`,
  `cooldownReady`, `spend`, `update`, `castBeam`, `castCharged`, `castPulse`, `castReveal`,
  `castGrapple`, `_updateGrapple`, `cycleMode`, `_aimDirection`, `startTrick`, `_updateTrick`,
  `_restoreTransform`, `abilityState(settings)` (6 ícones do HUD), `serialize`, `load`.

## `src/systems/combat.js` (189)

- `class Combat(scene, deps)`: `projectiles`, `hitStop`, `spawn(opts)`, `remove`, `clearOwner`,
  `clear`, `update(dt, ctx)`, colisão com terreno/paredes, reflexo em cristais, dano em inimigos,
  chefe e jogador, eventos `combat:hit`/`combat:reflect`.

## `src/systems/enemies.js` (403)

- `ENEMY_TYPES` (sombra, cogumelo, espirito), `class Enemy` (build por tipo, IA, dano, purify,
  morte), `class EnemyManager` (`addSpawn`, `spawn(type, pos)`, `update`, `list`, `engaged`, `clear`).
- IA: perseguição com `damp`, contato (cooldown), ataque à distância do espírito, pulos do
  cogumelo, fuga da luz da sombra, purificação.

## `src/systems/miniboss.js` (349)

- `class AncientGuardian(scene, position, deps)`: `maxHp 320`, `radius 1.5`, `rewards`,
  `wake`, `takeDamage`, `_execute`, `_walkAnim`, `_defeat`, `update`, `serialize/load`
  (via `load({hp, defeated})`), estados `sleep/idle/telegraph/slam/shards/charge/hurt/defeated`.

## `src/systems/interactables.js` (440)

- `Interactable` (base), `Chest`, `Breakable`, `Lever`, `Door`, `CrystalNode`, `GlowFlower`,
  `SecretWall`, `Inscription`, `Checkpoint`, `GrapplePoint`, `Pickup`, `InteractionManager`.
- `InteractionManager`: `add`, `remove`, `list`, `byId`, `update(dt, ctx)` (detecta o mais próximo e
  emite `prompt:show/hide`), `interact(ctx)`.

## `src/systems/loot.js` (103)

- `ITEMS` (28 entradas), `CHEST_TIERS` (comum/raro/secreto), `rollChest(tier, depth)`,
  `class Inventory` (`add`, `remove`, `has`, `count`, `serialize`, `load`).

## `src/systems/npc.js` (1.134)

- `QUEST_ORDER`, `class QuestManager` (`defs` com 7 missões, `active`, `completed`, `isActive`,
  `has`, `canStart`, `start`, `currentStep`, `advance`, `setProgress`, `event`, `trackerText`,
  `serialize`, `load`).
- `NPC_DEFS` (9 NPCs com `lines` por nó, `choices` função, `portrait`), `MOODS`, `class NPC`
  (construção procedural, `_face`, `setExpression`, `reactToTrick`, `update`, `follow`,
  `stopFollowing`), `class DialogueSystem` (`open`, `startFor`, `resolveChoices`, `play`,
  `_emitLine`, `next`, `choose`, `close`).
- Nós de diálogo aceitam: string, string[], `{mood, text}`, função `(ctx) => string|string[]`.

## `src/systems/motivation.js` (45)

- `MOTIVATION_LINES` (6 frases), `class Motivation`: `say(text)`, `random()`, `update(dt, {paused, exploring})`
  com intervalo `rand(85,135)` s.

## `src/world/biome.js` (1.162)

- `BIOME_LIST` (7 biomas), `mulberry32(seed=20261020)`, `class World`.
- Terreno/colisão: `terrainHeight`, `groundHeightAt`, `resolveCollision`, `projectileBlocked`,
  `isSafe`, `setRespawn`.
- Helpers: `_mat`, `_box`, `_wall`, `_platform`, `_instanced`, `addGlowPoint`, `spawnPickup`,
  `revealNear`, `reactToPower`, `growRootBridge`.
- Construção: `build('floresta')`, `_buildFireflies`, `_buildCamp`, `_addBreakable`, `_addChest`,
  `_buildRuins`, `_buildMeadow`, `_buildAncientClearing`, `_buildPlateau`, `_buildHiddenGrove`,
  `_makeLever`, `leversPulled`, `onLeverPulled`, `_buildSecrets`, `_buildCrystals`, `lightCrystal`,
  `_buildBiomeGate`, `_buildInscriptions`, `_buildNPCs`, `_buildEnemies`, `populate`.
- Loop: `update(dt, ctx)` (fogo, água, vaga-lumes, animações, brilho das plantas, recarga de cristais),
  `mapData()`, `serialize()`, `load()`.

## `src/world/questland.js` (633)

- `ZONES` (5), `class QuestLand(world)`: `build`, `buildDarkGrove`, `buildCave`, `buildLostLights`,
  `buildNightTemple`, `refreshNightPedestal`, `_buildNightGate`, `openNightGate`, `openRiddle`,
  `applyFlags`, `update`; `buildQuestLand(world)`.
- Conteúdo: Lanterna Antiga, Pedra Rachada, Cristal Luminoso, 3 símbolos, Pedra Sussurrante,
  5 fragmentos luminosos, criatura presa, Altar de Luz, Pedra da Lua/Estrelas, pedestal do segredo,
  véu da noite e Bosque da Noite Estrelada.

## `src/world/graphics.js` (578)

- `enableShadows`, `makeTerrainMaterial()`, `buildGrassField(scene, world, rng, {count=3800})`,
  `buildFlowerField(..., {count=520})`, `makeWaterMaterial({center, radius, deep, light})`,
  `buildWaterfall(scene, effects, {x,y,z,width=2.6,height=5.2,facing})`,
  `buildDistantLandscape(scene, {terrainHeight})`.
- Shaders: terreno com detalhe procedural (`TERRAIN_COMMON`), grama com vento, água com fresnel.
- Exporta `grassWind` (uniforme compartilhado de vento).

## `src/world/atmosphere.js` (713)

- `DAY_SECONDS 480`, `WEATHER_RAMP 0.4`, `SKY_KEYS` (10), `WEATHER_INFO`,
  `class Atmosphere(scene, {world, settings, events, effects})`.
- API: `build`, `_takeLights`, `_buildSky`, `_buildStars`, `_buildLeaves`, `_buildClouds`,
  `_buildWeather`, `applyWind(material, amp)`, `setWeather(id)`, `_cycleWeather`, `_updateWeather`,
  `_animateRain/_animateSnow/_animateSand`, `_sampleSky`, `_applySky`, `_updateWater`,
  `_updateLeaves`, `_emitStatus`, `update(dt, focus)`.
- Campos usados pelo resto: `sunDir`, `sunIntensity`, `mix`, `warmth`, `night`, `wind`, `hours`.

## `src/world/postfx.js` (388)

- Shaders: `QUAD_VERT`, `BRIGHT_FRAG`, `BLUR_FRAG`, `RAYS_FRAG`, passe final (ACES/grading/vinheta/grão).
- `class PostFX(renderer, scene, camera, {quality})`: `enabled`, `hdr`, `samples`, `bloomStrength`,
  `rayStrength`, `exposure`, `saturation`, `vignette`, `grain`, `setLook`, `setSun`, `setSize`,
  `render(dt)`.

## `src/world/effects.js` (244)

- `makeGlowTexture()` (canvas radial 128), `MAX_PARTICLES 900`, `class Effects(scene, settings)`.
- API: `burst`, `ring`, `trail`, `beam`, `flash`, `attachGlow`, `_sprite`, `update(dt)`,
  `get intensity`.

## `src/ui/hud.js` (316)

- `class HUD({events, settings, input, audio})`: cache de elementos, `bindEvents` (prompt, toast,
  motto, status), `bindTouch` (joystick + lookzone + tbtns), `applyTouchPreference`, `setVisible`,
  `toast`, `motto`, `hint`, `hideHint`, `update(dt, ctx)`, `setBoss`, `drawMinimap`.

## `src/ui/menus.js` (692)

- `class Menus({events, settings, input, audio, save, hud})`; `screens` (9 telas), `current`,
  `returnTo`, `game`.
- `wireStatic`, `advanceDialogue`, `updateTitleButtons`, `open(id)`, `back()`, `hideAll`, `show(id)`,
  getter `isOpen`, `renderSettings`, `renderHelp`, `renderUpgrades`, `renderInventory`,
  `renderQuests`, `renderMap`, `drawFullMap`, `showDialogue`, `typeText`, `finishTyping`,
  `showChoices`, `hideDialogue`, `drawPortrait(canvas, spec, mood)`, `updatePauseStats(game)`.

## `src/ui/avatar-studio.js` (438)

- `TABS` (7), `class AvatarStudio({events, settings, audio, game})`.
- `show`, `hide`, `_setupScene` (renderer próprio + luzes), `_rebuildPreview`, `_resize`, `_loop`,
  `_wire`, `_locked`, `_choose`, `_tryUnlock`, `_apply`, `_reset`, `close`, `_close`, `render`,
  `_sectionTitle`, `_grid`, `_cards`, `_card`, `_colors`, `_expressions`, `_animeItems`.

## `src/avatar/catalog.js` (199)

- Dados puros: `RARITY`, `RARITY_ORDER`, `COSTS`, `ANIME_COLLECTIONS`, `SPECIES` (7), `EXPRESSIONS` (5),
  `OUTFITS` (13), `HAIRS` (9), `HEADS` (8), `FACES` (8), `BACKS` (9), `AURAS` (7), `BODY_COLORS` (8),
  `OUTFIT_COLORS` (8), `HAIR_COLORS` (8), `DEFAULT_AVATAR`, `ALL_ITEMS`, `listFor`, `itemById`,
  `itemCost`.

## `src/avatar/builder.js` (1.077)

- `buildAvatar(config)` → rig `{group, body, torso, head, face, armL/R, legL/R, handSocket,
  materials, updaters, update, parts}`.
- Construtores: `buildPenguin`, `buildIceCream`, `buildMammal(kind)`, `buildStar`;
  acessórios: `buildHair`, `buildHeadItem`, `buildFaceItem`, `buildBackItem`, `buildAura`,
  `buildOutfit`; utilidades `bigEyes`, `mouth`, `blush`; `disposeAvatar(rig)`.
- Cada peça registra `rig.updaters.push((dt,t)=>...)` para animações próprias.

## `src/avatar/avatar-state.js` (50)

- `class AvatarState`: `config`, `unlocked` (Set de `"slot:id"`), `has`, `unlock`, `unlockedIn`,
  `count`, `apply`, `reset`, `serialize`, `load` (garante que o visual salvo esteja desbloqueado).

## `vendor/three/three.module.js`

- Three.js **r160** completo (build ESM), 53.044 linhas. Não modificar; resolver pelo importmap.
