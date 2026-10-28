# 4. Forma

| Elemento | Regra |
|---|---|
| Raio | `rounded-cordel` (2 px) em tudo |
| Borda | `border-2 border-borda` (2 px sólidos) |
| Sombra de ação | `shadow-carimbo` (`4px 4px 0 var(--tinta)`) em botões e cartões de destaque |
| Sombra pequena | `shadow-carimbo-pequeno` (`2px 2px 0`) em balões, menus, cabeçalhos |
| Sombra difusa | **Proibida.** Sem `blur`, sem `shadow-md`/`shadow-lg` |
| Espaçamento | múltiplos de 4 px; padding de botão `px-5 py-2.5` |

## Estado de "pressionado"

Ao clicar, o elemento "afunda" a sombra:

```
enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:shadow-none
```
