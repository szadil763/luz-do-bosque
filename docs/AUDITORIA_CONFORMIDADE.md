# AUDITORIA FINAL DE CONFORMIDADE

Estados: **EXTRAÍDO** (documentado a partir do código e/ou copiado integralmente) ·
**PARCIALMENTE EXTRAÍDO** (estrutura completa, mas algum aspecto não verificável nesta auditoria) ·
**NÃO DISPONÍVEL** (não existe no projeto original).

| # | Item auditado | Estado | Evidência |
|---|---|---|---|
| 1 | Todos os arquivos inventariados | **EXTRAÍDO** | 33 arquivos em `MANIFESTO_DE_ARQUIVOS.txt` (sha256 + bytes) |
| 2 | Código-fonte copiado | **EXTRAÍDO** | `CODIGO_FONTE/` verbatim (24 módulos + index.html + three.js + configs) |
| 3 | Componentes/páginas (telas) | **EXTRAÍDO** | 9 telas + estúdio + diálogo em `DESIGN_VISUAL.md` §5–8 e `COMPONENTES.md` |
| 4 | CSS completo (tokens, medidas, estados) | **EXTRAÍDO** | `DESIGN_VISUAL.md` §2–10; `ASSETS_ORIGINAIS/tokens_css.css` |
| 5 | Tipografia | **EXTRAÍDO** | pilha do sistema + tabela de tamanhos (`DESIGN_VISUAL.md` §3) |
| 6 | Cores e gradientes | **EXTRAÍDO** | tokens, variantes de botão, barras, raridades, céu (10 chaves) |
| 7 | Sombras, bordas, raios, sombras internas | **EXTRAÍDO** | `--shadow`, `--radius`, `.panel`, `.acard` |
| 8 | Ícones | **EXTRAÍDO** | 120 emojis distintos / 313 ocorrências em `emojis.json` |
| 9 | Imagens/sprites/texturas em arquivo | **NÃO DISPONÍVEL** | o projeto não possui bitmaps (tudo procedural) |
| 10 | Fontes em arquivo | **NÃO DISPONÍVEL** | usa fontes do sistema |
| 11 | Áudio em arquivo | **NÃO DISPONÍVEL** | 100 % WebAudio; parâmetros em `trilhas_audio.json` |
| 12 | Trilhas musicais (5) | **EXTRAÍDO** | BPM, pads, baixos, melodias, ondas, percussão |
| 13 | Efeitos sonoros (33) | **EXTRAÍDO** | tabela completa em `ANIMACOES_E_AUDIO.md` §6.4 |
| 14 | Timbre/experiência sonora | **PARCIALMENTE EXTRAÍDO** | parâmetros completos; não houve escuta no ambiente |
| 15 | Animações de personagem | **EXTRAÍDO** | fórmulas de `_animate/_animateAir/_animateDash` |
| 16 | Animações de objetos/UI | **EXTRAÍDO** | keyframes CSS + `rig.updaters` + animações do mundo |
| 17 | Câmera (comportamentos) | **EXTRAÍDO** | `core/camera.js` documentado em §3 |
| 18 | Efeitos de partículas | **EXTRAÍDO** | pool de 900, shader, API e tabela por momento |
| 19 | Jogabilidade — movimento/física | **EXTRAÍDO** | `GAMEPLAY.md` §2 (todos os números) |
| 20 | Jogabilidade — poderes da lanterna | **EXTRAÍDO** | `GAMEPLAY.md` §3 (custos, recargas, fórmulas) |
| 21 | Jogabilidade — combate | **EXTRAÍDO** | `GAMEPLAY.md` §4 |
| 22 | Jogabilidade — inimigos e chefe | **EXTRAÍDO** | `GAMEPLAY.md` §5–6 (stats, fases, recompensas) |
| 23 | Jogabilidade — interativos | **EXTRAÍDO** | `GAMEPLAY.md` §7 (12 classes + posições) |
| 24 | Jogabilidade — itens, baús, inventário | **EXTRAÍDO** | `GAMEPLAY.md` §8 + `itens_e_baus.json` |
| 25 | Progressão (XP, níveis, títulos, relíquias) | **EXTRAÍDO** | `GAMEPLAY.md` §9 |
| 26 | Missões (7) e enigmas | **EXTRAÍDO** | `GAMEPLAY.md` §10 (passos, recompensas, respostas) |
| 27 | Mundo — mapa, coordenadas, limites | **EXTRAÍDO** | `GAMEPLAY.md` §11 |
| 28 | Ciclo dia/noite, clima, vento | **EXTRAÍDO** | `GAMEPLAY.md` §12 e `paleta_3d.json` |
| 29 | Dificuldade/acessibilidade | **EXTRAÍDO** | `GAMEPLAY.md` §13 e tela de opções |
| 30 | Casos limite/comportamentos incomuns | **EXTRAÍDO** | `GAMEPLAY.md` §14 |
| 31 | Arquitetura e dependências | **EXTRAÍDO** | `ARQUITETURA.md` (grafo real dos imports) |
| 32 | Eventos e gatilhos | **EXTRAÍDO** | catálogo de 68 nomes em `ARQUITETURA.md` §6 |
| 33 | Fluxos de navegação e de interação | **EXTRAÍDO** | `FLUXOS.md` (diagramas + tabelas) |
| 34 | Persistência (esquema completo) | **EXTRAÍDO** | `BANCO_DE_DADOS.md` |
| 35 | Dependências externas / serviços Base44 | **EXTRAÍDO** | nenhuma dependência de runtime; só o compose de dev |
| 36 | Banco de dados/modelos/relacionamentos | **NÃO DISPONÍVEL** | não existe banco (localStorage) |
| 37 | Autenticação/usuários | **NÃO DISPONÍVEL** | não existe login |
| 38 | Backend/APIs | **NÃO DISPONÍVEL** | não existe servidor de aplicação |
| 39 | Rotas de SPA | **NÃO DISPONÍVEL** | jogo de uma página; navegação por telas |
| 40 | Conteúdo dos 6 biomas não implementados | **NÃO DISPONÍVEL** | só metadados (`BIOME_LIST`), `build()` retorna false |
| 41 | Efeito mecânico dos traços de personalidade | **NÃO DISPONÍVEL** | são apenas registrados no save |
| 42 | Testes automatizados | **NÃO DISPONÍVEL** | não existem no projeto |
| 43 | Diálogos completos dos 9 NPCs | **EXTRAÍDO** | arquivo `npc.js` copiado integralmente (~310 linhas de conteúdo) |
| 44 | Retratos de diálogo | **EXTRAÍDO** | `drawPortrait` (canvas vetorial por `kind`) |
| 45 | Catálogo de avatares (61 itens) | **EXTRAÍDO** | `catalogo_avatar.json` + `builder.js` |
| 46 | Geometria dos avatares | **EXTRAÍDO** | `builder.js` copiado (1.077 linhas) |
| 47 | Shaders (terreno, água, partículas, céu, postfx) | **EXTRAÍDO** | no código copiado + `shaders_postfx.js` |
| 48 | Pós-processamento (parâmetros) | **EXTRAÍDO** | `DESIGN_VISUAL.md` §11 e `paleta_3d.json` |
| 49 | Desempenho/FPS real | **PARCIALMENTE EXTRAÍDO** | qualidade adaptativa documentada; FPS depende de GPU |
| 50 | Comportamento visual final em hardware real | **PARCIALMENTE EXTRAÍDO** | parâmetros completos; preview roda em software |

## Resumo

- **EXTRAÍDO:** 37 itens.
- **PARCIALMENTE EXTRAÍDO:** 3 itens (timbre sonoro, FPS, aparência em GPU real) — todos por
  limitação de ambiente de auditoria, não por falta de informação no código.
- **NÃO DISPONÍVEL:** 10 itens — todos por **inexistência no projeto original** (bitmaps, fontes em
  arquivo, áudio em arquivo, banco de dados, autenticação, backend/APIs, rotas de SPA, biomas não
  implementados, efeito mecânico dos traços, testes automatizados).

Nenhuma parte do código foi deixada sem exame: os 33 arquivos foram lidos (integralmente os de
lógica própria; `three.module.js` foi copiado, não reescrito).
