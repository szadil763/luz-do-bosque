# ARQUITETURA — Luz do Bosque

Documento derivado da leitura integral de `src/` (24 módulos) e `index.html`.

---

## 1. Visão de alto nível

O jogo é uma **aplicação de página única sem framework**: um único `<canvas id="game">` recebe
o `WebGLRenderer` do Three.js; o resto da interface é DOM puro (divs/botões/canvas 2D) descrito em
`index.html` e manipulado por `src/ui/*.js`.

```
index.html (DOM + CSS + importmap)
   └── src/main.js  ── Game ──────────────────────────────────────────────┐
         ├── core/state.js      (StateMachine, Emitter, utilidades)       │
         ├── core/settings.js   (opções + bindings + localStorage)        │
         ├── core/save.js       (localStorage luzdobosque.save.v1)        │
         ├── core/input.js      (teclado/mouse/toque → ACTIONS)           │
         ├── core/audio.js      (WebAudio: 5 trilhas + 33 sfx)            │
         ├── core/camera.js     (CameraRig orbital)                       │
         ├── world/effects.js   (pool de 900 partículas + sprites/anéis)  │
         ├── world/biome.js     (World: terreno, colisão, Floresta)       │
         │     ├── world/questland.js   (4 zonas de missão)               │
         │     ├── world/graphics.js    (materiais/vegetação/água/cenário)│
         │     ├── systems/interactables.js (objetos interativos)         │
         │     ├── systems/loot.js      (ITEMS/baús)                      │
         │     └── systems/npc.js       (NPCs + diálogo + QuestManager)   │
         ├── world/atmosphere.js (dia/noite, céu, clima, vento, luzes)    │
         ├── world/postfx.js     (HDR → bloom → god rays → ACES)          │
         ├── player/player.js    (movimento, física, dano, animação)      │
         ├── player/lantern.js   (poderes, energia, melhorias, manobras)  │
         ├── systems/combat.js   (projéteis + dano + reflexo)             │
         ├── systems/enemies.js  (3 tipos + IA)                           │
         ├── systems/miniboss.js (Guardião Antigo)                        │
         ├── systems/motivation.js (frases motivacionais)                 │
         ├── ui/hud.js           (barras, habilidades, minimapa, toasts)  │
         ├── ui/menus.js         (9 telas + diálogo + retratos)           │
         ├── ui/avatar-studio.js (estúdio com 2º WebGLRenderer)           │
         ├── avatar/avatar-state.js (config + desbloqueios)               │
         ├── avatar/catalog.js   (dados de cosméticos)                    │
         └── avatar/builder.js   (geometria procedural do avatar)         │
```

## 2. Grafo de dependências (real, extraído dos `import`)

```
state.js        → (nenhum)                          [base de todos]
settings.js     → (nenhum)
save.js         → (nenhum)
audio.js        → (nenhum)
postfx.js       → (nenhum)
catalog.js      → (nenhum)
graphics.js     → state
input.js        → settings, state
camera.js       → state
effects.js      → state
combat.js       → state
enemies.js      → state
miniboss.js     → state
loot.js         → state
motivation.js   → state
npc.js          → state
interactables.js→ state, loot
questland.js    → state, interactables
atmosphere.js   → state, graphics
biome.js        → state, effects, interactables, loot, npc, questland, graphics
avatar-state.js → catalog
builder.js      → catalog
avatar-studio.js→ catalog, builder
player.js       → state, builder, catalog
lantern.js      → state
hud.js          → state
menus.js        → state, lantern, loot, biome, input
main.js         → todos os anteriores
```

Não há ciclos. `main.js` é o único orquestrador; nenhum módulo de sistema conhece o `Game`
diretamente — a comunicação acontece por **eventos** (`Emitter`) e pelo objeto `ctx`.

## 3. Inicialização (`Game.boot()`)

`boot()` executa 4 etapas assíncronas, cada uma precedida por uma atualização da tela de carregamento
(`step(text, progress)` grava em `#loading-text` e escala `#loading-fill`):

| # | Texto exibido | Função | O que cria |
|---|---|---|---|
| 1 | “Acendendo a lanterna mágica…” | `setupCore()` | `Input`, `AudioManager`, `Effects`, `CameraRig`, `Inventory`, `AvatarState`, `QuestManager`, `DialogueSystem`, `Motivation`, `Combat` |
| 2 | “Plantando a Floresta Encantada…” | `setupWorld()` | `World` + `build('floresta')`, `Atmosphere().build()` |
| 3 | “Acordando criaturas e amizades…” | `setupEntities()` | `Player`, `Lantern`, `AncientGuardian`, `EnemyManager`, `world.populate()`, poderes iniciais, posição no acampamento `(0, terreno, 7)` |
| 4 | “Ligando a música do bosque…” | `setupUI()` | `HUD`, `Menus`, `AvatarStudio`, FSM do jogo, `bindEvents()`, `applySettings()` |
| — | “Pronto para explorar!” | — | `ready = true`, `fsm.set('title')`, `menus.updateTitleButtons()`, `startLoop()` |

`setupRenderer()` roda antes de tudo: cria o `WebGLRenderer` (`antialias:false`, `powerPreference:'high-performance'`,
pixelRatio máx. 1,8, `outputColorSpace = SRGB`, `toneMapping = ACESFilmic`, exposição 1.1, `shadowMap` PCFSoft),
a `Scene`, a `PerspectiveCamera(58, aspect, 0.1, 420)` e instancia `PostFX` com `quality: 'low'|'high'`.

**Detecção de qualidade** (`main.js`, `setupRenderer`):
```js
software = /swiftshader|llvmpipe|software|basic/i.test(gpuName)   // via WEBGL_debug_renderer_info
lowPower = software || innerWidth < 620 || hardwareConcurrency <= 4
postfx = new PostFX(..., { quality: lowPower ? 'low' : 'high' })
```
`'low'` = sem MSAA, 1 passe de bloom, bloomStrength 0,5; `'high'` = 4 amostras HDR, 2 passes, 0,72.

## 4. Máquina de estados do jogo

```js
new StateMachine('loading', {
  title:   { enter: () => { menus.show('title'); hud.setVisible(false); } },
  playing: { enter: () => { menus.hideAll(); hud.setVisible(true); applySettings(); } },
  paused:  { enter: () => { menus.open('pause'); menus.updatePauseStats(game); } },
  dead:    { enter: () => { menus.show('dead'); } },
});
```
`paused` é usado por **qualquer** tela aberta (opções, mochila, missões, mapa, estúdio, diálogo).
Com o jogo pausado o mundo continua animando a 15 % da velocidade (`world.update(dt*0.15)`) e os
efeitos a 40 %, mas o jogador/inimigos não são atualizados (`updatePlaying` não roda).

## 5. Loop principal

```js
startLoop(): dt = clamp((now-last)/1000, 0, 0.05)   // teto de 50 ms por quadro
frame(dt):
  slow = combat.hitStop > 0 ? 0.35 : 1              // hit-stop de impacto
  d = dt * slow
  audio.update(dt)                                   // música independe do hit-stop
  atmosphere.update(playing ? dt : dt*0.5, player.position)
  if title|loading:  world.update → effects.update → spinCameraAtTitle → input.endFrame → renderFrame
  if dead:           world.update → effects.update → updateCamera → input.endFrame → renderFrame
  teclas de conforto (diálogo/pausa/menus) com input.consume(...)
  locked = menus.isOpen || fsm.is('paused')
  world.update(locked ? dt*0.15 : d, ctx)
  hud.update(dt, ctx)
  locked ? (effects.update(dt*0.4), updateCamera(dt)) : (updatePlaying(d, ctx), playtime += d)
  input.endFrame()
  renderFrame(dt)
```

`renderFrame(dt)` → `updatePostFX()` (sol na tela, clima) → `postfx.render(dt)`; a cada 2,5 s
`applyShadowFlags()` percorre a cena e liga `castShadow/receiveShadow` em meshes novos.

### Ordem de atualização em `updatePlaying(dt, ctx)`

1. `pause` / `map` (teclas) → abre tela e retorna
2. diálogo aberto → `advanceDialogue()` e retorna (só câmera atualiza)
3. `player.rememberCamera()` + `player.update()`
4. `lantern.update()` (mira, escudo, ataque/poderes, recarga, revelação, gancho, manobras)
5. `world.interactions.update()` + tecla `interact` → `interact(ctx)`
6. `enemies.update()`
7. `miniboss.update()`
8. `npc.update()` para cada NPC
9. `combat.update()` (projéteis, dano, reflexo)
10. `updateEscort()`, `updateTutorials()`, `motivation.update()`
11. `updateCamera()`, `effects.update()`
12. a cada 0,8 s `updateMusicTrack()`; a cada 25 s `autosave()`

## 6. Barramento de eventos (nomes reais)

Emitidos: `audio:track`, `avatar:applied`, `avatar:closed`, `avatar:unlocked`, `boss:damage`,
`boss:defeated`, `boss:phase`, `boss:start`, `boss:summon`, `boss:vulnerable`, `camera:shake`,
`checkpoint:reached`, `chest:opened`, `combat:hit`, `combat:reflect`, `dialogue:choice`,
`dialogue:close`, `dialogue:closed`, `dialogue:next`, `dialogue:open`, `door:opened`,
`enemy:defeated`, `enemy:purified`, `game:continue`, `game:load`, `game:new`, `game:quit`,
`game:respawn`, `game:resume`, `game:save`, `game:skin`, `game:upgrade`, `input:capture`,
`input:key`, `input:rebound`, `item:gained`, `lantern:cast`, `lantern:mode`, `lantern:pulse`,
`lantern:trick`, `lever:pulled`, `npc:talk`, `player:avatar`, `player:blocked`, `player:damage`,
`player:dash`, `player:down`, `player:heal`, `prompt:hide`, `prompt:show`, `quest:advanced`,
`quest:completed`, `quest:started`, `save:written`, `settings:change`, `ui:avatar-request`,
`ui:dialogue`, `ui:motto`, `ui:pause-request`, `ui:screen`, `ui:toast`, `world:altar`,
`world:bridge`, `world:gate`, `world:status`, `world:weather`, `world:zone`.

Escutados em `main.js`: `game:*`, `ui:pause-request`, `ui:avatar-request`, `avatar:closed`,
`npc:talk`, `dialogue:choice|next|closed|close`, `world:zone`, `player:damage|blocked|down`,
`camera:shake`, `enemy:defeated|purified`, `boss:start|damage|defeated|summon`,
`checkpoint:reached`, `quest:completed`, `world:altar`, `lantern:trick`, `lever:pulled`,
`settings:change`.
Escutados em `menus.js`: `dialogue:open|close`, `settings:change`, `input:capture`.
Escutados em `hud.js`: `ui:toast`, `ui:motto`, `ui:screen`, `prompt:show|hide`, `world:status`,
`boss:*`, `item:gained`, `player:*`.
Escutados em `audio.js`: `settings:change`.

## 7. Objeto de contexto (`Game.makeCtx()`)

Criado uma única vez e memoizado. Expõe getters vivos e helpers usados por todo o conteúdo:

```js
ctx = {
  player, lantern, world, enemies, miniboss, combat, inventory, quests, settings,
  audio, effects, events, input, npcs, traits,
  dialogue: { open(data), close() },
  give(id, amount), toast(text, icon),
  actions: { upgrades(), save(), follow(), acceptQuest(id), motivate(text), addXp(n) }
}
```

## 8. Renderização (pipeline cinematográfico)

`PostFX` (`world/postfx.js`) desenha a cena em um **render target HDR linear** (sem tone mapping),
depois executa, com shaders próprios (sem `EffectComposer`):

1. **Bright pass** com soft-knee (`uThreshold`, `uKnee`).
2. **Blur gaussiano separável** de 9 amostras, 1 ou 2 iterações (low/high).
3. **God rays** radiais, 24 passos, a partir da posição do sol projetada na tela
   (`setSun(uv, amount, color, {warmth, night})`, `density/decay/weight`).
4. **Passe final**: ACES tone mapping + exposição + saturação + grading (warmth/night) +
   vinheta + grão sutil.

Parâmetros iniciais: `exposure 1.14`, `saturation 1.16`, `vignette 0.45`, `grain 0.016`,
`bloomStrength 0.72` (high) / `0.5` (low), `rayStrength 0.9`, `samples 4` (HDR/high).
`Game.applySettings()` reescreve a exposição: `renderer.toneMappingExposure = 1.08 * brightness`
e `postfx.setLook({ exposure: 1.14 * brightness })`.

**Regra do projeto:** nunca chamar `renderer.render(scene, camera)` no loop (só como fallback quando
`postfx` não existe). O `AvatarStudio` tem renderer próprio e é a única exceção.

## 9. Iluminação — quem manda em quê

- `world/biome.js` cria `HemisphereLight('#8fb6dd','#22301f',1.0)` e `DirectionalLight` lua
  (`'#9db8f0'`, 0.36) apenas como base; `scene.fog = FogExp2('#8fb4c9', 0.0072)`.
- **`atmosphere.js` é a única fonte de intensidade de `hemi`/`sun`/`moon`** (ciclo dia/noite ×
  opção de brilho). `World.update` não deve reescrever essas intensidades — isso já causou um bug
  em que o dia ficava congelado com iluminação noturna.
- Sombras vêm do sol (`castShadow`) com câmera ortográfica de ±46 que acompanha o jogador;
  `Game.applyShadowFlags()` liga sombras em meshes novos a cada 2,5 s (`userData.noShadow` exclui
  céu, água, grama e cenário distante).
- Vento: `graphics.grassWind` (grama) e `atmosphere.wind` (copas/arbustos) são uniformes
  compartilhados atualizados a cada quadro.

## 10. Persistência

`SaveManager` (localStorage) + `buildState()`/`loadFromSave()` no `Game`. Autosave a cada 25 s
(`writeThrottled(...,25)`) e forçado em eventos importantes (baú, missão, chefe, checkpoint, sair,
trocar avatar, comprar melhoria). Esquema completo em `BANCO_DE_DADOS.md`.

## 11. Serviços do Base44 usados

**Nenhum.** O jogo não importa SDK, não chama backend functions, não usa entidades, autenticação
ou storage gerenciado. O Base44 aparece apenas como ambiente de execução:

- `docker-compose.base44.yml`: um serviço `web` (imagem `node:22`) que roda
  `npx browser-sync start --server --files ... --port 3000 --host 0.0.0.0`, com o repositório
  montado em `/app` e `BASE44_PREVIEW_MODE` repassado como variável nua (pass-through).
- `.base44/environment.json`: `previewPort 3000`, `healthPath "/"`, `startCommand`, `secrets: []`.
- `AGENTS.md`: notas de arquitetura para agentes (não afeta o runtime).

Reproduzir em outro ambiente = servir arquivos estáticos. Não há nada a migrar.

## 12. Pontos de extensão previstos pelo próprio código

1. **Novo bioma:** `BIOME_LIST` (`world/biome.js`) marca os 7 biomas; implementar
   `World.build('<id>')` (hoje só `'floresta'` retorna `true`).
2. **Poderes por bioma:** `BIOME_POWERS` (`player/lantern.js`) + reação do mundo em
   `World.reactToPower(biome, position, radius)`.
3. **Inimigos/chefes:** `ENEMY_TYPES` (`systems/enemies.js`) e um novo arquivo de chefe.
4. **Conteúdo interativo:** registrar em `world.interactions.add(new Interactable({...}))` com
   `interact(ctx)`; o `ctx` traz `give`, `toast`, `inventory`, `quests`, `audio`, `effects`, `events`.
5. **Missões:** adicionar em `QuestManager.defs` (passos com `on`/`goal`/`match`, `rewards`, `xp`).
6. **Cosméticos:** item em `avatar/catalog.js` + `case` correspondente em `avatar/builder.js`.
