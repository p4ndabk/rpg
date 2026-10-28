# 10. Checklist para um novo projeto

- [ ] Copiei `tokens.css` e os nomes dos tokens são iguais.
- [ ] Fontes Alfa Slab One e Atkinson Hyperlegible vêm de `@fontsource` (empacotadas).
- [ ] `@theme inline` expõe as cores e as sombras ao Tailwind.
- [ ] Modo claro e escuro funcionam; o escuro é carvão, não preto puro.
- [ ] Todo par texto/fundo passa em 4,5:1 nos dois temas (teste automatizado).
- [ ] Botões, campos e cartões usam `border-2`, `rounded-cordel` e sombra deslocada.
- [ ] Nenhuma sombra difusa nem cor hexadecimal em componente.
- [ ] Alvos de toque de 44 px no celular e texto mínimo de 12 px.
- [ ] Animações respeitam `prefers-reduced-motion`.
- [ ] Nada é carregado de CDN ou serviço externo em produção.
- [ ] Toda tela nova tem estado vazio com próximo passo e botão.
- [ ] Ações que fazem o jogo andar registram evento na jornada (`registrar`) e rendem XP.
- [ ] Nenhum aviso cobre o resultado da ação nem a zona do polegar.
