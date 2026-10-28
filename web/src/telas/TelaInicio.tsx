import { useState } from 'react'
import { Dado } from '../components/Dado'
import { usarJornada } from '../components/jornada/Jornada'
import { BarraXp } from '../components/jornada/Nivel'
import { IconeCheck, IconeGrid, IconeSelo } from '../components/ui/Icones'
import { ler } from '../lib/armazenamento'
import { CONQUISTAS, MISSOES, progresso, proximaMissao } from '../lib/jornada'
import { linkPara } from '../lib/rota'
import { lerSala } from '../lib/sala'

function saudacao(): string {
  const hora = new Date().getHours()
  if (hora < 5) return 'Boa madrugada'
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** Link com cara de botão. */
const comoBotao = (variante: 'principal' | 'secundario') =>
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-cordel border-2 border-borda px-5 py-2.5 font-bold shadow-carimbo active:translate-x-[3px] active:translate-y-[3px] active:shadow-none ${
    variante === 'principal' ? 'bg-vermelho text-sobre-vermelho' : 'bg-superficie text-tinta'
  }`

export function TelaInicio() {
  const { jornada } = usarJornada()
  const [sala] = useState(() => ler('rpg:sala', null, lerSala))
  const p = progresso(jornada.xp)
  const proxima = proximaMissao(jornada)
  const feitas = MISSOES.filter((m) => jornada.missoes[m.id]).length
  const selos = CONQUISTAS.filter((c) => jornada.conquistas[c.id]).length
  const e = jornada.estatisticas

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 pt-6 pb-32 sm:pb-12">
      <section className="flex items-center gap-5">
        {/* Ilustração da capa: o D20 em traço de xilogravura. */}
        <Dado faces={20} valor={20} estado="destaque" className="size-24 shrink-0 -rotate-6 sm:size-28" />
        <div className="min-w-0">
          <h1 tabIndex={-1} className="font-display text-3xl sm:text-4xl">
            {saudacao()}! Bora jogar?
          </h1>
          <p className="mt-1 text-tinta-suave">Role dados, monte sua sala e ganhe XP a cada jogada.</p>
        </div>
      </section>

      {/* Ficha do jogador: nível e quanto falta para o próximo. */}
      <section aria-labelledby="titulo-nivel" className="rounded-cordel border-2 border-borda bg-superficie p-5 shadow-carimbo">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="titulo-nivel" className="font-display text-2xl">
            Nível {p.nivel} · {p.titulo}
          </h2>
          <span className="shrink-0 text-sm font-bold text-verde">{jornada.xp} XP</span>
        </div>
        <BarraXp
          fracao={p.fracao}
          rotulo={`XP para o nível ${p.nivel + 1}`}
          className="mt-3 h-4"
        />
        <p className="mt-2 text-sm text-tinta-suave">
          Faltam {p.necessario - p.atual} XP para virar <strong className="text-tinta">{p.proximoTitulo}</strong>.
        </p>
      </section>

      {/* Próximo passo: quem não sabe o que fazer sempre tem uma sugestão e um botão. */}
      <section aria-labelledby="titulo-missao" className="rounded-cordel border-2 border-borda bg-superficie p-5 shadow-carimbo">
        <p className="text-xs font-bold tracking-wide text-tinta-suave uppercase">
          Primeiros passos · {feitas} de {MISSOES.length}
        </p>
        {proxima ? (
          <>
            <h2 id="titulo-missao" className="mt-1 font-display text-2xl">
              {proxima.titulo}
            </h2>
            <p className="mt-1 text-tinta-suave">{proxima.dica}</p>
            <a href={linkPara(proxima.rota)} className={`mt-4 ${comoBotao('principal')}`}>
              Bora lá
            </a>
          </>
        ) : (
          <>
            <h2 id="titulo-missao" className="mt-1 font-display text-2xl">
              Jornada iniciada!
            </h2>
            <p className="mt-1 text-tinta-suave">
              Você já sabe o caminho. Agora é caçar selos: role com vantagem, chame um bando, aguente três rodadas.
            </p>
            <a href={linkPara('sala')} className={`mt-4 ${comoBotao('principal')}`}>
              Ir para a sala
            </a>
          </>
        )}
        <details className="mt-4">
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-bold">Ver todas as missões</summary>
          <ol className="mt-2 space-y-2">
            {MISSOES.map((m) => {
              const feita = Boolean(jornada.missoes[m.id])
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-cordel border-2 border-borda ${feita ? 'bg-verde text-sobre-verde' : ''}`}
                  >
                    {feita && <IconeCheck className="size-4" />}
                  </span>
                  <span className={feita ? 'text-tinta-suave line-through' : 'font-bold'}>
                    {m.titulo}
                    <span className="sr-only">{feita ? ' (cumprida)' : ' (a fazer)'}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        </details>
      </section>

      <section aria-labelledby="titulo-modos" className="space-y-3">
        <h2 id="titulo-modos" className="font-display text-2xl">
          Jogar
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <a href={linkPara('dados')} className="flex gap-4 rounded-cordel border-2 border-borda bg-superficie p-4 shadow-carimbo active:translate-x-[3px] active:translate-y-[3px] active:shadow-none">
            <Dado faces={6} className="size-10 shrink-0" />
            <span>
              <span className="block font-display text-xl">Dados</span>
              <span className="text-sm text-tinta-suave">Rolagem rápida: testes de D20 e dados de dano.</span>
            </span>
          </a>
          <a href={linkPara('sala')} className="flex gap-4 rounded-cordel border-2 border-borda bg-superficie p-4 shadow-carimbo active:translate-x-[3px] active:translate-y-[3px] active:shadow-none">
            <IconeGrid className="size-10 shrink-0" />
            <span>
              <span className="block font-display text-xl">{sala ? sala.nome : 'Sala'}</span>
              <span className="text-sm text-tinta-suave">
                {sala
                  ? `${sala.pecas.length} ${sala.pecas.length === 1 ? 'peça' : 'peças'} no grid${sala.combate ? ` · combate na rodada ${sala.combate.rodada}` : ''}.`
                  : 'Monte um grid com heróis e monstros e conduza o combate.'}
              </span>
            </span>
          </a>
        </div>
      </section>

      <section aria-labelledby="titulo-selos" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="titulo-selos" className="font-display text-2xl">
            Selos
          </h2>
          <span className="text-sm font-bold text-tinta-suave">
            {selos} de {CONQUISTAS.length}
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CONQUISTAS.map((c) => {
            const tem = Boolean(jornada.conquistas[c.id])
            return (
              <li
                key={c.id}
                className={`flex gap-3 rounded-cordel border-2 p-3 ${
                  tem ? 'border-borda bg-superficie shadow-carimbo-pequeno' : 'border-dashed border-tinta-suave'
                }`}
              >
                <span className={`shrink-0 ${tem ? 'text-verde' : 'text-tinta-suave'}`}>
                  <IconeSelo className="size-7" cheio={tem} />
                </span>
                <span className="min-w-0">
                  <span className={`block font-bold leading-tight ${tem ? '' : 'text-tinta-suave'}`}>
                    {c.titulo}
                    <span className="sr-only">{tem ? ' (conquistado)' : ' (a conquistar)'}</span>
                  </span>
                  <span className="text-sm text-tinta-suave">{c.descricao}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="titulo-numeros" className="space-y-3">
        <h2 id="titulo-numeros" className="font-display text-2xl">
          Seus números
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Rolagens', String(e.rolagens)],
            ['20 naturais', String(e.vinteNaturais)],
            ['1 naturais', String(e.umNaturais)],
            ['Média do D20', e.testes ? decimal.format(e.somaNaturais / e.testes) : '—'],
          ].map(([rotulo, valor]) => (
            <div key={rotulo} className="rounded-cordel border-2 border-borda bg-superficie p-3">
              <dt className="text-sm text-tinta-suave">{rotulo}</dt>
              <dd className="font-display text-2xl">{valor}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  )
}
