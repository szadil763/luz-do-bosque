# Luz do Bosque — Pacote de transferência técnica (reconstrução 1:1)

Versão auditada: branch `darkness-adventure-game`, commit `f22ce107d6` + commits de ambiente (`48c40c7`).
Data da extração: 2026-11-24.
Idioma do produto: português (pt-BR). Todo texto de interface, diálogo, item e missão está em pt-BR e deve ser reproduzido literalmente.

---

## 1. O que é o jogo

Jogo 3D de aventura, exploração e combate em terceira pessoa, com gráficos cartunescos
construídos **inteiramente por primitivas geométricas** (sem nenhum arquivo de imagem ou áudio),
sobre uma floresta noturna. O tema é ajudar crianças a trocar o medo do escuro por curiosidade e coragem.

- **Título:** Luz do Bosque — A Lanterna Mágica
- **Gênero:** aventura/exploração/combate 3D em terceira pessoa
- **Câmera:** orbital em terceira pessoa (mouse, setas, arraste no toque)
- **Conteúdo implementado:** 1 bioma jogável (Floresta Encantada) + 4 zonas de missão
  (Bosque Sem Luz, Caverna Sem Fim, Ruínas Antigas, Templo Noturno) + 1 região desbloqueável
  (Bosque da Noite Estrelada)
- **Estados do jogo:** `loading → title → playing → (paused | dead)`

## 2. Stack técnica real (não é React, não usa SDK do Base44)

| Item | Valor |
|---|---|
| Linguagem | JavaScript ES2020+ (módulos ES nativos, `type="module"`) |
| Bundler | **nenhum** (sem npm, sem build step, sem transpilação) |
| Engine 3D | Three.js **r160**, vendorizado em `vendor/three/three.module.js` (53.044 linhas, 1,4 MB) |
| Resolução do import | `<script type="importmap">` → `{"three": "./vendor/three/three.module.js"}` |
| Servidor | Browsersync (`node:22`) na porta 3000, live reload em `index.html`, `src/**/*.js`, `vendor/**/*.js` |
| CSS | um único bloco `<style>` dentro de `index.html` (linhas 7–350) |
| Backend | **não existe** |
| Banco de dados | **não existe** (persistência em `localStorage`) |
| Autenticação | **não existe** |
| Dependências externas | **nenhuma** (sem CDN, sem fontes web, sem texturas, sem áudio binário) |
| Testes automatizados | **nenhum** (a verificação é jogar/inspecionar) |

Consequência para a reconstrução: **não há o que instalar**. Basta copiar a árvore e servir
arquivos estáticos por HTTP, mantendo a resolução do importmap.

## 3. Números do projeto

| Métrica | Valor |
|---|---|
| Arquivos versionados | 33 |
| Linhas totais | 65.572 |
| Linhas de código próprio | **12.528** (24 módulos JS + `index.html` com 517 linhas) |
| Linhas vendorizadas (three.js) | 53.044 |
| Maior módulo próprio | `src/world/biome.js` (1.162 linhas) |
| Áudio procedural | 5 trilhas musicais + 33 efeitos, gerados por WebAudio |
| Itens de avatar | 7 espécies, 13 roupas, 9 cabelos, 8 chapéus, 8 rostos, 9 costas, 7 auras |
| Missões | 7 (3 introdutórias + 4 missões de coragem) |
| Inimigos | 3 tipos + 1 minichefe |

## 4. Árvore de arquivos (idêntica à original)

```
index.html                      telas/HUD/estúdio/diálogo + CSS completo + importmap
src/main.js                     Game: renderer, FSM, loop, save, XP, eventos, tutoriais
src/core/state.js               StateMachine, Emitter, clamp/lerp/damp/rand/dist2D/angleLerp
src/core/settings.js            DEFAULTS, bindings teclado/mouse, labels, persistência
src/core/save.js                SaveManager (localStorage, throttling)
src/core/input.js               teclado + mouse M1–M4 + toque unificado (ACTIONS)
src/core/audio.js               AudioManager: 5 trilhas, 33 sfx, ambiente procedural
src/core/camera.js              CameraRig: órbita, zoom, auto-align, shake
src/player/player.js            movimentação, dash, salto, dano, animação procedural
src/player/lantern.js           poderes, energia, recargas, melhorias, manobras
src/systems/combat.js           projéteis, reflexo, dano, hit-stop
src/systems/enemies.js          ENEMY_TYPES + IA (sombra, cogumelo, espírito)
src/systems/miniboss.js         Guardião Antigo (fases, telegrafia, recompensas)
src/systems/interactables.js    baús, caixas, alavancas, portas, cristais, flores, paredes...
src/systems/loot.js             ITEMS, CHEST_TIERS, rollChest, Inventory
src/systems/npc.js              QUEST defs, QuestManager, NPC_DEFS, NPC, DialogueSystem
src/systems/motivation.js       MOTIVATION_LINES + temporizador de frases
src/world/biome.js              BIOME_LIST, terreno, colisão, Floresta Encantada
src/world/questland.js          ZONES + construções das 4 missões de coragem
src/world/graphics.js           materiais procedurais, grama, flores, água, cenário distante
src/world/atmosphere.js         dia/noite, céu, nuvens, clima, vento, luzes
src/world/postfx.js             pipeline HDR: bloom, god rays, ACES, grading, vinheta
src/world/effects.js            partículas, brilhos, anéis, feixes
src/ui/hud.js                   barras, habilidades, minimapa, avisos, toque
src/ui/menus.js                 telas: título, pausa, opções, melhorias, mochila, missões, mapa
src/ui/avatar-studio.js         estúdio de avatar com prévia 3D
src/avatar/catalog.js           dados: espécies, roupas, cabelos, chapéus, rostos, costas, auras
src/avatar/builder.js           geometria procedural dos avatares (rig do Player)
src/avatar/avatar-state.js      visual escolhido + itens desbloqueados
vendor/three/three.module.js    Three.js r160 (vendorizado)
```

## 5. Conteúdo deste pacote

| Arquivo | Conteúdo |
|---|---|
| `README_GERAL.md` | este documento |
| `ARQUITETURA.md` | módulos, dependências, eventos, pipeline de render, inicialização |
| `GAMEPLAY.md` | todas as mecânicas, números, fórmulas, missões, itens |
| `DESIGN_VISUAL.md` | tokens CSS, tipografia, medidas, telas, HUD, paleta 3D, pós-processamento |
| `ANIMACOES_E_AUDIO.md` | animações procedurais, câmera, partículas, trilhas e 33 efeitos |
| `BANCO_DE_DADOS.md` | chaves e esquema completo do `localStorage` |
| `FLUXOS.md` | fluxos de navegação, diagramas e tabelas ação→evento→resultado |
| `COMPONENTES.md` | ficha técnica de cada módulo/classe/função |
| `ASSETS.md` | inventário de recursos (não há binários; emojis, paletas, shaders) |
| `INSTRUCOES_CLAUDE.md` | regras obrigatórias + receita de reconstrução passo a passo |
| `LIMITACOES.md` | o que não pôde ser extraído e por quê |
| `AUDITORIA_CONFORMIDADE.md` | tabela EXTRAÍDO / PARCIALMENTE EXTRAÍDO / NÃO DISPONÍVEL |
| `MANIFESTO_DE_ARQUIVOS.txt` | sha256 (16 chars) + bytes + caminho de cada arquivo copiado |
| `CODIGO_FONTE/` | **cópia integral e verbatim** de todos os fontes, `index.html`, three.js e configs |
| `ASSETS_ORIGINAIS/` | catálogos exportados em JSON + paleta CSS + shaders extraídos |

## 6. Como rodar o original

```bash
# ambiente Base44 (já configurado)
docker compose --project-name app --project-directory "$BASE44_PROJECT_ROOT" \
  -f "$BASE44_CONFIG_ROOT/docker-compose.base44.yml" up -d --build

# fora do Base44: qualquer servidor estático na porta 3000
python3 -m http.server 3000     # ou npx serve -l 3000
```

Verificação mínima: abrir `/` → tela de título → **Começar aventura** → acampamento com fogueira,
HUD (vida/energia, 6 ícones de habilidade, minimapa) e dicas de tutorial.

## 7. Controles padrão

| Ação | Teclado | Mouse |
|---|---|---|
| Andar | W A S D | — |
| Correr | Shift | — |
| Pular | Espaço | — |
| Dash | Q | — |
| Manobra da lanterna | R | — |
| Atacar / usar poder | J | M1 (esquerdo) |
| Defesa / mira (escudo) | K | M2 (direito) |
| Habilidade especial (pulso) | U | M3 (meio) |
| Alternar poder | I | M4 (extra) |
| Interagir | E | — |
| Mapa | M | — |
| Pausa | Esc | — |
| Câmera | ← → ↑ ↓ | movimento do cursor |

> Atenção: no navegador o botão 1 é o do meio e o 2 é o direito. O jogo rotula
> `0→M1, 1→M3, 2→M2, 3→M4` (`MOUSE_SHORT` em `core/settings.js`).

## 8. Fidelidade — o que está garantido

- Todos os 24 módulos e o `index.html` foram copiados **byte a byte** em `CODIGO_FONTE/`.
- Todos os números, fórmulas, textos, cores, medidas e shaders citados nos documentos foram
  lidos do código desta versão (nenhum valor foi estimado).
- O jogo **não possui** assets binários: toda imagem é geometria/emoji/shader, todo som é
  sintetizado em tempo real. Portanto "exportar os arquivos originais" = exportar código,
  catálogos e paletas — o que este pacote faz.
