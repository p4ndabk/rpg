# 5. Componentes base

Receitas de referência. Copie a classe, não invente uma nova.

## Botão

```tsx
const base =
  'inline-flex items-center justify-center gap-2 rounded-cordel border-2 border-borda px-5 py-2.5 ' +
  'font-bold shadow-carimbo transition-transform select-none ' +
  'enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:shadow-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none'

const variantes = {
  principal: 'bg-vermelho text-sobre-vermelho',
  secundario: 'bg-superficie text-tinta',
}
```

- **Principal:** vermelho, para a ação da tela (uma por vez).
- **Secundário:** superfície, para cancelar, voltar, ações menores.

## Campo

```tsx
<label htmlFor={id} className="font-bold">{rotulo}</label>
<input
  id={id}
  className="rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-tinta placeholder:text-tinta-suave"
/>
<p className="text-sm text-tinta-suave">{ajuda}</p>      {/* opcional */}
<p className="text-sm font-bold text-vermelho">{erro}</p> {/* opcional */}
```

Rótulo sempre visível (não só placeholder). Erro vinculado com `aria-describedby` e `aria-invalid`.

## Balão (mensagem)

- Meu: `bg-vermelho text-sobre-vermelho`, alinhado à direita.
- Do outro: `bg-superficie text-tinta`, alinhado à esquerda.
- Destaque (ex.: fui marcado): `border-vermelho`.
- Largura máxima de 85%, `shadow-carimbo-pequeno`.

## Selo (status)

Pequeno rótulo em caixa alta, com um quadrado como ícone de apoio:

- Estado ativo / "privado": `bg-tinta text-fundo`
- Estado neutro / "público": `bg-superficie text-tinta`

Sempre `text-xs font-bold uppercase tracking-wide`. O ícone é `aria-hidden`.

## Aviso

- Info: `bg-superficie text-tinta`, `role="status"`.
- Erro: `bg-vermelho text-sobre-vermelho`, `role="alert"`.

## Modal

- Overlay `bg-tinta/60`, painel `bg-superficie`, `border-2 shadow-carimbo`, `max-w-md`.
- Título em `font-display text-2xl`.
- Fecha com Escape, devolve o foco ao elemento que abriu.

## Cabeçalho de página

- `font-display text-4xl`, grudado no topo (`sticky`), fundo `bg-fundo`.
- Botão de voltar: `min-h-11 min-w-11` (alvo de toque de 44 px), mesmo estilo de botão com sombra pequena.

## Logo

Quadrado preto (`fill-tinta`) com moldura vermelha interna (`stroke-vermelho`, 2 px) e um balão de fala. Use `currentColor` ou os tokens; nunca hexadecimal.

Se o seu projeto tiver outro nome, troque a palavra e mantenha a forma do selo.
