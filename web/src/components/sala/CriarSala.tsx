import { useState, type FormEvent } from 'react'
import {
  COLUNAS_MAX,
  COLUNAS_MIN,
  COLUNAS_PADRAO,
  LINHAS_MAX,
  LINHAS_MIN,
  LINHAS_PADRAO,
} from '../../lib/sala'
import { Contador } from '../Contador'
import { Botao } from '../ui/Botao'
import { IconeGrid } from '../ui/Icones'

// Para quem trava no nome: um toque e sai uma ideia.
const NOMES = [
  'A cripta do lich',
  'Taverna do Bode Manco',
  'Sertão das Almas',
  'Mina dos Anões Perdidos',
  'Torre do Mago Doido',
  'Feira de Caruaru Assombrada',
  'Pântano da Cuca',
  'Castelo do Rei Sem Sombra',
]

interface CriarSalaProps {
  aoCriar: (nome: string, colunas: number, linhas: number) => void
  /** Quando a criação é uma escolha (vindo da lista de salas), dá para voltar. */
  aoCancelar?: () => void
}

export function CriarSala({ aoCriar, aoCancelar }: CriarSalaProps) {
  const [nome, setNome] = useState('')
  const [colunas, setColunas] = useState(COLUNAS_PADRAO)
  const [linhas, setLinhas] = useState(LINHAS_PADRAO)

  function sortear() {
    const outros = NOMES.filter((n) => n !== nome)
    setNome(outros[Math.floor(Math.random() * outros.length)]!)
  }

  function aoEnviar(e: FormEvent) {
    e.preventDefault()
    aoCriar(nome, colunas, linhas)
  }

  return (
    <main className="mx-auto max-w-xl px-4 pt-6 pb-32 sm:pb-12">
      <div className="flex items-center gap-4">
        <IconeGrid className="size-14 shrink-0 -rotate-3" />
        <div>
          <h1 tabIndex={-1} className="font-display text-4xl">
            Nova sala
          </h1>
          <p className="text-tinta-suave">O tabuleiro da sua aventura. Leva 10 segundos.</p>
        </div>
      </div>

      <ol className="mt-5 grid grid-cols-3 gap-2 text-center text-sm font-bold" aria-label="Como funciona">
        {['Crie a sala', 'Chame heróis e monstros', 'Role a iniciativa'].map((passo, i) => (
          <li key={passo} className="rounded-cordel border-2 border-dashed border-tinta-suave p-2">
            <span className="block font-display text-xl">{i + 1}</span>
            {passo}
          </li>
        ))}
      </ol>

      <form onSubmit={aoEnviar} className="mt-6 space-y-5 rounded-cordel border-2 border-borda bg-superficie p-5 shadow-carimbo">
        <div className="flex flex-col gap-1">
          <label htmlFor="nome-sala" className="font-bold">
            Nome da sala
          </label>
          <div className="flex gap-2">
            <input
              id="nome-sala"
              value={nome}
              maxLength={40}
              placeholder="Ex.: A cripta do lich"
              onChange={(e) => setNome(e.target.value)}
              className="min-w-0 flex-1 rounded-cordel border-2 border-borda bg-fundo px-3 py-2.5 text-tinta placeholder:text-tinta-suave"
            />
            <Botao tamanho="pequeno" className="shrink-0" onClick={sortear}>
              Sortear
            </Botao>
          </div>
          <p className="text-sm text-tinta-suave">Sem ideia? Sorteie. Em branco, vira "Minha sala".</p>
        </div>

        <Contador
          emLinha
          id="colunas"
          rotulo="Colunas"
          valor={colunas}
          min={COLUNAS_MIN}
          max={COLUNAS_MAX}
          aoMudar={setColunas}
          ajuda={`De A a ${String.fromCharCode(64 + colunas)}`}
        />
        <Contador emLinha id="linhas" rotulo="Linhas" valor={linhas} min={LINHAS_MIN} max={LINHAS_MAX} aoMudar={setLinhas} ajuda={`De 1 a ${linhas}`} />

        <Botao type="submit" variante="principal" className="w-full">
          Criar sala (+20 XP)
        </Botao>
        {aoCancelar && (
          <Botao className="w-full" onClick={aoCancelar}>
            Cancelar
          </Botao>
        )}
      </form>
    </main>
  )
}
