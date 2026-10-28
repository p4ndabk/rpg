import { useEffect, useState } from 'react'
import { ehDanoMaximo, margem, notacao, nomeDado, comSinal, type Rolagem } from '../../lib/dados'
import { Dado } from '../Dado'
import { Explosao } from '../Explosao'
import { estadoDoDado } from '../Rolador'
import { DESFECHOS } from '../ui/Selo'

const DURACAO = 5000

/**
 * Resultado da rolagem em destaque, no meio do tabuleiro, para a mesa toda ver de quem foi e o que saiu.
 * Não segura o toque (o tabuleiro continua clicável) e some sozinho. O leitor de tela já recebe o resultado
 * pelo rolador e pelo log, então aqui tudo é `aria-hidden`.
 */
export function AnuncioRolagem({ rolagem }: { rolagem: Rolagem | null }) {
  const [visivel, setVisivel] = useState<string | null>(null)

  useEffect(() => {
    if (!rolagem) return
    setVisivel(rolagem.id)
    const t = window.setTimeout(() => setVisivel(null), DURACAO)
    return () => clearTimeout(t)
  }, [rolagem])

  if (!rolagem || visivel !== rolagem.id) return null

  const teste = rolagem.tipo === 'teste'
  const desfecho = teste ? DESFECHOS[rolagem.desfecho] : null
  const maximo = !teste && ehDanoMaximo(rolagem)
  const vinte = teste && rolagem.desfecho === 'sucesso-critico'
  const poucos = rolagem.dados.length <= 3
  const tamanho = rolagem.dados.length === 1 ? 'size-36' : 'size-28'
  const quem = rolagem.rotulo || (teste ? 'Teste' : 'Rolagem')

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 grid place-items-center p-4">
      <div
        key={rolagem.id}
        className="relative flex w-full max-w-lg animate-carimbar flex-col items-center gap-3 rounded-cordel border-2 border-borda bg-superficie p-5 text-center shadow-carimbo"
      >
        <div>
          <p className="font-display text-3xl break-words">{quem}</p>
          <p className="text-sm font-bold tracking-wide text-tinta-suave uppercase">
            {teste ? `${nomeDado(20)} · CD ${rolagem.cd}` : notacao(rolagem.dados.length, rolagem.faces, rolagem.bonus)}
          </p>
        </div>

        <div className="relative flex items-center justify-center gap-4">
          {poucos ? (
            rolagem.dados.map((valor, i) => (
              <Dado key={i} faces={rolagem.faces} valor={valor} estado={estadoDoDado(rolagem, i)} className={tamanho} />
            ))
          ) : (
            <p className="font-display text-7xl">{rolagem.total}</p>
          )}
          {vinte && <Explosao />}
        </div>

        {teste ? (
          <>
            <p className={`-rotate-2 rounded-cordel border-2 border-borda px-6 py-1 font-display text-5xl uppercase shadow-carimbo-pequeno ${desfecho!.classe}`}>
              {desfecho!.rotulo}
            </p>
            <p className="text-lg font-bold">
              {rolagem.natural} {comSinal(rolagem.modificador)} = <span className="font-display text-2xl">{rolagem.total}</span> · {margem(rolagem)}
            </p>
          </>
        ) : (
          <p className={`-rotate-2 rounded-cordel border-2 border-borda px-6 py-1 font-display text-5xl uppercase shadow-carimbo-pequeno ${maximo ? 'bg-tinta text-fundo' : 'bg-superficie text-tinta'}`}>
            {maximo ? `Máximo! ${rolagem.total}` : `Total ${rolagem.total}`}
          </p>
        )}
      </div>
    </div>
  )
}
