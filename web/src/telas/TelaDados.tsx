import { usarJornada } from '../components/jornada/Jornada'
import { Rolador } from '../components/Rolador'
import { usarArmazenado } from '../lib/armazenamento'
import { lerHistorico, noHistorico, type Rolagem } from '../lib/dados'

// Chaves com "d20" no nome vêm da primeira versão; mantidas para não perder o que já foi salvo.
const CHAVE_PEDIDO = 'rpg:d20:pedido'
const CHAVE_HISTORICO = 'rpg:d20:historico'

export function TelaDados() {
  const [historico, setHistorico] = usarArmazenado<Rolagem[]>(CHAVE_HISTORICO, [], lerHistorico)
  const { registrar } = usarJornada()

  return (
    <main className="mx-auto max-w-xl px-4 pt-6 pb-32 sm:pb-12">
      <h1 tabIndex={-1} className="font-display text-4xl">
        Dados
      </h1>
      <p className="mt-1 mb-6 text-tinta-suave">Rolagem rápida, fora da sala. Cada rolagem vale XP.</p>
      <Rolador
        chavePedido={CHAVE_PEDIDO}
        historico={historico}
        aoRolar={(r) => {
          setHistorico((h) => noHistorico(h, r))
          registrar({ tipo: 'rolagem', rolagem: r, naSala: false })
        }}
        aoLimparHistorico={() => setHistorico([])}
      />
    </main>
  )
}
