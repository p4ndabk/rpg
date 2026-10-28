# 11. Experiência de jogo (UX e gamificação)

O app é um jogo, não um formulário. Toda tela responde a três perguntas: **o que eu faço agora?**, **o que aconteceu?** e **o que eu ganhei?**

## Sempre um próximo passo

- **Nenhuma tela vazia sem saída.** Estado vazio diz o que fazer e oferece o botão ou atalho para fazer. Ex.: grid vazio → "Coloque um herói pelos atalhos".
- **Missões de primeiros passos** guiam quem acabou de chegar. A próxima missão fica no Início com um botão "Bora lá" que leva direto à tela certa.
- **Atalho antes de formulário.** Se dá para escolher entre opções prontas (Goblin, Mago, nome sorteado), ofereça. Digitar é a segunda opção, dentro de `<details>`.
- **A vez de quem joga é avisada.** Quando chega a vez de uma peça sua, aparece o cartão "Sua vez!" no topo do tabuleiro (some em 4,5 s), toca um som curto e o título da aba marca "● Sua vez!" enquanto durar. Nunca avisa quem não é a pessoa da vez.
- **No combate, a tela diz de quem é a vez** e já deixa a peça selecionada. Rolagens sem nome levam o nome de quem está na vez.

## Feedback em três tempos

1. **Ação** (toque): resposta imediata. O dado gira, o botão afunda.
2. **Resultado**: chega como carimbo (`animate-carimbar`). No teste, diga quanto passou ou faltou ("Passou por 3.", "Faltou 2.").
3. **Recompensa**: o aviso de XP, missão ou selo entra **depois** do resultado (cerca de 0,9 s). Nunca cubra o resultado com a recompensa.

Momentos especiais têm peso especial:

| Momento | Resposta |
|---|---|
| 20 natural | Dado verde, lascas de papel voando (`Explosao`), carimbo "Sucesso crítico" |
| 1 natural | Dado vermelho que treme (`animate-tremer`). Também vale XP e selo: errar faz parte, não é castigo |
| Dano máximo (2+ dados) | Carimbo invertido "Máximo!" |

## Progresso

- **XP** em toda ação que faz o jogo andar (rolar, montar sala, colocar e mover peça, combater). Valores em `src/lib/jornada.ts` (`XP`).
- **Níveis** com títulos de cordel: Aprendiz, Andarilho, Aventureiro, Veterano, Herói, Campeão, Lenda. O selo de nível fica sempre no cabeçalho.
- **Selos** (conquistas) são carimbos: conquistado = moldura cheia e estrela verde; a conquistar = moldura tracejada, com a descrição visível como dica (nada de "???").
- Apagar sala ou histórico **nunca** apaga XP nem selos.

## Avisos (toasts)

- Um aviso por evento, juntando tudo o que ele rendeu (nível > selo > missão).
- No máximo dois na tela; o resto espera na fila. Somem em 6 s.
- **Não seguram o toque**: só o × é clicável; tocar no aviso acerta o que está embaixo.
- Compactos: chamada, título e XP. Os detalhes ficam para o leitor de tela e para o Início.
- No celular, no topo; na tela larga, no canto inferior esquerdo (a direita é da bandeja de dados da sala).

## Celular primeiro (Início e Dados)

- Navegação em barra fixa embaixo, ao alcance do polegar. O pé da tela é da ação: não cubra com avisos.
- Controles junto da ação: ajustes da rolagem ficam no mesmo cartão do botão Rolar.
- `scroll-padding` reserva o espaço das barras fixas, para foco e rolagem não pararem atrás delas.

## Sala: desktop, tabuleiro protagonista

A Sala é a tela de quem joga e é feita para **desktop, com alvo em 1920×1080**. Não se joga no celular: abaixo de 1024 px ela só empilha (tabuleiro em cima, bandeja embaixo) sem quebrar.

- **O tabuleiro manda.** As casas crescem até o grid inteiro caber na altura da janela, sem rolar a página (mínimo de 44 px, máximo de 120 px).
- **Ferramentas em volta, não em cima.** Dados e log ficam numa bandeja estreita à direita, com rolagem própria. Colocar e listar peças fica numa gaveta ("+ Peça"). Ações raras (encerrar combate, apagar sala) ficam no menu ⋯.
- **Combate em faixa, não em cartão.** Uma linha só: rodada, ordem de iniciativa e "Passar a vez".
- **Log sempre visível, como conversa de mesa.** Ocupa o resto da bandeja, com o mais antigo em cima e o mais novo embaixo (rola sozinho até ele). Blocos com cabeçalho: Iniciativa, Rodada N, Fora de combate. Uma frase curta por rolagem ("Tirou 18 contra CD 15.") e o desfecho em selo. Sem cartão por rolagem.
- **Resultado em destaque para a mesa toda.** Cada pessoa joga da sua casa, então só o log não basta: quando uma rolagem termina, um cartão grande aparece no meio do tabuleiro (`AnuncioRolagem`) com quem rolou, o dado, o carimbo do desfecho e a conta. Some em 5 s e não segura o toque. O 20 natural leva as lascas de papel. Na bandeja, o cartão do rolador mostra só uma linha do resultado.
- **Ajustes da rolagem nunca ficam escondidos.** Nome, CD, bônus e sorte (ou quantidade e bônus) ficam sempre à vista na bandeja, compactos: nome em cima, dois contadores lado a lado e a sorte numa linha.
- **Mover de dois jeitos.** Arrastar a peça até a casa ou tocar nela e depois na casa; o teclado segue com setas e Enter.
- **Personagem é ficha de RPG.** Cada personagem é um quadrado com o emblema da classe em traço grosso de xilogravura (espada, cajado, adagas cruzadas, símbolo sagrado), sem rostos nem bichinhos. Monstro segue losango vermelho. Ilustração própria em SVG, só com os tokens.
- **Dois papéis, uma tela.** O mestre vê tudo e cuida de monstros, vida, dano, combate, condições, rolagens secretas e notas. Quem joga vê só o que foi revelado e move só a própria peça. Controle de mestre nunca aparece para quem joga.
- **Painel do mestre fixo.** O que o mestre faz toda hora (dano, cura, condições, esconder, duplicar) fica num painel que ocupa sempre o mesmo espaço embaixo do tabuleiro: nada pula quando se seleciona uma peça. Número digitado + Enter vale mais que botões de ±.
- **Botão direito na casa vazia coloca peça ali.** Menu "Colocar em C4" com heróis, monstros, Outro… (foco no nome), vida e quantidade; no mestre também o terreno. Quem joga só vê os heróis. Menus de botão direito compartilham o comportamento de `usarMenuFlutuante` (cabem na janela, Esc ou clique fora fecham).
- **Botão direito na peça.** O menu abre no cursor com o foco no campo da vida: número + Enter define a vida. Esc ou clique fora fecha. O botão direito também seleciona a peça.
- **Tudo se desfaz.** Toda mudança da sala entra numa pilha de desfazer (Ctrl+Z). Atalhos de teclado do mestre: N passa a vez, D foca o dano, H esconde ou revela, Esc solta. Aviso de XP não cobre o painel.
- **Cenário em traço de cordel.** Terrenos (parede de tijolo, porta, água ondulada, lava hachurada, árvore, pedra, buraco) são desenhos próprios em SVG, só com os tokens (nada de cor nova: o verde continua só de êxito). O mestre desenha por formas (pincel, linha, retângulo, contorno) arrastando; tudo entra no desfazer.
- **Quem joga edita a própria ficha.** Descrição, CD e bônus de iniciativa do próprio personagem, por botão, duplo clique ou botão direito na peça. Do monstro, o que o mestre anota não vai para quem joga.
- **Quem joga vê a própria vida.** O personagem dele fica no alto da bandeja, com PV, barra e condições.
- **Várias salas, nenhuma se perde.** Criar ou abrir outra sala guarda a atual com tudo (peças, log, notas). A lista mostra o que está só neste navegador. Dar nome a uma peça é um toque: **Outro…**.
- **Ação no contexto.** A linha de status acima do tabuleiro diz o que está acontecendo e mostra os botões da seleção (Soltar, Tirar, Colocar peça aqui).

## Voz

- Português do Brasil, segunda pessoa, curto e animado: "Bora jogar?", "Bora lá", "Passou por 3."
- Sabor de sertão e cordel nos nomes e frases (Taverna do Bode Manco, "Você virou cordel").
- **Linguagem neutra em gênero** quando se refere a quem joga ou a uma peça: "Selecionou Goblin", não "Goblin selecionado"; "Hora de respirar", não "Respira, aventureiro".
