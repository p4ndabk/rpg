/** "agora", "há 5 min", "há 2 h", "há 3 dias": para saber há quanto tempo a sala mudou. */
export function tempoRelativo(quando: number, agora: number = Date.now()): string {
  if (!quando) return 'sem registro'
  const s = Math.max(0, Math.round((agora - quando) / 1000))
  if (s < 45) return 'agora'
  const min = Math.round(s / 60)
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const dias = Math.round(h / 24)
  return dias === 1 ? 'ontem' : `há ${dias} dias`
}
