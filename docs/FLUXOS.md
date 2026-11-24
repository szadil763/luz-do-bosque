# FLUXOS — navegação, estados e interações

Formato das tabelas: **AÇÃO DO JOGADOR → EVENTO → PROCESSAMENTO → MUDANÇA DE ESTADO → RESULTADO**.

---

## 1. Fluxo de navegação (telas)

```
                 ┌──────────────┐
                 │   loading    │  boot() em 4 etapas + barra
                 └──────┬───────┘
                        │ ready
                 ┌──────▼───────┐
      ┌─────────►│    title     │◄──────────────┐
      │          └──┬───┬───┬───┘               │
      │   Começar   │   │   │  Opções/Ajuda     │
      │             │   │   └──────────► [settings] / [help]  (overlay sobre o título)
      │             │   └── Continuar (se há save)
      │             ▼
      │        ┌─────────┐   Esc / ☰ / botão "Pausa"
      │        │ playing │──────────────►┌────────┐
      │        └──┬───┬──┘               │ paused │ (menu de pausa)
      │           │   │  morte           └───┬────┘
      │           │   └──────────►┌───────┐  │ Continuar → playing
      │           │               │ dead  │  │ Melhorias → upgrades
      │           │               └───┬───┘  │ Mochila → inventory
      │           │   Levantar de novo │     │ Missões → quests
      │           │◄──────────────────┘     │ Mapa → map
      │           │                          │ Opções → settings
      │  Voltar ao início (quit)             │ Controles → help
      └───────────┴──────────────────────────┘ Trocar avatar → avatar-studio
```

- `menus.current` guarda a tela aberta; `menus.back()` fecha a atual e volta para `pause`
  (ou para o título, quando a origem é o título).
- `Esc` e `M` fecham sub-telas (`menus.back()`), consumindo a tecla (`input.consume`).
- Abrir qualquer tela coloca a FSM em `paused` (exceto diálogo, que é overlay durante `playing`).
- O estúdio de avatar pode ser aberto do HUD (jogando) ou da pausa; ao fechar, volta à origem
  (`avatarReturnToPlaying`).

## 2. Fluxo de uma partida nova

```
[Começar aventura]
  → eventos: game:new
  → Game.startNew():
      inventory novo, quests novo, traits {}, flags {}, armor 0
      lantern.load({ unlockedModes: [], unlockedTricks: ['giro','orbita'] })
      miniboss.load({ hp: 320, defeated: false })
      world.load({ flags:{}, interactions:[], gates:[], respawn:[0, y, 7] })
      player: avatar reset, vida/energia 100, posição (0,y,7)
      enemies.clear() + world.populate()
      lantern.unlockMode('escudo')
      fsm → playing
      hint 9 s: "WASD anda · SHIFT corre · setas ou mouse giram a câmera · M1 atira luz · segure M1 para carregar!"
      toast: "Encontre Lumi, o vagalume-guia, no acampamento."
      autosave(true)
```

## 3. Fluxo de diálogo

```
Aproximar de um NPC (raio 3.1) → prompt "Conversar com X"
[E] → Interactable.interact → evento 'npc:talk' {id}
    → DialogueSystem.startFor(npc, ctx):
         escolhe o nó: locked | active_<passo> | after | repeat | intro
         marca npc.talked = true
         se def.autoStart e missão não iniciada → quests.start(quest)
         quests.event('talk', {id})
         play(nó) → emite 'dialogue:open' {name, portrait, mood, text, choices, canContinue, isLast}
    → Menus.showDialogue(data): retrato desenhado no canvas, nome, digitação, escolhas
[E] ou [Espaço] ou clique → advanceDialogue() → next()
     ├─ há mais falas → próxima linha (sfx 'talk')
     └─ última linha → close()
[Esc] → dialogue.close() → evento 'dialogue:close' → onDialogueClosed()
     └─ se NPC = Lumi e Revelação não desbloqueada → unlockMode('revelacao') + toast
Escolha → evento 'dialogue:choice' {index} → choose(index)
     ├─ trait → traits[trait]++
     ├─ quest → actions.acceptQuest(id)
     ├─ action (função ou nome em ctx.actions)
     ├─ reply → nova fala curta
     ├─ next → outro nó
     └─ senão → close()
```

## 4. Fluxo de missão

```
NPC oferece (choices com quest) → acceptQuest(id)
  → quests.start(id) (valida canStart/requires)
  → hint com a descrição
  → sfx 'quest' + autosave
Objetivo cumprido → quests.event(tipo, payload)
  → compara com o passo atual (on + match + goal)
  → avança progresso; ao completar o passo → 'quest:advanced'
  → último passo → 'quest:completed' {id}
      → Game.onQuestCompleted(id):
          recompensas (def.rewards), xp (def.xp), hint de recompensas,
          motivation após 1,4 s, sfx 'levelup', autosave
          casos especiais: luz_do_bosque → gancho + 10 cristais
                           flores_da_clareira → reliquia_foco
                           segredo_da_noite → armadura_noite + abre o portão da noite
```

## 5. Fluxo de combate

```
[M1] pressionado
  → Lantern.charging = true, charge += dt/1.1
[M1] solto
  ├─ charge > 0.85 → castCharged (20 energia, 3,1× dano, pierce 2)
  └─ senão        → castBeam (4 energia, projétil 30 u/s)
Projétil acerta inimigo
  → Combat: dano, knockback, 'combat:hit', hitStop
  → Enemy.takeDamage → hp -= dano; se hp <= 0:
        defeito → partículas + drops → 'enemy:defeated'
        corrompido + purificado → 'enemy:purified' (fragmento + quest)
Jogador é atingido
  → Player.takeDamage → se escudo/dash/invulnerável: ignora
    senão: vida -= dano×dificuldade×(1-armor), vinheta, shake, 'player:damage'
    se vida <= 0 → 'player:down' → fsm dead → [Levantar de novo] → respawn()
```

## 6. Fluxo do Guardião Antigo

```
jogador a < 13 u e fora de área segura
  → wake() → 'boss:start' {name}
      → trilha 'boss', barra do chefe, dica de combate
  → ciclo: idle → telegraph (0,95 s) → slam | shards
      slam   → onda de choque (18) → cristal exposto 3 s ('boss:vulnerable')
      shards → 12 de dano por projétil, a cada 0,18 s
  → vida ≤ 50 % → 'boss:phase' (enraged): +25 % velocidade, charge, telegrafia 0,7 s
      charge → 16 de dano + convoca sombras ('boss:summon')
  → vida ≤ 0 → 'boss:defeated' {rewards}
      → barra some, trilha 'explore', pickups espalhados, toast da chave, autosave
```

## 7. Fluxo do estúdio de avatar

```
[🎭 Trocar avatar] (HUD ou pausa) → 'ui:avatar-request'
  → guarda avatarReturnToPlaying
  → se playing: fsm paused + menus.hideAll()
  → AvatarStudio.show(): copia config atual, cria cena/renderer próprio, monta abas
Aba/carta clicada
  ├─ desbloqueado → _choose(slot,id) → atualiza prévia 3D
  └─ bloqueado    → _tryUnlock(slot,id): se moedas ≥ custo → debita, avatar.unlock, 'avatar:unlocked'
[Aplicar visual] → game.applyAvatar(config)
  → avatar.apply + player.setAvatar + autosave + 'avatar:applied'
  → fecha o estúdio
[✕ / Esc] → 'avatar:closed' → volta para playing (ou pausa, conforme origem)
```

## 8. Fluxo de interação com objetos

```
Aproximar (raio do objeto) → 'prompt:show' {label ou hint()}
[E] → InteractionManager.interact(ctx):
      escolhe o objeto disponível mais próximo e chama interact(ctx)
      ├─ sem objeto → sfx 'hurtSoft'
      ├─ requer item/modo → hint explica ("Use o poder Revelação" / "Precisa de Chave da Ruína")
      └─ sucesso → efeitos + som + toast + 'quests.event(...)'
```

## 9. Fluxo de salvamento/carregamento

```
autosave (25 s) ou evento → buildState() → save.writeThrottled/write → 'save:written'
[Continuar] → game:continue → loadFromSave()
   ├─ sem save → startNew()
   ├─ save inválido → toast de erro, retorna false
   └─ ok → aplica player, avatar, inventory, quests, lantern, world, flags, traits, tutorials,
           reaplica armadura/auréola, refaz escolta, aplica flags do QuestLand, toast de boas-vindas
```

## 10. Tabela geral: ação → evento → processamento → estado → resultado

| Ação | Evento | Processamento | Estado alterado | Resultado |
|---|---|---|---|---|
| Clicar “Começar aventura” | `game:new` | `startNew()` | FSM `playing`, inventário/quests novos | HUD aparece, dica inicial |
| Clicar “Continuar” | `game:continue` | `loadFromSave()` | save aplicado | retoma posição/progresso |
| `Esc` jogando | — (input) | `fsm.set('paused')` | `paused` | menu de pausa + `sfx ui` |
| `Esc` na pausa | — | `fsm.set('playing')` | `playing` | HUD volta, mundo retoma |
| `Esc` em sub-tela | — | `menus.back()` | tela anterior | painel anterior |
| `M` jogando | — | `menus.open('map')` | `paused` | mapa completo |
| Mover WASD | — | `Player.update` (eixo relativo à câmera) | posição/velocidade | corrida procedural, passos |
| `Shift` | — | `sprinting = true` | velocidade 9,4 | animação mais rápida |
| `Q` | `player:dash` | `tryDash` | `dash` 0,26 s, invuln 0,32 s | rastro ciano, `sfx dash` |
| `Espaço` | — | `jumpBuffer` + coyote | `jump`, v.y 9,2 | salto + partículas |
| `M1` curto | `lantern:cast {raio}` | `castBeam` | −4 energia, cd 0,42 | projétil + `sfx beam` |
| `M1` segurado 1,1 s e solto | `lantern:cast {carregado}` | `castCharged` | −20 energia, cd 1,1 | projétil grande + anel |
| `M2` segurado | — | escudo | −14 energia/s, `shieldActive` | esfera protetora; bloqueia dano |
| `M3` | `lantern:pulse` | `castPulse` | −25 energia, cd 4 | anel, purificação, `reactToPower` |
| `M4` | `lantern:mode` | `cycleMode` | índice do modo | ícone/label do HUD mudam |
| `R` | `lantern:trick` | `startTrick` | `trick` 1,6 s | animação + NPCs reagem |
| `E` perto de NPC | `npc:talk` | `DialogueSystem.startFor` | diálogo aberto | retrato + fala + escolhas |
| `E` perto de baú | — | `Chest.interact` | baú `done`, itens entregues | toast com loot + brilho |
| `E` na fogueira | `checkpoint:reached` | `Checkpoint.interact` | vida cheia, respawn atualizado | `sfx heal`, autosave |
| Acender 4 cristais | — | `lightCrystal` | `crystalCache` | 3 cristais + 1 fragmento |
| Puxar 2 alavancas | `lever:pulled` | `onLeverPulled` | portão aberto | passagem liberada |
| Acender o Altar | `world:altar` | `quests.event('altar')` | missão avança | portal entre biomas “desperta” |
| Comprar melhoria | `game:upgrade` | `buyUpgrade` | nível + cristais − | `sfx levelup`, autosave |
| Trocar visual | `avatar:applied` | `applyAvatar` | config do avatar | rig reconstruído, autosave |
| Receber dano | `player:damage` | `takeDamage` | vida, invuln 0,85 | vinheta, tremor de câmera |
| Vida = 0 | `player:down` | `fsm.set('dead')` | `dead` | tela “A luz fraquejou…” |
| “Levantar de novo” | `game:respawn` | `respawn()` | vida 70 %, energia cheia | volta ao checkpoint |
| Mudar opção | `settings:change` | `applySettings()` | exposição/`--ui`/volumes | efeito imediato |
| Girar câmera (cursor) | — | `lookFromPointer` | yaw/pitch | visão orbital |
| Arrastar em `#lookzone` | — | `addLookDelta` | yaw/pitch | câmera no toque |
| Joystick virtual | — | `setTouchAxis` | eixo de movimento | caminhada no toque |
| Redimensionar janela | — | `onResize` | aspect/renderer/postfx | layout reflui |

## 11. Fluxos de estados de UI (detalhes finos)

| Situação | Comportamento exato |
|---|---|
| Tecla repetida no mesmo quadro | `input.consume(...)` evita leitura dupla (pausa) |
| Diálogo aberto + `E`/`Espaço` | avança a fala e consome a tecla |
| Diálogo aberto + `Esc` | fecha o diálogo e consome a tecla |
| Estúdio aberto + `Esc` | fecha o estúdio |
| Sub-tela + `M`/`Esc` | volta uma tela |
| Menu aberto | `locked = true` → mundo a 15 %, jogador parado |
| Pausa com diálogo | o diálogo tem prioridade na cadeia de `if` do `frame()` |
| Toast | entra com `pop .25s`, fica ~3 s, sai por opacidade |
| Dica (`hint`) | desaparece após `seconds` (padrão 6) |
| Frase motivacional | `#motivation.show`, fade `.5 s`, permanece até a próxima |
| Prompt de interação | aparece/desaparece por proximidade, sem clique |
| Barra de chefe | aparece em `boss:start`, atualiza em `boss:damage`, some em `boss:defeated` |

## 12. Comportamento em dispositivos móveis

- `settings.touch = auto` mostra os controles quando `(pointer: coarse)`; `on` força, `off` esconde.
- `#lookzone` cobre a parte superior direita (acima de 390 px do rodapé) para arrastar a câmera.
- `#joy` (132 px) controla o eixo; `setTouchAxis` ignora valores não finitos.
- `.tbtns` (9 botões de 64 px) disparam as mesmas ações do teclado (`data-action`).
- `#dialogue` fica em 94vw com retrato de 70 px abaixo de 620 px de largura.
- `viewport` com `maximum-scale=1.0, user-scalable=no` evita zoom acidental durante o jogo.
- Sem `pointer-lock`: a câmera por cursor também funciona em iframe e em telas de toque.

## 13. Redimensionamento e orientação

`onResize()` atualiza `camera.aspect` + `updateProjectionMatrix()`, `renderer.setSize` e
`postfx.setSize` (recria os render targets quando o tamanho do drawing buffer muda). O layout é
fluido (`min()`, `vw`, `vh`, flex/grid), então orientação horizontal e vertical funcionam sem
nenhuma regra específica além dos dois breakpoints (620 px e 760 px).
