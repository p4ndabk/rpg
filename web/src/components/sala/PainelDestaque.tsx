import { DESTAQUE_TEXTO_MAX, DESTAQUES_MAX, nomeCasa, type Destaque } from '../../lib/sala'
import { Botao } from '../ui/Botao'

interface PainelDestaqueProps {
  /** A frase que vai junto do próximo destaque (opcional). */
  texto: string
  aoTexto: (texto: string) => void
  destaques: Destaque[]
  aoLimpar: () => void
  aoConcluir: () => void
}

/**
 * Painel do modo Destaque, no lugar do painel da peça. O mestre escreve (se quiser) uma frase curta e toca nas
 * casas: elas ganham um contorno vermelho pulsando, visível para a mesa toda. Tocar de novo tira.
 */
export function PainelDestaque({ texto, aoTexto, destaques, aoLimpar, aoConcluir }: PainelDestaqueProps) {
  return (
    <section aria-label="Destacar casas" className="flex min-h-30 flex-col justify-center gap-2 rounded-cordel border-2 border-borda bg-superficie px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-display text-lg">Destaque</p>
        <div className="flex min-w-48 flex-1 flex-col">
          <label htmlFor="texto-destaque" className="sr-only">
            Frase do destaque (opcional)
          </label>
          <input
            id="texto-destaque"
            value={texto}
            maxLength={DESTAQUE_TEXTO_MAX}
            placeholder="Frase curta (opcional). Ex.: O baú está trancado"
            onChange={(e) => aoTexto(e.target.value)}
            className="min-h-11 rounded-cordel border-2 border-borda bg-fundo px-3 text-tinta placeholder:text-tinta-suave"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Botao tamanho="pequeno" disabled={destaques.length === 0} onClick={aoLimpar}>
            Limpar destaques
          </Botao>
          <Botao variante="principal" tamanho="pequeno" onClick={aoConcluir}>
            Concluir
          </Botao>
        </div>
      </div>
      <p className="text-sm text-tinta-suave">
        {destaques.length === 0
          ? 'Toque numa casa do tabuleiro para destacá-la para a mesa toda. Toque de novo para tirar.'
          : `Destacadas (${destaques.length} de ${DESTAQUES_MAX}): ${destaques.map((d) => `${nomeCasa(d.coluna, d.linha)}${d.texto ? ` (${d.texto})` : ''}`).join(', ')}.${destaques.length >= DESTAQUES_MAX ? ' Chegou ao máximo: o próximo tira o mais antigo.' : ''}`}
      </p>
    </section>
  )
}
