# ASSETS — inventário completo de recursos

## 1. Resultado da auditoria: o projeto não possui assets binários

| Categoria | Existe? | Observação |
|---|---|---|
| Imagens (PNG/JPG/WebP/SVG/GIF) | **NÃO** | zero arquivos de imagem no repositório |
| Sprites / sprite sheets | **NÃO** | personagens e objetos são geometria 3D procedural |
| Texturas | **NÃO** (arquivos) | duas texturas são **geradas em runtime**: brilho radial 128×128 (canvas) e a textura interna do Three.js para pontos |
| Ícones | **SIM** (emoji) | 120 emojis distintos, 313 ocorrências (inventário em `ASSETS_ORIGINAIS/emojis.json`) |
| Fontes | **NÃO** | usa a pilha do sistema: `'Trebuchet MS','Segoe UI',Verdana,sans-serif` |
| Sons / músicas | **NÃO** (arquivos) | 100 % WebAudio procedural (5 trilhas + 33 efeitos) |
| Vídeos | **NÃO** | — |
| Animações | **NÃO** (arquivos) | procedurais (senoides/amortecimento) e keyframes CSS |
| Shaders | **SIM** (texto no código) | terreno, grama, água, partículas, céu, nuvens, pós-processamento |
| Modelos 3D (glTF/OBJ) | **NÃO** | primitivas Three.js (`BoxGeometry`, `SphereGeometry`, `ConeGeometry`, `CylinderGeometry`, `IcosahedronGeometry`, `OctahedronGeometry`, `TorusGeometry`, `RingGeometry`, `PlaneGeometry`) |

Consequência: “exportar os recursos originais” significa exportar **código, dados de catálogo,
paletas e shaders** — todos incluídos neste pacote. Não existe arte bitmap ou áudio para exportar.

## 2. Arquivos entregues no pacote

### `CODIGO_FONTE/` (cópia verbatim — 33 arquivos)
```
index.html
src/main.js
src/core/{state,settings,save,input,audio,camera}.js
src/player/{player,lantern}.js
src/systems/{combat,enemies,miniboss,interactables,loot,npc,motivation}.js
src/world/{biome,questland,graphics,atmosphere,postfx,effects}.js
src/ui/{hud,menus,avatar-studio}.js
src/avatar/{catalog,builder,avatar-state}.js
vendor/three/three.module.js          (Three.js r160, 1,4 MB)
AGENTS.md
docker-compose.base44.yml
.base44/environment.json
```
Integridade: `MANIFESTO_DE_ARQUIVOS.txt` traz sha256 (16 caracteres) + tamanho em bytes de cada um.

### `ASSETS_ORIGINAIS/`
| Arquivo | Conteúdo |
|---|---|
| `catalogo_avatar.json` | 61 itens de avatar com raridade, custo, coleção de anime, cores, expressões, `DEFAULT_AVATAR` |
| `itens_e_baus.json` | 28 itens (`ITEMS`) e 3 tiers de baú com tabelas de loot/chance |
| `paleta_3d.json` | 10 chaves de céu, terreno (fórmula + HSL), luzes, água, vegetação, inimigos, chefe, poderes, pós-processamento |
| `trilhas_audio.json` | 5 trilhas (BPM, pad, baixo, melodia, ondas, percussão), ambiente, ganhos, lista de 33 efeitos |
| `emojis.json` | 120 emojis distintos com contagem e arquivos onde aparecem |
| `tokens_css.css` | bloco `:root` original (17 tokens) |
| `shaders_postfx.js` | shaders originais do pós-processamento (bright, blur, rays, final) |

## 3. Inventário de emojis (por função)

**Marca e navegação:** 🏮 (logo) · ☰ (menu) · 🎭 (avatar) · ✕ · ▸ · ↻ · ↺ · ✓ · 🗑 · 💾 · 📂 · ⏏ · ⚙ · 🎮 · 🗺 · 📜 · 🎒 · 🏅 · 🔆 · ✨ · ⭐ · 🌙 · 🌿 · 💎 · 🔷 · 🪙 · 🪄 · 🎗 · 📿 · 🛡 · 🗝 · ❤️ · 💠 · 🌀 · 🌟 · 🌪 · 🎈 · 🤹 · 🪐 · ✍️ · 🔭 · ⚡ · 🔋 · ⏱ · ◎ · » · »» · ⤒ · ✦ · 🛡 · ✋ · 🎩 · 👁 · 🔒 · 🎁 · 📦 · 🏮.

**Clima:** ✨ céu limpo · 🌧 chuva · ❄️ neve · 🌪 areia.

**Coleções de anime:** 🧿 Jujutsu · 🔥 Dragon Ball · 🕵️ Spy x Family · 🥷 Naruto · 🏴‍☠️ One Piece · 🧹 Little Witch.

**Espécies:** 🐧 Pip · 🍦 Gelato · 🐻 Mel · 🐱 Mimi · 🐰 Pipoca · 🦊 Fizz · ⭐ Nova.

**Roupas/acessórios:** 🧵 🧥 👗 🎽 🥋 🩳 💇 🎀 💫 🌪 🧢 🍄 ⛑ 🏴‍☠️ 🥷 🧙 👑 👓 🕶 🩹 📡 🎭 🥋 🎒 🦋 🦸 🧹 🗡 👛 🔮.

**Efeitos/auras:** ✨ 🔵 🟣 🌀 🔥 🌟.

A lista exata, com contagens e arquivos, está em `ASSETS_ORIGINAIS/emojis.json`.

## 4. Texturas e materiais gerados em runtime

| Recurso | Onde | Como |
|---|---|---|
| Sprite de brilho | `world/effects.js → makeGlowTexture()` | canvas 128×128, gradiente radial branco (stops 0, 0.22, 0.55, 1) |
| Terreno | `world/graphics.js → makeTerrainMaterial()` | shader com ruído/hash e detalhe por vértice |
| Grama | `buildGrassField` | lâminas instanciadas + shader de vento (`grassWind`) |
| Flores | `buildFlowerField` | instâncias coloridas |
| Água | `makeWaterMaterial` | fresnel + espuma + reflexo do céu |
| Cachoeira | `buildWaterfall` | planos animados + partículas |
| Céu/nuvens/estrelas | `atmosphere.js` | domo com shader, pontos, planos de nuvem |
| Partículas | `effects.js` | `ShaderMaterial` aditivo com 900 pontos |
| Retratos de diálogo | `ui/menus.js → drawPortrait()` | desenho vetorial em canvas 128×128 (por `kind`: firefly, kid, keeper, elder, adventurer, knight, fairy, sage, spirit, stone) |
| Prévia do avatar | `avatar/builder.js` | geometria procedural no renderer do estúdio |
| Minimapa / mapa | `ui/hud.js`, `ui/menus.js` | canvas 2D desenhado por frame |

## 5. Bibliotecas e dependências

| Dependência | Versão | Como é fornecida |
|---|---|---|
| Three.js | r160 | vendorizada (`vendor/three/three.module.js`), resolvida por importmap |
| Browsersync | (via `npx`) | apenas servidor de desenvolvimento no compose |
| Node.js | 22 | apenas para o Browsersync |

Nenhuma outra dependência de runtime. Não há `package.json` no repositório do jogo.

## 6. Direitos e proveniência

- Todo o código, texto, nomes, diálogos, paletas e geometria foram criados no próprio projeto.
- As “coleções de anime” são **homenagens estilizadas** feitas com primitivas e emojis; não há
  assets, nomes de personagens licenciados ou músicas de terceiros.
- Three.js é distribuído sob licença MIT (cabeçalho preservado no arquivo vendorizado).
