# 8. Acessibilidade e responsividade

- **Contraste AA (4,5:1)** em todo par texto/fundo, nos dois temas. Teste automatizado com os tokens lidos do CSS.
- **Foco visível:** contorno vermelho de 3 px com 2 px de afastamento.
- **Alvos de toque de 44 px** no celular (`min-h-11 min-w-11`).
- **Texto mínimo de 12 px.**
- Layout funciona a partir de **360 px** de largura, sem rolagem horizontal.
  - A **Sala** é pensada para desktop (alvo 1920×1080) mas é **responsiva**: abaixo de 1024 px empilha (mapa em cima, bandeja embaixo), sem rolagem horizontal da página; o mapa rola dentro da própria moldura. Ver `10-ux-jogo.md`.
- Cor nunca é o único indicador: sempre há texto ou forma (ex.: quadrado do selo, borda de destaque).
