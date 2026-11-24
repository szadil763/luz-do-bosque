# 🏮 Luz do Bosque

Aventura 3D em terceira pessoa, em português, feita para crianças explorarem o escuro com
curiosidade e coragem. Com a lanterna mágica, o jogador explora a Floresta Encantada, conversa
com NPCs, cumpre missões sobre superar o medo do escuro, enfrenta criaturas das sombras e o
Guardião Antigo.

Projeto originalmente criado na Base44 e restaurado aqui **arquivo por arquivo** a partir do
pacote de transferência oficial (`luz-do-bosque-transfer.zip`). Os 33 arquivos de código conferem
com o SHA-256 listado em [`docs/MANIFESTO_DE_ARQUIVOS.txt`](docs/MANIFESTO_DE_ARQUIVOS.txt).

## Como jogar

O jogo é um site estático (HTML + módulos JavaScript + Three.js r160 incluído em `vendor/`).
Não precisa de `npm install`, build nem banco de dados — só de um servidor HTTP local, porque
módulos ES não funcionam abrindo o `index.html` direto (`file://`).

- **Windows:** clique duas vezes em `iniciar-jogo.bat` (precisa do Python 3).
- **Linux / macOS:** rode `./iniciar-jogo.sh`.
- **Manual:** `python3 -m http.server 8000` e abra <http://localhost:8000>.
- **Docker (igual à Base44):** `docker compose -f docker-compose.base44.yml up -d` → <http://localhost:3000>.

Requisitos: navegador moderno com WebGL e suporte a importmap (Chrome/Edge 89+, Firefox 108+,
Safari 16.4+). O progresso é salvo no próprio navegador (`localStorage`).

### Controles principais

| Ação | Teclado / mouse |
|---|---|
| Andar / correr | W A S D / Shift |
| Câmera | mouse ou setas |
| Interagir / conversar | E |
| Raio de luz · Escudo · Pulso · Poder | M1/J · M2/K · M3/U · M4/I |
| Pular · Dash · Manobra | Espaço · Q · R |
| Mapa · Pausa | M · Esc |

No celular aparecem controles de toque.

## Estrutura

```
index.html            telas, HUD, CSS e importmap
src/main.js           loop do jogo, estados, salvamento
src/core/             estado, opções, save, entrada, áudio procedural, câmera
src/player/           aventureiro e lanterna (poderes, energia, melhorias)
src/systems/          combate, inimigos, minichefe, itens, interações, NPCs e missões
src/world/            terreno, floresta, áreas de missão, atmosfera, efeitos, pós-processamento
src/ui/               HUD, menus e estúdio de avatar
src/avatar/           catálogo e construção 3D dos avatares
vendor/three/         Three.js r160
docs/                 documentação técnica completa exportada da Base44
```

Toda a arte é geometria procedural, shaders e emojis; todo o som é sintetizado com WebAudio —
não há imagens nem áudios em arquivo. Detalhes em [`docs/README_GERAL.md`](docs/README_GERAL.md),
[`docs/GAMEPLAY.md`](docs/GAMEPLAY.md) e [`AGENTS.md`](AGENTS.md).
