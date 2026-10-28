import { useState, type FormEvent } from 'react'
import { usarUsuario } from '../components/usuario/Usuario'
import { BaixarCredencial, SubirCredencial } from '../components/usuario/Credencial'
import { Botao } from '../components/ui/Botao'
import { Opcao } from '../components/ui/Opcao'
import { tocarAvisoDeVez } from '../components/sala/AvisoDaVez'
import { gravar, ler, usarArmazenado } from '../lib/armazenamento'
import { CHAVE_SOM, lerLigado } from '../lib/preferencias'
import { CHAVE_CONVITE_PENDENTE } from '../lib/rede/chaves'
import { gerarIdentidade, lerEntrada, npubDe, TAMANHO_MAXIMO_NOME } from '../lib/usuario'

type Modo = 'criar' | 'colar' | 'arquivo'

const ERROS = {
  vazia: 'Cole a sua chave. Ela começa com nsec1 ou npub1.',
  invalida: 'Essa chave não parece certa. Confira se copiou inteira (começa com nsec1 ou npub1).',
}

const campo = 'rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-tinta placeholder:text-tinta-suave'

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

/** Entrar com uma identidade Nostr (a mesma chave do Voz) ou ver e sair da identidade atual. */
export function TelaPerfil() {
  const { usuario, entrar, sair } = usarUsuario()
  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-32 sm:pb-12">
      <h1 tabIndex={-1} className="font-display text-4xl">
        {usuario ? 'Seu perfil' : 'Quem vai jogar?'}
      </h1>
      {usuario && <VoltarAoConvite />}
      {usuario ? <Perfil nome={usuario.nome} pubkey={usuario.pubkey} aoMudarNome={(nome) => entrar({ ...usuario, nome })} aoSair={sair} /> : <Entrada aoEntrar={entrar} />}
    </main>
  )
}

/** Quem veio por um convite e precisou criar o perfil volta para ele com um toque. */
function VoltarAoConvite() {
  const [pendente] = useState(() => ler(CHAVE_CONVITE_PENDENTE, '', (v) => (typeof v === 'string' && v.startsWith('#/entrar/') ? v : null)))
  if (!pendente) return null
  return (
    <section aria-labelledby="titulo-convite" className="mt-4 space-y-3 rounded-cordel border-2 border-borda bg-superficie p-4 shadow-carimbo">
      <h2 id="titulo-convite" className="font-display text-2xl">
        Seu convite está esperando
      </h2>
      <p>Pronto, você já tem perfil. Bora voltar para a sala?</p>
      <a
        href={pendente}
        onClick={() => gravar(CHAVE_CONVITE_PENDENTE, '')}
        className="inline-flex min-h-11 items-center justify-center rounded-cordel border-2 border-borda bg-vermelho px-5 py-2.5 font-bold text-sobre-vermelho shadow-carimbo"
      >
        Voltar ao convite
      </a>
    </section>
  )
}

function Entrada({ aoEntrar }: { aoEntrar: (u: { pubkey: string; nome: string }) => void }) {
  const [modo, setModo] = useState<Modo>('criar')
  const [nome, setNome] = useState('')
  const [chave, setChave] = useState('')
  const [erro, setErro] = useState('')
  // Identidade nova: nasce na memória e só vira sessão depois de a pessoa confirmar que guardou a nsec.
  const [nova, setNova] = useState<{ nsec: string; pubkey: string } | null>(null)
  const [guardou, setGuardou] = useState(false)
  const [copiou, setCopiou] = useState(false)
  const nomeLimpo = nome.trim()

  function criar() {
    setNova(gerarIdentidade())
    setGuardou(false)
    setCopiou(false)
  }

  function colar(e: FormEvent) {
    e.preventDefault()
    const r = lerEntrada(chave)
    if (!r.ok) return setErro(ERROS[r.motivo])
    aoEntrar({ pubkey: r.pubkey, nome: nomeLimpo || 'Sem nome' })
  }

  return (
    <div className="mt-2 space-y-6">
      <p className="text-tinta-suave">
        Seu usuário é uma chave Nostr, a mesma do Voz. Fica só neste navegador: o RPG guarda o seu nome e a chave pública, nunca a chave secreta.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="nome-usuario" className="font-bold">
          Seu nome na mesa
        </label>
        <input id="nome-usuario" value={nome} maxLength={TAMANHO_MAXIMO_NOME} placeholder="Ex.: Zé do Cordel" onChange={(e) => setNome(e.target.value)} className={campo} />
      </div>

      <fieldset>
        <legend className="font-bold">Como você quer entrar?</legend>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <Opcao nome="modo-entrada" valor="criar" marcada={modo === 'criar'} aoMarcar={() => setModo('criar')}>
            Criar chave nova
          </Opcao>
          <Opcao nome="modo-entrada" valor="colar" marcada={modo === 'colar'} aoMarcar={() => setModo('colar')}>
            Colar minha chave
          </Opcao>
          <Opcao nome="modo-entrada" valor="arquivo" marcada={modo === 'arquivo'} aoMarcar={() => setModo('arquivo')}>
            Subir credencial
          </Opcao>
        </div>
      </fieldset>

      {modo === 'criar' ? (
        !nova ? (
          <Botao variante="principal" onClick={criar}>
            Criar minha chave
          </Botao>
        ) : (
          <section aria-labelledby="titulo-nsec" className="space-y-3 rounded-cordel border-2 border-borda bg-superficie p-4 shadow-carimbo">
            <h2 id="titulo-nsec" className="font-display text-2xl">
              Guarde sua chave secreta
            </h2>
            <p>
              Esta é a sua <strong>nsec</strong>. Ela aparece <strong>só agora</strong> e o RPG não guarda uma cópia. Quem tem a nsec é você: sem ela, você não recupera esta identidade.
            </p>
            <code className="block rounded-cordel border-2 border-borda bg-fundo p-3 text-sm break-all">{nova.nsec}</code>
            <Botao
              tamanho="pequeno"
              onClick={async () => setCopiou(await copiar(nova.nsec))}
            >
              {copiou ? 'Copiada!' : 'Copiar nsec'}
            </Botao>
            <BaixarCredencial nsec={nova.nsec} nome={nomeLimpo || 'Sem nome'} />
            <label className="flex min-h-11 items-center gap-3 font-bold">
              <input type="checkbox" checked={guardou} onChange={(e) => setGuardou(e.target.checked)} className="size-5 accent-vermelho" />
              Guardei minha nsec ou baixei a credencial
            </label>
            <Botao variante="principal" disabled={!guardou} onClick={() => aoEntrar({ pubkey: nova.pubkey, nome: nomeLimpo || 'Sem nome' })}>
              Entrar
            </Botao>
          </section>
        )
      ) : modo === 'arquivo' ? (
        <SubirCredencial aoEntrar={(u) => aoEntrar({ pubkey: u.pubkey, nome: nomeLimpo || u.nome })} />
      ) : (
        <form onSubmit={colar} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="chave-usuario" className="font-bold">
              Sua chave
            </label>
            <input
              id="chave-usuario"
              value={chave}
              autoComplete="off"
              spellCheck={false}
              placeholder="nsec1… ou npub1…"
              aria-invalid={erro !== ''}
              aria-describedby={erro ? 'erro-chave' : 'ajuda-chave'}
              onChange={(e) => {
                setChave(e.target.value)
                setErro('')
              }}
              className={campo}
            />
            <p id="ajuda-chave" className="text-sm text-tinta-suave">
              Com a nsec ou só com a npub dá para entrar. O RPG usa a chave para saber quem é você e guarda só a parte pública.
            </p>
            {erro && (
              <p id="erro-chave" role="alert" className="text-sm font-bold text-vermelho">
                {erro}
              </p>
            )}
          </div>
          <Botao type="submit" variante="principal">
            Entrar
          </Botao>
        </form>
      )}
      {/* Fora do formulário (formulário dentro de formulário não vale). Só aparece com uma nsec colada. */}
      {modo === 'colar' && chave.trim().replace(/^nostr:/, '').startsWith('nsec1') && lerEntrada(chave).ok && <BaixarCredencial nsec={chave} nome={nomeLimpo || 'Sem nome'} />}
    </div>
  )
}

function Perfil({ nome, pubkey, aoMudarNome, aoSair }: { nome: string; pubkey: string; aoMudarNome: (n: string) => void; aoSair: () => void }) {
  const [copiou, setCopiou] = useState(false)
  const npub = npubDe(pubkey)
  const [som, setSom] = usarArmazenado<boolean>(CHAVE_SOM, true, lerLigado)
  return (
    <div className="mt-4 space-y-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="nome-perfil" className="font-bold">
          Seu nome na mesa
        </label>
        <input id="nome-perfil" value={nome} maxLength={TAMANHO_MAXIMO_NOME} onChange={(e) => aoMudarNome(e.target.value)} className={campo} />
      </div>

      <section aria-labelledby="titulo-npub" className="space-y-2">
        <h2 id="titulo-npub" className="font-bold">
          Sua chave pública (npub)
        </h2>
        <code className="block rounded-cordel border-2 border-borda bg-superficie p-3 text-sm break-all">{npub}</code>
        <Botao tamanho="pequeno" onClick={async () => setCopiou(await copiar(npub))}>
          {copiou ? 'Copiada!' : 'Copiar npub'}
        </Botao>
        <p className="text-sm text-tinta-suave">Quem conduz a sessão usa a npub para dar uma peça a você.</p>
      </section>


      <section aria-labelledby="titulo-som" className="space-y-2">
        <h2 id="titulo-som" className="font-bold">
          Aviso da sua vez
        </h2>
        <label className="flex min-h-11 items-center gap-3 font-bold">
          <input type="checkbox" checked={som} onChange={(e) => setSom(e.target.checked)} className="size-5 accent-vermelho" />
          Tocar um som quando chegar a minha vez
        </label>
        <Botao tamanho="pequeno" onClick={tocarAvisoDeVez}>
          Ouvir o som
        </Botao>
        <p className="text-sm text-tinta-suave">O cartão &quot;Sua vez!&quot; e o título da aba aparecem de qualquer jeito.</p>
      </section>

      <section aria-labelledby="titulo-sair" className="border-t-2 border-dashed border-tinta-suave pt-6">
        <h2 id="titulo-sair" className="font-bold">
          Trocar de usuário
        </h2>
        <p className="mb-3 text-sm text-tinta-suave">
          Sair tira esta identidade deste navegador. Sua sala, XP e selos continuam aqui. Sem a sua nsec (ou o arquivo de credencial e a senha) você não entra de novo como esta pessoa.
        </p>
        <Botao
          tamanho="pequeno"
          onClick={() => {
            if (window.confirm('Sair desta identidade neste navegador?')) aoSair()
          }}
        >
          Sair
        </Botao>
      </section>
    </div>
  )
}
