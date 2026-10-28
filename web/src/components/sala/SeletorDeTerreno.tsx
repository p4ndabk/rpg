import { useState } from 'react'
import { GRUPOS_DE_TERRENO, TERRENOS, type GrupoDeTerreno, type Terreno } from '../../lib/sala'
import { AmostraTerreno } from './Terreno'

interface SeletorDeTerrenoProps {
  /** O terreno em uso; null é a borracha. */
  terreno: Terreno | null | undefined
  aoEscolher: (t: Terreno) => void
  /** Tamanho da amostra de cada terreno. */
  amostra?: string
  /** Mostra o nome ao lado da amostra. */
  comNome?: boolean
}

/** A paleta de terrenos em abas por grupo (Construção, Natureza, Piso, Objetos, Perigos): o painel não cresce com os terrenos. */
export function SeletorDeTerreno({ terreno, aoEscolher, amostra = 'size-9', comNome = true }: SeletorDeTerrenoProps) {
  const doTerreno = terreno ? TERRENOS.find((t) => t.valor === terreno)?.grupo : undefined
  const [escolhido, setGrupo] = useState<GrupoDeTerreno>(doTerreno ?? GRUPOS_DE_TERRENO[0])
  const grupo = escolhido
  return (
    <div className="space-y-1.5">
      <div role="tablist" aria-label="Grupo de terreno" className="flex flex-wrap gap-1">
        {GRUPOS_DE_TERRENO.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={grupo === g}
            onClick={() => setGrupo(g)}
            className="min-h-9 rounded-cordel border-2 border-borda px-3 text-sm font-bold aria-selected:bg-tinta aria-selected:text-fundo"
          >
            {g}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={grupo} className="flex flex-wrap items-center gap-1.5">
        {TERRENOS.filter((t) => t.grupo === grupo).map((t) => (
          <button
            key={t.valor}
            type="button"
            aria-pressed={terreno === t.valor}
            aria-label={t.bloqueia ? `${t.rotulo} (barra o caminho)` : t.rotulo}
            title={t.bloqueia ? `${t.rotulo}: barra o caminho` : t.rotulo}
            onClick={() => aoEscolher(t.valor)}
            className="flex min-h-11 items-center gap-2 rounded-cordel border-2 border-transparent pr-2 pl-1 text-sm font-bold aria-pressed:border-borda aria-pressed:bg-fundo"
          >
            <AmostraTerreno tipo={t.valor} className={amostra} />
            {comNome && t.rotulo}
          </button>
        ))}
      </div>
    </div>
  )
}
