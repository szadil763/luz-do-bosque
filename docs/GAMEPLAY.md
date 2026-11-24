# GAMEPLAY — todas as regras e mecânicas

Todos os números abaixo foram lidos do código desta versão (`src/player`, `src/systems`,
`src/world`, `src/main.js`). Unidades: distância em unidades 3D (≈ metros), tempo em segundos.

---

## 1. Objetivo, vitória e derrota

- **Objetivo principal (trilha “A origem da escuridão”):** conversar com Lumi, encontrar 3 fragmentos
  mágicos e acender o **Altar da Clareira Antiga**. Isso desperta a passagem entre biomas e libera o
  poder **Gancho luminoso**.
- **Vitória:** o jogo **não tem tela de vitória**. O progresso é contínuo; a conclusão da última
  missão de coragem (“O Segredo da Noite”) abre o **Bosque da Noite Estrelada** e entrega a
  **Armadura da Noite**.
- **Derrota:** quando `player.health <= 0` o evento `player:down` leva a FSM a `dead`, exibe a tela
  “A luz fraquejou…” e a música passa para `safe`. O botão **Levantar de novo** chama `respawn()`.
- **Não há game over permanente, pontuação, vidas ou cronômetro.** A moeda de progresso é
  experiência + itens.

### Respawn (`Game.respawn()`)
```
posição = world.respawn (checkpoint) com y = terrainHeight
velocidade = 0
health   = maxHealth * 0.7
energy   = maxEnergy
invulnerable = 2.4 s
combat.clearOwner('enemy')      // remove projéteis inimigos
fsm → playing
toast: "Você levantou de novo. A escuridão pode esperar!"
```
`world.setRespawn()` é atualizado ao acender a fogueira/checkpoint (`checkpoint:reached`), que também
salva.

---

## 2. Jogador — movimento e física

| Parâmetro | Valor |
|---|---|
| Raio de colisão | `0.45` |
| Altura | `1.8` |
| Vida / energia iniciais | `100 / 100` |
| Armadura inicial | `0` (reduz dano; teto de 70 %) |
| Velocidade andando | `6.6` × `max(0.35, magnitude do eixo)` |
| Velocidade correndo (Shift) | `9.4` × magnitude — **sem custo de energia** |
| Velocidade mirando (M2) | `2.6` × magnitude |
| Aceleração (damp) | `34` no chão · `14` no ar (`blend / maxSpeed`) |
| Dash | velocidade `18`, duração `0.26 s`, invulnerável `0.32 s` |
| Recarga do dash | `1.15 - 0.22 × nível('dash')` s |
| Salto | `velocity.y = 9.2`; `jumpBuffer 0.15 s`; `coyote 0.12 s` |
| Gravidade | `24 /s²`; velocidade terminal `-34` |
| Regeneração de energia | `11/s` fora de combate · `5/s` em combate (bloqueada com escudo ativo) |
| Invulnerabilidade após dano | `0.85 s` (`hurtTimer 0.45`) |
| `moveSpeedRatio` | `clamp(velocidade/6.6, 0, 1.4)` — usado nas animações |

**Estados do jogador (FSM própria):** `idle, run, jump, fall, land, dash, hurt, trick`.
Transições automáticas: sem chão → `jump` (v.y > 0.5) ou `fall`; no chão e `moveSpeedRatio > 0.06` → `run`;
`land` dura `0.18 s`; `hurt` dura `hurtTimer`; `trick` dura `trickTimer`.

### Dano recebido (`Player.takeDamage(amount, opts)`)
```
se invulnerable > 0 || fsm === 'dash' || shieldActive  → ignora (escudo emite 'player:blocked')
dano = amount * (opts.difficulty ?? 1) * (1 - clamp(armor, 0, 0.7))
health = max(0, health - dano)
invulnerable = 0.85 ; hurtTimer = 0.45 ; fsm = 'hurt' ; sfx 'hurt'
se opts.from: empurrão horizontal +7 e vertical +3.4
se health <= 0 → evento 'player:down'
```

### Segurança contra bugs de física
Se `x+y+z` não for finito, o jogador é reposicionado no `world.respawn` com velocidade zero
(proteção contra NaN — já houve um caso de evento de ponteiro sem coordenadas).

### Corrida e câmera relativa
O eixo de movimento é relativo à câmera (`cameraRig.forward()/right()`). A corrida é desativada ao
mirar, durante dash/manobra ou com tela aberta. A orientação do corpo segue o movimento
(`atan2(-vx,-vz)`), exceto ao mirar, quando segue a câmera (`yaw + PI`), com `damp(...,12)`.

---

## 3. Lanterna mágica

### 3.1 Fórmulas de atributos (`Lantern.stats`)
```
damage        = 12 + 6 * nível('dano')
range         = 18 + 5 * nível('alcance') + relíquias.lightRange
lightRange    = 30 + 4 * nível('alcance') + relíquias.lightRange   // distância da PointLight
efficiency    = 1 - min(0.60, 0.14 * nível('eficiencia') + relíquias.efficiency)
cooldownScale = 1 - min(0.55, 0.12 * nível('recarga'))
shieldMax     = 3.2 + 1.4 * nível('escudo') + relíquias.shieldDuration
pulseRadius   = 4.4 + 1.1 * nível('pulso') + relíquias.pulseRadius
dashCooldown  = 0.15 * nível('dash') + relíquias.dashCooldown
```
`spend(n)` debita `n * efficiency` da energia e falha se não houver energia suficiente.
`_syncLight()` mantém `PointLight.distance = lightRange` e `intensity = 3.0 + (lightRange-30)*0.06`.

### 3.2 Poderes

| Poder | Entrada | Custo | Recarga | Efeito |
|---|---|---|---|---|
| **Raio de luz** (`raio`) | M1 (clique curto) | 4 | `0.42 × cooldownScale` | projétil `speed 30`, `damage = stats.damage`, `size 0.34`, `life 1.5`, cor da skin |
| **Disparo carregado** | segurar M1 ≥ 0,85 (carga total em 1,1 s) e soltar | 20 | `1.1 × cooldownScale` | projétil `speed 24`, `damage × 3.1`, `pierce 2`, `knockback 9`, `size 0.8`, `life 2.2`, branco |
| **Pulso luminoso** | M3 | 25 | `4.0 × cooldownScale` | anel de raio `pulseRadius`; dano `damage × 1.3`, `knockback 12`; **purifica** criaturas corrompidas; chama `world.reactToPower(biome, pos, raio)` |
| **Escudo de luz** | segurar M2 | `14/s` | — | bloqueia **todo** dano enquanto ativo; duração `shieldMax`; requer energia > 2; visual pulsante |
| **Revelação** | alternar com M4 e usar M1 | 16 | `0.9 × cooldownScale` | `revealNear(pos, 15, true)` por `2.6 s` (renova a cada quadro), purifica corrompidos em 9 u; som `secret` |
| **Gancho luminoso** | alternar com M4 e usar M1 | 8 | — | escolhe `grapplePoint` com distância ≤ 24 e `dot > 0.45`; puxa o jogador a `speed 17`, solta a < 1,6 u ou após 2,6 s |
| **Purificação** | (passiva do pulso/revelação) | — | — | converte inimigo corrompido em amigo: dropa 1 `fragmento` e conta `quests.event('fragmento')` |

Modos disponíveis por padrão: `['raio', 'revelacao']` (Revelação é desbloqueada ao terminar a primeira
conversa com Lumi); `gancho` entra na lista ao concluir “A origem da escuridão”. **Escudo** é
desbloqueado no `setupEntities()` (`lantern.unlockMode('escudo')`).
Alternar poder com menos de 2 modos disponíveis mostra o toast “Novo poder será desbloqueado explorando o bosque.” (🔒).

### 3.3 Melhorias (pagas com cristais 🔷)

| id | Nome | Ícone | Máx | Custos | Efeito |
|---|---|---|---|---|---|
| `alcance` | Alcance da luz | 🔭 | 3 | 2,4,7 | +5 alcance de projétil, +4 luz por nível |
| `dano` | Energia concentrada | ⚡ | 3 | 3,5,8 | +6 de dano por nível |
| `eficiencia` | Eficiência mágica | 🔋 | 3 | 2,4,6 | −14 % de custo por nível (teto 60 %) |
| `recarga` | Recarga rápida | ⏱ | 3 | 3,5,8 | −12 % de recarga por nível (teto 55 %) |
| `escudo` | Escudo duradouro | 🛡 | 2 | 4,7 | +1,4 s de escudo por nível |
| `pulso` | Pulso amplo | ◎ | 3 | 3,5,8 | +1,1 de raio por nível |
| `dash` | Botas de luz | » | 2 | 4,7 | −0,22 s de recarga do dash por nível |
| `vitalidade` | Vitalidade | ❤️ | 3 | 5,8,12 | +15 de vida máxima por nível (cura junto) |

Compra: `Game.buyUpgrade(id)` → exige `inventory.has('cristal', custo)`, remove os cristais, aplica,
toca `levelup`, salva.

### 3.4 Manobras recreativas (R)

`TRICK_DEFS`: `giro` 🌀, `malabarismo` 🤹, `orbita` 🪐, `circulos` ✍️, `flutuar` 🎈, `espiral` 🌪,
`sequencia` ✨ (R, R, R). Desbloqueadas inicialmente: `giro` e `orbita`; as demais vêm de itens
(`manobra_*`). Manobra dura `1.6 s` (pulso usa 0,35 s), trava movimento, toca `trick`, e NPCs em um
raio de 9 u reagem (`npc.reactToTrick`).

### 3.5 Skins da lanterna
`primaveril #7cf0a8`, `oceano #63d3ff`, `aurora #ff9be8`, `cogumelo #ffb3d9`
(itens `cor_primaveril`, `cor_oceano`, `cor_aurora`, `lanterna_cogumelo`).

### 3.6 Afinidades de bioma (`BIOME_POWERS`)
`floresta` Luz Verde-Primavera `#7cf0a8` (liberada); `cristal` `#7ec8ff`; `deserto` `#ffd479`;
`pantano` `#7cf0d8`; `gelo` `#dff2ff`; `ruinas` `#c79bff`; `sombras` `#ff9be8` (todas `locked: true`).

---

## 4. Combate

`Combat.spawn({...})` cria projéteis com: `speed` (padrão 26), `damage` (12), `owner`, `color`,
`size` (0.34), `life` (1.6), `pierce`, `reflectable` (true), `knockback` (4), `charged`, `homing`,
`onHit`, `purify`. Cada projétil recebe um sprite de brilho e um rastro a cada 0,02 s.

- **Hit-stop:** `combat.hitStop` reduz o `dt` do mundo para 35 % por alguns instantes (impacto).
- **Reflexo em cristais:** projéteis `reflectable` que passam perto de um cristal ativo
  (`world.crystals`, raio 1,7) ricocheteiam e chamam `lightCrystal(node)`; evento `combat:reflect`.
- **Limpeza:** `clearOwner('enemy')` no respawn; `clear()` em transições de cena.
- **Colisão de cenário:** `world.projectileBlocked(pos)` (terreno + paredes).
- Estética: criaturas nunca “sangram” — desfazem em partículas, fogem, adormecem ou são purificadas.

---

## 5. Inimigos (`ENEMY_TYPES`)

| id | Nome | HP | Raio | Velocidade | Dano | Drops | Fraqueza | Comportamento |
|---|---|---|---|---|---|---|---|---|
| `sombra` | Sombra Travessa | 26 | 0.55 | 4.4 | 6 | `moeda 2–6` | pulso | flutua, contato, corrompida e purificável; “foge da luz e adora pregar peças” |
| `cogumelo` | Cogumelo Saltitante | 34 | 0.6 | 3.0 | 9 | `moeda 3–8`, `cristal 0–1` | pulso | ataca em grupos pulando na direção do jogador |
| `espirito` | Espírito Brincalhão | 44 | 0.6 | 3.6 | 7 | `fragmento 1`, `moeda 4–9` | revelação | à distância (projéteis), corrompido/purificável; purificado entrega pistas |

- Inimigos **não agem** dentro de área segura (`world.isSafe`) — nem o minichefe.
- `settings.calm` (Exploração tranquila) reduz velocidade e dano; `settings.difficulty` multiplica o
  dano recebido (0,6 · 1 · 1,5).
- Derrota emite `enemy:defeated { position, drops }`; o `Game` converte em pickups espalhados
  (`rand(-1,1)` em X/Z, +0,4 em Y).

### Spawns na Floresta (`_buildEnemies`)
```
sombra   : (-10,20) (14,14) (-30,4) (26,-6) (8,-26) (-36,-12) (30,14) (-24,28)
cogumelo : (12,8) (15,10) (16,-8) (18,-10) (-20,20) (-22,21) (-32,-26) (-33,-24)   [grupos de 2]
espirito : (-22,14) (-12,6) (-14,-20)
```

---

## 6. Minichefe — Guardião Antigo (`systems/miniboss.js`)

| Parâmetro | Valor |
|---|---|
| Vida | `320` |
| Raio | `1.5` |
| Posição | `(-24, terreno, -22)` (arena das ruínas) |
| Despertar | jogador a menos de `13` u e **fora** de área segura |
| Dano recebido | `amount × (vulnerableTimer > 0 ? 2.4 : 1)` |
| Fúria | ao cair a 50 % da vida: `enraged = true` (velocidade ×1,25, 3º ataque, telegrafia 0,7 s) |
| Recompensas | `cristal 14`, `fragmento 2`, `reliquia_brilho 1`, `chave_ruina 1`, `moeda 90` |

**Ciclo de estados:** `sleep → idle → telegraph → (slam | shards | charge) → idle`
- `idle`: caminha a `2.2 × speedScale` até 4 u do jogador; ao fim do timer escolhe o ataque.
- `telegraph`: anel de aviso vermelho no chão pulsa; duração `0.95 s` (normal) / `0.7 s` (fúria).
- `slam`: braços descem, onda radial; ao terminar **expõe o cristal do peito por 3,0 s**
  (`boss:vulnerable`), janela em que o dano é ×2,4. Dano de área `18` (`difficulty` aplicada).
- `shards`: arremessa projéteis `speed 15`, `damage 12`, cor `#ffd479`, a cada 0,18 s.
- `charge`: investida; dano `16` (metade em modo tranquilo).
- Na fúria, após uma investida convoca sombras (`boss:summon` → `enemies.spawn('sombra', ...)` em
  torno de ±5 u).
- Eventos: `boss:start`, `boss:phase`, `boss:damage`, `boss:vulnerable`, `boss:summon`,
  `boss:defeated` (recompensas espalhadas em pickups, toca `explore`, autosave, toast da chave).

---

## 7. Objetos interativos (`systems/interactables.js`)

| Classe | type | Raio | Comportamento |
|---|---|---|---|
| `Interactable` | vários | 2.4 | base: `available = revealed && !done`; `canUse(ctx)` valida `requires.item` / `requires.mode`; `reveal()` anima escala 0,2→1, anel+burst, `sfx secret`, `quests.event('reveal')` |
| `Chest` | chest | 2.4 | `rollChest(tier, depth)`, burst dourado, flash, toast com itens, `quests.event('chest')`, tampa gira −1,9 rad |
| `Breakable` | breakable | 2.0 | HP `24`, quebra com luz, drops definidos |
| `Lever` | lever | 2.4 | `interact` marca puxada, `sfx lever`, emite `lever:pulled` |
| `Door` | door | 3.0 | exige item/modo; `hint()` explica o requisito; emite `door:opened` |
| `CrystalNode` | crystal | 1.6 | acende ao ser atingido; conta 4 para o esconderijo |
| `GlowFlower` | flower | 2.6 | `bloom(ctx)` faz a flor desabrochar (pétalas visíveis), `quests.event('flower')` |
| `SecretWall` | secret | 3.0 | `hidden`, só existe após Revelação; `hideFromPhysics()` enquanto escondida |
| `Inscription` | inscription | 2.6 | abre diálogo com `title`/`text` e botão “Entendi” |
| `Checkpoint` | checkpoint | 3.2 | “Descansar (recupera vida)”: `health = maxHealth`, `sfx heal`, emite `checkpoint:reached` |
| `GrapplePoint` | — | — | ponto de ancoragem do gancho (posição + mesh animada) |
| `Pickup` | pickup | — | moeda/cristal/fragmento flutuante; coleta automática por proximidade |

**Flores da clareira:** 5 flores em `(18,2)` com deslocamentos
`(-3,-2) (2.5,-1) (0,3.5) (-4.2,2.4) (4.4,2.8)`; missão pede as 5.

**Cristais refletores:** 4 em `(-18,-14) (-20,-8) (-26,-12) (-30,-20)`; ao acender os 4, surgem
3 `cristal` + 1 `fragmento` (uma única vez, flag `crystalCache`).

**Alavancas do portão de pedra:** duas (`_makeLever`), uma perto do lago e outra perto das ruínas;
`leversPulled(group)` verifica o grupo e `onLeverPulled(ctx)` desce o portão.

---

## 8. Itens, baús e inventário

### `ITEMS` (id → nome, ícone, tipo, efeito)
- Moedas 🪙 `moeda` (currency) · Cristais 🔷 `cristal` (currency) · Fragmentos ✨ `fragmento`
  (currency) · Experiência ⭐ `experiencia` (xp) · Moedas mágicas 🪄 `moeda_magica`.
- Relíquias: `cristal_raro` 💎 (lightRange +8) · `cristal_magico` 🔮 (lightRange +5, maxEnergy +15) ·
  `acessorio_luminoso` 🎗 (+4 luz) · `escudo_corajoso` 🛡 (shieldDuration +2,5) ·
  `amuleto_luz` 📿 (+3 luz, cria auréola) · `reliquia_vigor` ❤️ (maxHealth +25) ·
  `reliquia_foco` 💠 (maxEnergy +25) · `reliquia_leveza` 🌀 (dashCooldown −0,3) ·
  `reliquia_brilho` 🌟 (lightRange +6).
- `armadura_noite` 🜲 (armor 0,25 → −25 % dano) · `titulo_coracao` 🏅 (título “Coração Corajoso”).
- Chaves: `lanterna_antiga` 🏮, `simbolo_antigo` 🜁, `fragmento_luz` 🌟, `chave_ruina` 🗝.
- `mapa_bosque` 🗺 (marca pontos no minimapa) · manobras (`manobra_espiral`, `manobra_flutuar`,
  `manobra_malabarismo`) · skins (`cor_*`, `lanterna_cogumelo`).

`Game.give(id, amount)` aplica por `kind`: `relic` (efeito permanente + toast), `trick`, `skin`, `map`,
`xp`, `armor`, `title`; `fragmento` também alimenta a missão; `def.aura` liga a auréola.

### Baús (`CHEST_TIERS`)
| Tier | Cor | Loot garantido | Chanceleres |
|---|---|---|---|
| `comum` | `#c9a06a` | moeda 12–26, cristal 1–3 | fragmento 25 % · manobra_malabarismo 8 % |
| `raro` | `#7ec8ff` | moeda 30–55, cristal 4–8 | fragmento 60 % (1–2) · reliquia_leveza 18 % · manobra_espiral 30 % |
| `secreto` | `#d59bff` | moeda 70–110, cristal 10–16, fragmento 2–3 | reliquia_vigor 60 % · reliquia_foco 60 % · reliquia_brilho 55 % · manobra_flutuar 70 % · cor_aurora 45 % |

`rollChest(tier, depth)` sorteia `loot` (intervalo inteiro) + `chance` (probabilidade × quantidade).

### Inventário
`Inventory` guarda `Map<id, quantidade>` com `add`, `remove`, `has(id, n)`, `count(id)`,
`serialize()` (array de `{id, amount}`) e `load()`.

---

## 9. Progressão

- **Experiência:** `level = 1 + floor(xp / 150)`. Ao subir de nível: `sfx levelup`, anel dourado,
  toast “Nível N! Sua luz ficou mais firme.”
- **Títulos:** `flags.title` (ex.: “Coração Corajoso”).
- **Traços de personalidade:** escolhas de diálogo somam em `traits` (`brave`, `kind`, `curious`) —
  registrados no save, sem efeito mecânico nesta versão.
- **Moedas 🪙:** usadas no estúdio de avatar (custos por raridade: comum 0, raro 6, épico 14,
  lendário 26, mítico 45; alguns itens têm `cost` próprio, ex.: espécie `estrela` 30).

---

## 10. Missões (`QuestManager.defs`)

Eventos que alimentam objetivos: `talk` (com `match` por id de NPC), `fragmento` (com `amount`),
`altar`, `escort`, `flower`, `zone` (id da zona), `lanterna`, `origem`, `cristal_luz`, `symbol`,
`riddle`, `criatura`, `altar_luz`, `luz_perdida`, `night_riddle`, `secret`, `reveal`, `chest`.

| id | Título | Dá | Requer | Passos | Recompensas |
|---|---|---|---|---|---|
| `luz_do_bosque` | A origem da escuridão | Lumi (auto) | — | falar com Lumi → 3 fragmentos → acender o Altar | desbloqueia **Gancho** + 10 cristais |
| `teo_perdido` | O explorador perdido | Téo (auto) | — | conversar com Téo → levá-lo ao acampamento (raio 7) | 45 moedas, 5 cristais, `reliquia_leveza` |
| `flores_da_clareira` | Flores da clareira | — | — | 5 flores | `reliquia_foco` |
| `floresta_sem_luz` | A Floresta Sem Luz | Velho Guardião | — | 3 moradores (mila/lyra/lumi) → Lanterna Antiga → explorar `dark_grove` → pedra da origem → Cristal Luminoso | `cristal_magico`, `acessorio_luminoso`, **120 XP** |
| `coragem_do_heroi` | A Coragem do Herói | Cavaleiro Aldric | `floresta_sem_luz` | entrar em `dark_cave` → 3 símbolos → enigma `cave_riddle` → voltar a Aldric | `escudo_corajoso`, `titulo_coracao`, **150 XP** |
| `luzes_perdidas` | As Luzes Perdidas | Faísca | `coragem_do_heroi` | 5 fragmentos luminosos → explorar `ruins` → libertar criatura → restaurar Altar de Luz | `amuleto_luz`, `moeda_magica 30`, **180 XP** |
| `segredo_da_noite` | O Segredo da Noite | Sábio da Montanha | `luzes_perdidas` | encontrar `night_temple` → falar com Guardião da Noite → 2 enigmas → segredo | `armadura_noite`, `cristal_raro`, **220 XP**, abre o Bosque da Noite Estrelada |

`QUEST_ORDER = ['floresta_sem_luz','coragem_do_heroi','luzes_perdidas','segredo_da_noite']`.
`canStart(id)` exige `requires` concluído. `advance(id)` incrementa o passo; `setProgress` grava
progresso numérico; `trackerText()` alimenta o rastreador do HUD.

### Enigmas (respostas corretas)
1. **Pedra Sussurrante** (caverna) — “Eu apago tudo o que vejo, mas não apago o que você lembra. O que eu sou?” → **A memória**.
2. **Pedra da Lua** (templo) — “Eu chego sem barulho, cubro o mundo com um cobertor azul e trago as estrelas.” → **A noite**.
3. **Pedra das Estrelas** (templo) — “Sou pequena, mas só apareço quando tudo fica escuro…” → **Uma estrela**.

Resposta errada reabre as opções com uma fala de incentivo; “Deixar para depois” fecha o diálogo.

---

## 11. Mundo — mapa, terreno e limites

- Terreno: `PlaneGeometry(160, 160, 144, 144)`, altura
  `h = 0.45·sin(x·0.13)·cos(z·0.15) + 0.3·sin(x·0.27+1.1)·cos(z·0.21−0.6)`,
  achatado perto do acampamento (`lerp(0.12, 1, clamp((dist−7)/9,0,1))`) e com depressão de até
  −2,6 no lago (`dist(-16,9) < 7`).
- **Limite do mapa:** raio `52` (posição é reescalada para dentro do círculo).
- **Área segura:** círculo de raio `11` no acampamento `(0,0)` — inimigos e chefe ficam inertes.
- Colisão: caixas (`walls`) empurram pelo eixo de menor penetração; plataformas (`platforms`) só
  bloqueiam se o jogador estiver abaixo de `top − 0,45`; `groundHeightAt` aceita degrau de 0,6.

### Pontos de interesse (coordenadas X,Z)
| Local | Coordenada | Conteúdo |
|---|---|---|
| Acampamento | `(0, 0)` | fogueira, 3 tendas (raio 6,5), checkpoint `(1.6, 0.8)`, caixote quebrável `(-5.5, 3.2)`, banco `(3.2, -3)` |
| Clareira das flores | `(18, 2)` | 5 flores luminosas, baú comum `(24, 6.5)` |
| Ruínas da torre | `(-24, -22)` | arena do Guardião, muralha circular, cofre selado (precisa `chave_ruina`) |
| Lago cristalino | `(-16, 9)` | água com fresnel/espuma, cachoeira, vitórias-régias |
| Ravina das raízes | `(10, -16)` | brambles bloqueando; **Pulso** cria ponte de raízes |
| Altar da Clareira Antiga | `(-2, -34)` | altar da missão principal |
| Planalto do gancho | `(20, -24)` | escada de pedras + 2 pontos de gancho (um sobre o lago) |
| Grove secreto | portão de pedra + 2 alavancas | baú escondido atrás do portão |
| Paredes ilusórias | 2 (`_buildSecrets`) | esconderijo atrás das ruínas e passagem para plataforma |
| Cristais refletores | 4 (ver §7) | esconderijo ao acender todos |
| Portal entre biomas | `(26, -20)` | arco de pedra adormecido (desperta com o altar) |
| Bosque Sem Luz | `(-40, -6)` r12 | Lanterna Antiga, pedra rachada, Cristal Luminoso |
| Caverna Sem Fim | `(38, 12)` r8 | 3 símbolos, Pedra Sussurrante, tochas frias |
| Ruínas Antigas (zona) | `(-24, -22)` r10 | 5 fragmentos luminosos, criatura presa, Altar de Luz |
| Templo Noturno | `(-4, 40)` r10.5 | colunas, arco da lua, 2 pedras de enigma, pedestal do segredo |
| Bosque da Noite Estrelada | `(26, 40)` r8 | desbloqueado por `segredo_da_noite`; baú secreto |

### NPCs (posições)
`lumi (4,3)` · `mila (-4.5,2.5)` · `teo (-27.5,-25)` · `guardiao (-8,-4)` · `lyra (-8,14)` ·
`cavaleiro (31,6)` · `fada (14,7)` · `sabio (16,20)` · `noite (-4,36)`.
Cada NPC tem um `Interactable` de raio `3.1` com o rótulo “Conversar com …”.

---

## 12. Ciclo do dia, clima e vento (efeito de jogo)

- Um dia completo dura **480 s** (8 min); começa às **17,6 h** (fim de tarde).
- Clima muda a cada `50–95 s` entre `limpo`, `chuva`, `neve`, `areia`, com transição suave
  (`WEATHER_RAMP 0,4/s`). O clima afeta luz, névoa, partículas e a intensidade dos god rays.
- Chuva/areia/neve reduzem os raios de sol (`amount × max(0.1, 1 − weather)`).
- O horário e o clima aparecem no HUD (`#world-status`, ex.: “🌙 20:24 · Céu limpo”).
- Vento: uniformes `grassWind` (grama) e `atmosphere.wind` (copas) atualizados no loop.

---

## 13. Dificuldade, conforto e acessibilidade

| Opção | Valores | Efeito mecânico |
|---|---|---|
| `difficulty` | 0,6 / 1 / 1,5 | multiplica o dano recebido |
| `calm` | bool | inimigos e chefe mais lentos (×0,7), metade do dano de investida |
| `brightness` | 0,6–1,6 | exposição do renderer e do pós-processamento |
| `fx` | 0–1,5 | intensidade de partículas/brilhos |
| `textScale` | 0,9–1,4 | variável CSS `--ui` (todo o texto da interface escala) |
| `music` / `sfx` / `ambient` | 0–1 | ganhos dos canais WebAudio |
| `sensitivity` | 0,4–2 | velocidade da câmera |
| `invertY` | bool | inverte eixo vertical |
| `tutorials` | bool | dicas contextuais |
| `touch` | auto/on/off | mostra/esconde os controles de toque |

---

## 14. Casos limite e comportamentos incomuns (implementados)

- **NaN de entrada:** `setTouchAxis`/`moveAxis` saneiam valores não finitos; `Player.update` tem a
  rede de segurança que devolve o jogador ao respawn.
- **Dupla leitura de tecla:** teclas tratadas em `frame()` usam `input.consume(...)` (sem isso a
  pausa “despausava e pausava” no mesmo quadro).
- **Salvamento com posição inválida:** `buildState()` grava o respawn se `x+z` não for finito;
  `loadFromSave()` valida `position.every(Number.isFinite)` antes de aplicar.
- **Carregar com Téo seguindo:** `flags.teoFollowing` refaz `teo.follow()`.
- **Carregar com portão aberto:** `world.questLand.applyFlags()` reaplica cores/visibilidade de
  altares, pedestal, criatura, símbolos e véu da noite.
- **Poder com energia insuficiente:** toca `hurtSoft` e não dispara (sem mensagem).
- **Gancho sem alvo:** `hurtSoft`, sem custo de energia.
- **Modo único:** M4 mostra o toast de bloqueio em vez de alternar.
- **Chefe em área segura:** volta a `idle`, esconde o aviso e apenas observa.
- **Efeitos com `fx = 0`:** partículas continuam existindo, mas com intensidade mínima.
