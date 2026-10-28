import { iniciais, type Peca } from '../../lib/sala'
import { Emblema } from './Emblema'

interface FichaProps {
  peca: Pick<Peca, 'nome' | 'tipo' | 'classe'>
  /** Peça selecionada: sobe e ganha a sombra carimbo, como se tivesse sido levantada do tabuleiro. */
  erguida?: boolean
  /** Peça da vez no combate: pulsa devagar para chamar o olho. */
  naVez?: boolean
  /**
   * No tabuleiro, a ficha ocupa a casa e as iniciais crescem com ela (a casa é um `@container`).
   * Fora dele, tem o tamanho fixo de um ícone.
   */
  noTabuleiro?: boolean
  /** Sem pontos de vida: a peça fica apagada. */
  caida?: boolean
}

/**
 * Ficha da peça no grid. Personagem é um quadrado com o emblema da classe; monstro é losango em vermelho.
 * A forma repete a informação da cor, para quem não distingue as cores.
 */
export function Ficha({ peca, erguida = false, naVez = false, noTabuleiro = false, caida = false }: FichaProps) {
  const estado = `${caida ? 'opacity-40' : ''} ${erguida ? '-translate-x-0.5 -translate-y-0.5 shadow-carimbo-pequeno' : ''} ${naVez ? 'animate-pulsar' : ''}`
  const tamanho = noTabuleiro ? 'size-[78%]' : 'size-9'
  const letras = noTabuleiro ? 'text-xs @[4rem]:text-base @[5rem]:text-lg' : 'text-xs'
  if (peca.tipo === 'monstro') {
    return (
      <span aria-hidden="true" className={`grid shrink-0 place-items-center ${tamanho} ${estado}`}>
        <span className="grid size-[78%] rotate-45 place-items-center rounded-cordel border-2 border-borda bg-vermelho text-sobre-vermelho">
          <span className={`-rotate-45 font-bold ${letras}`}>{iniciais(peca.nome)}</span>
        </span>
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center overflow-hidden rounded-cordel border-2 border-borda bg-fundo ${tamanho} ${estado}`}
    >
      <Emblema nome={peca.classe ?? peca.nome} className="size-full p-0.5" />
    </span>
  )
}
