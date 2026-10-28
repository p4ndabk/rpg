# CLAUDE.md

Orientações para o Claude Code neste repositório.

## Projeto

Plataforma pessoal para jogar RPG de mesa online com os amigos. Detalhes de escopo no `README.md`.

Fase atual: **só frontend**, para testar a ideia. Não há backend; tudo é salvo no `localStorage` do navegador. Quatro telas e o perfil, com rota pelo hash (`src/lib/rota.ts`, sem biblioteca de rotas):

- **Início** (`#/inicio`, padrão): nível e XP, próxima missão, selos e números do jogador.
- **Dados** (`#/dados`): só rolagem, com histórico próprio (`rpg:d20:historico`).
- **Sala** (`#/sala`): tela de quem joga, pensada para **desktop Full HD** e **responsiva** (empilha abaixo de 1024 px; o usuário pediu para deixar responsivo em 2026-10-28). O tabuleiro ocupa a tela e cresce com ela (`Grade`, que também faz **zoom e navegação**: casa de 14 a 120 px, Ctrl+roda, botão do meio ou Mão para arrastar, Ir à peça e `Miniatura` para saltar; mapa de até 50 × 50, `nomeColuna` gera A…Z, AA…); cenário escondido (`CasaDeCenario.oculta`, `pintar(..., oculta)`, `ocultarCenario`, `alternarOcultoCenario`, `cenarioVisivel`; `visaoPublica` e a `visao` de quem joga tiram o escondido; botão direito em `MenuDaCasa`, "Pintar escondido"/"Esconder tudo" no `PainelCenario`, marca com `IconeEscondido` na `Grade`), destaques do mestre (`Sala.destaques`, `alternarDestaque`, `limparDestaques`, `PainelDestaque`; contorno `animate-destacar` só com `motion-safe`; vão na foto da rede); o cenário é pintado clicando ou arrastando (sem seletor de formas; `casasDaForma` fica só para os modelos; a prévia do traço é uma camada à parte na `Grade`); com `CasaDeCenario.disfarce` (`disfarcarCenario`, "Mostrar como parede" no `MenuDaCasa`) a casa escondida aparece para quem joga como outro terreno (`cenarioVisivel` troca o terreno); terrenos em 5 grupos (`TERRENOS` com `grupo`, `SeletorDeTerreno`, desenhos em `Terreno.tsx`) e **modelos de mapa** (`lib/modelos.ts`: `MODELOS`, `salaDoModelo`, `aplicarModelo`, `MiniMapa`, `ModelosDeMapa`; determinísticos e testados; a foto da rede comprime o cenário em trechos, `comprimirCenario` em `lib/nostr/eventos.ts`, para o mapa grande caber no limite dos relays); combate numa faixa fina (`FaixaCombate`); dados e log numa bandeja à direita (`Rolador compacto`, log sempre visível em `rpg:sala:log`); atalhos e lista de peças numa gaveta (`GavetaPecas`). Uma sala só, de um jogador (`rpg:sala`). **Papéis:** quem cria a sala é o mestre (`sala.mestre`, `ehMestre`); os demais jogam. A barra do mestre usa `Ferramentas` (seletor Mover/Cenário/Destaque, atalhos M/C/E, `Opcao` em rádio), Desfazer e Refazer (`pilha` e `futuro`, Ctrl+Shift+Z/Ctrl+Y), e `RoteiroDoMestre` (`lib/roteiro.ts`: `passosDoRoteiro`, `roteiroCompleto`; dispensado em `rpg:sala:roteiro`) no alto da bandeja. A `Grade` só desenha as casas da janela acima de 900 casas (`CASAS_PARA_VIRTUALIZAR`, posição explícita na grade, `useMemo` sem o traço de pintura; `irPara` conta por posição) e dá zoom por pinça (Pointer Events de toque, `touch-action: pan-x pan-y`). A tela do mestre é a própria `TelaSala` com um `PainelPeca` fixo embaixo do tabuleiro (dano e cura digitando, condições, iniciativa, esconder, duplicar), faixa de combate detalhada, atalhos de teclado (N, D, H, Ctrl+Z) e desfazer (`mudar()` empilha até 30 passos), além do menu do botão direito numa casa vazia (`MenuDaCasa`: colocar peça ali, vida, quantidade, Outro…, terreno; `casaLivrePerto` mantém o grupo junto) e do menu sobre a peça (`MenuDaPeca`, aberto pelo `onContextMenu` da `Grade`: define a vida exata, dano/cura, condições, esconder, duplicar, remover), do cenário (`Sala.cenario`, `TERRENOS`, `pintar`, `casasDaForma`, `casaBloqueada` em `sala.ts`; desenho em `Terreno.tsx`; `PainelCenario` e o arrasto de pintura na `Grade`; parede, árvore e pedra barram `moverPeca`), da ficha de quem joga (`MeuPersonagem` e `CamposDaFicha`; `Peca.descricao`/`cd`, `editarFicha` e a ação `ficha`, que só a dona ou o dono da peça aplica; `visaoPublica` tira descrição, CD e bônus dos monstros; abre por botão, duplo clique ou botão direito na própria peça; com o bônus e o lugar na iniciativa, e a **classe** (`Peca.classe`, `CLASSES`, campo de `CamposFicha`) que decide o emblema; `Peca.bonusIniciativa` soma ao D20 em `iniciarCombate`, editado por `definirBonusIniciativa` na `FichaPeca`) e de `EditarSala` (nome e tamanho; `editarSala` e `tamanhoMinimo` em `sala.ts` nunca deixam peça fora do grid) e (monstros em quantidade, `alterarPv`, `alternarOculta`, `alternarCondicao`, `definirIniciativa`, `definirDono`, rolagens `secreta`, notas em `rpg:sala:notas`); quem joga é avisado da sua vez (`AvisoDaVez`: cartão, som (opção em Perfil, `rpg:som`, `lib/preferencias.ts`) e título da aba; `marcaDaVez` e `vezChegouParaMim` em `sala.ts`: a marca junta rodada, posição e peça, e quem joga vê a vida dos monstros e quando caem) e vê só `pecasVisiveis` e move só o que `podeMover`.
- **Perfil** (`#/perfil`): identidade Nostr (`src/lib/usuario.ts`, `components/usuario/Usuario.tsx`, `usarUsuario()`). Guarda em `rpg:usuario` só `{ pubkey, nome }`; a nsec nunca é salva (aparece uma vez ao criar). Sem usuário, a Sala pede para entrar. O Nostr é só identidade; o jogo em rede usa o servidor Node (decisão de 2026-10-27, depois de testar relays e desistir).
- **Credencial e amigos:** `lib/credencial.ts` (arquivo `.json` com a nsec; senha opcional: com ela vai trancada (NIP-49, campo `ncryptsec`), sem ela vai aberta (campo `nsec`); `criarCredencial`, `abrirCredencial`, `pedeSenha`; o app não grava a nsec, ela só passa pela memória ao baixar ou ao subir) e `components/usuario/Credencial.tsx` (`BaixarCredencial`, `SubirCredencial`, usados na `TelaPerfil`; o baixar fica fora de `<form>`). `lib/amigos.ts` (`rpg:amigos`, `lerChaveDoAmigo` recusa nsec e a própria chave, link `#/amigos/<npub>?nome=`) e `telas/TelaAmigos.tsx` (rota `amigos`, entrada própria na barra).
- **Mesa** (`PainelMesa`, gaveta `mesa`, botão "Mesa (N)" para todos): lista o mestre e `jogadores` (do estado ou da foto), com personagem e "Adicionar aos amigos". Só o mestre vê "Colocar no mapa" (`colocarJogador` na `TelaSala`: `adicionarPeca(..., dono = pubkey)`; classe vazia usa o nome da pessoa). Quem joga sem peça vê o cartão de `MeuPersonagem` com "Entrar como <nome>". **Presença** só nos relays (`lib/presenca.ts`: `SINAL_MS` 60 s, `ONLINE_S` 150, `MESTRE_AUSENTE_S` 180, `situacaoDe`): quem joga manda `{ t: 'presenca' }` por minuto, a `PonteMestre` guarda `sinais`, republica a foto a cada minuto com `vistos` (`Foto.vistos`) e avisa o mestre por `{ t: 'presenca', vistos }`; a foto também é o sinal do mestre (`Conexao.presenca`). A ponte etiqueta com `recusou` a foto seguinte a uma ação recusada (`Conexao.recusadas`).
- **Entrar** (`#/entrar/<sala>`): convite do mestre para a sala em rede. Sem perfil, o hash é guardado em `rpg:convite:pendente` e a `TelaPerfil` oferece "Voltar ao convite" (`VoltarAoConvite`); no convite em relays, `usarVistaDaSala` (`lib/nostr/`) espia a foto pública e a `TelaEntrar` mostra o nome da sala e as pessoas, ou "Não achei a sala" após 8 s.
- **Várias salas por navegador** (`lib/salas.ts`, puro e testado): a sala aberta fica nas chaves de sempre e as outras em `rpg:salas:arquivo`; `abrirSala`/`abrirSalaNova` guardam a atual e trazem a outra, `salasLocais` alimenta a lista. `definirPv` muda máximo e atual da peça. `Sala.pvBase` guarda a vida base por nome (ou `#personagem`/`#monstro`): `pvDaPeca` decide com quanto a peça nasce e `definirPvBase` a edita (`VidaBase.tsx`); `visaoPublica` a tira da foto de quem joga.
- **Salas** (`#/salas`, `TelaSalas`): lista "Minhas salas" do servidor (`listar` → `salas`; `Servidor.listar` em `mesas.ts`; `Mesa.atualizadaEm`). Mestre entra trazendo o estado do servidor para o navegador (`pedir` em `lib/rede/consulta.ts`); quem joga grava a conexão. As chaves de armazenamento da sala e da rede estão em `lib/rede/chaves.ts`.
- **Rede** (servidor Node em `server/`, `ws` + arquivo JSON, `tsx`; `cd server && npx npm@11 install && npm start`). A lógica do servidor é pura e fica no app, em `web/src/lib/rede/`: `protocolo.ts` (mensagens, `visaoPublica`, `aplicarAcao`) e `mesas.ts` (classe `Servidor`: salas, papéis, versões, conflitos), ambos testados; `server/src/` só liga isso a WebSocket e arquivo (`armazenamento.ts` isola o JSON para trocar por SQLite). No navegador: `servidor.ts` (endereço), `usarServidor.ts` (WebSocket com reconexão) e a `TelaSala`. O mestre manda o estado completo (`abrir`/`estado`); quem joga manda ações e recebe a foto pública. Versão por sala: base velha vira `conflito` e o servidor vence. O servidor **confia na pubkey informada** (sem conferir assinatura): conferir o Nostr no login é trabalho futuro.
- **Rede por relays Nostr** (`web/src/lib/nostr/`, alternativa ao servidor, o `server/` segue valendo; escolha em `PainelRede`, modo salvo em `rpg:rede:via`; padrão `nostr`, em qualquer página). O navegador do mestre roda o `Servidor` de `rede/mesas.ts` em memória (`PonteMestre`, `ponteMestre.ts`): quem joga manda pedidos efêmeros (`KIND_PEDIDO` 21078, só `entrar`/`acao`, `lerPedido`) e o mestre publica a foto pública como evento substituível (`KIND_FOTO` 30078, `montarFoto`, `d` = `rpg:<sala>`). `barramento.ts` isola o `SimplePool` do nostr-tools (testes usam um relay de mentira), `usarNostr.ts` tem os hooks `usarNostrMestre`/`usarNostrJogador` com a mesma forma de `usarServidor`. A nsec continua sem ser guardada: eventos são assinados por uma chave só do navegador (`chave.ts`, `rpg:nostr:chave`). Convite `#/entrar/<sala>/nostr/<chave do mestre>` (`convite.ts`; `TelaEntrar` guarda o convite em `rpg:convite:pendente` quando falta o perfil e mostra a sala por `usarVistaDaSala`); "Testar relays" no `PainelRede` (`testarRelays.ts`); a conexão de quem joga (`lerConexaoSala`) leva `nostr: { mestre, relays }`. Relays padrão em `relays.ts`. Esta decisão **substitui** a de não usar relays para o estado do jogo, a pedido do usuário (2026-10-28: "pode manter o server mas coloca outra pasta de nostr"; sala pública não é problema).

O app é **gamificado**: toda ação que faz o jogo andar chama `registrar(evento)` (`usarJornada()`), que soma XP, cumpre missões, dá selos e mostra avisos. A lógica é pura, em `src/lib/jornada.ts`, e o estado fica em `rpg:jornada`. Regras de UX em `.rules/10-ux-jogo.md`.

O rolador de dados é no estilo Baldur's Gate 3: o D20 faz teste (CD, bônus, vantagem/desvantagem, 20 e 1 naturais como críticos) e os demais dados (D3, D4, D6, D8, D10, D12, D100, D1000) fazem soma (`2D6 + 3`).

- Na interface, o nome do dado é sempre com D maiúsculo (`D6`, `2D6 + 3`); use `nomeDado()` e `notacao()` de `src/lib/dados.ts`.
- O formato salvo no `localStorage` já mudou uma vez. Ao mudar de novo, mantenha `lerPedido`/`lerHistorico` lendo os formatos antigos e cubra com teste.

## Stack e comandos

Código em `web/`: Vite 7, React 19, TypeScript 5.9, Tailwind v4 e Vitest 4.

```sh
cd web
npm install        # se o npm 10 der "Cannot read properties of null (reading 'edgesOut')", use: npx npm@11 install
npm run dev        # servidor de desenvolvimento
npm test           # testes (dados, sala, jornada e contraste dos tokens)
npm run typecheck
npm run build
```

- Node 20: o Vite 8 e o Vitest 5 exigem versões que não rodam aqui, por isso as versões estão fixadas nas linhas 7 e 4.
- `src/lib/`: lógica pura e testada (`dados.ts`, `sala.ts`, `jornada.ts`), rotas (`rota.ts`) e acesso ao `localStorage` (`armazenamento.ts`). Tudo que é lido do `localStorage` passa por um conversor que valida e descarta o que estiver corrompido (`lerPedido`, `lerHistorico`, `lerSala`, `lerJornada`, `lerUsuario`). O Nostr (`nostr-tools`) é só identidade: gerar e ler chaves.
- `src/telas/`: uma tela por rota. `src/components/sala/`: grid, fichas, faixa de combate, gaveta de peças, atalhos, lista de peças e criação da sala. `src/components/jornada/`: provedor da jornada, avisos e selo de nível.
- `src/components/ui/`: componentes base do guia (`Botao`, `Selo`, `Opcao`, `Icones`).
- O `Rolador` recebe a chave dos ajustes e o histórico por props (cada tela guarda o seu) e usa container queries (`@container`, `@md:`, `@lg:`) porque aparece em larguras diferentes: página inteira em Dados, bandeja lateral na Sala. Com `compacto`, o dado fica menor, os ajustes ficam sempre à vista, em duas colunas, e o histórico vira log em estilo conversa (`Historico compacto`). Peças guardam `pv` e `pvMax` (`alterarPv`, `pvPadrao` em `sala.ts`), e só o mestre mexe nelas. Na `Grade`, a ficha é arrastável (HTML5 drag and drop); personagem usa o emblema de `Emblema.tsx` (símbolo por classe, em SVG com os tokens) e monstro, o losango. O resultado de cada rolagem da sala aparece grande no meio do tabuleiro (`AnuncioRolagem`). As rolagens da sala guardam `rodada` e `iniciativa` (`noMomento`) para o log se organizar em blocos; `lerHistorico` continua lendo rolagens sem esses campos.
- Combate: `iniciarCombate`, `passarVez`, `encerrarCombate`, `daVez` em `sala.ts`. As iniciativas entram no log como `rolagemAvulsa`.
- `src/styles/contraste.test.ts` lê o `tokens.css` e falha se algum par texto/fundo ficar abaixo de 4,5:1.
- Chaves do `localStorage` têm o prefixo `rpg:`.

## Idioma

- Documentação, textos da interface e mensagens de commit em **português do Brasil**.
- Nomes de tokens e classes de estilo seguem o guia em português (`--fundo`, `text-tinta`, `rounded-cordel`).

## Identidade visual

Toda interface segue a identidade **Cordel** (folheto de cordel + xilogravura nordestina). As regras estão separadas por tema em `.rules/` e são importadas abaixo:

@.rules/00-identidade.md
@.rules/01-principios.md
@.rules/02-cores.md
@.rules/03-tipografia.md
@.rules/04-forma.md
@.rules/05-componentes.md
@.rules/06-ilustracao-movimento.md
@.rules/07-acessibilidade.md
@.rules/08-tom.md
@.rules/09-checklist.md
@.rules/10-ux-jogo.md

### Regras que não se negociam

- Use sempre os tokens semânticos; nunca hexadecimal ou cores do Tailwind (`bg-red-500`) em componente.
- Bordas de 2 px, raio de 2 px (`rounded-cordel`), sombra deslocada (`shadow-carimbo`). Nada de sombra difusa, gradiente ou glassmorphism.
- Vermelho para ação, perigo e falha; verde-mata só para êxito e progresso. Uma ação principal (vermelha) por painel.
- Toda tela tem próximo passo: estado vazio com botão, missão ou atalho. Resultado antes da recompensa; aviso nunca cobre o resultado nem a zona do polegar.
- Linguagem neutra em gênero ao falar de quem joga ou de uma peça.
- Fontes e ícones empacotados no build (`@fontsource`). Nada de Google Fonts, CDN ou serviço externo em produção.
- Contraste AA (4,5:1) nos temas claro e escuro, foco visível, alvos de toque de 44 px, texto mínimo de 12 px, layout a partir de 360 px (a Sala também, só que pensada para desktop).
- Respeitar `prefers-reduced-motion`.

## Convenções

- O guia de identidade assume React (TSX) + Tailwind v4. Se a stack mudar, adapte as receitas de `.rules/05-componentes.md` mantendo os mesmos tokens.
- Ao mudar uma regra visual, edite o arquivo correspondente em `.rules/`, não este.
