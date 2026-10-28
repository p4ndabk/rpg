import { useState } from 'react'
import { usarArmazenado } from '../../lib/armazenamento'
import { adicionarAmigo, CHAVE_AMIGOS, ehAmigo, lerAmigos } from '../../lib/amigos'
import type { Jogador } from '../../lib/rede/protocolo'
import { ATALHOS, nomeCasa, type Peca } from '../../lib/sala'
import { linkPara } from '../../lib/rota'
import { npubCurta } from '../../lib/usuario'
import { Botao } from '../ui/Botao'

interface PainelMesaProps {
  /** Quem conduz a sala (chave pública), se já se sabe. */
  mestre?: string
  jogadores: Jogador[]
  /** As peças que esta pessoa vê: serve para mostrar o personagem de cada jogador. */
  pecas: Peca[]
  /** Quem está olhando. */
  eu: string
  /** Só o mestre coloca o personagem de outra pessoa no mapa. */
  mestreVendo?: boolean
  /** Casa escolhida no tabuleiro para a próxima peça, como "C4". */
  destino?: string | null
  /** Coloca o personagem do jogador no mapa; `classe` vazia usa o nome dele. */
  aoColocar?: (jogador: Jogador, classe: string) => void
  aoSelecionar?: (pecaId: string) => void
}

interface Linha {
  pubkey: string
  nome: string
  papel: 'Mestre' | 'Jogador'
  personagens: string[]
}

/** Quem está na mesa: o mestre e quem já entrou, com o personagem de cada um e o botão de adicionar aos amigos. */
export function PainelMesa({ mestre, jogadores, pecas, eu, mestreVendo = false, destino = null, aoColocar, aoSelecionar }: PainelMesaProps) {
  const [classe, setClasse] = useState('')
  const [amigos, setAmigos] = usarArmazenado(CHAVE_AMIGOS, [], lerAmigos)
  const naMesa = (pubkey: string) => pecas.filter((p) => p.dono === pubkey)
  const linhas: Linha[] = [
    ...(mestre ? [{ pubkey: mestre, nome: jogadores.find((j) => j.pubkey === mestre)?.nome ?? '', papel: 'Mestre' as const, personagens: [] }] : []),
    ...jogadores
      .filter((j) => j.pubkey !== mestre)
      .map((j) => ({ pubkey: j.pubkey, nome: j.nome, papel: 'Jogador' as const, personagens: pecas.filter((p) => p.dono === j.pubkey).map((p) => p.nome) })),
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-tinta-suave">
        Quem já entrou nesta sala. A lista mostra quem entrou, não quem está com a aba aberta agora.
      </p>
      <ul className="space-y-2">
        {linhas.map((l) => {
          const souEu = l.pubkey === eu
          const amigo = ehAmigo(amigos, l.pubkey)
          const nome = souEu ? 'Você' : l.nome || (l.papel === 'Mestre' ? 'Mestre da sala' : 'Sem nome')
          return (
            <li key={l.pubkey} className="space-y-1 rounded-cordel border-2 border-borda bg-superficie p-3 shadow-carimbo-pequeno">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-bold">{nome}</span>
                <span className="rounded-cordel border-2 border-borda bg-tinta px-1.5 text-xs font-bold tracking-wide text-fundo uppercase">{l.papel}</span>
                <span className="text-xs text-tinta-suave">{npubCurta(l.pubkey)}</span>
              </div>
              {l.papel === 'Jogador' && (
                <p className="text-sm text-tinta-suave">
                  {l.personagens.length > 0
                    ? `No mapa: ${naMesa(l.pubkey).map((p) => `${p.nome} em ${nomeCasa(p.coluna, p.linha)}`).join(', ')}`
                    : 'Ainda fora do mapa'}
                </p>
              )}
              {mestreVendo && l.papel === 'Jogador' && aoColocar && l.personagens.length === 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor={`classe-${l.pubkey}`} className="sr-only">
                    Classe de {l.nome}
                  </label>
                  <select
                    id={`classe-${l.pubkey}`}
                    value={classe}
                    onChange={(e) => setClasse(e.target.value)}
                    className="min-h-11 rounded-cordel border-2 border-borda bg-superficie px-2 text-sm font-bold text-tinta"
                  >
                    <option value="">Com o nome dele</option>
                    {ATALHOS.personagem.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <Botao variante="principal" tamanho="pequeno" onClick={() => aoColocar(jogadores.find((j) => j.pubkey === l.pubkey)!, classe)}>
                    Colocar {destino ? `em ${destino}` : 'no mapa'}
                  </Botao>
                </div>
              )}
              {mestreVendo && aoSelecionar && naMesa(l.pubkey)[0] && (
                <Botao tamanho="pequeno" onClick={() => aoSelecionar(naMesa(l.pubkey)[0]!.id)}>
                  Selecionar no mapa
                </Botao>
              )}
              {!souEu &&
                (amigo ? (
                  <p className="text-sm font-bold text-verde">Já é seu amigo</p>
                ) : (
                  <Botao tamanho="pequeno" onClick={() => setAmigos(adicionarAmigo(amigos, l.pubkey, l.nome, Date.now()))}>
                    Adicionar aos amigos
                  </Botao>
                ))}
            </li>
          )
        })}
      </ul>
      {mestreVendo && jogadores.some((j) => naMesa(j.pubkey).length === 0) && (
        <p className="text-sm text-tinta-suave">{destino ? `A peça entra em ${destino}.` : 'Para escolher o lugar, toque antes numa casa vazia do tabuleiro.'}</p>
      )}
      {jogadores.length === 0 && <p className="text-sm text-tinta-suave">Ninguém entrou ainda além do mestre. Em Compartilhar, copie o convite e mande para quem vai jogar.</p>}
      <a href={linkPara('amigos')} className="inline-block font-bold underline hover:text-vermelho">
        Ver minha lista de amigos
      </a>
    </div>
  )
}
