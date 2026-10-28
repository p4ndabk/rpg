import { useState, type FormEvent } from 'react'
import { MODELOS, TAMANHOS, type Modelo } from '../../lib/modelos'
import {
  COLUNAS_MAX,
  COLUNAS_MIN,
  COLUNAS_PADRAO,
  LINHAS_MAX,
  LINHAS_MIN,
  LINHAS_PADRAO,
  nomeColuna,
} from '../../lib/sala'
import { Contador } from '../Contador'
import { Botao } from '../ui/Botao'
import { Opcao } from '../ui/Opcao'
import { ModelosDeMapa } from './ModelosDeMapa'
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
  /** Com `modelo`, o tamanho e o cenário vêm dele. */
  aoCriar: (nome: string, colunas: number, linhas: number, modelo?: Modelo) => void
  /** Quando a criação é uma escolha (vindo da lista de salas), dá para voltar. */
  aoCancelar?: () => void
}

export function CriarSala({ aoCriar, aoCancelar }: CriarSalaProps) {
  const [nome, setNome] = useState('')
  const [colunas, setColunas] = useState(COLUNAS_PADRAO)
  const [linhas, setLinhas] = useState(LINHAS_PADRAO)
  // Começa por um modelo pronto (o primeiro é o tabuleiro limpo, igual ao de antes) ou só pelo tamanho do grid.
  const [como, setComo] = useState<'modelo' | 'grid'>('modelo')
  const [modeloId, setModeloId] = useState(MODELOS[0]!.id)
  const modelo = MODELOS.find((m) => m.id === modeloId)!

  function sortear() {
    const outros = NOMES.filter((n) => n !== nome)
    setNome(outros[Math.floor(Math.random() * outros.length)]!)
  }

  function aoEnviar(e: FormEvent) {
    e.preventDefault()
    if (como === 'modelo') aoCriar(nome, modelo.colunas, modelo.linhas, modelo)
    else aoCriar(nome, colunas, linhas)
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-32 sm:pb-12">
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

        <fieldset>
          <legend className="font-bold">Como começar?</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <Opcao nome="como-criar" valor="modelo" marcada={como === 'modelo'} aoMarcar={() => setComo('modelo')}>
              Modelo pronto
            </Opcao>
            <Opcao nome="como-criar" valor="grid" marcada={como === 'grid'} aoMarcar={() => setComo('grid')}>
              Só o grid
            </Opcao>
          </div>
        </fieldset>

        {como === 'modelo' ? (
          <div className="space-y-2">
            <p className="text-sm text-tinta-suave">
              Escolha um mapa pronto: o tamanho já combina com a cena e dá para mudar tudo depois, em <strong>Cenário</strong> e <strong>Editar sala</strong>.
            </p>
            <ModelosDeMapa escolhido={modeloId} rotuloDoBotao="Escolher" aoEscolher={(m) => setModeloId(m.id)} />
          </div>
        ) : (
          <div className="space-y-4">
            <div role="group" aria-label="Tamanhos recomendados" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TAMANHOS.map((t) => (
                <button
                  key={t.nome}
                  type="button"
                  aria-pressed={colunas === t.colunas && linhas === t.linhas}
                  onClick={() => {
                    setColunas(t.colunas)
                    setLinhas(t.linhas)
                  }}
                  className="rounded-cordel border-2 border-borda bg-superficie p-2 text-left shadow-carimbo-pequeno aria-pressed:bg-tinta aria-pressed:text-fundo"
                >
                  <span className="block font-bold">{t.nome}</span>
                  <span className="block text-sm">
                    {t.colunas} × {t.linhas}
                  </span>
                  <span className="block text-xs opacity-80">{t.dica}</span>
                </button>
              ))}
            </div>
            <Contador
              emLinha
              id="colunas"
              rotulo="Colunas"
              valor={colunas}
              min={COLUNAS_MIN}
              max={COLUNAS_MAX}
              aoMudar={setColunas}
              ajuda={`De A a ${nomeColuna(colunas - 1)}`}
            />
            <Contador emLinha id="linhas" rotulo="Linhas" valor={linhas} min={LINHAS_MIN} max={LINHAS_MAX} aoMudar={setLinhas} ajuda={`De 1 a ${linhas}`} />
            <p className="text-sm text-tinta-suave">Mapa grande (mais de uns 30 de lado) rola na tela: dá zoom, arrasta e tem miniatura para se achar.</p>
          </div>
        )}

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
