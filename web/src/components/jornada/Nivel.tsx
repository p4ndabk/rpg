import { progresso } from '../../lib/jornada'
import { linkPara } from '../../lib/rota'
import { usarJornada } from './Jornada'

/** Barra de XP. Com rótulo, vira progressbar acessível; sem, é decorativa. */
export function BarraXp({ fracao, rotulo, className = '' }: { fracao: number; rotulo?: string; className?: string }) {
  const porcento = Math.round(Math.min(1, Math.max(0, fracao)) * 100)
  return (
    <span
      role={rotulo ? 'progressbar' : undefined}
      aria-label={rotulo}
      aria-valuenow={rotulo ? porcento : undefined}
      aria-valuemin={rotulo ? 0 : undefined}
      aria-valuemax={rotulo ? 100 : undefined}
      aria-hidden={rotulo ? undefined : true}
      className={`block h-3 overflow-hidden rounded-cordel border-2 border-borda bg-fundo ${className}`}
    >
      <span className="block h-full bg-verde transition-[width] duration-500" style={{ width: `${porcento}%` }} />
    </span>
  )
}

/** Selo de nível no cabeçalho: sempre à vista, leva ao Início. */
export function Nivel() {
  const { jornada } = usarJornada()
  const p = progresso(jornada.xp)
  return (
    <a
      href={linkPara('inicio')}
      aria-label={`Nível ${p.nivel}, ${p.titulo}: ${p.atual} de ${p.necessario} XP para ${p.proximoTitulo}`}
      className="flex min-h-11 items-center gap-2 rounded-cordel border-2 border-borda bg-superficie px-2.5 shadow-carimbo-pequeno"
    >
      <span className="font-display text-lg leading-none">Nv {p.nivel}</span>
      <span className="hidden text-sm font-bold md:inline">{p.titulo}</span>
      <BarraXp fracao={p.fracao} className="w-10 sm:w-16" />
    </a>
  )
}
