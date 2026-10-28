# 3. Tipografia

| Papel | Fonte | Pesos | Uso |
|---|---|---|---|
| Display | **Alfa Slab One** (serifa grossa, tipo de madeira) | 400 | marca, títulos (`h1`, `h2`) |
| Corpo | **Atkinson Hyperlegible** | 400, 700 | todo o resto |

- Pacote: `@fontsource/alfa-slab-one` e `@fontsource/atkinson-hyperlegible` (licença OFL).
- **Empacote as fontes no build.** Nada de Google Fonts ou CDN: um terceiro saberia quem abre o site.
- Fallbacks: `'Rockwell', 'Roboto Slab', Georgia, serif` para display; `system-ui, -apple-system, 'Segoe UI', sans-serif` para corpo.
- Corpo com `line-height: 1.5`. Negrito (`font-bold`) para rótulos e botões.
- Texto mínimo de **12 px** (`text-xs`). Em celular, texto secundário não desce disso.

## Tailwind v4 (`index.css`)

```css
@import 'tailwindcss';
@import '@fontsource/alfa-slab-one/400.css';
@import '@fontsource/atkinson-hyperlegible/400.css';
@import '@fontsource/atkinson-hyperlegible/700.css';
@import './tokens.css';

@theme inline {
  --color-fundo: var(--fundo);
  --color-superficie: var(--superficie);
  --color-tinta: var(--tinta);
  --color-tinta-suave: var(--tinta-suave);
  --color-vermelho: var(--vermelho);
  --color-sobre-vermelho: var(--sobre-vermelho);
  --color-borda: var(--borda);

  --font-display: 'Alfa Slab One', 'Rockwell', 'Roboto Slab', Georgia, serif;
  --font-corpo: 'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif;

  --radius-cordel: 2px;
  --shadow-carimbo: 4px 4px 0 var(--tinta);
  --shadow-carimbo-pequeno: 2px 2px 0 var(--tinta);
}

body {
  margin: 0;
  background-color: var(--fundo);
  color: var(--tinta);
  font-family: var(--font-corpo);
  line-height: 1.5;
}

:focus-visible {
  outline: 3px solid var(--vermelho);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Classes resultantes: `bg-fundo`, `bg-superficie`, `text-tinta`, `text-tinta-suave`, `bg-vermelho`, `text-sobre-vermelho`, `border-borda`, `rounded-cordel`, `shadow-carimbo`, `shadow-carimbo-pequeno`, `font-display`, `font-corpo`.

## Textura de papel (opcional)

Um grão SVG inline sutil no `body`, com menos de 5 KB, via `background-image` e `feTurbulence` com opacidade de 0,07. Não use imagem externa.
