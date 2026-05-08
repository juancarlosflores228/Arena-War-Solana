use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("5xkEnY6QthFiXSpqCMwBFPVrZNguAWdbcMEJxNKZuZRZ");

pub const FEE_BPS: u64 = 300;
pub const BPS_DENOM: u64 = 10_000;
pub const MIN_APUESTA: u64 = 1_000_000; // 1 USDT (6 decimals)
pub const CIERRE_ANTICIPADO: i64 = 10 * 60; // 10 min antes del partido

#[program]
pub mod arena_war_mundial {
    use super::*;

    pub fn inicializar(ctx: Context<Inicializar>, admin: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.admin = admin;
        state.total_partidos = 0;
        state.bump = ctx.bumps.state;
        Ok(())
    }

    pub fn crear_partido(
        ctx: Context<CrearPartido>,
        partido_id: u64,
        inicio_unix: i64,
        descripcion: String,
    ) -> Result<()> {
        require!(descripcion.len() <= 64, ErrorCode::ResultadoInvalido);
        let pool = &mut ctx.accounts.partido_pool;
        pool.partido_id = partido_id;
        pool.inicio_unix = inicio_unix;
        pool.descripcion = descripcion;
        pool.pool_local = 0;
        pool.pool_empate = 0;
        pool.pool_visita = 0;
        pool.total_apostado = 0;
        pool.estado = EstadoPartido::Abierto;
        pool.resultado = Resultado::Pendiente;
        pool.fee_cobrado = false;
        pool.bump = ctx.bumps.partido_pool;
        pool.vault_bump = ctx.bumps.vault;

        let state = &mut ctx.accounts.state;
        state.total_partidos = state.total_partidos.checked_add(1).unwrap();
        Ok(())
    }

    pub fn apostar(
        ctx: Context<Apostar>,
        _partido_id: u64,
        seleccion: Resultado,
        monto: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.partido_pool;
        let clock = Clock::get()?;

        require!(pool.estado == EstadoPartido::Abierto, ErrorCode::ApuestasCerradas);
        require!(
            clock.unix_timestamp < pool.inicio_unix - CIERRE_ANTICIPADO,
            ErrorCode::ApuestasCerradas
        );
        require!(monto >= MIN_APUESTA, ErrorCode::MontoInsuficiente);
        require!(seleccion != Resultado::Pendiente, ErrorCode::ResultadoInvalido);

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.usuario.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, monto)?;

        match seleccion {
            Resultado::Local => pool.pool_local = pool.pool_local.checked_add(monto).unwrap(),
            Resultado::Empate => pool.pool_empate = pool.pool_empate.checked_add(monto).unwrap(),
            Resultado::Visita => pool.pool_visita = pool.pool_visita.checked_add(monto).unwrap(),
            Resultado::Pendiente => return err!(ErrorCode::ResultadoInvalido),
        }
        pool.total_apostado = pool.total_apostado.checked_add(monto).unwrap();

        let apuesta = &mut ctx.accounts.apuesta;
        apuesta.usuario = ctx.accounts.usuario.key();
        apuesta.partido_id = pool.partido_id;
        apuesta.seleccion = seleccion;
        apuesta.monto = monto;
        apuesta.reclamado = false;
        apuesta.bump = ctx.bumps.apuesta;

        Ok(())
    }

    pub fn cerrar_apuestas(ctx: Context<AdminPartido>, _partido_id: u64) -> Result<()> {
        let pool = &mut ctx.accounts.partido_pool;
        require!(pool.estado == EstadoPartido::Abierto, ErrorCode::ApuestasCerradas);
        pool.estado = EstadoPartido::Cerrado;
        Ok(())
    }

    pub fn declarar_resultado(
        ctx: Context<AdminPartido>,
        _partido_id: u64,
        resultado: Resultado,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.partido_pool;
        require!(pool.estado == EstadoPartido::Cerrado, ErrorCode::PartidoNoFinalizado);
        require!(resultado != Resultado::Pendiente, ErrorCode::ResultadoInvalido);
        pool.resultado = resultado;
        pool.estado = EstadoPartido::Finalizado;
        Ok(())
    }

    pub fn cobrar_fee(ctx: Context<CobrarFee>, partido_id: u64) -> Result<()> {
        let pool = &mut ctx.accounts.partido_pool;
        require!(pool.estado == EstadoPartido::Finalizado, ErrorCode::PartidoNoFinalizado);
        require!(!pool.fee_cobrado, ErrorCode::YaReclamado);

        let fee = pool
            .total_apostado
            .checked_mul(FEE_BPS)
            .unwrap()
            .checked_div(BPS_DENOM)
            .unwrap();

        let vault_bump = pool.vault_bump;
        let id_bytes = partido_id.to_le_bytes();
        let seeds: &[&[u8]] = &[b"vault", &id_bytes, &[vault_bump]];
        let signer = &[seeds];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.admin_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer,
        );
        token::transfer(cpi_ctx, fee)?;

        pool.fee_cobrado = true;
        Ok(())
    }

    pub fn reclamar_ganancias(ctx: Context<ReclamarGanancias>, partido_id: u64) -> Result<()> {
        let pool = &ctx.accounts.partido_pool;
        let apuesta = &mut ctx.accounts.apuesta;

        require!(pool.estado == EstadoPartido::Finalizado, ErrorCode::PartidoNoFinalizado);
        require!(pool.fee_cobrado, ErrorCode::PartidoNoFinalizado);
        require!(!apuesta.reclamado, ErrorCode::YaReclamado);
        require!(apuesta.seleccion == pool.resultado, ErrorCode::NoGanaste);

        let pool_ganador = match pool.resultado {
            Resultado::Local => pool.pool_local,
            Resultado::Empate => pool.pool_empate,
            Resultado::Visita => pool.pool_visita,
            Resultado::Pendiente => return err!(ErrorCode::ResultadoInvalido),
        };
        require!(pool_ganador > 0, ErrorCode::PoolVacio);

        let fee = pool
            .total_apostado
            .checked_mul(FEE_BPS)
            .unwrap()
            .checked_div(BPS_DENOM)
            .unwrap();
        let total_neto = pool.total_apostado.checked_sub(fee).unwrap();

        let ganancia = (apuesta.monto as u128)
            .checked_mul(total_neto as u128)
            .unwrap()
            .checked_div(pool_ganador as u128)
            .unwrap() as u64;

        let vault_bump = pool.vault_bump;
        let id_bytes = partido_id.to_le_bytes();
        let seeds: &[&[u8]] = &[b"vault", &id_bytes, &[vault_bump]];
        let signer = &[seeds];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer,
        );
        token::transfer(cpi_ctx, ganancia)?;

        apuesta.reclamado = true;
        Ok(())
    }

    pub fn reclamar_devolucion(ctx: Context<ReclamarDevolucion>, partido_id: u64) -> Result<()> {
        let pool = &ctx.accounts.partido_pool;
        let apuesta = &mut ctx.accounts.apuesta;

        require!(pool.estado == EstadoPartido::Cancelado, ErrorCode::PartidoCancelado);
        require!(!apuesta.reclamado, ErrorCode::YaReclamado);

        let vault_bump = pool.vault_bump;
        let id_bytes = partido_id.to_le_bytes();
        let seeds: &[&[u8]] = &[b"vault", &id_bytes, &[vault_bump]];
        let signer = &[seeds];

        let monto = apuesta.monto;
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer,
        );
        token::transfer(cpi_ctx, monto)?;

        apuesta.reclamado = true;
        Ok(())
    }

    pub fn cancelar_partido(ctx: Context<AdminPartido>, _partido_id: u64) -> Result<()> {
        let pool = &mut ctx.accounts.partido_pool;
        require!(
            pool.estado == EstadoPartido::Abierto || pool.estado == EstadoPartido::Cerrado,
            ErrorCode::PartidoNoFinalizado
        );
        pool.estado = EstadoPartido::Cancelado;
        Ok(())
    }
}

// ─── ACCOUNTS ───────────────────────────────

#[derive(Accounts)]
pub struct Inicializar<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + ArenaWarState::LEN,
        seeds = [b"state"],
        bump
    )]
    pub state: Account<'info, ArenaWarState>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(partido_id: u64)]
pub struct CrearPartido<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump, has_one = admin)]
    pub state: Account<'info, ArenaWarState>,

    #[account(
        init,
        payer = admin,
        space = 8 + PartidoPool::LEN,
        seeds = [b"partido", partido_id.to_le_bytes().as_ref()],
        bump
    )]
    pub partido_pool: Account<'info, PartidoPool>,

    #[account(
        init,
        payer = admin,
        token::mint = usdt_mint,
        token::authority = vault,
        seeds = [b"vault", partido_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    pub usdt_mint: Account<'info, anchor_spl::token::Mint>,

    #[account(mut)]
    pub admin: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(partido_id: u64)]
pub struct Apostar<'info> {
    #[account(
        mut,
        seeds = [b"partido", partido_id.to_le_bytes().as_ref()],
        bump = partido_pool.bump
    )]
    pub partido_pool: Account<'info, PartidoPool>,

    #[account(
        init,
        payer = usuario,
        space = 8 + Apuesta::LEN,
        seeds = [b"apuesta", usuario.key().as_ref(), partido_id.to_le_bytes().as_ref()],
        bump
    )]
    pub apuesta: Account<'info, Apuesta>,

    #[account(
        mut,
        seeds = [b"vault", partido_id.to_le_bytes().as_ref()],
        bump = partido_pool.vault_bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub usuario: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(partido_id: u64)]
pub struct AdminPartido<'info> {
    #[account(seeds = [b"state"], bump = state.bump, has_one = admin)]
    pub state: Account<'info, ArenaWarState>,

    #[account(
        mut,
        seeds = [b"partido", partido_id.to_le_bytes().as_ref()],
        bump = partido_pool.bump
    )]
    pub partido_pool: Account<'info, PartidoPool>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(partido_id: u64)]
pub struct CobrarFee<'info> {
    #[account(seeds = [b"state"], bump = state.bump, has_one = admin)]
    pub state: Account<'info, ArenaWarState>,

    #[account(
        mut,
        seeds = [b"partido", partido_id.to_le_bytes().as_ref()],
        bump = partido_pool.bump
    )]
    pub partido_pool: Account<'info, PartidoPool>,

    #[account(
        mut,
        seeds = [b"vault", partido_id.to_le_bytes().as_ref()],
        bump = partido_pool.vault_bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub admin_token_account: Account<'info, TokenAccount>,

    pub admin: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(partido_id: u64)]
pub struct ReclamarGanancias<'info> {
    #[account(
        seeds = [b"partido", partido_id.to_le_bytes().as_ref()],
        bump = partido_pool.bump
    )]
    pub partido_pool: Account<'info, PartidoPool>,

    #[account(
        mut,
        seeds = [b"apuesta", usuario.key().as_ref(), partido_id.to_le_bytes().as_ref()],
        bump = apuesta.bump,
        has_one = usuario
    )]
    pub apuesta: Account<'info, Apuesta>,

    #[account(
        mut,
        seeds = [b"vault", partido_id.to_le_bytes().as_ref()],
        bump = partido_pool.vault_bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub usuario: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(partido_id: u64)]
pub struct ReclamarDevolucion<'info> {
    #[account(
        seeds = [b"partido", partido_id.to_le_bytes().as_ref()],
        bump = partido_pool.bump
    )]
    pub partido_pool: Account<'info, PartidoPool>,

    #[account(
        mut,
        seeds = [b"apuesta", usuario.key().as_ref(), partido_id.to_le_bytes().as_ref()],
        bump = apuesta.bump,
        has_one = usuario
    )]
    pub apuesta: Account<'info, Apuesta>,

    #[account(
        mut,
        seeds = [b"vault", partido_id.to_le_bytes().as_ref()],
        bump = partido_pool.vault_bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub usuario: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// ─── STATE ACCOUNTS ─────────────────────────

#[account]
pub struct ArenaWarState {
    pub admin: Pubkey,
    pub total_partidos: u64,
    pub bump: u8,
}
impl ArenaWarState {
    pub const LEN: usize = 32 + 8 + 1;
}

#[account]
pub struct PartidoPool {
    pub partido_id: u64,
    pub inicio_unix: i64,
    pub descripcion: String,
    pub pool_local: u64,
    pub pool_empate: u64,
    pub pool_visita: u64,
    pub total_apostado: u64,
    pub estado: EstadoPartido,
    pub resultado: Resultado,
    pub fee_cobrado: bool,
    pub bump: u8,
    pub vault_bump: u8,
}
impl PartidoPool {
    pub const LEN: usize = 8 + 8 + (4 + 64) + 8 + 8 + 8 + 8 + 1 + 1 + 1 + 1 + 1;
}

#[account]
pub struct Apuesta {
    pub usuario: Pubkey,
    pub partido_id: u64,
    pub seleccion: Resultado,
    pub monto: u64,
    pub reclamado: bool,
    pub bump: u8,
}
impl Apuesta {
    pub const LEN: usize = 32 + 8 + 1 + 8 + 1 + 1;
}

// ─── ENUMS ──────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EstadoPartido {
    Abierto,
    Cerrado,
    Finalizado,
    Cancelado,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Resultado {
    Pendiente,
    Local,
    Empate,
    Visita,
}

// ─── ERRORS ─────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Las apuestas para este partido ya estan cerradas")]
    ApuestasCerradas,
    #[msg("El partido aun no ha finalizado")]
    PartidoNoFinalizado,
    #[msg("Ya reclamaste tu premio o devolucion")]
    YaReclamado,
    #[msg("No ganaste este partido")]
    NoGanaste,
    #[msg("Monto insuficiente, minimo 1 USDT")]
    MontoInsuficiente,
    #[msg("No eres el administrador")]
    NoEresAdmin,
    #[msg("Resultado invalido")]
    ResultadoInvalido,
    #[msg("Este partido fue cancelado, reclama devolucion")]
    PartidoCancelado,
    #[msg("El pool ganador esta vacio")]
    PoolVacio,
}
