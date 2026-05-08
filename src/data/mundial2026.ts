export interface MatchData {
  id: number
  local: string
  visita: string
  fecha: string
  estadio: string
  grupo: string
}

export interface EliminatoriaMatch {
  id: number
  desc: string
  fecha: string
  estadio: string
}

export interface PoolConfig {
  threshold: number
  fee: number
}

export const GRUPOS: Record<string, MatchData[]> = {
  A: [
    { id: 1,  local: 'México',        visita: 'Sudáfrica',    fecha: '2026-06-11T19:00:00Z', estadio: 'Ciudad de México', grupo: 'A' },
    { id: 2,  local: 'Corea del Sur', visita: 'Chequia',      fecha: '2026-06-12T02:00:00Z', estadio: 'Guadalajara',      grupo: 'A' },
    { id: 25, local: 'Chequia',       visita: 'Sudáfrica',    fecha: '2026-06-18T16:00:00Z', estadio: 'Atlanta',          grupo: 'A' },
    { id: 28, local: 'México',        visita: 'Corea del Sur',fecha: '2026-06-19T01:00:00Z', estadio: 'Guadalajara',      grupo: 'A' },
    { id: 53, local: 'Chequia',       visita: 'México',       fecha: '2026-06-25T01:00:00Z', estadio: 'Ciudad de México', grupo: 'A' },
    { id: 54, local: 'Sudáfrica',     visita: 'Corea del Sur',fecha: '2026-06-25T01:00:00Z', estadio: 'Monterrey',        grupo: 'A' },
  ],
  B: [
    { id: 3,  local: 'Canadá',        visita: 'Bosnia & Herz.',fecha: '2026-06-12T19:00:00Z', estadio: 'Toronto',       grupo: 'B' },
    { id: 8,  local: 'Catar',         visita: 'Suiza',         fecha: '2026-06-13T19:00:00Z', estadio: 'San Francisco', grupo: 'B' },
    { id: 26, local: 'Suiza',         visita: 'Bosnia & Herz.',fecha: '2026-06-18T19:00:00Z', estadio: 'Los Angeles',   grupo: 'B' },
    { id: 27, local: 'Canadá',        visita: 'Catar',         fecha: '2026-06-18T22:00:00Z', estadio: 'Vancouver',     grupo: 'B' },
    { id: 51, local: 'Suiza',         visita: 'Canadá',        fecha: '2026-06-24T19:00:00Z', estadio: 'Vancouver',     grupo: 'B' },
    { id: 52, local: 'Bosnia & Herz.',visita: 'Catar',         fecha: '2026-06-24T19:00:00Z', estadio: 'Seattle',       grupo: 'B' },
  ],
  C: [
    { id: 7,  local: 'Brasil',  visita: 'Marruecos', fecha: '2026-06-13T22:00:00Z', estadio: 'Nueva York/NJ', grupo: 'C' },
    { id: 5,  local: 'Haití',   visita: 'Escocia',   fecha: '2026-06-14T01:00:00Z', estadio: 'Boston',        grupo: 'C' },
    { id: 30, local: 'Escocia', visita: 'Marruecos', fecha: '2026-06-19T22:00:00Z', estadio: 'Boston',        grupo: 'C' },
    { id: 29, local: 'Brasil',  visita: 'Haití',     fecha: '2026-06-20T01:00:00Z', estadio: 'Filadelfia',    grupo: 'C' },
    { id: 49, local: 'Escocia', visita: 'Brasil',    fecha: '2026-06-24T22:00:00Z', estadio: 'Miami',         grupo: 'C' },
    { id: 50, local: 'Marruecos',visita: 'Haití',    fecha: '2026-06-24T22:00:00Z', estadio: 'Atlanta',       grupo: 'C' },
  ],
  D: [
    { id: 4,  local: 'Estados Unidos', visita: 'Paraguay',  fecha: '2026-06-13T01:00:00Z', estadio: 'Los Angeles',   grupo: 'D' },
    { id: 6,  local: 'Australia',      visita: 'Turquía',   fecha: '2026-06-14T04:00:00Z', estadio: 'Vancouver',     grupo: 'D' },
    { id: 32, local: 'Estados Unidos', visita: 'Australia', fecha: '2026-06-19T19:00:00Z', estadio: 'Seattle',       grupo: 'D' },
    { id: 31, local: 'Turquía',        visita: 'Paraguay',  fecha: '2026-06-20T04:00:00Z', estadio: 'San Francisco', grupo: 'D' },
    { id: 59, local: 'Turquía',        visita: 'Estados Unidos', fecha: '2026-06-26T02:00:00Z', estadio: 'Los Angeles',   grupo: 'D' },
    { id: 60, local: 'Paraguay',       visita: 'Australia', fecha: '2026-06-26T02:00:00Z', estadio: 'San Francisco', grupo: 'D' },
  ],
  E: [
    { id: 10, local: 'Alemania',         visita: 'Curazao',          fecha: '2026-06-14T17:00:00Z', estadio: 'Houston',     grupo: 'E' },
    { id: 9,  local: 'Costa de Marfil',  visita: 'Ecuador',          fecha: '2026-06-14T23:00:00Z', estadio: 'Filadelfia',  grupo: 'E' },
    { id: 33, local: 'Alemania',         visita: 'Costa de Marfil',  fecha: '2026-06-20T20:00:00Z', estadio: 'Toronto',     grupo: 'E' },
    { id: 34, local: 'Ecuador',          visita: 'Curazao',          fecha: '2026-06-21T00:00:00Z', estadio: 'Kansas City', grupo: 'E' },
    { id: 56, local: 'Ecuador',          visita: 'Alemania',         fecha: '2026-06-25T22:00:00Z', estadio: 'Nueva York/NJ', grupo: 'E' },
    { id: 55, local: 'Curazao',          visita: 'Costa de Marfil',  fecha: '2026-06-25T22:00:00Z', estadio: 'Filadelfia',  grupo: 'E' },
  ],
  F: [
    { id: 11, local: 'Países Bajos', visita: 'Japón',  fecha: '2026-06-14T20:00:00Z', estadio: 'Dallas',     grupo: 'F' },
    { id: 12, local: 'Suecia',       visita: 'Túnez',  fecha: '2026-06-15T02:00:00Z', estadio: 'Monterrey',  grupo: 'F' },
    { id: 35, local: 'Países Bajos', visita: 'Suecia', fecha: '2026-06-20T17:00:00Z', estadio: 'Houston',    grupo: 'F' },
    { id: 36, local: 'Túnez',        visita: 'Japón',  fecha: '2026-06-21T04:00:00Z', estadio: 'Monterrey',  grupo: 'F' },
    { id: 58, local: 'Túnez',        visita: 'Países Bajos', fecha: '2026-06-25T23:00:00Z', estadio: 'Kansas City', grupo: 'F' },
    { id: 57, local: 'Japón',        visita: 'Suecia', fecha: '2026-06-25T23:00:00Z', estadio: 'Dallas',     grupo: 'F' },
  ],
  G: [
    { id: 16, local: 'Bélgica',      visita: 'Egipto',        fecha: '2026-06-15T19:00:00Z', estadio: 'Seattle',     grupo: 'G' },
    { id: 15, local: 'Irán',         visita: 'Nueva Zelanda', fecha: '2026-06-16T01:00:00Z', estadio: 'Los Angeles', grupo: 'G' },
    { id: 39, local: 'Bélgica',      visita: 'Irán',          fecha: '2026-06-21T19:00:00Z', estadio: 'Los Angeles', grupo: 'G' },
    { id: 40, local: 'Nueva Zelanda',visita: 'Egipto',        fecha: '2026-06-22T01:00:00Z', estadio: 'Vancouver',   grupo: 'G' },
    { id: 64, local: 'Nueva Zelanda',visita: 'Bélgica',       fecha: '2026-06-27T03:00:00Z', estadio: 'Vancouver',   grupo: 'G' },
    { id: 63, local: 'Egipto',       visita: 'Irán',          fecha: '2026-06-27T03:00:00Z', estadio: 'Seattle',     grupo: 'G' },
  ],
  H: [
    { id: 14, local: 'España',        visita: 'Cabo Verde',    fecha: '2026-06-15T16:00:00Z', estadio: 'Atlanta', grupo: 'H' },
    { id: 13, local: 'Arabia Saudita',visita: 'Uruguay',       fecha: '2026-06-15T22:00:00Z', estadio: 'Miami',   grupo: 'H' },
    { id: 38, local: 'España',        visita: 'Arabia Saudita',fecha: '2026-06-21T16:00:00Z', estadio: 'Atlanta', grupo: 'H' },
    { id: 37, local: 'Uruguay',       visita: 'Cabo Verde',    fecha: '2026-06-21T22:00:00Z', estadio: 'Miami',   grupo: 'H' },
    { id: 66, local: 'Uruguay',       visita: 'España',        fecha: '2026-06-27T00:00:00Z', estadio: 'Guadalajara', grupo: 'H' },
    { id: 65, local: 'Cabo Verde',    visita: 'Arabia Saudita',fecha: '2026-06-27T00:00:00Z', estadio: 'Houston', grupo: 'H' },
  ],
  I: [
    { id: 17, local: 'Francia', visita: 'Senegal', fecha: '2026-06-16T19:00:00Z', estadio: 'Nueva York/NJ', grupo: 'I' },
    { id: 18, local: 'Irak',    visita: 'Noruega', fecha: '2026-06-16T22:00:00Z', estadio: 'Boston',        grupo: 'I' },
    { id: 42, local: 'Francia', visita: 'Irak',    fecha: '2026-06-22T21:00:00Z', estadio: 'Filadelfia',    grupo: 'I' },
    { id: 41, local: 'Noruega', visita: 'Senegal', fecha: '2026-06-23T00:00:00Z', estadio: 'Nueva York/NJ', grupo: 'I' },
    { id: 61, local: 'Noruega', visita: 'Francia', fecha: '2026-06-26T19:00:00Z', estadio: 'Boston',        grupo: 'I' },
    { id: 62, local: 'Senegal', visita: 'Irak',    fecha: '2026-06-26T19:00:00Z', estadio: 'Toronto',       grupo: 'I' },
  ],
  J: [
    { id: 19, local: 'Argentina', visita: 'Argelia',  fecha: '2026-06-17T01:00:00Z', estadio: 'Kansas City',  grupo: 'J' },
    { id: 20, local: 'Austria',   visita: 'Jordania', fecha: '2026-06-17T04:00:00Z', estadio: 'San Francisco',grupo: 'J' },
    { id: 43, local: 'Argentina', visita: 'Austria',  fecha: '2026-06-22T17:00:00Z', estadio: 'Dallas',       grupo: 'J' },
    { id: 44, local: 'Jordania',  visita: 'Argelia',  fecha: '2026-06-23T03:00:00Z', estadio: 'San Francisco',grupo: 'J' },
    { id: 70, local: 'Jordania',  visita: 'Argentina',fecha: '2026-06-28T02:00:00Z', estadio: 'Dallas',       grupo: 'J' },
    { id: 69, local: 'Argelia',   visita: 'Austria',  fecha: '2026-06-28T02:00:00Z', estadio: 'Kansas City',  grupo: 'J' },
  ],
  K: [
    { id: 23, local: 'Portugal',   visita: 'RD Congo',   fecha: '2026-06-17T17:00:00Z', estadio: 'Houston',         grupo: 'K' },
    { id: 24, local: 'Uzbekistán', visita: 'Colombia',   fecha: '2026-06-18T02:00:00Z', estadio: 'Ciudad de México', grupo: 'K' },
    { id: 47, local: 'Portugal',   visita: 'Uzbekistán', fecha: '2026-06-23T17:00:00Z', estadio: 'Houston',         grupo: 'K' },
    { id: 48, local: 'Colombia',   visita: 'RD Congo',   fecha: '2026-06-24T02:00:00Z', estadio: 'Guadalajara',     grupo: 'K' },
    { id: 71, local: 'Colombia',   visita: 'Portugal',   fecha: '2026-06-27T23:30:00Z', estadio: 'Miami',           grupo: 'K' },
    { id: 72, local: 'RD Congo',   visita: 'Uzbekistán', fecha: '2026-06-27T23:30:00Z', estadio: 'Atlanta',         grupo: 'K' },
  ],
  L: [
    { id: 22, local: 'Inglaterra', visita: 'Croacia', fecha: '2026-06-17T20:00:00Z', estadio: 'Dallas',       grupo: 'L' },
    { id: 21, local: 'Ghana',      visita: 'Panamá',  fecha: '2026-06-17T23:00:00Z', estadio: 'Toronto',      grupo: 'L' },
    { id: 45, local: 'Inglaterra', visita: 'Ghana',   fecha: '2026-06-23T20:00:00Z', estadio: 'Boston',       grupo: 'L' },
    { id: 46, local: 'Panamá',     visita: 'Croacia', fecha: '2026-06-23T23:00:00Z', estadio: 'Toronto',      grupo: 'L' },
    { id: 67, local: 'Panamá',     visita: 'Inglaterra', fecha: '2026-06-27T21:00:00Z', estadio: 'Nueva York/NJ', grupo: 'L' },
    { id: 68, local: 'Croacia',    visita: 'Ghana',   fecha: '2026-06-27T21:00:00Z', estadio: 'Filadelfia',   grupo: 'L' },
  ],
}

export const FLAGS: Record<string, string> = {
  'México': '🇲🇽', 'Sudáfrica': '🇿🇦', 'Corea del Sur': '🇰🇷', 'Chequia': '🇨🇿',
  'Canadá': '🇨🇦', 'Bosnia & Herz.': '🇧🇦', 'Suiza': '🇨🇭', 'Catar': '🇶🇦',
  'Brasil': '🇧🇷', 'Marruecos': '🇲🇦', 'Haití': '🇭🇹', 'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Estados Unidos': '🇺🇸', 'Paraguay': '🇵🇾', 'Australia': '🇦🇺', 'Turquía': '🇹🇷',
  'Alemania': '🇩🇪', 'Curazao': '🇨🇼', 'Costa de Marfil': '🇨🇮', 'Ecuador': '🇪🇨',
  'Países Bajos': '🇳🇱', 'Japón': '🇯🇵', 'Suecia': '🇸🇪', 'Túnez': '🇹🇳',
  'España': '🇪🇸', 'Cabo Verde': '🇨🇻', 'Arabia Saudita': '🇸🇦', 'Uruguay': '🇺🇾',
  'Bélgica': '🇧🇪', 'Irán': '🇮🇷', 'Nueva Zelanda': '🇳🇿', 'Egipto': '🇪🇬',
  'Francia': '🇫🇷', 'Senegal': '🇸🇳', 'Irak': '🇮🇶', 'Noruega': '🇳🇴',
  'Argentina': '🇦🇷', 'Argelia': '🇩🇿', 'Austria': '🇦🇹', 'Jordania': '🇯🇴',
  'Portugal': '🇵🇹', 'RD Congo': '🇨🇩', 'Uzbekistán': '🇺🇿', 'Colombia': '🇨🇴',
  'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Ghana': '🇬🇭', 'Panamá': '🇵🇦', 'Croacia': '🇭🇷',
}

export const FASES_ELIMINATORIAS: Record<string, EliminatoriaMatch[]> = {
  dieciseisavos: [
    { id: 73, desc: '2A vs 2B',       fecha: '2026-06-28T19:00:00Z', estadio: 'Los Angeles' },
    { id: 74, desc: '1E vs 3ABCDF',   fecha: '2026-06-29T20:30:00Z', estadio: 'Boston' },
    { id: 75, desc: '1F vs 2C',       fecha: '2026-06-30T01:00:00Z', estadio: 'Monterrey' },
    { id: 76, desc: '1C vs 2F',       fecha: '2026-06-29T17:00:00Z', estadio: 'Houston' },
    { id: 77, desc: '1I vs 3CDFGH',   fecha: '2026-06-30T21:00:00Z', estadio: 'Nueva York/NJ' },
    { id: 78, desc: '2E vs 2I',       fecha: '2026-06-30T17:00:00Z', estadio: 'Dallas' },
    { id: 79, desc: '1A vs 3CEGHI',   fecha: '2026-07-01T01:00:00Z', estadio: 'Ciudad de México' },
    { id: 80, desc: '1L vs 3EHIJK',   fecha: '2026-07-01T16:00:00Z', estadio: 'Atlanta' },
    { id: 81, desc: '1D vs 3BEFIJ',   fecha: '2026-07-02T00:00:00Z', estadio: 'San Francisco' },
    { id: 82, desc: '1G vs 3AEHIJ',   fecha: '2026-07-01T20:00:00Z', estadio: 'Seattle' },
    { id: 83, desc: '2K vs 2L',       fecha: '2026-07-02T23:00:00Z', estadio: 'Toronto' },
    { id: 84, desc: '1H vs 2J',       fecha: '2026-07-02T19:00:00Z', estadio: 'Los Angeles' },
    { id: 85, desc: '1B vs 3EFGIJ',   fecha: '2026-07-03T01:00:00Z', estadio: 'Vancouver' },
    { id: 86, desc: '1J vs 2H',       fecha: '2026-07-03T22:00:00Z', estadio: 'Miami' },
    { id: 87, desc: '1K vs 3DEIJL',   fecha: '2026-07-04T01:30:00Z', estadio: 'Kansas City' },
    { id: 88, desc: '2D vs 2G',       fecha: '2026-07-03T18:00:00Z', estadio: 'Dallas' },
  ],
  octavos: [
    { id: 89, desc: 'G74 vs G77', fecha: '2026-07-04T21:00:00Z', estadio: 'Filadelfia' },
    { id: 90, desc: 'G73 vs G75', fecha: '2026-07-04T17:00:00Z', estadio: 'Houston' },
    { id: 91, desc: 'G76 vs G78', fecha: '2026-07-05T20:00:00Z', estadio: 'Nueva York/NJ' },
    { id: 92, desc: 'G79 vs G80', fecha: '2026-07-06T00:00:00Z', estadio: 'Ciudad de México' },
    { id: 93, desc: 'G83 vs G84', fecha: '2026-07-06T19:00:00Z', estadio: 'Dallas' },
    { id: 94, desc: 'G81 vs G82', fecha: '2026-07-07T00:00:00Z', estadio: 'Seattle' },
    { id: 95, desc: 'G86 vs G88', fecha: '2026-07-07T16:00:00Z', estadio: 'Atlanta' },
    { id: 96, desc: 'G85 vs G87', fecha: '2026-07-07T20:00:00Z', estadio: 'Vancouver' },
  ],
  cuartos: [
    { id: 97,  desc: 'G89 vs G90', fecha: '2026-07-09T20:00:00Z', estadio: 'Boston' },
    { id: 98,  desc: 'G93 vs G94', fecha: '2026-07-10T19:00:00Z', estadio: 'Los Angeles' },
    { id: 99,  desc: 'G91 vs G92', fecha: '2026-07-11T21:00:00Z', estadio: 'Miami' },
    { id: 100, desc: 'G95 vs G96', fecha: '2026-07-12T01:00:00Z', estadio: 'Kansas City' },
  ],
  semifinales: [
    { id: 101, desc: 'G97 vs G98',   fecha: '2026-07-14T19:00:00Z', estadio: 'Dallas' },
    { id: 102, desc: 'G99 vs G100',  fecha: '2026-07-15T19:00:00Z', estadio: 'Atlanta' },
  ],
  tercerLugar: [
    { id: 103, desc: 'Perdedor SF1 vs Perdedor SF2', fecha: '2026-07-18T21:00:00Z', estadio: 'Miami' },
  ],
  final: [
    { id: 104, desc: 'Campeón SF1 vs Campeón SF2', fecha: '2026-07-19T19:00:00Z', estadio: 'Nueva York/NJ' },
  ],
}

export const POOL_CONFIG: Record<string, PoolConfig> = {
  grupos:        { threshold: 500,  fee: 0.03 },
  dieciseisavos: { threshold: 1000, fee: 0.03 },
  octavos:       { threshold: 2000, fee: 0.03 },
  cuartos:       { threshold: 3000, fee: 0.03 },
  semifinales:   { threshold: 4000, fee: 0.03 },
  final:         { threshold: 5000, fee: 0.03 },
}

export type Pick = 'local' | 'empate' | 'visita'

export interface BetEntry {
  matchId: number
  pick: Pick
  amount: number
  matchLabel: string
  teamLabel: string
  fecha: string
  status: 'activa' | 'pendiente' | 'ganó' | 'perdió'
}

export interface PoolData {
  total: number
  local: number
  empate: number
  visita: number
}
