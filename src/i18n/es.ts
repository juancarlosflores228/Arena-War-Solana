export interface Translations {
  nav: {
    arena:     string
    create:    string
    dashboard: string
    devnet:    string
    connect:   string
  }
  home: {
    badge:          string
    title1:         string
    title2:         string
    subtitle:       string
    statPrize:      string
    statOpen:       string
    statTotal:      string
    section:        string
    empty:          string
    filterAll:      string
    filterOpen:     string
    filterLive:     string
    filterFinished: string
  }
  card: {
    entry:          string
    prize:          string
    slots:          string
    players:        string
    org:            string
    join:           string
    full:           string
    ended:          string
    live:           string
    statusOpen:     string
    statusActive:   string
    statusFinished: string
  }
  create: {
    badge:        string
    title:        string
    subtitle:     string
    labelTitle:   string
    labelGame:    string
    labelFee:     string
    labelPlayers: string
    placeholder:  string
    prizeLabel:   string
    walletWarn:   string
    submit:       string
    submitting:   string
  }
  dashboard: {
    badge:          string
    title:          string
    statCreated:    string
    statJoined:     string
    statEarnings:   string
    statWinRate:    string
    sectionCreated: string
    sectionJoined:  string
    emptyCreated:   string
    emptyJoined:    string
    roleOrg:        string
    rolePlayer:     string
    entry:          string
    prize:          string
    locked: {
      title:    string
      subtitle: string
    }
  }
  footer: {
    network: string
  }
  toast: {
    connectFirst:  string
    joining:       string
    pending:       string
    walletReady:   string
    fillFields:    string
    feeError:      string
    playersError:  string
    creating:      string
    created:       string
    txFailed:      string
  }
}

const es: Translations = {
  nav: {
    arena:     'Arena',
    create:    'Crear',
    dashboard: 'Panel',
    devnet:    'DEVNET',
    connect:   'Conectar Wallet',
  },
  home: {
    badge:          '⚡ IMPULSADO POR SOLANA DEVNET',
    title1:         'ENTRA AL',
    title2:         'ARENA',
    subtitle:       'Compite en torneos on-chain. Paga con SOL. Ganas o pierdes — la blockchain nunca miente.',
    statPrize:      'POZO TOTAL DE PREMIOS',
    statOpen:       'ARENAS ABIERTAS',
    statTotal:      'ARENAS TOTALES',
    section:        'ARENAS ACTIVAS',
    empty:          'No se encontraron arenas para este filtro.',
    filterAll:      'TODOS',
    filterOpen:     'ABIERTO',
    filterLive:     'EN VIVO',
    filterFinished: 'FINALIZADOS',
  },
  card: {
    entry:          'ENTRADA',
    prize:          'PREMIO',
    slots:          'CUPOS',
    players:        'Jugadores',
    org:            'ORG',
    join:           'UNIRSE →',
    full:           'LLENO',
    ended:          'FINALIZADO',
    live:           'EN VIVO',
    statusOpen:     'ABIERTO',
    statusActive:   'EN VIVO',
    statusFinished: 'FINALIZADO',
  },
  create: {
    badge:        '▶ CREACIÓN DE TORNEO',
    title:        'FORJA TU ARENA',
    subtitle:     'Despliega un nuevo torneo en Solana Devnet. Se aplica comisión del 10%.',
    labelTitle:   'NOMBRE DE LA ARENA',
    labelGame:    'MODO DE JUEGO',
    labelFee:     'CUOTA DE ENTRADA (SOL)',
    labelPlayers: 'MÁX. JUGADORES',
    placeholder:  'COMBATE A MUERTE ALPHA',
    prizeLabel:   'POZO DE PREMIOS ESTIMADO',
    walletWarn:   'Conecta tu wallet Phantom para crear un torneo',
    submit:       'CREAR ARENA ◆',
    submitting:   'DESPLEGANDO EN SOLANA…',
  },
  dashboard: {
    badge:          '▶ CUARTEL GENERAL',
    title:          'PANEL',
    statCreated:    'CREADOS',
    statJoined:     'UNIDOS',
    statEarnings:   'GANANCIAS',
    statWinRate:    'TASA DE VICTORIA',
    sectionCreated: 'ARENAS CREADAS',
    sectionJoined:  'ARENAS UNIDAS',
    emptyCreated:   'Crea tu primera arena',
    emptyJoined:    'Explorar arenas abiertas',
    roleOrg:        'ORG',
    rolePlayer:     'JUGADOR',
    entry:          'ENTRADA',
    prize:          'PREMIO',
    locked: {
      title:    'BLOQUEADO',
      subtitle: 'Conecta tu wallet Phantom para acceder a tu panel',
    },
  },
  footer: {
    network: 'Solana Devnet',
  },
  toast: {
    connectFirst:  'Conecta tu wallet Phantom primero',
    joining:       'Uniéndose a',
    pending:       '— TX pendiente',
    walletReady:   'Wallet no lista',
    fillFields:    'Completa todos los campos requeridos',
    feeError:      'La cuota de entrada debe ser > 0',
    playersError:  'Se necesitan al menos 2 jugadores',
    creating:      'Creando arena en Solana…',
    created:       'Arena creada',
    txFailed:      'Transacción fallida',
  },
}

export default es
