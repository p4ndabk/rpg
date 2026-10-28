import { useRef, type ChangeEvent } from 'react'
import { lerArquivoSala, montarArquivoSala, nomeDoArquivoSala, type ArquivoDeSala as Arquivo } from '../../lib/arquivoSala'
import { chaveHexDoNavegador } from '../../lib/nostr/chave'
import type { Guardada } from '../../lib/salas'
import { Botao } from '../ui/Botao'

/** Baixa a sala (peças, escondidos, log, notas e a chave dos relays) num arquivo .json. */
export function baixarSala(g: Guardada, senha = ''): void {
  const url = URL.createObjectURL(new Blob([montarArquivoSala(g, chaveHexDoNavegador(), senha)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nomeDoArquivoSala(g.sala.nome)
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

interface AbrirProps {
  /** Recebe a sala lida; `erro` chega quando o arquivo não presta. */
  aoLer: (a: Arquivo) => void
  aoErro: (mensagem: string) => void
}

/** Botão que abre um arquivo de sala salvo antes (em outro navegador ou computador). */
export function AbrirArquivoDeSala({ aoLer, aoErro }: AbrirProps) {
  const entrada = useRef<HTMLInputElement>(null)

  async function aoEscolher(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    if (arquivo.size > 5_000_000) return aoErro('Esse arquivo é grande demais para ser uma sala.')
    const lido = lerArquivoSala(await arquivo.text())
    if (!lido) return aoErro('Esse arquivo não parece uma sala salva por aqui.')
    aoLer(lido)
  }

  return (
    <>
      <Botao onClick={() => entrada.current?.click()}>Abrir de um arquivo</Botao>
      <input ref={entrada} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="Arquivo de sala" onChange={(e) => void aoEscolher(e)} />
    </>
  )
}
