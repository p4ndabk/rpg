import { useEffect, useState } from 'react'
import { gravar, ler } from '../lib/armazenamento'
import { Botao } from './ui/Botao'

type Tema = 'claro' | 'escuro'

const CHAVE = 'rpg:tema'
const ehTema = (v: unknown): v is Tema => v === 'claro' || v === 'escuro'

/** Aplica o tema salvo antes do primeiro render, para não piscar. */
export function aplicarTemaSalvo(): void {
  const salvo = ler<Tema | null>(CHAVE, null, (v) => (ehTema(v) ? v : null))
  if (salvo) document.documentElement.dataset.tema = salvo
}

function temaAtual(): Tema {
  const definido = document.documentElement.dataset.tema
  if (ehTema(definido)) return definido
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

export function BotaoTema() {
  const [tema, setTema] = useState(temaAtual)
  const outro: Tema = tema === 'claro' ? 'escuro' : 'claro'

  // Sem escolha manual, o tema segue o sistema, que pode mudar com a página aberta.
  useEffect(() => {
    const consulta = matchMedia('(prefers-color-scheme: dark)')
    const aoMudar = () => setTema(temaAtual())
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [])

  function alternar() {
    document.documentElement.dataset.tema = outro
    gravar(CHAVE, outro)
    setTema(outro)
  }

  return (
    <Botao tamanho="pequeno" className="whitespace-nowrap max-lg:px-3" onClick={alternar}>
      {/* Abaixo de 1024 px o botão encurta para caber ao lado do nome e do nível; o leitor de tela ainda ouve "Tema escuro". */}
      <span className="max-lg:sr-only">Tema </span>
      {outro}
    </Botao>
  )
}
