import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { lerMesas, type Mesas } from '../../web/src/lib/rede/mesas'

// Onde as salas ficam guardadas. Hoje é um arquivo JSON; para trocar por SQLite depois, basta reescrever
// `carregar` e `salvar` (o resto do servidor só conhece estas duas funções).

export function carregar(arquivo: string): Mesas {
  try {
    if (!existsSync(arquivo)) return {}
    return lerMesas(JSON.parse(readFileSync(arquivo, 'utf8')))
  } catch (erro) {
    console.error(`Não consegui ler ${arquivo}; começando sem salas.`, erro)
    return {}
  }
}

/** Grava o arquivo inteiro de uma vez (escreve num temporário e troca, para nunca deixar o arquivo pela metade). */
export function salvar(arquivo: string, mesas: Mesas): void {
  mkdirSync(dirname(arquivo), { recursive: true })
  const temporario = `${arquivo}.tmp`
  writeFileSync(temporario, JSON.stringify(mesas, null, 2))
  renameSync(temporario, arquivo)
}
