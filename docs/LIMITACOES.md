# LIMITAÇÕES DA EXTRAÇÃO

Documento honesto sobre o que **não** pôde ser extraído, o que é parcial e o que depende de
interpretação. Nada aqui deve ser “inventado” na reconstrução: onde há lacuna, ela está declarada.

## 1. Não existem assets binários para exportar

O jogo não contém imagens, texturas em arquivo, fontes, músicas ou efeitos sonoros em disco.
Toda a aparência vem de geometria procedural, shaders e emojis; todo o som é sintetizado.
Portanto a pasta `ASSETS_ORIGINAIS/` contém **dados e shaders**, não bitmaps/áudios. Não há perda:
o “original” é exatamente o que está em `CODIGO_FONTE/`.

## 2. Áudio não é auditável por escuta nesta extração

As trilhas e efeitos são descritos por parâmetros (BPM, notas MIDI, formas de onda, ganhos,
durações) e o código gerador está incluído. Não foi possível ouvir o resultado no ambiente de
auditoria; a fidelidade sonora depende de executar `core/audio.js` em um navegador. **Parcialmente
extraído** (estrutura completa, timbre não verificado por escuta).

## 3. Percepção visual não substitui o código

Cores, medidas, sombras e gradientes foram extraídos do CSS/shaders. O “look” final (bloom, god
rays, exposição) depende da GPU: o preview do Base44 roda em SwiftShader, onde FPS e alguns efeitos
de iluminação não representam hardware real. **Extraído** como parâmetros; **não verificado** como
experiência visual em hardware dedicado.

## 4. Conteúdo não implementado no original

O próprio código declara 7 biomas em `BIOME_LIST`, mas apenas `floresta` é construída
(`build(id)` retorna `false` para os outros). Os biomas “Cavernas de Cristal”, “Deserto dos Ecos”,
“Pântano Luminescente”, “Montanhas Congeladas”, “Ruínas Antigas” e “Bioma das Sombras” existem
**apenas como metadados e poderes bloqueados**. Não há como extrair o que não foi escrito.
**NÃO DISPONÍVEL** (por decisão do projeto original, não da auditoria).

## 5. Sistemas sem conteúdo completo

| Item | Situação |
|---|---|
| `TRICK_DEFS.sequencia` (“R, R, R”) | definido no catálogo; a cadeia é contabilizada (`trickChain`), mas não há efeito exclusivo documentado além dos truques existentes |
| Traços de personalidade (`traits`) | somados pelas escolhas e salvos, **sem efeito mecânico** implementado |
| `mapa_bosque` | entrega toast e marca pontos no minimapa; não há lógica adicional |
| Itens `lanterna_antiga`, `simbolo_antigo`, `fragmento_luz` | usados como chaves narrativas/contadores de missão |
| Título do jogador | exibido em `flags.title` e no painel de pausa; sem bônus |

## 6. Sem testes automatizados

Não existe suíte de testes, lint ou CI de código no repositório. A verificação do original é manual
(“abrir `/` → título → Começar aventura → conferir acampamento/HUD/dicas”). Qualquer “verificação”
na reconstrução precisa ser feita por inspeção/execução.

## 7. Dependência de navegador

O jogo exige WebGL2 (ou WebGL1 com fallbacks), `AudioContext` após gesto do usuário, `localStorage`
e módulos ES com importmap. Ambientes sem importmap (navegadores muito antigos) não executam o jogo.
Isso é uma característica do original, não uma lacuna da extração.

## 8. Textos muito longos

`NPC_DEFS` (9 NPCs, com nós `intro/repeat/story/offer/active_*/after/locked` e escolhas) tem cerca de
310 linhas de conteúdo. Eles estão **integralmente** em `CODIGO_FONTE/src/systems/npc.js`; este
pacote documenta a estrutura e cita exemplos, sem reproduzir cada fala nos .md (para não duplicar e
arriscar divergência). Para reconstrução fiel, **copie o arquivo**, não reescreva os diálogos.

## 9. Comportamentos dependentes de hardware/entrada

- Câmera por posição do cursor depende do movimento real do mouse; em automação só é possível
  verificar o estado interno (yaw/pitch).
- Áudio só inicia após gesto; um teste automatizado sem gesto não ouve nada.
- Performance (FPS) varia com GPU, número de núcleos e tamanho da janela (a qualidade ‘low’ é
  escolhida automaticamente).

## 10. O que **não** falta

- Todos os arquivos foram inventariados (33) e copiados.
- Todas as funções, classes, constantes e fórmulas citadas nos documentos foram lidas do código.
- Todas as telas, componentes de UI, animações CSS, efeitos, itens, missões, inimigos e diálogos
  (estrutura) estão documentados.
- Nenhuma funcionalidade dependia de serviço externo do Base44 — não há nada a “substituir”.
