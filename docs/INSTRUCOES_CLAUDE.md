# INSTRUÇÕES PARA RECONSTRUÇÃO INTEGRAL

> Você está recebendo a documentação técnica e os arquivos originais de um jogo já desenvolvido.
> Sua missão é reconstruir o jogo reproduzindo fielmente o projeto original.
>
> **REGRAS OBRIGATÓRIAS**
>
> 1. Não invente novas mecânicas.
> 2. Não simplifique funcionalidades.
> 3. Não altere o design visual.
> 4. Não substitua os recursos gráficos originais.
> 5. Não modifique as regras de jogabilidade.
> 6. Não altere os comportamentos dos personagens.
> 7. Não elimine animações ou efeitos.
> 8. Preserve a experiência original do jogador.
> 9. Reproduza todos os menus, telas, componentes e interações.
> 10. Implemente todas as funcionalidades documentadas.
> 11. Preserve as proporções e o posicionamento dos elementos.
> 12. Reproduza o comportamento em computadores e dispositivos móveis.
> 13. Utilize os arquivos originais sempre que disponíveis.
> 14. Identifique qualquer funcionalidade que dependa de infraestrutura externa e implemente uma
>     alternativa compatível sem alterar seu comportamento.
> 15. Não considere a reconstrução concluída enquanto existirem funcionalidades documentadas
>     ainda não implementadas.
>
> A prioridade máxima é a fidelidade ao jogo original, tanto visual quanto funcional.
> Antes de finalizar, compare a reconstrução com as especificações originais e execute testes
> completos de funcionamento.

---

## 0. Nota decisiva sobre este projeto

A reconstrução **não é uma reimplementação**: os arquivos originais existem e são JavaScript puro,
sem build. A forma mais fiel (e a recomendada) é **restaurar os arquivos de `CODIGO_FONTE/` na
mesma árvore** e servi-los. Qualquer reescrita introduz divergência. Se for necessário reescrever
(por exemplo, para outra stack), use os documentos como especificação e compare byte a byte o
comportamento com o original.

## 1. Receita de restauração (recomendada)

```bash
# 1. criar a árvore
mkdir -p src/core src/player src/systems src/world src/ui src/avatar vendor/three

# 2. copiar TODOS os arquivos de CODIGO_FONTE/ preservando caminhos
cp -r CODIGO_FONTE/. destino/

# 3. servir (não abrir via file:// — módulos ES exigem HTTP)
python3 -m http.server 3000
#    ou: npx browser-sync start --server --files "index.html,src/**/*.js,vendor/**/*.js" --port 3000
```

Requisitos do ambiente: navegador com **módulos ES + importmap** (Chrome/Edge 89+, Firefox 108+,
Safari 16.4+) e **WebGL**. Não há npm install, build, variável de ambiente ou banco.

## 2. Ordem de criação (se for reescrever)

1. `index.html` — markup + CSS + importmap **antes** de qualquer JS (os módulos consultam os ids).
2. `vendor/three/three.module.js` — copiar integralmente (r160).
3. `src/core/state.js` → `settings.js` → `save.js` → `input.js` → `audio.js` → `camera.js`
   (base sem dependências).
4. `src/world/effects.js` (usado por quase tudo).
5. `src/systems/loot.js` → `interactables.js` → `npc.js` (dados + diálogo + missões).
6. `src/world/graphics.js` → `questland.js` → `biome.js` (o mundo depende dos anteriores).
7. `src/world/atmosphere.js` → `postfx.js`.
8. `src/player/player.js` (depende de `avatar/builder.js`) → `avatar/catalog.js` →
   `avatar/builder.js` → `avatar/avatar-state.js` → `player/lantern.js`.
9. `src/systems/combat.js` → `enemies.js` → `miniboss.js` → `motivation.js`.
10. `src/ui/hud.js` → `menus.js` → `avatar-studio.js`.
11. `src/main.js` por último (orquestra todos).

## 3. Invariantes que NÃO podem ser alteradas

| # | Invariante | Consequência se violada |
|---|---|---|
| 1 | `importmap` resolvendo `"three"` para `./vendor/three/three.module.js` | todos os módulos falham ao importar |
| 2 | Um único ponto de desenho: `Game.renderFrame → PostFX.render` | dupla renderização / perda do look cinematográfico |
| 3 | `atmosphere.js` é a única fonte de intensidade de `hemi/sun/moon` | o dia “congela” em iluminação noturna (bug já ocorrido) |
| 4 | `world.isSafe()` desliga IA de inimigos **e** do chefe | o jogador morre no acampamento em segundos |
| 5 | Teclas lidas em `frame()` exigem `input.consume(...)` | a mesma tecla é processada duas vezes no quadro |
| 6 | Rótulos de mouse: `0→M1, 1→M3, 2→M2, 3→M4` | HUD e opções mentem sobre os botões |
| 7 | Botões `[data-close]` por delegação no `document` | telas dinâmicas não fecham |
| 8 | `AudioContext` só no primeiro gesto (`unlock`) | áudio bloqueado pela política de autoplay |
| 9 | Rede de segurança de NaN no `Player.update` | jogador pode cair no vazio para sempre |
| 10 | Salvar valida `position.every(Number.isFinite)` | save corrompido trava o carregamento |
| 11 | Câmera nunca abaixo de `terrainHeight + 0.7` | câmera atravessa o chão |
| 12 | `renderer.toneMappingExposure = 1.08 × brightness` e `postfx.setLook({exposure: 1.14 × brightness})` | o controle de brilho deixa de funcionar |

## 4. Ordem de construção do mundo (obrigatória)

`World.build('floresta')` executa, nesta sequência: terreno → árvores → copas → arbustos → grama →
flores → pedras → cogumelos → vaga-lumes → lago → cachoeira → vitórias-régias → acampamento →
ruínas → clareira → ravina/altar → planalto → grove secreto → segredos → cristais → portal de bioma →
inscrições → NPCs → QuestLand → inimigos → cenário distante → névoa e luzes.
Inverter a ordem muda colisões, sombras e sobreposição de objetos.

## 5. Checklist de verificação (execute na ordem)

1. **Boot:** `/` mostra a tela de carregamento com 4 mensagens e depois o título com o bosque 3D ao fundo girando.
2. **Novo jogo:** acampamento com fogueira, 3 tendas, Lumi e Mila; HUD com vida/energia, 6 habilidades, minimapa, badge “🌿 Área segura”, dica inicial.
3. **Movimento:** WASD relativo à câmera, Shift corre, Espaço pula, Q dash com rastro, passos audíveis.
4. **Lanterna:** M1 atira, segurar M1 carrega e solta disparo grande, M2 escudo bloqueia, M3 pulso, M4 alterna poder, R manobra.
5. **Diálogo:** E em Lumi → retrato desenhado, texto digitando, escolhas, “Continuar ▸”; ao fechar, Revelação desbloqueada.
6. **Missão:** 3 fragmentos (baús/caixas/inimigos purificados) → altar `(-2,-34)` → portal desperta + Gancho.
7. **Combate:** sombra/cogumelo/espírito com drops; purificação converte corrompidos; vinheta e tremor ao levar dano.
8. **Chefe:** aproximar das ruínas `(-24,-22)` → barra do chefe, telegrafia, cristal exposto, fúria em 50 %, recompensas + chave.
9. **Interativos:** baú, caixa quebrável, alavancas + portão, 4 cristais, 5 flores, paredes ilusórias (Revelação), inscrições, checkpoint.
10. **Telas:** pausa, opções (todos os sliders/toggles/rebind), melhorias, mochila, missões, mapa, ajuda, morte/respawn.
11. **Estúdio:** abrir, navegar 7 abas, comprar item bloqueado com moedas, aplicar visual, fechar com Esc.
12. **Persistência:** recarregar a página → “Continuar” restaura posição, vida, inventário, missões, avatar, mundo.
13. **Áudio:** música muda entre exploração/segura/combate/chefe/secreto; volumes das opções respondem.
14. **Ciclo do dia:** após alguns minutos a luz muda; `#world-status` mostra hora e clima.
15. **Mobile:** joystick, 9 botões de toque, arraste na `#lookzone`, diálogo 94vw, estúdio empilhado.

## 6. Armadilhas conhecidas (do próprio projeto)

- Não chamar `renderer.render(scene, camera)` no loop (exceto fallback sem `postfx`).
- Não reescrever intensidades de luz fora de `atmosphere.js`.
- Não remover `input.consume` das teclas tratadas em `frame()`.
- Não trocar three.js por CDN/npm (o projeto é offline e sem build).
- Não “melhorar” os diálogos: eles são conteúdo do produto (tom acolhedor, pt-BR).
- Não substituir emojis por ícones de biblioteca: a interface foi desenhada em cima deles.
- Não alterar as fórmulas de dano/energia/velocidade: o balanceamento é parte da experiência.

## 7. Critério de conclusão

A reconstrução só está concluída quando **todos os 15 itens do checklist passam** e quando uma
comparação lado a lado com `CODIGO_FONTE/` não revela diferença de comportamento, texto, cor,
medida, animação, som ou fluxo. Qualquer item não implementado deve ser declarado, nunca simulado.
