import { daVez, nomeCasa, TIPOS, type Sala } from '../../lib/sala'
import { Botao } from '../ui/Botao'
import { Ficha } from './Ficha'

interface PecasProps {
  sala: Sala
  selecionada: string | null
  aoSelecionar: (id: string) => void
  aoRemover: (id: string) => void
}

/** Lista das peças no grid, para achar, mover e tirar. */
export function Pecas({ sala, selecionada, aoSelecionar, aoRemover }: PecasProps) {
  const vez = daVez(sala)
  return (
    <section aria-labelledby="titulo-pecas" className="space-y-3">
      <h3 id="titulo-pecas" className="font-display text-xl">
        Peças no grid
      </h3>
      {sala.pecas.length === 0 ? (
        <p className="rounded-cordel border-2 border-dashed border-tinta-suave p-4 text-tinta-suave">
          Ninguém no grid ainda. Comece por um herói nos atalhos acima.
        </p>
      ) : (
        <ul className="space-y-3">
          {sala.pecas.map((p) => {
            const marcada = p.id === selecionada
            return (
              <li
                key={p.id}
                className={`flex flex-wrap items-center gap-3 rounded-cordel border-2 bg-superficie px-3 py-2 shadow-carimbo-pequeno ${marcada ? 'border-vermelho' : 'border-borda'}`}
              >
                <span className="grid size-11 place-items-center">
                  <Ficha peca={p} naVez={p.id === vez?.id} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{p.nome}</p>
                  <p className="text-sm text-tinta-suave">
                    {TIPOS.find((t) => t.valor === p.tipo)!.rotulo} · {nomeCasa(p.coluna, p.linha)}
                    {p.id === vez?.id && ' · na vez'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Botao tamanho="pequeno" aria-pressed={marcada} onClick={() => aoSelecionar(p.id)}>
                    {marcada ? 'Soltar' : 'Mover'}
                  </Botao>
                  <Botao tamanho="pequeno" aria-label={`Tirar ${p.nome} do grid`} onClick={() => aoRemover(p.id)}>
                    Tirar
                  </Botao>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
