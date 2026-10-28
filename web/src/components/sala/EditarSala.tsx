import { useState, type FormEvent } from 'react'
import { COLUNAS_MAX, LINHAS_MAX, nomeCasa, tamanhoMinimo, type Sala } from '../../lib/sala'
import { Contador } from '../Contador'
import { Botao } from '../ui/Botao'

interface EditarSalaProps {
  sala: Sala
  aoSalvar: (nome: string, colunas: number, linhas: number) => void
  aoCancelar: () => void
}

/** Muda o nome e o tamanho da sala. Encolher o grid para no que as peças já ocupam. */
export function EditarSala({ sala, aoSalvar, aoCancelar }: EditarSalaProps) {
  const [nome, setNome] = useState(sala.nome)
  const [colunas, setColunas] = useState(sala.colunas)
  const [linhas, setLinhas] = useState(sala.linhas)
  const minimo = tamanhoMinimo(sala)
  const mudou = nome.trim() !== sala.nome || colunas !== sala.colunas || linhas !== sala.linhas

  function aoEnviar(e: FormEvent) {
    e.preventDefault()
    aoSalvar(nome, colunas, linhas)
  }

  return (
    <form onSubmit={aoEnviar} className="space-y-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="nome-sala-editar" className="font-bold">
          Nome da sala
        </label>
        <input
          id="nome-sala-editar"
          value={nome}
          maxLength={40}
          onChange={(e) => setNome(e.target.value)}
          className="rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-tinta placeholder:text-tinta-suave"
        />
      </div>

      <div className="space-y-3">
        <Contador
          emLinha
          id="colunas-editar"
          rotulo="Colunas"
          valor={colunas}
          min={minimo.colunas}
          max={COLUNAS_MAX}
          aoMudar={setColunas}
          ajuda={`De A a ${nomeCasa(colunas - 1, 0).slice(0, 1)}`}
        />
        <Contador emLinha id="linhas-editar" rotulo="Linhas" valor={linhas} min={minimo.linhas} max={LINHAS_MAX} aoMudar={setLinhas} ajuda={`De 1 a ${linhas}`} />
        <p className="text-sm text-tinta-suave">
          O grid não encolhe além das peças que já estão nele (agora, no mínimo {minimo.colunas} × {minimo.linhas}). As peças ficam onde estão.
        </p>
      </div>

      <div className="flex gap-2">
        <Botao type="submit" variante="principal" disabled={!mudou}>
          Salvar
        </Botao>
        <Botao onClick={aoCancelar}>Cancelar</Botao>
      </div>
    </form>
  )
}
