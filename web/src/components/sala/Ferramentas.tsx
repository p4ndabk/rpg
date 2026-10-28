import type { ReactNode } from 'react'
import { IconeAlvo, IconeMao, IconePincel } from '../ui/Icones'
import { Opcao } from '../ui/Opcao'

export type Ferramenta = 'mover' | 'cenario' | 'destaque'

const FERRAMENTAS: { valor: Ferramenta; rotulo: string; tecla: string; dica: string; icone: ReactNode }[] = [
  { valor: 'mover', rotulo: 'Mover', tecla: 'M', dica: 'Selecionar e mover peças', icone: <IconeMao /> },
  { valor: 'cenario', rotulo: 'Cenário', tecla: 'C', dica: 'Pintar o cenário do mapa', icone: <IconePincel /> },
  { valor: 'destaque', rotulo: 'Destaque', tecla: 'E', dica: 'Marcar casas para a mesa toda ver', icone: <IconeAlvo /> },
]

interface FerramentasProps {
  ativa: Ferramenta
  aoEscolher: (f: Ferramenta) => void
}

/** O que o toque no mapa faz agora. Uma escolha só (rádio): o modo ativo fica invertido e com o ícone, nunca só na cor. */
export function Ferramentas({ ativa, aoEscolher }: FerramentasProps) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="sr-only">Ferramenta do mapa</legend>
      <div className="flex gap-1.5">
        {FERRAMENTAS.map((f) => (
          <span key={f.valor} title={`${f.dica} (${f.tecla})`} className="flex">
            <Opcao nome="ferramenta" valor={f.valor} marcada={ativa === f.valor} aoMarcar={() => aoEscolher(f.valor)} className="gap-1.5 px-3">
              {f.icone}
              <span className="max-2xl:sr-only">{f.rotulo}</span>
              <span className="sr-only">. Atalho {f.tecla}</span>
            </Opcao>
          </span>
        ))}
      </div>
    </fieldset>
  )
}
