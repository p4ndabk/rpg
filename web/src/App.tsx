import { useEffect, useRef, type ReactNode } from 'react'
import { BotaoTema } from './components/BotaoTema'
import { Dado } from './components/Dado'
import { ProvedorJornada } from './components/jornada/Jornada'
import { ProvedorUsuario, usarUsuario } from './components/usuario/Usuario'
import { Nivel } from './components/jornada/Nivel'
import { IconeAmigos, IconeCasa, IconeGrid, IconeLista } from './components/ui/Icones'
import { linkPara, ROTAS, TITULOS, usarRota, type Rota } from './lib/rota'
import { TelaAmigos } from './telas/TelaAmigos'
import { TelaDados } from './telas/TelaDados'
import { TelaEntrar } from './telas/TelaEntrar'
import { TelaInicio } from './telas/TelaInicio'
import { TelaPerfil } from './telas/TelaPerfil'
import { TelaSalas } from './telas/TelaSalas'
import { TelaSala } from './telas/TelaSala'

const ICONES: Record<Rota, ReactNode> = {
  inicio: <IconeCasa />,
  dados: <Dado faces={20} className="size-6" />,
  salas: <IconeLista />,
  amigos: <IconeAmigos />,
  sala: <IconeGrid />,
  perfil: null,
  entrar: null,
}

/** Quem está jogando, no cabeçalho: leva ao perfil. Sem ninguém entrar, vira o convite "Entrar". */
function SeloUsuario({ ativo }: { ativo: boolean }) {
  const { usuario } = usarUsuario()
  return (
    <a
      href={linkPara('perfil')}
      aria-current={ativo ? 'page' : undefined}
      aria-label={usuario ? `Perfil de ${usuario.nome}` : 'Entrar'}
      className="flex min-h-11 max-w-40 items-center rounded-cordel border-2 border-borda bg-superficie px-3 font-bold text-tinta shadow-carimbo-pequeno aria-[current=page]:bg-tinta aria-[current=page]:text-fundo"
    >
      <span className="truncate">{usuario ? usuario.nome : 'Entrar'}</span>
    </a>
  )
}

export function App() {
  const rota = usarRota()
  const primeiraVez = useRef(true)

  // Ao trocar de tela, leva o foco ao título novo, para leitor de tela e teclado não ficarem perdidos.
  useEffect(() => {
    document.title = `${TITULOS[rota]} · RPG`
    if (primeiraVez.current) {
      primeiraVez.current = false
      return
    }
    window.scrollTo(0, 0)
    document.querySelector<HTMLElement>('main h1')?.focus()
  }, [rota])

  return (
    <ProvedorUsuario>
    <ProvedorJornada>
      <header className="sticky top-0 z-20 border-b-2 border-borda bg-fundo shadow-carimbo-pequeno">
        {/* A sala usa a largura toda da tela; o cabeçalho acompanha para alinhar com ela. */}
        <div className={`mx-auto flex items-center gap-3 px-4 py-2.5 ${rota === 'sala' ? 'lg:px-6' : 'max-w-6xl'}`}>
          <a href={linkPara('inicio')} className="font-display text-2xl">
            RPG
          </a>
          {/* No celular, a navegação vira barra fixa embaixo, ao alcance do polegar. */}
          <nav
            aria-label="Telas"
            className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-borda bg-fundo px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:static sm:border-0 sm:bg-transparent sm:p-0"
          >
            <ul className="grid grid-cols-5 gap-2 sm:flex">
              {ROTAS.map((r) => (
                <li key={r.rota}>
                  <a
                    href={linkPara(r.rota)}
                    aria-current={rota === r.rota ? 'page' : undefined}
                    className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-cordel border-2 border-borda bg-superficie px-3 text-sm font-bold text-tinta shadow-carimbo-pequeno aria-[current=page]:bg-tinta aria-[current=page]:text-fundo sm:min-h-11 sm:flex-row sm:gap-2 sm:text-base"
                  >
                    {ICONES[r.rota]}
                    {/* Entre 640 px e 1280 px a barra só tem ícones (o nome fica para o leitor de tela): não cabe tudo numa linha. */}
                    <span className="sm:max-xl:sr-only">{r.rotulo}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <SeloUsuario ativo={rota === 'perfil'} />
            <Nivel />
            <BotaoTema />
          </div>
        </div>
      </header>
      {rota === 'inicio' && <TelaInicio />}
      {rota === 'dados' && <TelaDados />}
      {rota === 'salas' && <TelaSalas />}
      {rota === 'amigos' && <TelaAmigos />}
      {rota === 'sala' && <TelaSala />}
      {rota === 'perfil' && <TelaPerfil />}
      {rota === 'entrar' && <TelaEntrar />}
    </ProvedorJornada>
    </ProvedorUsuario>
  )
}
