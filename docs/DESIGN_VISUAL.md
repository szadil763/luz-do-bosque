# DESIGN VISUAL — especificação completa

Fontes desta especificação: bloco `<style>` de `index.html` (linhas 7–350), markup (351–517),
`src/ui/*.js`, `src/world/graphics.js`, `src/world/atmosphere.js`, `src/world/postfx.js`.

---

## 1. Princípios

1. **Navy + dourado**: fundo quase preto azulado, painéis `#11151c`, bordas translúcidas brancas,
   acentos dourados (`--gold`) e verdes (`--glow`).
2. **Cartões arredondados** com sombra profunda e um filete interno claro (`inset 0 1px 0`).
3. **Nenhum asset de imagem**: ícones são **emoji**, ilustrações são geometria 3D, texturas são
   geradas em canvas/shader.
4. **Uma única família tipográfica de sistema**: `'Trebuchet MS','Segoe UI',Verdana,sans-serif`.
5. **Escala global de texto** por `--ui` (opção “Tamanho do texto”).
6. **Sem `pointer-lock`**: a câmera reage à posição do cursor (funciona em iframe e toque).

## 2. Tokens (`:root` de `index.html`)

| Token | Valor | Uso |
|---|---|---|
| `--ui` | `1` (0,9–1,4 pela opção) | multiplicador de fonte (`font-size: calc(15px * var(--ui))`) |
| `--ink` | `#f5f7fb` | texto principal |
| `--ink-soft` | `#c3cbdb` | texto secundário |
| `--panel` | `#11151c` | fundo de painel |
| `--panel-2` | `#1a2030` | fundo de item/cartão |
| `--edge` | `rgba(255,255,255,.10)` | borda padrão |
| `--edge-gold` | `rgba(212,175,55,.38)` | borda de destaque |
| `--glow` | `#4ade80` | verde de seleção/ativo |
| `--glow-2` | `#7dd3fc` | azul claro |
| `--gold` | `#d4af37` | dourado principal |
| `--gold-soft` | `#ffd479` | dourado claro (títulos h3, destaques) |
| `--danger` | `#ff7b7b` | perigo |
| `--radius` | `24px` | raio de painel |
| `--radius-sm` | `14px` | raio de botão/cartão |
| `--shadow` | `0 18px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06)` | sombra de painel |

Reset: `*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}`.
`html,body{width:100%;height:100%;overflow:hidden;background:#05060d}` e `user-select:none`.

## 3. Tipografia

| Elemento | Tamanho | Peso/Detalhe |
|---|---|---|
| `body` | `15px × --ui` | família do sistema |
| `.panel h1` | `2.05em`, `line-height 1.1`, `letter-spacing .5px` | bold, centralizado |
| `.panel h2` | `1.45em`, `margin-bottom 10px`, `letter-spacing .3px` | bold, `#fff` |
| `.panel h3` | `1.02em`, `margin 18px 0 7px`, `letter-spacing .4px` | `--gold-soft` |
| `.panel p` | herda | `--ink-soft`, `line-height 1.5`, `margin 6px 0` |
| `.panel .hint` | `.84em` | `#9ca3af`, `line-height 1.45` |
| `.eyebrow` | `.72em`, `letter-spacing 3px`, uppercase | `--gold`, bold |
| `.logo .sub` | `.72em`, `letter-spacing 3px`, uppercase | `--gold` |
| `.logo .lantern` | `3.2em` | emoji 🏮 com `drop-shadow(0 0 20px rgba(255,212,121,.75))` |
| `footer.tip` | `.8em`, centralizado | `#9ca3af` |
| `.dlg .who` | `.78em`, `letter-spacing 2px`, uppercase | `--gold`, bold |
| `.dlg .speech` | `1.02em`, `line-height 1.55`, `min-height 2.8em` | `--ink`; cursor pointer |
| `.toast` | `.86em`, máx. `min(280px,52vw)` | `--ink` |
| `#quest-tracker` | `.82em`, `line-height 1.4` | `--ink` |
| `#hint` | `.9em`, `line-height 1.45`, máx. `min(420px,80vw)` | centralizado |
| `#world-status` | `.7em`, `letter-spacing .6px` | `#ffe6a8` |

## 4. Componentes base

### Botão `.btn`
```
padding 12px 18px; border-radius var(--radius-sm); font-weight bold; text-align center;
background linear-gradient(180deg,#334155,#1e293b);
border 1px solid rgba(255,255,255,.10); color var(--ink);
transition transform .12s, filter .12s
:hover  filter brightness(1.18)
:active transform scale(.98)
:disabled opacity .45; cursor default; filter none
```
Variantes:
- `.btn.primary` — `linear-gradient(180deg,#4ade80,#16a34a)`, borda `rgba(180,255,215,.45)`, texto `#06210f`.
- `.btn.gold` — `linear-gradient(180deg,#ffd479,#d79c26)`, borda `rgba(255,235,180,.5)`, texto `#2a1c04`.
- `.btn.ghost` — fundo `#1e293b`, borda `rgba(255,255,255,.07)`, texto `#e5edf7`.
- `.btn.small` — `padding 8px 12px`, raio `10px`, fonte `.9em`.

### Painel `.panel`
`width min(560px,100%)`; `.panel.wide` `min(760px,100%)`; `max-height 92vh`, `overflow-y auto`,
fundo `var(--panel)`, borda `1px solid var(--edge)`, raio `24px`, `padding 24px`, sombra `var(--shadow)`.
`.screen` centraliza com `background: radial-gradient(circle at 50% 32%,#121824 0%,#05070a 72%)`,
`backdrop-filter blur(4px)`, `padding 16px`, `overflow-y auto`.

### Barra `.bar`
Altura `15px` (`.bar.energy` 11px), raio 999px, fundo `rgba(255,255,255,.07)`, borda
`rgba(255,255,255,.12)`. Preenchimento via `transform: scaleX()` com `transform-origin:left` e
`transition .18s`.
- Vida `#health-fill`: `linear-gradient(90deg,#ff9d9d,#ff5c7a)`.
- Energia `#energy-fill`: `linear-gradient(90deg,#7dd3fc,#38bdf8)`.
- Chefe `#boss-fill`: `linear-gradient(90deg,#ffd479,#ff7b7b)`.
- Texto `.txt`: `.7em`, bold, `text-shadow 0 1px 2px #000`.

### Pílula `.pill`
`padding 3px 9px`, raio 999px, fundo `rgba(74,222,128,.16)`, borda `rgba(74,222,128,.4)`,
texto `#d8ffe9`, `.78em`. `.pill.off` = cinza translúcido.

### Tecla `.key`
`min-width 2em`, `padding 3px 8px`, raio 8px, fundo `rgba(212,175,55,.14)`, borda `--edge-gold`,
texto `#ffe6a8`, `.85em`, bold.

### Item de lista `.item`
`display flex; gap 10px; padding 11px; border-radius var(--radius-sm); background var(--panel-2);
border 1px solid rgba(255,255,255,.07)`. `.ico` `1.6em`; `.t` bold; `.d` `.84em` `--ink-soft`.

### Outros
`.kv` linha chave/valor com `border-bottom 1px dashed rgba(255,255,255,.09)`.
`.switch` linha de toggle com dica; `.tabs` grupo de botões; `.closebar` barra fixa no rodapé do
painel com gradiente para esconder o scroll; `.row` flex com `gap 8px` e filhos `flex:1`.

## 5. Telas (markup real)

| id | Classe | Conteúdo |
|---|---|---|
| `#loading` | `.screen` | logo 🏮, “Luz do Bosque”, `#loading-text`, barra `#loading-fill` (gradiente verde→azul) |
| `#title` | `.screen` | logo + subtítulo “Aventura na escuridão”, h1, parágrafo de apresentação, menu: **▶ Começar aventura** (primary), **↻ Continuar** (oculto se não há save), **🎮 Controles e ajuda**, **⚙ Opções e acessibilidade**, **🗑 Apagar progresso salvo**, rodapé “Feito para crianças explorarem o escuro com curiosidade e coragem.” |
| `#screen-pause` | `.screen` | eyebrow “Aventura em andamento”, h2 “Pausa”, `#pause-stats`, botões: Continuar, Trocar avatar, Melhorias da lanterna, Mochila, Missões, Mapa do bosque, Salvar, Carregar (oculto), Opções, Controles, Voltar ao início |
| `#screen-settings` | `.screen` | `#settings-panel` gerado por `Menus.renderSettings()` |
| `#screen-help` | `.screen` | `#help-body` gerado por `renderHelp()` + “Voltar” |
| `#screen-upgrades` | `.screen` | `.panel.wide#upgrades-panel` |
| `#screen-inventory` | `.screen` | `#inventory-panel` |
| `#screen-quests` | `.screen` | `#quests-panel` |
| `#screen-map` | `.screen` | `.panel.wide#map-panel` (canvas do mapa completo) |
| `#screen-dead` | `.screen` | eyebrow “Um pequeno susto”, h2 “A luz fraquejou…”, texto acolhedor, botão **🔆 Levantar de novo** |
| `#avatar-studio` | `#avatar-studio` (fora de `#screens`) | estúdio (ver §8) |
| `#dialogue` | `#dialogue` | diálogo (ver §7) |

A tela de título é a única com fundo semitransparente que **deixa o mundo 3D aparecer**:
`radial-gradient(circle at 50% 44%, rgba(6,10,18,.18) 0%, rgba(4,6,12,.62) 58%, rgba(2,3,7,.9) 100%)`
com `backdrop-filter blur(1.5px) saturate(1.05)` e `.panel` em `rgba(14,18,26,.82)` + `blur(10px)`.

## 6. HUD (`#hud`)

Posicionamento absoluto sobre o canvas, `pointer-events:none` (só `#gear` e `#btn-avatar` reativam).

| Elemento | Posição | Medidas | Estilo |
|---|---|---|---|
| `.hud-tl` (barras) | `top 10px; left 10px` | largura `min(230px,42vw)`, `padding 9px 11px`, `gap 7px` | fundo `rgba(17,21,28,.72)`, raio `14px`, sombra `0 10px 28px rgba(0,0,0,.45)` |
| `#health-fill` / `#energy-fill` | dentro do card | 15px / 11px | gradientes acima |
| `#world-status` | abaixo das barras | `.7em` | `#ffe6a8` (ex.: “🌙 20:24 · Céu limpo”) |
| `#minimap-wrap` | `top 10px; right 10px` | `min(126px,26vw)` quadrado, raio 50 % | borda `2px solid rgba(255,255,255,.14)`, fundo `rgba(17,21,28,.82)`; canvas 252×252 |
| `#compass` | topo do minimapa | `.68em` | `#ffe6a8`, texto “N” |
| `#gear` (☰) | `top 10px; left 50%` | `38px` círculo | fundo `rgba(17,21,28,.85)` |
| `#btn-avatar` (🎭 TROCAR AVATAR) | `left 10px; top 70px` | `padding 7px 13px`, raio 999px | gradiente `#334155→#1e293b`, borda `--edge-gold`, texto `#ffe6a8` |
| `.ability-bar` | `bottom 14px; left 50%` | `gap 8px` | 6 botões de `54×54px`, raio 14px |
| `.ability` | — | 54×54 | fundo `rgba(17,21,28,.82)`, borda branca 10 %, sombra; `.ico` `1.35em`, `.lbl` `.5em`, `.key` no topo direito, `.cd` overlay escuro com `scaleY()` |
| `.ability.active` | — | — | borda `--glow` + `box-shadow 0 0 16px rgba(74,222,128,.5)` |
| `.ability.locked` | — | — | `opacity .42` |
| `#quest-tracker` | `left 10px; bottom 14px` | `max-width min(300px,44vw)`, `padding 9px 12px` | borda esquerda 3px `--gold`, raio 12px, `.qt` dourado uppercase `letter-spacing 1.6px` |
| `#prompt` | `bottom calc(14px + 70px); left 50%` | raio 999px, `padding 8px 16px` | fundo `rgba(17,21,28,.92)`, borda `--edge-gold`; contém `.key` + texto |
| `#bossbar` | `top 12px; left 50%` | `min(420px,70vw)` | nome dourado uppercase `letter-spacing 1.4px` + barra |
| `#toasts` | `right 12px; bottom calc(14px+76px)` | coluna, `gap 6px` | `.toast` com borda esquerda 3px `--gold`, animação `pop .25s` |
| `#motivation` | `top 18%; left 50%` | `min(520px,86vw)`, `padding 14px 20px` | gradiente radial dourado, `::before` “✦”, animação `mottoIn .6s` |
| `#hint` | `top 16%; left 50%` | `min(420px,80vw)` | card central com sombra |
| `#safe-badge` | `top 10px; left 50%` | pílula | “🌿 Área segura”, texto `#c9ffe4`, fundo `rgba(20,60,44,.8)` |
| `#vignette` | `inset 0` | — | `radial-gradient(... rgba(255,40,60,.42))`, `opacity` controlada por dano, `transition .25s` |

### Minimapa (`HUD.drawMinimap`)
Canvas 252×252 desenhado a cada quadro: anéis de referência, pontos de interesse, zona segura,
inimigos, minichefe, jogador (seta) e borda com bússola. Escala cobre o raio do mapa (52 u).

## 7. Diálogo (`#dialogue`)

```
#dialogue: bottom 20px; left 50%; width min(680px,94vw); animação dlgIn .28s
.dlg: gradiente (180deg, rgba(24,29,40,.97), rgba(13,17,24,.98));
      borda 1px --edge-gold; raio 22px; padding 14px 16px 12px; sombra --shadow
.dlg[data-mood="happy"|"warm"]  → borda dourada forte + brilho externo dourado
.dlg[data-mood="sad"|"afraid"]  → borda azul `rgba(126,200,255,.42)`
.dlg[data-mood="surprise"]      → borda lilás `rgba(240,171,252,.55)`
```
- `#dialogue-portrait` (canvas 128×128 exibido em `92×92`, `flex:0 0 92px`) com
  `drop-shadow(0 6px 16px rgba(0,0,0,.5))` e flutuação `portraitFloat 3.4s` (sobe 3px).
- `.who` = nome do personagem; `.speech` = texto com efeito de digitação (`typeText`) e cursor
  `▌` piscando (`caret .8s steps(1)`).
- `.choices` = botões `.btn.choice` (`linear-gradient(180deg,#243044,#18202e)`, borda dourada 26 %)
  com animação `choiceIn .25s` em cascata.
- Rodapé `.dlg-actions`: **✕ Encerrar** (ghost) e **Continuar ▸** (primary, aparece quando há mais falas).
- Em `max-width:620px`: largura 94vw, retrato 70×70, fala `.96em`.

## 8. Estúdio de avatar (`#avatar-studio`)

Overlay `position:fixed; inset:0; z-index:90`, fundo radial `#121824→#05070a`.
`.studio`: `min(1080px,100%)` × `min(94vh,900px)`, gradiente `#151a24→#0c1017`, raio 26px,
borda branca 9 %, sombra `0 30px 90px rgba(0,0,0,.65)`.

| Parte | Medidas/estilo |
|---|---|
| `.studio-head` | `padding 12px 16px`, gradiente horizontal verde 12 % → dourado 12 %, borda inferior |
| `.studio-wallet` | pílula dourada com `#studio-coins` + 🪙 |
| `.studio-x` | botão circular 36px |
| `.studio-body` | `display:flex; gap:10px; padding:10px` |
| `.studio-stage` | `flex:1.05`, raio 20px, gradiente radial `#1c2534→#0a0e15`, canvas `#studio-canvas` absoluto |
| `.stage-name` | pílula inferior esquerda com o nome da espécie |
| `.stage-tools` | botões “↻ Girar” e “🎉 Comemorar” no canto superior direito |
| `.studio-panel` | `flex:1.15`, abas + grade rolável |
| `.studio-tab` | pílula `padding 7px 11px`, `.8em`; ativa = gradiente verde + brilho |
| `.studio-cards` | grid `repeat(auto-fill,minmax(92px,1fr))`, `gap 8px`; `.tight` 78px |
| `.acard` | cartão `min-height 98px`, raio 16px, gradiente `#1c2433→#141a25`, borda 2px; `.sel` borda `--glow`; `.locked` opacidade .92 e ícone `grayscale(.45)` |
| `.acard-lock` | pílula de preço (🪙), `.free` em verde |
| `.acard-sel` | selo ✓ verde 18px |
| `.rar-*` | comum `rgba(159,180,216,.45)`; raro `#63d3ff`; épico `#c79bff`; lendário `#ffd479`; mítico `#ff9be8` com animação `mythicGlow 3s` |
| `.swatch` | círculo 30px com `--c`; ativo com anel branco + halo verde |
| `.studio-foot` | dois botões flex: “↺ Resetar” (ghost) e “✓ Aplicar visual” (primary) |
| breakpoint `max-width:760px` | `.studio` passa a `height:min(96vh,900px)` e o corpo empilha |

Abas: **Avatares 🐧 · Roupas 👕 · Cabelos 💇 · Acessórios 🎩 · Anime Collection ✨ · Efeitos 🌟 ·
Minha coleção 📚**.

## 9. Controles de toque (`#touch`)

| Elemento | Posição | Medidas |
|---|---|---|
| `#joy` (analógico) | `left 18px; bottom 96px` | 132×132, círculo, fundo `rgba(17,21,28,.45)`, borda branca 14 % |
| `#joy-knob` | centro | 56×56, gradiente radial azul-claro |
| `#lookzone` | `top 0; right 0; left 28%; bottom 390px` | área de arraste para girar a câmera |
| `.tbtns` | `right 16px; bottom 96px` | grid 2 colunas de 64px, `gap 10px` |
| `.tbtn` | — | 64×64 círculo, fundo `rgba(17,21,28,.72)`, borda 2px, `1.3em` + rótulo `.44em`; `.on` verde |

Botões: ⤒ PULAR · ✦ ATACAR · » DASH · ◎ PULSO · 🛡 ESCUDO · 🔆 PODER · ✋ AÇÃO · 🎩 TRUQUE · »» CORRER.
Visibilidade controlada por `settings.touch` (`auto` mostra quando `(pointer:coarse)`).

## 10. Responsividade

- `max-width: 620px` → diálogo 94vw, retrato 70px, fala .96em (HUD já usa `min()` e `vw`).
- `max-width: 760px` → estúdio empilhado/compacto.
- O canvas cobre `100vw × 100vh`; `onResize` atualiza `camera.aspect`, renderer e `postfx.setSize`.
- `--ui` escala **todo** o texto (acessibilidade), sem quebrar layout (larguras em `min(px,vw)`).

## 11. Linguagem visual 3D

### Céu e atmosfera (`SKY_KEYS`, 10 chaves de 0 h a 24 h)
| h | topo | horizonte | névoa | densidade | hemi (céu/chão) | sol | lua |
|---|---|---|---|---|---|---|---|
| 0 | `#050a18` | `#0e1b30` | `#0b1526` | .0130 | `#3a4d76` / `#141d2d` @0.78 | 0.0 | 0.8 |
| 4.6 | `#0c1a33` | `#2b4468` | `#122036` | .0120 | `#41578a` / `#151e30` @0.82 | 0.10 | 0.6 |
| 6.4 | `#3a6aa8` | `#ffb579` | `#5a6076` | .0100 | `#6f8ec4` / `#3d4a45` @0.96 | 1.5 | 0.06 |
| 9.0 | `#4f93cf` | `#e6f4fb` | `#a6c6d8` | .0055 | `#b5d6f5` / `#6f8048` @1.28 | 2.4 | 0 |
| 13.0 | `#4c9ede` | `#e9f7ff` | `#b6d5e4` | .0048 | `#c8e4fb` / `#78874f` @1.38 | 2.7 | 0 |
| 17.0 | `#4f8fc4` | `#f7d9a8` | `#adc0c2` | .0062 | `#b3c9dd` / `#6b664a` @1.14 | 1.9 | 0 |
| 18.8 | `#2f4f7f` | `#ff9c6b` | `#5e5566` | .0085 | `#7d78a8` / `#2f2733` @0.80 | 0.85 | 0.06 |
| 20.4 | `#1c2e4a` | `#6d5a80` | `#22304c` | .0115 | `#4a5b85` / `#1a2334` @0.85 | 0.14 | 0.5 |
| 22.0 | `#070f20` | `#16263f` | `#0f1a2c` | .0130 | `#3b4d74` / `#141d2d` @0.80 | 0.0 | 0.78 |
| 24 | `#050a18` | `#0e1b30` | `#0b1526` | .0130 | `#3a4d76` / `#141d2d` @0.78 | 0.0 | 0.8 |

O jogo começa às **17,6 h** (luz dourada). Céu com sol, lua, estrelas e nuvens em shader;
clima `limpo/chuva/neve/areia` com ícones `✨/🌧/❄️/🌪`.

### Terreno
Altura analítica (ver GAMEPLAY §11). Cor por vértice em HSL:
`h = 0.325 + moss*0.05 − damp*0.05 + meadow*0.02`,
`s = 0.38 + moss*0.10 − damp*0.14`, `l = 0.145 + moss*0.075 + damp*0.05 + meadow*0.03`
(`moss`, `damp` perto do lago, `meadow` perto da clareira). Material com shader de detalhe
procedural (`makeTerrainMaterial`) e smooth shading.

### Vegetação e cenário (`graphics.js`)
- 170 árvores instanciadas (tronco `CylinderGeometry(0.3,0.58,3.6,7)` cor `#4a3a2b`), copas em dois
  tons com 2 esferas escuras + 2 claras por árvore (silhueta orgânica “anime 3D”).
- Grama em lâminas instanciadas (padrão 3.800), flores (520), arbustos, pedras, cogumelos e flores
  luminosas; tudo balança com `grassWind`.
- Água: material com fresnel, espuma e reflexo do céu (`makeWaterMaterial`, `deep #0e3348`,
  `light #3f8f9e`), raio 7 no lago `(-16,9)`; cachoeira `buildWaterfall` (largura 2,6 · altura 5,2).
- Cenário distante: cordilheiras em camadas, castelo, ilhas flutuantes e muralha de rochas
  (`buildDistantLandscape`), tudo com `userData.noShadow`.
- Névoa: `FogExp2('#8fb4c9', 0.0072)`.

### Personagens e criaturas
- Avatar jogável: primitivas com `flatShading`, paleta do catálogo (corpo, roupa, cabelo).
- Inimigos: sombra `#3b3560` (olhos `#bff6ff`), cogumelo `#c25a86` (touca com pintas `#ffe9f3`,
  olhos `#fff6d8`), espírito `#7fe3d8` translúcido (opacidade .72).
- Chefe: cinzas azulados `#6b6f86 / #7d8299 / #8f95ab / #9aa0b6`, olhos verdes `#8ef7c0`,
  cristal no peito `#7ec8ff`, anel de aviso `#ff8f8f`.
- Lanterna: núcleo emissivo na cor da skin, `PointLight` de alcance 30+, cone `SpotLight` ao mirar
  (intensidade 4.2), escudo esférico translúcido.

### Pós-processamento (visual final)
ACES + exposição 1.14 + saturação 1.16 + vinheta 0.45 + grão 0.016 + bloom 0.72 + god rays 0.9.
O “brilho da cena” das opções multiplica a exposição (0,6–1,6).

## 12. Estados visuais obrigatórios

| Componente | normal | hover | ativo/pressionado | desativado |
|---|---|---|---|---|
| `.btn` | gradiente slate | `brightness(1.18)` | `scale(.98)` | `opacity .45` |
| `.ability` | card escuro | — | `.active` borda verde + glow; `.cd` cobre de baixo para cima | `.locked` opacidade .42 |
| `.acard` | cartão escuro | `translateY(-2px)` | `.sel` borda verde + anel | `.locked` ícone cinza |
| `.studio-tab` | pílula cinza | — | `.on` gradiente verde + glow | — |
| `.swatch` | círculo colorido | — | `.on` anel branco + halo verde | — |
| `.tbtn` | círculo escuro | — | `.on` fundo verde 40 % | — |
| `.tbarra` | gradiente | — | `scaleX` animado | — |
