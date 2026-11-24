# BANCO DE DADOS E PERSISTÊNCIA

**Não existe banco de dados, servidor, API ou autenticação.** Toda a persistência é feita no
`localStorage` do navegador, em duas chaves. Este documento descreve o esquema completo, campo a
campo, como se fosse o “banco” do jogo.

---

## 1. Chaves

| Chave | Constante | Gravada por | Conteúdo |
|---|---|---|---|
| `luzdobosque.save.v1` | `KEY` em `core/save.js` | `SaveManager.write()` | progresso da aventura |
| `luzdobosque.settings.v1` | `KEY` em `core/settings.js` | `Settings.persist()` | opções, acessibilidade e bindings |

Não há versionamento de migração além de `SAVE_VERSION = 1` no objeto de save (gravado em
`data.version`). Se `JSON.parse` falhar, o save é ignorado com `console.warn('[save] arquivo inválido')`
e o jogo começa do zero.

## 2. Save do jogo (`luzdobosque.save.v1`)

Gerado por `Game.buildState()` e carregado por `Game.loadFromSave()`.

```jsonc
{
  "version": 1,
  "savedAt": 1730000000000,          // injetado por SaveManager.write()
  "playtime": 1234.5,                // segundos jogados

  "player": {
    "position": [x, y, z],           // se não finito, grava world.respawn
    "facing": 3.14159,
    "health": 100, "maxHealth": 100,
    "energy": 100, "maxEnergy": 100
  },

  "lantern": {
    "upgrades": { "alcance": 1, "dano": 2 },        // id → nível
    "unlockedModes": ["escudo", "revelacao", "gancho"],
    "unlockedTricks": ["giro", "orbita", "espiral"],
    "skin": "primaveril",
    "mode": "raio"
  },

  "avatar": {
    "config": {
      "species": "pinguim", "bodyColor": "#3f7fd6", "expression": "feliz",
      "outfit": "nenhum", "outfitColor": "#57d99a",
      "hair": "nenhum", "hairColor": "#5a4632",
      "head": "nenhum", "face": "nenhum", "back": "nenhum", "aura": "nenhum"
    },
    "unlocked": ["species:pinguim", "outfit:nenhum", "hair:nenhum", "..."]  // "slot:id"
  },

  "inventory": [ { "id": "moeda", "amount": 120 }, { "id": "cristal", "amount": 9 } ],

  "quests": {
    "active": { "luz_do_bosque": { "step": 1, "progress": 2 } },
    "completed": ["teo_perdido"]
  },

  "world": { /* ver §3 */ },

  "flags": { "title": "Coração Corajoso", "level": 3, "teoFollowing": false, "nightRegion": true },
  "traits": { "brave": 2, "kind": 1, "curious": 0 },
  "tutorials": ["started", "camp", "bramble"]
}
```

### Regras de leitura
- `health` é preso a `[1, maxHealth]`; `energy` a `[0, maxEnergy]`.
- `armor` **não** é salvo: ao carregar, `armor = inventory.has('armadura_noite') ? 0.25 : 0`.
- Relíquias permanentes são reaplicadas pelo inventário (`applyRelic` é chamado em `give`, então o
  `load` precisa reaplicar — hoje a reaplicação efetiva vem de `applyLightAura()` e da armadura).
- `flags.teoFollowing` refaz `teo.follow()`.
- `world.questLand.applyFlags()` reaplica o visual de portões/altares/pedestais.

## 3. Estado do mundo (`world.serialize()`)

```jsonc
{
  "flags": { "crystalCache": true, "nightGateOpen": true, "altar": true },
  "interactions": [
    { "id": "chest-meadow", "done": true, "revealed": true, "opened": true },
    { "id": "flower-0", "done": true, "revealed": true, "lit": true }
  ],
  "gates": [ { "id": "stone-gate", "open": true } ],
  "respawn": [0, 0.0, 7]
}
```
- `interactions`: apenas `id`, `done`, `revealed`, `opened`/`lit` (o que cada classe declara).
- `gates`: estado do portão de pedra das alavancas.
- `respawn`: última posição de descanso (fogueira/checkpoint).

## 4. Configurações (`luzdobosque.settings.v1`)

`Settings.values` = `DEFAULTS` mesclado com o que estiver salvo:

```jsonc
{
  "brightness": 1,        // 0.6 – 1.6
  "fx": 1,                // 0 – 1.5
  "music": 0.55,          // 0 – 1
  "sfx": 0.8,             // 0 – 1
  "ambient": 0.5,         // 0 – 1
  "textScale": 1,         // 0.9 – 1.4  → CSS var --ui
  "calm": false,
  "difficulty": 1,        // 0.6 | 1 | 1.5
  "tutorials": true,
  "touch": "auto",        // auto | on | off
  "sensitivity": 1,       // 0.4 – 2
  "invertY": false,
  "bindings": {
    "forward": "KeyW", "back": "KeyS", "left": "KeyA", "right": "KeyD",
    "jump": "Space", "dash": "KeyQ", "trick": "KeyR", "sprint": "ShiftLeft",
    "attack": "KeyJ", "defense": "KeyK", "special": "KeyU", "toggle": "KeyI",
    "interact": "KeyE", "map": "KeyM", "pause": "Escape",
    "camLeft": "ArrowLeft", "camRight": "ArrowRight", "camUp": "ArrowUp", "camDown": "ArrowDown"
  },
  "mouse": { "attack": 0, "defense": 2, "special": 1, "toggle": 3 }
}
```

`Settings.reset()` restaura `DEFAULTS`. Cada `set()` persiste e emite `settings:change`, que o
`Game` consome para reaplicar exposição e escala de texto.

## 5. Quando o jogo salva

| Gatilho | Chamada | Observação |
|---|---|---|
| A cada 25 s jogando | `autosave()` → `writeThrottled(state, 25)` | só durante `playing` |
| Baú, missão concluída, chefe derrotado, checkpoint, altar | `autosave(true)` | grava imediatamente |
| Botão “Salvar” | `game:save {manual:true}` | `sfx('save')` |
| Sair para o título | `autosave(true)` | |
| Trocar avatar | `applyAvatar()` → `autosave(true)` | |
| Comprar melhoria | `buyUpgrade()` → `autosave(true)` | |
| Aceitar missão | `acceptQuest()` → `autosave(true)` | |

`SaveManager.writeThrottled` mantém `this.lastWrite` e ignora gravações dentro da janela de 25 s.
`SaveManager.clear()` apaga a chave (botão “Apagar progresso salvo”).

## 6. Equivalência para outros ambientes

Para reconstruir sem `localStorage` (ex.: build empacotado), basta implementar a mesma interface:

```js
interface Storage {
  has(): boolean
  read(): object | null
  write(data): boolean          // deve adicionar savedAt
  writeThrottled(data, seconds): boolean
  clear(): void
}
```

Nada mais no jogo depende de persistência remota. Não há login, perfil, ranking, telemetria,
analytics ou cookies.
