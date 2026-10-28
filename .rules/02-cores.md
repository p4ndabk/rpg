# 2. Cores (tokens)

Cada cor é um par claro/escuro usando `light-dark()`. Os nomes são semânticos: nunca use hexadecimal dentro de um componente, use o token.

| Token | Claro (papel) | Escuro (carvão) | Uso |
|---|---|---|---|
| `--fundo` | `#F2E8D5` | `#1B1916` | fundo da página |
| `--superficie` | `#FBF6EC` | `#26231F` | cartões, campos, balão do outro |
| `--tinta` | `#1B1916` | `#F2E8D5` | texto principal, traços, sombra |
| `--tinta-suave` | `#5B544A` | `#B9AF9F` | texto secundário, placeholder, ajuda |
| `--vermelho` | `#B3261E` | `#EC6652` | ação principal, foco, erro, balão meu |
| `--sobre-vermelho` | `#FBF6EC` | `#1B1916` | texto sobre o vermelho |
| `--verde` | `#3A6B35` | `#78B86E` | sucesso, XP, missão cumprida, selo conquistado |
| `--sobre-verde` | `#FBF6EC` | `#1B1916` | texto sobre o verde |
| `--borda` | `#1B1916` | `#F2E8D5` | bordas de 2 px |

> **Emenda (gamificação):** o verde-mata entrou para dar ao jogador um sinal claro de êxito e progresso. Ele **nunca** é cor de ação: botões continuam vermelhos (principal) ou papel (secundário). Contraste: 5,2:1 a 7,4:1 nos dois temas, coberto pelo teste automatizado.

> O vermelho escuro foi ajustado de `#E0523F` para `#EC6652`: o teste de contraste mostrou 4,06:1 como texto sobre a superfície. Ao copiar, rode um teste de contraste com os seus pares.

## `tokens.css`

```css
:root {
  color-scheme: light dark;

  --fundo: light-dark(#f2e8d5, #1b1916);
  --superficie: light-dark(#fbf6ec, #26231f);
  --tinta: light-dark(#1b1916, #f2e8d5);
  --tinta-suave: light-dark(#5b544a, #b9af9f);
  --vermelho: light-dark(#b3261e, #ec6652);
  --sobre-vermelho: light-dark(#fbf6ec, #1b1916);
  --verde: light-dark(#3a6b35, #78b86e);
  --sobre-verde: light-dark(#fbf6ec, #1b1916);
  --borda: light-dark(#1b1916, #f2e8d5);
}

/* Preferência manual do usuário (botão de tema) sobrepõe o sistema. */
:root[data-tema='claro'] {
  color-scheme: light;
}

:root[data-tema='escuro'] {
  color-scheme: dark;
}
```

Se o projeto precisa de navegadores sem `light-dark()`, use o par explícito em duas regras:

```css
:root {
  --fundo: #f2e8d5;
  /* ...demais tokens claros */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-tema='claro']) {
    --fundo: #1b1916;
    /* ...demais tokens escuros */
  }
}

:root[data-tema='escuro'] {
  --fundo: #1b1916;
  /* ...demais tokens escuros */
}
```
