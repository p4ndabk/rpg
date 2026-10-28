import { CONDICOES, daVez, type Peca, type Sala } from '../../lib/sala'
import { Ficha } from './Ficha'

/** A ficha de quem joga: o personagem dele, com a vida, a iniciativa, a CD, a descrição e se é a sua vez. Fica no alto da bandeja. */
export function MeuPersonagem({ sala, pubkey, aoEditar }: { sala: Sala; pubkey: string; aoEditar: () => void }) {
  const peca = sala.pecas.find((p) => p.dono === pubkey)
  if (!peca) return null
  const ordem = sala.combate?.ordem.filter((o) => sala.pecas.some((p) => p.id === o.id)) ?? []
  const lugar = ordem.findIndex((o) => o.id === peca.id)
  return (
    <Cartao
      peca={peca}
      aoEditar={aoEditar}
      naVez={daVez(sala)?.id === peca.id}
      iniciativa={lugar >= 0 ? { valor: ordem[lugar]!.iniciativa, lugar: lugar + 1, total: ordem.length } : null}
    />
  )
}

/** `iniciativa` só vem durante o combate: o valor tirado e o lugar na ordem. */
function Cartao({ peca, naVez, iniciativa, aoEditar }: { peca: Peca; naVez: boolean; iniciativa: { valor: number; lugar: number; total: number } | null; aoEditar: () => void }) {
  const bonus = peca.bonusIniciativa ?? 0
  const caido = peca.pv === 0
  const fracao = peca.pv / peca.pvMax
  const baixo = fracao <= 0.25
  const condicoes = CONDICOES.filter((c) => peca.condicoes?.includes(c))
  return (
    <section aria-label="Seu personagem" className="rounded-cordel border-2 border-borda bg-superficie p-3 shadow-carimbo-pequeno">
      <div className="flex items-center gap-3">
        <Ficha peca={peca} naVez={naVez} caida={caido} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="truncate font-display text-xl">{peca.nome}</span>
            {peca.cd !== undefined && <span className="rounded-cordel border-2 border-borda px-1.5 text-xs font-bold">CD {peca.cd}</span>}
            {naVez && <span className="text-xs font-bold tracking-wide text-vermelho uppercase">Sua vez</span>}
          </p>
          <p className="text-sm font-bold">
            PV {peca.pv}/{peca.pvMax}
            {caido && <span className="text-vermelho"> · caído</span>}
            {!caido && baixo && <span className="text-vermelho"> · perigo</span>}
          </p>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label="Pontos de vida"
        aria-valuemin={0}
        aria-valuemax={peca.pvMax}
        aria-valuenow={peca.pv}
        className="mt-2 h-3 border-2 border-borda bg-fundo"
      >
        <div className={`h-full ${baixo ? 'bg-vermelho' : 'bg-tinta'}`} style={{ width: `${fracao * 100}%` }} />
      </div>
      <p className="mt-2 text-sm" aria-label="Iniciativa">
        <span className="font-bold">Iniciativa</span>{' '}
        {iniciativa ? (
          <>
            <span className="font-display text-lg">{iniciativa.valor}</span> · {iniciativa.lugar}º de {iniciativa.total} na ordem
          </>
        ) : (
          <span className="text-tinta-suave">{bonus === 0 ? 'bônus +0' : `bônus ${bonus > 0 ? '+' : '−'}${Math.abs(bonus)}`} (soma ao D20 quando o combate começar)</span>
        )}
        {iniciativa && bonus !== 0 && <span className="text-tinta-suave"> (bônus {bonus > 0 ? '+' : '−'}{Math.abs(bonus)})</span>}
      </p>
      {peca.descricao && <p className="mt-2 line-clamp-3 text-sm break-words whitespace-pre-line text-tinta-suave">{peca.descricao}</p>}
      <div className="mt-2 flex flex-wrap gap-1" aria-label="Condições">
        {condicoes.length === 0 ? (
          <span className="text-sm text-tinta-suave">Sem condições.</span>
        ) : (
          condicoes.map((c) => (
            <span key={c} className="rounded-cordel border-2 border-borda bg-tinta px-2 text-sm font-bold text-fundo">
              {c}
            </span>
          ))
        )}
      </div>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={aoEditar}
        className="mt-3 min-h-11 w-full rounded-cordel border-2 border-borda bg-fundo px-3 font-bold shadow-carimbo-pequeno enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:shadow-none"
      >
        Editar ficha
      </button>
    </section>
  )
}
