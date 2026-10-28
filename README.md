# RPG

Plataforma pessoal para jogar RPG de mesa online com os amigos.

A ideia é ter um lugar nosso, sem depender de serviços de terceiros, para reunir o grupo, conduzir as sessões e guardar o que acontece na campanha.

## Status

Fase de teste da ideia: só frontend, com tudo salvo no navegador (`localStorage`), sem servidor nem conta.

O app tem cinco telas. No celular, o menu fica numa barra embaixo; no desktop, no topo.

- **Início** (`#/inicio`): seu nível e XP, a próxima missão com um botão para ir até ela, os selos conquistados e os seus números (rolagens, 20 naturais, média do D20).
- **Dados** (`#/dados`): só rolagem, com histórico próprio.
- **Sala** (`#/sala`): a mesa de quem joga, feita para desktop (Full HD). Tabuleiro grande com heróis e monstros, combate por turnos e os dados da cena. As rolagens feitas ali formam o **log da sala**.

- **Salas** (`#/salas`): "Minhas salas": **crie quantas quiser** (botão **Nova sala**; a que estava aberta fica guardada, com peças, log e notas) e troque de sala quando quiser. A lista junta as salas **deste navegador** e as do **servidor** em que você conduz ou joga, com nome, seu papel, número de jogadores e peças, se há combate e há quanto tempo mudou. Busca pelo nome e botão **Entrar**, sem precisar guardar o link. Salas que só existem neste navegador têm a etiqueta "Só neste navegador"; as guardadas podem ser tiradas daqui (**Tirar daqui** mantém a do servidor, **Apagar** remove de vez). O mestre também recupera a sua sala num navegador novo (entrando com a mesma chave).
- **Perfil** (`#/perfil`): quem é você. O usuário é uma **chave Nostr**, a mesma do Voz, usada **só como identidade**: crie uma nova (a nsec aparece uma vez, para você guardar) ou entre com a sua nsec ou npub. O RPG guarda só o nome e a chave **pública**, nunca a secreta. O Nostr é só identidade: o jogo roda num servidor próprio (ver **Sala em rede**).

### É um jogo

- **XP e níveis:** cada rolagem, peça colocada, movimento e rodada de combate rende XP. Os níveis têm títulos de cordel: Aprendiz, Andarilho, Aventureiro, Veterano, Herói, Campeão, Lenda.
- **Missões de primeiros passos:** sete missões guiam quem está começando, do primeiro D20 ao primeiro combate.
- **Selos:** 13 conquistas, como Vinte natural, Sorte dobrada (20 nos dois dados da vantagem), Golpe perfeito, Bando e Sobrevivente.
- **Comemoração:** o 20 natural deixa o dado verde e espalha lascas de papel; o 1 natural faz o dado tremer (e também rende selo, porque errar faz parte).

### Sala

Quem **cria a sala é o mestre**; as outras pessoas **jogam**.

- **Mestre** (a tela do mestre é a própria Sala, com mais ferramentas): um **painel fixo embaixo do tabuleiro** (não pula quando você seleciona) concentra o que se usa o tempo todo:
  - **Ficha do personagem (descrição, CD, iniciativa):** em **Ficha** o mestre edita os mesmos campos de qualquer peça. A descrição e a CD dos **monstros** não vão para quem joga (você pode anotar segredos). Em **Ficha** (no painel da peça), o **bônus de iniciativa** (de −10 a +20, como o +3 de Destreza) soma ao D20 quando o combate começa. O log mostra a conta ("Tirou 23 na iniciativa (18 +5)"). Para mudar a iniciativa durante o combate, use o − e o + do painel.
  - **Botão direito numa casa vazia** abre o menu **Colocar em C4**: toque num herói ou monstro para colocá-lo ali. O mestre também escolhe a **vida** e **quantos** (o grupo fica junto, em volta da casa), usa **Outro…** para dar nome à peça (o cursor já cai no campo) e pinta o **terreno** daquela casa. Quem joga vê só os heróis e, se ainda não tem personagem, coloca o seu direto na casa que clicou. Casa com parede, árvore ou pedra não aceita peça.
  - **Botão direito numa peça** abre um menu no lugar do cursor, já com o cursor no campo da vida: digite o número e aperte **Enter** e a vida dela fica **exatamente nele** (o segundo número é o máximo). O mesmo menu dá dano e cura, condições, esconder, duplicar e remover. **Esc** ou um clique fora fecha.
  - **Dano e cura digitando:** escreva o número e aperte Enter para dar dano (o botão Cura faz o contrário). "Aplicar N" desconta o último dado rolado.
  - **Condições** (Caído, Envenenado, Atordoado, Com medo, Abençoado) e **iniciativa** com um toque, **Esconder/Revelar** e **Duplicar** (mais um Goblin igual).
  - **Faixa de iniciativa do mestre:** mostra a vida, as condições e as peças escondidas de cada um, e clicar numa peça da faixa a seleciona.
  - **Desfazer** (botão ou Ctrl+Z) volta as últimas 30 mudanças da sala.
  - **Atalhos:** N passa a vez, D vai para o campo de dano, H esconde ou revela, Esc solta a peça.
  - **Cenário** (botão na barra): monte o mapa com terrenos desenhados no traço do cordel: **Parede, Porta, Água, Lava, Árvore, Pedra e Buraco**. Escolha o terreno e a forma (**Pincel**, **Linha**, **Retângulo**, **Contorno** para as paredes de uma sala) e arraste no tabuleiro. **Apagar** faz de borracha, **Limpar tudo** zera, e dá para desfazer. Parede, árvore e pedra **barram o caminho** (peças não entram nelas); o resto é só visual. Quem joga vê o cenário.
  - **Editar sala** (menu ⋯): muda o nome e o tamanho do grid. O grid não encolhe além das peças que já estão nele, e dá para desfazer.
  - **Vida dos monstros:** ao chamar peças, digite os pontos de vida que quiser (vazio usa o padrão de cada uma). Com a peça no tabuleiro, **Ficha** mostra o máximo e o atual para digitar.
  - **Vida base das peças** (menu ⋯, ou "Editar a vida base de cada peça" em + Peça): escolha com quantos pontos de vida cada atalho nasce (Goblin, Orc, Dragão, Mago…) e o valor de "outros heróis" e "outros monstros" (os que você batiza). Cada atalho mostra a sua vida base. Marcando "Também nas peças que já estão no tabuleiro", elas são refeitas com o novo valor, cheias. A vida base vale para a sala e também para o personagem que cada jogador chama; ela **não** vai para quem joga (não revela a vida dos monstros).
  - **Outro…** (em Heróis e em Monstros) abre o nome para você batizar a peça, como "Mímico" ou "Cultista".
  - Chama monstros em quantidade ("3 Goblins"), dá um personagem a quem joga pela npub, faz **rolagens secretas** (só ele vê) e guarda **notas** privadas.
- **Quem joga** é avisado quando chega a sua vez no combate: um cartão "Sua vez!" no tabuleiro, um toque suave de som e o título da aba ("● Sua vez!", que pisca com a aba em segundo plano). Vê só o que o mestre mostrou, chama o próprio personagem, move só a própria peça e rola dados. Passa a vez quando é a vez da sua peça. Vê a vida dos personagens, não a dos monstros, e tem no alto da bandeja a **ficha do seu personagem**, que ele mesmo edita (botão **Editar ficha**, duplo clique ou botão direito na própria peça): **descrição**, **CD** (a do personagem, como a de magia ou de resistência, de 1 a 30) e **bônus de iniciativa**. A ficha mostra também PV com barra, condições (Envenenado, Caído…), a **iniciativa** (o bônus da ficha e, durante o combate, o valor tirado e o seu lugar na ordem) e quando é a sua vez.

- Crie a sala com nome (ou sorteie um, como "Taverna do Bode Manco") e tamanho do grid: de 4 a 26 colunas (A a Z) e de 4 a 20 linhas.
- **Tabuleiro em primeiro lugar:** o grid ocupa a tela e as casas crescem até ele caber inteiro na janela. Dados e log ficam numa bandeja estreita à direita; o log fica sempre à vista, como uma conversa de mesa: o mais novo embaixo, com blocos de Iniciativa e de cada Rodada, para todo mundo ver o que está acontecendo.
- **Resultado para a mesa toda:** quando alguém rola, um cartão grande aparece no meio do tabuleiro com quem rolou, o dado e o carimbo do resultado (Sucesso, Falha, Máximo!), e some em poucos segundos. Os ajustes da rolagem (nome, CD, bônus, sorte) ficam sempre visíveis na bandeja.
- **Colocar no grid:** o botão "+ Peça" abre uma gaveta com atalhos (Guerreira, Mago, Goblin, Lobo…) e a opção de criar uma peça com nome seu. Quer escolher o lugar? Toque antes numa casa vazia e depois em "Colocar peça em C4". **Personagem** é um quadrado com o emblema da classe em traço de xilogravura (a Guerreira com espada, o Mago com cajado, a Ladina com adagas cruzadas, o Clérigo com símbolo sagrado; peças com nome seu ganham um elmo, um escudo ou um machado) e **monstro** é um losango vermelho. Nomes repetidos ganham número (Goblin, Goblin 2).
- **Mover:** arraste a peça até uma casa vazia, ou toque na peça e depois na casa. A peça recém-colocada já vem selecionada. Com uma peça selecionada, a linha acima do tabuleiro mostra Soltar e Tirar. No teclado, use as setas para andar pelo grid, Enter para escolher e Esc para soltar.
- **Combate:** "Iniciar combate" rola um D20 de iniciativa para cada peça. Uma faixa fina acima do tabuleiro mostra a rodada, a ordem e quem está na vez; "Passar a vez" segue a ordem. Rolagens sem nome entram no log com o nome de quem está na vez. Encerrar o combate e apagar a sala ficam no menu ⋯.
- Por enquanto é uma sala só por navegador. Apagar a sala apaga as peças, o log e as notas, mas não o seu XP nem os seus selos.

#### Sala em rede (servidor Node)

Para jogar de navegadores diferentes, o mestre abre a sala num **servidor Node** (pasta `server/`), que guarda a sala num arquivo JSON e fala com cada navegador por WebSocket.

1. Em um terminal: `cd server && npm install && npm start` (sobe em `ws://localhost:8787`; escolha outra porta com `PORT=9000`).
2. No app, o mestre abre **Compartilhar**, marca **Abrir esta sala no servidor** e copia o **convite**.
3. Quem joga abre o convite no próprio navegador, entra com a própria chave (Perfil) e toca em **Entrar na sala**. Nas próximas vezes, a sala aparece em **Salas**.

- **O servidor é a autoridade.** O mestre manda o estado; quem joga manda **ações** (chamar o personagem, mover, remover, passar a vez, rolar) e o servidor confere cada uma: só se move a própria peça, só se passa a própria vez.
- **Cada um vê o que pode ver.** Quem joga recebe uma "foto" sem peças escondidas, sem a vida dos monstros e sem rolagens secretas. As notas nem saem do navegador do mestre.
- **A sala sobrevive.** O arquivo fica em `server/dados/salas.json`. Se o mestre sair, quem joga continua agindo; quando o mestre volta, recebe o estado do servidor. Se os dois mexerem ao mesmo tempo, o servidor vence e o mestre vê um aviso.
- **Endereço do servidor:** por padrão é a mesma máquina do app, porta 8787 (funciona em `localhost` e na rede de casa, trocando pelo IP). Dá para mudar em Compartilhar, ou gerando o app com `VITE_SERVIDOR=wss://meu.servidor`.
- **Quem vê quais salas:** a lista é pela chave pública informada (sem conferir assinatura), então vale só entre amigos.
- **Limites desta fase:** o servidor confia na chave pública que o navegador informa, sem conferir assinatura (serve para amigos). Conferir a assinatura Nostr no login e hospedar com `wss://` (para abrir o app por HTTPS, como no GitHub Pages) ficam para depois.

#### Sala em relays Nostr (sem servidor, padrão)

É o modo **padrão** de Compartilhar: dá para hospedar o app só como site estático (GitHub Pages) e jogar sem ligar nada. Código em `web/src/lib/nostr/`; o servidor Node (`server/`) segue como opção em **Compartilhar → Servidor**.

- **O navegador do mestre faz o papel do servidor.** Ele roda em memória o mesmo `Servidor` do Node (`ponteMestre.ts`). Quem joga manda **pedidos** (eventos efêmeros, kind 21078: entrar e agir); o mestre os confere com as mesmas regras e publica a **foto pública** da sala (evento substituível, kind 30078, vale a última).
- **Só vai para os relays o que a mesa vê.** Peça escondida, vida de monstro, rolagem secreta e notas ficam no navegador do mestre. Os relays são públicos: quem tiver o link pode ler a foto.
- **O mestre precisa deixar a aba aberta.** Se fechar, a mesa para até ele voltar (o app republica a foto a cada 4 min e ao reconectar). A foto expira em 3 dias nos relays.
- **Relays padrão** (do Voz, testados em 2026-10-18): `relay.primal.net`, `purplerelay.com`, `relay.snort.social`. Publica em todos ao mesmo tempo; a lista muda em Compartilhar. O `relay.damus.io` pede AUTH e o `nos.lol` não conectou.
- **Convite:** `#/entrar/<sala>/nostr/<chave do mestre>` (com `?r=` se os relays não forem os padrão). Quem joga só aceita foto assinada por essa chave.
- **Assinatura:** a nsec continua sem ser guardada. Os eventos são assinados por uma chave só deste navegador (`rpg:nostr:chave`); quem a pessoa é (chave pública e nome) vai dentro do pedido, na mesma confiança do servidor.

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

**Em todos:** os ajustes ficam no mesmo cartão do botão Rolar, e tocar no próprio dado também rola. O resultado chega como carimbo e diz quanto passou ou faltou da CD. A animação do dado some com "reduzir movimento" ligado. O histórico guarda as últimas 50 rolagens no navegador, e o botão **Repetir** refaz qualquer uma delas.

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
├── web/        # app (Vite + React + TypeScript + Tailwind)
└── server/     # servidor da sala em rede (Node + WebSocket + JSON)
```

## Privacidade

Projeto de uso pessoal. Nada de rastreadores, fontes ou scripts de CDN: tudo é servido pelo próprio app.
# rpg
