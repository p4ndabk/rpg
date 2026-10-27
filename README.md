# RPG

Plataforma pessoal para jogar RPG de mesa online com os amigos.

A ideia é ter um lugar nosso, sem depender de serviços de terceiros, para reunir o grupo, conduzir as sessões e guardar o que acontece na campanha.

## Status

Fase de teste da ideia: só frontend, com tudo salvo no navegador (`localStorage`), sem servidor nem conta.

O app tem duas telas, trocadas pelo menu do topo:

- **Dados** (`#/dados`): só rolagem, com histórico próprio.
- **Sala** (`#/sala`): uma sala com grid para posicionar personagens e monstros, mais os dados da cena. As rolagens feitas ali formam o **log da sala**.

### Sala

- Crie a sala com nome e tamanho do grid: de 4 a 26 colunas (A a Z) e de 4 a 20 linhas.
- Adicione peças com nome e tipo. **Personagem** é um quadrado escuro e **monstro** é um losango vermelho; a ficha mostra as iniciais. Nomes repetidos ganham número (Goblin, Goblin 2).
- Para mover, toque na peça e depois numa casa vazia. No teclado, use as setas para andar pelo grid, Enter para escolher e Esc para soltar.
- Por enquanto é uma sala só, com um jogador, salva neste navegador. Apagar a sala apaga também o log.

### Dados

O **rolador de dados** é no estilo Baldur's Gate 3, com os dados do D&D: D3, D4, D6, D8, D10, D12, D20, D100 e D1000.

**D20 (teste):**

- Classe de dificuldade (CD) de 1 a 30, com os nomes do BG3 (Muito fácil, Fácil, Média, Difícil, Muito difícil, Quase impossível).
- Bônus de −10 a +20.
- Vantagem (rola dois, fica o maior) e desvantagem (fica o menor).
- 20 natural é sempre sucesso crítico; 1 natural é sempre falha crítica.

**Demais dados (dano e outras somas):**

- De 1 a 20 dados mais um bônus, na notação do D&D: `2D6 + 3`.
- Mostra a faixa possível (de 5 a 15) e o total; o dado que tira o valor máximo fica em destaque.

**Em todos:** animação do dado girando (some com "reduzir movimento" ligado) e histórico das últimas 50 rolagens, salvo no navegador.

## Como rodar

Precisa de Node 20.19 ou mais novo.

```sh
cd web
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente http://localhost:5173).

## O que a plataforma deve oferecer

Primeira lista de ideias, a refinar:

- **Mesas (campanhas):** criar uma mesa e convidar os amigos por link.
- **Fichas de personagem:** cada jogador cuida da sua; o mestre vê todas.
- **Rolagem de dados:** rolagens visíveis para a mesa, com histórico (ex.: `1d20+5`, `4d6`).
- **Chat da sessão:** conversa em tempo real, com mensagens do mestre e rolagens no mesmo fluxo.
- **Notas e diário:** anotações do mestre (privadas) e diário da campanha (público para a mesa).
- **Mapas e imagens:** o mestre mostra mapas ou ilustrações durante a sessão.

## Identidade visual

O visual segue a identidade **Cordel**: papel quente, traço preto firme, vermelho de carimbo e sombra deslocada, inspirado em folhetos de cordel e xilogravura nordestina. As regras completas estão em [`.rules/`](.rules/00-identidade.md).

## Estrutura

```
.
├── CLAUDE.md   # orientações para o Claude Code
├── README.md   # este arquivo
├── .rules/     # identidade visual Cordel, separada por tema
└── web/        # app (Vite + React + TypeScript + Tailwind)
```

## Privacidade

Projeto de uso pessoal. Nada de rastreadores, fontes ou scripts de CDN: tudo é servido pelo próprio app.
# rpg
