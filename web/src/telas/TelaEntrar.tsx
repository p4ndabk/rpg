import { Botao } from '../components/ui/Botao'
import { usarUsuario } from '../components/usuario/Usuario'
import { gravar } from '../lib/armazenamento'
import { apagarSalaRemota, CHAVE_CONEXAO } from '../lib/rede/chaves'
import { lerConvite } from '../lib/rede/protocolo'
import { urlDoServidor } from '../lib/rede/servidor'
import { lerConviteNostr } from '../lib/nostr/convite'
import { RELAYS_PADRAO } from '../lib/nostr/relays'
import { linkPara } from '../lib/rota'

const link = 'inline-flex min-h-11 items-center justify-center rounded-cordel border-2 border-borda bg-superficie px-5 py-2.5 font-bold text-tinta shadow-carimbo'

/** Abre pelo link de convite do mestre (#/entrar/<sala>) e liga este navegador à sala no servidor ou nos relays. */
export function TelaEntrar() {
  const { usuario } = usarUsuario()
  const nostr = lerConviteNostr(location.hash)
  const salaId = nostr?.salaId ?? lerConvite(location.hash)

  function entrar() {
    if (!salaId) return
    // Sala nova: começa sem nada do que havia de outra sala.
    apagarSalaRemota()
    gravar(CHAVE_CONEXAO, nostr ? { salaId, nostr: { mestre: nostr.mestre, relays: nostr.relays.length > 0 ? nostr.relays : [...RELAYS_PADRAO] } } : { salaId })
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
            <p>Você foi convidado para uma sala. Antes, diga quem você é.</p>
            <a href={linkPara('perfil')} className={link}>
              Criar ou entrar com uma chave
            </a>
            <p className="text-sm text-tinta-suave">Depois de entrar, abra o link do convite de novo.</p>
          </>
        ) : (
          <>
            <p>
              Você foi convidado para uma sala e entra como <strong>{usuario.nome}</strong>.
            </p>
            <p className="text-sm text-tinta-suave">
              {nostr ? (
                <>
                  Relays: <code>{(nostr.relays.length > 0 ? nostr.relays : [...RELAYS_PADRAO]).join(', ')}</code>.
                </>
              ) : (
                <>
                  Servidor: <code>{urlDoServidor()}</code>.
                </>
              )}{' '}
              Você move só a sua peça e rola dados; o mestre cuida do resto.
            </p>
            <Botao variante="principal" onClick={entrar}>
              Entrar na sala
            </Botao>
          </>
        )}
      </section>
    </main>
  )
}
