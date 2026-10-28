import { useEffect, useState, type FormEvent } from 'react'
import { Botao } from '../components/ui/Botao'
import { usarUsuario } from '../components/usuario/Usuario'
import { gravar } from '../lib/armazenamento'
import { apagarSalaRemota, CHAVE_CONEXAO, CHAVE_CONVITE_PENDENTE } from '../lib/rede/chaves'
import { lerConvite } from '../lib/rede/protocolo'
import { urlDoServidor } from '../lib/rede/servidor'
import { lerConviteNostr } from '../lib/nostr/convite'
import { RELAYS_PADRAO } from '../lib/nostr/relays'
import { usarVistaDaSala, type EstadoVista } from '../lib/nostr/usarVistaDaSala'
import { chaveDaSala } from '../lib/nostr/protegida'
import { linkPara } from '../lib/rota'

const link ='inline-flex min-h-11 items-center justify-center rounded-cordel border-2 border-borda bg-superficie px-5 py-2.5 font-bold text-tinta shadow-carimbo'

/** Abre pelo link de convite do mestre (#/entrar/<sala>) e liga este navegador à sala no servidor ou nos relays. */
export function TelaEntrar() {
  const { usuario } = usarUsuario()
  const nostr = lerConviteNostr(location.hash)
  const salaId = nostr?.salaId ?? lerConvite(location.hash)
  // Convite sem relays usa os padrão, igual a quando a pessoa entra.
  // Sala com senha: a pessoa digita, a chave é derivada (leva cerca de meio segundo) e a vista tenta abrir a foto com ela.
  const [rascunho, setRascunho] = useState('')
  const [senha, setSenha] = useState('')
  const [chave, setChave] = useState<{ chave: CryptoKey; id: string } | null>(null)
  const [calculando, setCalculando] = useState(false)
  const vista = usarVistaDaSala(nostr && { ...nostr, relays: nostr.relays.length > 0 ? nostr.relays : [...RELAYS_PADRAO] }, chave)

  async function aoDigitarSenha(e: FormEvent) {
    e.preventDefault()
    if (!salaId || !rascunho) return
    setCalculando(true)
    setChave({ chave: await chaveDaSala(rascunho, salaId), id: rascunho })
    setSenha(rascunho)
    setCalculando(false)
  }

  // Sem perfil ainda: lembra o convite para voltar a ele depois de entrar (ver TelaPerfil).
  const semPerfil = !usuario && !!salaId
  useEffect(() => {
    if (semPerfil) gravar(CHAVE_CONVITE_PENDENTE, location.hash)
  }, [semPerfil])

  function entrar() {
    if (!salaId) return
    gravar(CHAVE_CONVITE_PENDENTE, '')
    // Sala nova: começa sem nada do que havia de outra sala.
    apagarSalaRemota()
    gravar(CHAVE_CONEXAO, nostr ? { salaId, nostr: { mestre: nostr.mestre, relays: nostr.relays.length > 0 ? nostr.relays : [...RELAYS_PADRAO], ...(vista?.fase === 'achou' && senha ? { senha } : {}) } } : { salaId })
    location.hash = linkPara('sala')
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-32 sm:pb-12">
      <h1 tabIndex={-1} className="font-display text-4xl">
        Entrar na sala
      </h1>
      <section className="mt-6 space-y-4 rounded-cordel border-2 border-borda bg-superficie p-5 shadow-carimbo">
        {!salaId ? (
          <>
            <p className="font-bold text-vermelho" role="alert">
              Esse convite não parece certo.
            </p>
            <p className="text-tinta-suave">Peça ao mestre para copiar o link de novo, inteiro, em "Compartilhar".</p>
          </>
        ) : !usuario ? (
          <>
            <p>Você foi convidado para uma sala. Antes, diga quem você é. Depois a gente volta pra cá.</p>
            <a href={linkPara('perfil')} className={link}>
              Criar ou entrar com uma chave
            </a>
          </>
        ) : (
          <>
            <p>
              Você foi convidado para uma sala e entra como <strong>{usuario.nome}</strong>.
            </p>
            <CartaoDaSala vista={vista} />
            {vista?.fase === 'protegida' && (
              <form onSubmit={(e) => void aoDigitarSenha(e)} className="space-y-3 rounded-cordel border-2 border-borda bg-fundo p-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="senha-da-sala" className="font-bold">
                    Senha da sala
                  </label>
                  <input
                    id="senha-da-sala"
                    type="password"
                    autoComplete="off"
                    value={rascunho}
                    onChange={(e) => setRascunho(e.target.value)}
                    aria-invalid={vista.errada || undefined}
                    className="rounded-cordel border-2 border-borda bg-superficie px-3 py-2.5 text-tinta"
                  />
                  <p className="text-sm text-tinta-suave">O mestre passa a senha separada do convite.</p>
                </div>
                {vista.errada && (
                  <p role="alert" className="font-bold text-vermelho">
                    Essa senha não abre a sala. Confira com o mestre.
                  </p>
                )}
                <Botao type="submit" disabled={calculando || !rascunho}>
                  {calculando ? 'Conferindo…' : 'Usar a senha'}
                </Botao>
              </form>
            )}
            <p className="text-sm text-tinta-suave">Você move só a sua peça e rola dados; o mestre cuida do resto.</p>
            <details className="text-sm text-tinta-suave">
              <summary className="inline-flex min-h-11 cursor-pointer items-center font-bold">Detalhes da conexão</summary>
              {nostr ? (
                <>
                  Relays: <code>{(nostr.relays.length > 0 ? nostr.relays : [...RELAYS_PADRAO]).join(', ')}</code>.
                </>
              ) : (
                <>
                  Servidor: <code>{urlDoServidor()}</code>.
                </>
              )}
            </details>
            <Botao variante="principal" onClick={entrar} disabled={vista?.fase === 'protegida'}>
              Entrar na sala
            </Botao>
          </>
        )}
      </section>
    </main>
  )
}

/** Quem é a sala, antes de entrar. Só existe no convite em relays (o servidor não é consultado aqui). */
function CartaoDaSala({ vista }: { vista: EstadoVista | null }) {
  if (!vista) return null
  if (vista.fase === 'procurando') {
    return (
      <p role="status" className="rounded-cordel border-2 border-dashed border-borda p-3 text-tinta-suave">
        Procurando a sala…
      </p>
    )
  }
  if (vista.fase === 'protegida') {
    return (
      <p role="status" className="rounded-cordel border-2 border-borda bg-fundo p-3">
        <strong>Essa sala tem senha.</strong> Digite a senha para ver a sala e entrar.
      </p>
    )
  }
  if (vista.fase === 'nao-achou') {
    return (
      <p role="status" className="rounded-cordel border-2 border-dashed border-borda p-3">
        <strong>Não achei a sala.</strong> O mestre está com a aba aberta? Você pode entrar mesmo assim: a sala aparece quando ele voltar.
      </p>
    )
  }
  const minutos = Math.floor((Date.now() / 1000 - vista.vista.em) / 60)
  return (
    <div role="status" className="rounded-cordel border-2 border-borda bg-fundo p-3">
      <p className="font-display text-xl">{vista.vista.nome}</p>
      <p className="text-sm text-tinta-suave">
        {vista.vista.pessoas} {vista.vista.pessoas === 1 ? 'pessoa' : 'pessoas'} na mesa
        {minutos >= 3 ? ` · o mestre não dá sinal há ${minutos} min` : ''}
      </p>
    </div>
  )
}
