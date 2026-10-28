// Chaves do localStorage ligadas à sala e à rede, num lugar só porque mais de uma tela mexe nelas.

export const CHAVE_SALA = 'rpg:sala'
export const CHAVE_LOG = 'rpg:sala:log'
export const CHAVE_JOGADORES = 'rpg:sala:jogadores'
export const CHAVE_NOTAS = 'rpg:sala:notas'
/** As outras salas deste navegador (a que está aberta fica nas chaves acima). */
export const CHAVE_ARQUIVO = 'rpg:salas:arquivo'
/** O mestre deixou a sala aberta no servidor. */
export const CHAVE_REDE_MESTRE = 'rpg:rede:mestre'
/** Como o mestre compartilha: pelo servidor Node ou por relays Nostr. */
// Chave nova (via): o padrão passou a ser relays, e o valor gravado antes (sempre "servidor") não deve valer.
export const CHAVE_REDE_MODO = 'rpg:rede:via'
/** Quem joga em rede: a sala em que entrou. */
export const CHAVE_CONEXAO = 'rpg:rede:jogador'
/** Hash do convite (#/entrar/…) guardado enquanto a pessoa cria o perfil; vazio = nenhum. */
export const CHAVE_CONVITE_PENDENTE = 'rpg:convite:pendente'
/** A última foto que o servidor mandou a quem joga: sala, log e jogadores. */
export const CHAVES_SALA_REMOTA = ['rpg:sala:remota', 'rpg:sala:log:remoto', 'rpg:sala:jogadores:remoto'] as const

export function apagarSalaRemota(): void {
  for (const chave of CHAVES_SALA_REMOTA) {
    try {
      localStorage.removeItem(chave)
    } catch {
      // sem armazenamento: nada a apagar
    }
  }
}
