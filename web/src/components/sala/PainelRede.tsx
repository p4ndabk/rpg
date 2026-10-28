import { useState } from 'react'
import type { Jogador } from '../../lib/rede/protocolo'
import type { Fase } from '../../lib/rede/usarServidor'
import { npubCurta } from '../../lib/usuario'
import { ehLocal } from '../../lib/nostr/convite'
import { lerListaDeRelays } from '../../lib/nostr/relays'
import { testarRelays, textoDoResultado, type ResultadoRelay } from '../../lib/nostr/testarRelays'
import { Botao } from '../ui/Botao'
import { Opcao } from '../ui/Opcao'

export type ModoRede = 'servidor' | 'nostr'

export const TEXTO_FASE_RELAYS: Record<Fase, string> = {
  desligada: 'Desligada',
  conectando: 'Conectando aos relays…',
  ok: 'Conectado',
  erro: 'Nenhum relay respondeu; tentando de novo',
}

export const TEXTO_FASE: Record<Fase, string> = {
  desligada: 'Desligada',
  conectando: 'Conectando ao servidor…',
  ok: 'Conectado',
  erro: 'Sem conexão com o servidor; tentando de novo',
}

interface PainelRedeProps {
  modo: ModoRede
  aoMudarModo: (modo: ModoRede) => void
  relays: string[]
  /** Troca a lista de relays (texto com um por linha; vazio volta ao padrão). */
  aoMudarRelays: (texto: string) => void
  /** Endereço do app que vai no convite, e como trocá-lo (vazio volta ao da página). */
  baseConvite: string
  aoMudarBase: (texto: string) => void
  ativa: boolean
  aoAlternar: (ativa: boolean) => void
  fase: Fase
  servidor: string
  /** Troca o endereço do servidor (vazio volta ao padrão). */
  aoMudarServidor: (url: string) => void
  link: string
  jogadores: Jogador[]
}

/** O mestre abre a sala no servidor, copia o convite e vê quem entrou. */
export function PainelRede({ modo, aoMudarModo, relays, aoMudarRelays, baseConvite, aoMudarBase, ativa, aoAlternar, fase, servidor, aoMudarServidor, link, jogadores }: PainelRedeProps) {
  const [copiou, setCopiou] = useState(false)
  const [endereco, setEndereco] = useState(servidor)
  const [listaRelays, setListaRelays] = useState(relays.join('\n'))
  const nostr = modo === 'nostr'
  const [base, setBase] = useState(baseConvite)
  // Teste dos relays: null = não testou; [] com `testando` = em andamento.
  const [testes, setTestes] = useState<ResultadoRelay[] | null>(null)
  const [testando, setTestando] = useState(false)
  async function testar() {
    // Testa o que está na caixa (mesmo antes de salvar), senão a lista em uso.
    const lista = lerListaDeRelays(listaRelays)
    setTestando(true)
    setTestes(null)
    setTestes(await testarRelays(lista.length > 0 ? lista : relays))
    setTestando(false)
  }
  return (
    <div className="space-y-6">
      <label className="flex min-h-11 items-center gap-3 font-bold">
        <input type="checkbox" checked={ativa} onChange={(e) => aoAlternar(e.target.checked)} className="size-5 accent-vermelho" />
        {nostr ? 'Abrir esta sala nos relays' : 'Abrir esta sala no servidor'}
      </label>

      <p role="status" aria-live="polite" className="text-sm">
        <strong>{nostr ? TEXTO_FASE_RELAYS[fase] : TEXTO_FASE[fase]}</strong>
      </p>

      <fieldset className="space-y-2">
        <legend className="font-bold">Por onde compartilhar</legend>
        <div className="grid grid-cols-2 gap-2">
          <Opcao nome="modo-rede" valor="servidor" marcada={!nostr} aoMarcar={() => aoMudarModo('servidor')}>
            Servidor
          </Opcao>
          <Opcao nome="modo-rede" valor="nostr" marcada={nostr} aoMarcar={() => aoMudarModo('nostr')}>
            Relays Nostr
          </Opcao>
        </div>
      </fieldset>

      {nostr ? (
        <section aria-labelledby="titulo-relays" className="space-y-2">
          <h3 id="titulo-relays" className="font-bold">
            Relays
          </h3>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              aoMudarRelays(listaRelays)
            }}
          >
            <label htmlFor="lista-relays" className="sr-only">
              Relays, um por linha
            </label>
            <textarea
              id="lista-relays"
              rows={4}
              value={listaRelays}
              spellCheck={false}
              onChange={(e) => setListaRelays(e.target.value)}
              className="w-full rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-sm text-tinta"
            />
            <Botao type="submit" tamanho="pequeno" disabled={listaRelays.trim().split(/\s+/).join(' ') === relays.join(' ')}>
              Usar estes relays
            </Botao>
            <Botao tamanho="pequeno" className="ml-2" disabled={testando} aria-describedby="resultado-relays" onClick={testar}>
              {testando ? 'Testando…' : 'Testar relays'}
            </Botao>
          </form>
          <div id="resultado-relays" role="status" aria-live="polite">
            {testes && (
              <ul className="space-y-1 text-sm">
                {testes.map((t) => (
                  <li key={t.url} className="flex flex-wrap items-center gap-2">
                    {/* Quadrado cheio = respondeu; vazio = não. A frase diz o resto. */}
                    <span aria-hidden className={`size-2.5 border-2 border-current ${t.ms !== null ? 'bg-current text-verde' : 'text-vermelho'}`} />
                    <code className="break-all">{t.url}</code>
                    <span className={t.ms !== null ? 'font-bold text-verde' : 'font-bold text-vermelho'}>{textoDoResultado(t)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs text-tinta-suave">
            Sem servidor: o seu navegador faz o papel dele. <strong>Deixe esta aba aberta durante a sessão</strong>; se você fechar, a mesa para até você voltar. Os relays guardam a sala por poucos dias.
          </p>
        </section>
      ) : (
      <section aria-labelledby="titulo-servidor" className="space-y-2">
        <h3 id="titulo-servidor" className="font-bold">
          Servidor
        </h3>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            aoMudarServidor(endereco)
          }}
        >
          <label htmlFor="endereco-servidor" className="sr-only">
            Endereço do servidor
          </label>
          <input
            id="endereco-servidor"
            value={endereco}
            spellCheck={false}
            onChange={(e) => setEndereco(e.target.value)}
            className="min-w-0 flex-1 rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-sm text-tinta"
          />
          <Botao type="submit" tamanho="pequeno" disabled={endereco.trim() === servidor}>
            Usar
          </Botao>
        </form>
        <p className="text-xs text-tinta-suave">
          Rode <code>npm start</code> na pasta <code>server</code>. Quem joga usa o mesmo endereço (na rede de casa, troque localhost pelo IP da sua máquina).
        </p>
      </section>
      )}

      {ativa && (
        <section aria-labelledby="titulo-convite" className="space-y-2">
          <h3 id="titulo-convite" className="font-bold">
            Convite
          </h3>
          <code className="block rounded-cordel border-2 border-borda bg-fundo p-3 text-sm break-all">{link}</code>
          <Botao
            tamanho="pequeno"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link)
                setCopiou(true)
              } catch {
                setCopiou(false)
              }
            }}
          >
            {copiou ? 'Copiado!' : 'Copiar link'}
          </Botao>
          {nostr && (
            <form
              className="space-y-1"
              onSubmit={(e) => {
                e.preventDefault()
                aoMudarBase(base)
              }}
            >
              <label htmlFor="base-convite" className="text-sm font-bold">
                Endereço do app no convite
              </label>
              <div className="flex gap-2">
                <input
                  id="base-convite"
                  value={base}
                  spellCheck={false}
                  onChange={(e) => setBase(e.target.value)}
                  className="min-w-0 flex-1 rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-sm text-tinta"
                />
                <Botao type="submit" tamanho="pequeno" disabled={base.trim() === baseConvite}>
                  Usar
                </Botao>
              </div>
              {ehLocal(baseConvite) && (
                <p role="status" className="text-sm font-bold text-vermelho">
                  Esse endereço só abre nesta máquina. Para outra pessoa entrar, troque pelo endereço do app publicado (GitHub Pages) ou pelo IP da sua rede, como http://192.168.68.106:5173/.
                </p>
              )}
            </form>
          )}
          <p className="text-sm text-tinta-suave">Mande o link para quem vai jogar. Cada pessoa entra com a própria chave Nostr.</p>
        </section>
      )}

      <section aria-labelledby="titulo-jogadores" className="space-y-2">
        <h3 id="titulo-jogadores" className="font-bold">
          Quem entrou ({jogadores.length})
        </h3>
        {jogadores.length === 0 ? (
          <p className="text-sm text-tinta-suave">Ninguém ainda. Quando alguém abrir o convite, o nome aparece aqui.</p>
        ) : (
          <ul className="space-y-1">
            {jogadores.map((j) => (
              <li key={j.pubkey} className="flex items-baseline justify-between gap-3 border-b border-dashed border-tinta-suave/50 py-1">
                <span className="truncate font-bold">{j.nome}</span>
                <span className="shrink-0 text-xs text-tinta-suave">{npubCurta(j.pubkey)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-privacidade" className="space-y-1 rounded-cordel border-2 border-dashed border-tinta-suave p-3">
        <h3 id="titulo-privacidade" className="text-sm font-bold">
          O que sai do seu navegador
        </h3>
        <p className="text-sm text-tinta-suave">
          {nostr
            ? 'Os relays são públicos: qualquer pessoa com o link pode ler a sala. Mesmo assim, só vai para eles o que a mesa vê. Peças escondidas, a vida dos monstros, as rolagens secretas e as notas ficam só no seu navegador.'
            : 'O servidor guarda a sala inteira, mas só manda a quem joga o que a mesa vê: peças escondidas, a vida dos monstros, as rolagens secretas e as notas ficam de fora. As notas nem saem do seu navegador.'}
        </p>
      </section>
    </div>
  )
}
