# 6. Ilustração

- Traço de **xilogravura**: linhas grossas, hachura simples, preto sobre papel.
- Usada em estados vazios e na tela inicial, nunca como ícone de ação.
- Em SVG inline, com cores dos tokens (`fill-tinta`, `stroke-vermelho`).
- Sem ilustração de terceiros ou de banco de imagens.

# 7. Movimento

- Entradas curtas: `220ms ease-out`, deslizando até 8 px e esmaecendo.
- Fim de estado (ex.: apagar): máximo de 900 ms.
- Com `prefers-reduced-motion`, tudo vira esmaecimento ou sumiço.
