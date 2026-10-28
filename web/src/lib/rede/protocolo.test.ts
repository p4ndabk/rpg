import { generateSecretKey, getPublicKey } from 'nostr-tools'
import { describe, expect, it } from 'vitest'
import { PEDIDO_PADRAO, noMomento, rolar } from '../dados'
import { adicionarPeca, alternarOculta, criarSala, definirPvBase, disfarcarCenario, editarFicha, iniciarCombate, pintar, type Sala } from '../sala'
import { aplicarAcao, lerAcao, lerConexao, lerConvite, lerEstado, lerFoto, lerMensagemCliente, textoDaAcao, visaoPublica, type Estado } from './protocolo'

const chave = () => getPublicKey(generateSecretKey())
const MESTRE = chave()
const ANA = chave()
const BIA = chave()

const base = (): Estado => {
  let sala: Sala = criarSala('Cripta', 8, 8, 'sala-1234567', MESTRE)
  sala = adicionarPeca(sala, 'Goblin', 'monstro', 'g')
  sala = adicionarPeca(sala, 'Orc', 'monstro', 'o')
  return { sala, log: [], jogadores: [] }
}

describe('foto pública: cenário escondido', () => {
  it('não leva as casas de cenário escondidas, e leva as à vista', () => {
    const estado = base()
    estado.sala = pintar(pintar(estado.sala, [{ coluna: 5, linha: 5 }], 'armadilha', true), [{ coluna: 6, linha: 5 }], 'parede')
    const foto = visaoPublica(estado)
    expect(foto.sala.cenario).toEqual([{ coluna: 6, linha: 5, terreno: 'parede' }])
    expect(JSON.stringify(foto)).not.toContain('armadilha')
    // O mestre continua com tudo.
    expect(estado.sala.cenario).toHaveLength(2)
  })

  it('tudo escondido: a foto fica sem cenário', () => {
    const estado = base()
    estado.sala = pintar(estado.sala, [{ coluna: 5, linha: 5 }], 'buraco', true)
    expect(visaoPublica(estado).sala.cenario).toBeUndefined()
  })

  it('casa disfarçada vai na foto como o disfarce, sem revelar o terreno real', () => {
    const estado = base()
    estado.sala = disfarcarCenario(pintar(estado.sala, [{ coluna: 6, linha: 6 }], 'porta'), { coluna: 6, linha: 6 }, 'parede')
    const foto = visaoPublica(estado).sala.cenario!.find((c) => c.coluna === 6 && c.linha === 6)
    expect(foto).toEqual({ coluna: 6, linha: 6, terreno: 'parede' })
    expect(JSON.stringify(visaoPublica(estado))).not.toContain('porta')
  })
})

describe('classe na ficha', () => {
  it('quem joga muda a classe do próprio personagem pela ação "ficha"', () => {
    const dono = 'd'.repeat(64)
    let estado = base()
    estado.sala = adicionarPeca(estado.sala, 'Zé', 'personagem', 'z', undefined, undefined, dono)
    const acao = lerAcao(JSON.stringify({ v: 1, tipo: 'ficha', peca: 'z', descricao: '', cd: null, bonusIniciativa: 0, classe: 'Clérigo' }))
    expect(acao).toMatchObject({ tipo: 'ficha', classe: 'Clérigo' })
    estado = aplicarAcao(estado, acao!, dono)!
    expect(estado.sala.pecas.find((p) => p.id === 'z')?.classe).toBe('Clérigo')
    expect(visaoPublica(estado).sala.pecas.find((p) => p.id === 'z')?.classe).toBe('Clérigo')
    // Ação de antes, sem classe, continua valendo.
    expect(lerAcao(JSON.stringify({ v: 1, tipo: 'ficha', peca: 'z', descricao: '', cd: null, bonusIniciativa: 0 }))).not.toBeNull()
  })
})

describe('foto pública', () => {
  it('não leva peça escondida, vida de monstro, rolagem secreta nem notas', () => {
    const estado = base()
    estado.sala = alternarOculta(estado.sala, 'o')
    const secreta = noMomento(rolar(PEDIDO_PADRAO), { secreta: true })
    const aberta = rolar(PEDIDO_PADRAO)
    const foto = visaoPublica({ ...estado, log: [secreta, aberta] })
    expect(foto.sala.pecas.map((p) => p.id)).toEqual(['g'])
    expect(foto.sala.pecas[0]).toMatchObject({ pv: 1, pvMax: 1 })
    expect(foto.log).toEqual([aberta])
    expect(JSON.stringify(foto)).not.toContain('"id":"o"')
  })

  it('não leva a vida base dos monstros', () => {
    const estado = base()
    estado.sala = definirPvBase(estado.sala, { Goblin: 80 })
    expect(estado.sala.pvBase).toBeDefined()
    expect(visaoPublica(estado).sala.pvBase).toBeUndefined()
    // Procura o número 80 como valor (a pubkey aleatória do teste pode conter "80" por acaso).
    expect(JSON.stringify(visaoPublica(estado))).not.toMatch(/[:,[]80[,}\]]/)
    expect(JSON.stringify(visaoPublica(estado))).not.toContain('pvBase')
  })

  it('do monstro, a foto não leva descrição, CD nem bônus; do personagem leva', () => {
    const estado = base()
    estado.sala = adicionarPeca(estado.sala, 'Mago', 'personagem', 'm', undefined, undefined, ANA)
    estado.sala = editarFicha(estado.sala, 'g', { descricao: 'é um mímico disfarçado', cd: 15, bonusIniciativa: 2 })
    estado.sala = editarFicha(estado.sala, 'm', { descricao: 'Mago curioso', cd: 13, bonusIniciativa: 1 })
    const foto = visaoPublica(estado)
    expect(foto.sala.pecas.find((p) => p.id === 'g')).not.toHaveProperty('descricao')
    expect(foto.sala.pecas.find((p) => p.id === 'g')).not.toHaveProperty('cd')
    expect(foto.sala.pecas.find((p) => p.id === 'm')).toMatchObject({ descricao: 'Mago curioso', cd: 13 })
    expect(JSON.stringify(foto)).not.toContain('mímico')
  })

  it('combate: tira quem está escondido da ordem e aponta a vez para quem aparece', () => {
    const estado = base()
    estado.sala = iniciarCombate(estado.sala, () => 10).sala
    estado.sala = alternarOculta(estado.sala, estado.sala.combate!.ordem[0]!.id)
    const foto = visaoPublica(estado)
    expect(foto.sala.combate!.ordem).toHaveLength(1)
    expect(foto.sala.combate!.vez).toBe(0)
  })

  it('lê de volta o que foi publicado e recusa lixo', () => {
    const foto = visaoPublica(base())
    expect(lerFoto(JSON.stringify(foto))).toEqual(foto)
    expect(lerFoto('{')).toBeNull()
    expect(lerFoto(JSON.stringify({ ...foto, v: 2 }))).toBeNull()
  })
})

describe('ações de quem joga', () => {
  const entrou = (e: Estado, quem = ANA, nome = 'Ana') => aplicarAcao(e, { tipo: 'entrar', nome }, quem)!

  it('entrar registra a pessoa e atualiza o nome', () => {
    const e = entrou(entrou(base()), ANA, 'Ana Maria')
    expect(e.jogadores).toEqual([{ pubkey: ANA, nome: 'Ana Maria' }])
  })

  it('colocar cria só um personagem por pessoa, com ela de dona', () => {
    const com = aplicarAcao(entrou(base()), { tipo: 'colocar', nome: 'Mago' }, ANA)!
    expect(com.sala.pecas.at(-1)).toMatchObject({ nome: 'Mago', tipo: 'personagem', dono: ANA })
    expect(aplicarAcao(com, { tipo: 'colocar', nome: 'Outro' }, ANA)).toBeNull()
  })

  it('mover e remover só valem para a peça da própria pessoa', () => {
    const e = aplicarAcao(entrou(base()), { tipo: 'colocar', nome: 'Mago', casa: { coluna: 5, linha: 5 } }, ANA)!
    const id = e.sala.pecas.at(-1)!.id
    expect(aplicarAcao(e, { tipo: 'mover', peca: id, coluna: 6, linha: 6 }, ANA)!.sala.pecas.at(-1)).toMatchObject({ coluna: 6, linha: 6 })
    expect(aplicarAcao(e, { tipo: 'mover', peca: id, coluna: 6, linha: 6 }, BIA)).toBeNull()
    expect(aplicarAcao(e, { tipo: 'mover', peca: 'g', coluna: 7, linha: 7 }, ANA)).toBeNull()
    expect(aplicarAcao(e, { tipo: 'mover', peca: id, coluna: 0, linha: 0 }, ANA)).toBeNull() // casa ocupada pelo Goblin
    expect(aplicarAcao(e, { tipo: 'remover', peca: id }, BIA)).toBeNull()
    expect(aplicarAcao(e, { tipo: 'remover', peca: id }, ANA)!.sala.pecas.some((p) => p.id === id)).toBe(false)
  })

  it('passar a vez só vale para quem é dona ou dono da peça da vez', () => {
    let e = aplicarAcao(entrou(base()), { tipo: 'colocar', nome: 'Mago' }, ANA)!
    const mago = e.sala.pecas.at(-1)!
    e = { ...e, sala: { ...iniciarCombate(e.sala, (() => { let n = 0; return () => (n++ === 2 ? 20 : 1) })()).sala } }
    expect(e.sala.combate!.ordem[0]!.id).toBe(mago.id)
    expect(aplicarAcao(e, { tipo: 'passar' }, ANA)!.sala.combate!.vez).toBe(1)
    expect(aplicarAcao(e, { tipo: 'passar' }, BIA)).toBeNull()
  })

  it('ficha: só a dona ou o dono edita a ficha da própria peça', () => {
    const e = aplicarAcao(entrou(base()), { tipo: 'colocar', nome: 'Mago' }, ANA)!
    const id = e.sala.pecas.at(-1)!.id
    const acao = { tipo: 'ficha', peca: id, descricao: 'Mago curioso', cd: 13, bonusIniciativa: 2 } as const
    expect(aplicarAcao(e, acao, ANA)!.sala.pecas.at(-1)).toMatchObject({ descricao: 'Mago curioso', cd: 13, bonusIniciativa: 2 })
    expect(aplicarAcao(e, acao, BIA)).toBeNull()
    expect(aplicarAcao(e, { ...acao, peca: 'g' }, ANA)).toBeNull()
    expect(lerAcao(textoDaAcao(acao))).toEqual(acao)
    expect(lerAcao(JSON.stringify({ v: 1, tipo: 'ficha', peca: id, descricao: 5, cd: null, bonusIniciativa: 0 }))).toBeNull()
  })

  it('rolar entra no log com o nome da pessoa e nunca como secreta ou iniciativa', () => {
    const r = noMomento(rolar({ ...PEDIDO_PADRAO, rotulo: '' }), { secreta: true, iniciativa: true })
    const com = aplicarAcao(entrou(base()), { tipo: 'rolar', rolagem: r }, ANA)!
    expect(com.log[0]).toMatchObject({ rotulo: 'Ana' })
    expect(com.log[0]!.secreta).toBeUndefined()
    expect(com.log[0]!.iniciativa).toBeUndefined()
  })

  it('lê de volta a ação publicada e descarta o que não faz sentido', () => {
    const r = rolar(PEDIDO_PADRAO)
    for (const a of [{ tipo: 'entrar', nome: 'Ana' }, { tipo: 'mover', peca: 'x', coluna: 1, linha: 2 }, { tipo: 'passar' }, { tipo: 'rolar', rolagem: r }] as const) {
      expect(lerAcao(textoDaAcao(a))).toEqual(a)
    }
    expect(lerAcao('{"v":1,"tipo":"apagar-tudo"}')).toBeNull()
    expect(lerAcao('{"v":1,"tipo":"mover","peca":"x","coluna":"a","linha":2}')).toBeNull()
    expect(lerAcao('nada')).toBeNull()
  })
})

describe('convite e mensagens', () => {
  it('lê o id da sala, inclusive de um link inteiro', () => {
    expect(lerConvite('sala-1234567')).toBe('sala-1234567')
    expect(lerConvite('http://localhost:5173/#/entrar/sala-1234567')).toBe('sala-1234567')
    expect(lerConvite('oi')).toBeNull()
    expect(lerConvite('')).toBeNull()
    expect(lerConvite('sala 1234567')).toBeNull()
  })

  it('a conexão salva volta igual e recusa lixo', () => {
    expect(lerConexao({ salaId: 'sala-1234567' })).toEqual({ salaId: 'sala-1234567' })
    expect(lerConexao({ salaId: 'x' })).toBeNull()
    expect(lerConexao(null)).toBeNull()
  })

  it('lê o estado e as mensagens do navegador e recusa o que é inválido', () => {
    const estado = base()
    expect(lerEstado(JSON.parse(JSON.stringify(estado)))).toEqual(estado)
    expect(lerEstado({ sala: 1 })).toBeNull()
    const abrir = { t: 'abrir', sala: 'sala-1234567', pubkey: MESTRE, nome: 'Ana', estado, versao: 0 }
    expect(lerMensagemCliente(JSON.stringify(abrir))).toMatchObject({ t: 'abrir', pubkey: MESTRE, versao: 0 })
    expect(lerMensagemCliente(JSON.stringify({ ...abrir, pubkey: 'x' }))).toBeNull()
    expect(lerMensagemCliente(JSON.stringify({ t: 'entrar', sala: 'sala-1234567', pubkey: ANA, nome: 'Ana' }))).toMatchObject({ t: 'entrar' })
    expect(lerMensagemCliente(JSON.stringify({ t: 'acao', acao: { tipo: 'passar' } }))).toEqual({ t: 'acao', acao: { tipo: 'passar' } })
    expect(lerMensagemCliente(JSON.stringify({ t: 'acao', acao: { tipo: 'apagar' } }))).toBeNull()
    expect(lerMensagemCliente(JSON.stringify({ t: 'estado', base: 'x', estado }))).toBeNull()
    expect(lerMensagemCliente('lixo')).toBeNull()
    expect(lerMensagemCliente('{"t":"hack"}')).toBeNull()
  })
})
