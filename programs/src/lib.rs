use anchor_lang::prelude::*;

declare_id!("ARENAWAR111111111111111111111111111111111");

// Constantes principales del MVP
pub const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
pub const MIN_ENTRY_FEE_LAMPORTS: u64 = (LAMPORTS_PER_SOL / 20); // 0.05 SOL
pub const MAX_ENTRY_FEE_LAMPORTS: u64 = (LAMPORTS_PER_SOL / 5);  // 0.20 SOL

pub const MAX_PLAYERS: u8 = 20;
pub const PLATFORM_FEE_BPS: u16 = 100;   // 1%
pub const ORGANIZER_FEE_BPS: u16 = 1000; // 10%

#[program]
pub mod arena_war {
    use super::*;

    pub fn create_tournament(
        ctx: Context<CreateTournament>,
        entry_fee: u64,
        max_players: u8,
    ) -> Result<()> {
        // Validaciones de parámetros
        require!(
            entry_fee >= MIN_ENTRY_FEE_LAMPORTS,
            ArenaError::EntryFeeTooLow
        );
        require!(
            entry_fee <= MAX_ENTRY_FEE_LAMPORTS,
            ArenaError::EntryFeeTooHigh
        );
        require!(max_players <= MAX_PLAYERS, ArenaError::TooManyPlayers);

        let tournament = &mut ctx.accounts.tournament;
        let organizer_stats = &mut ctx.accounts.organizer_stats;
        let organizer = &ctx.accounts.organizer;
        let clock = Clock::get()?;

        tournament.creator = organizer.key();
        tournament.entry_fee = entry_fee;
        tournament.max_players = max_players;
        tournament.platform_fee_bps = PLATFORM_FEE_BPS;
        tournament.organizer_fee_bps = ORGANIZER_FEE_BPS;
        tournament.players = Vec::new();
        tournament.status = TournamentStatus::Open;
        tournament.prize_pool = 0;
        tournament.winners = [Pubkey::default(); 3];
        tournament.prizes_paid = false;
        tournament.created_at = clock.unix_timestamp;

        // Si es la primera vez, el organizer_stats se inicializa a 0 por Anchor
        organizer_stats.organizer = organizer.key();
        organizer_stats.tournaments_created = organizer_stats
            .tournaments_created
            .checked_add(1)
            .ok_or(ArenaError::MathOverflow)?;
        // los demás campos quedan en 0

        Ok(())
    }

    // Estas funciones quedan como stubs por ahora para que compile
    pub fn join_tournament(_ctx: Context<JoinTournament>) -> Result<()> {
        Ok(())
    }

    pub fn start_tournament(_ctx: Context<StartTournament>) -> Result<()> {
        Ok(())
    }

    pub fn set_results(_ctx: Context<SetResults>) -> Result<()> {
        Ok(())
    }

    pub fn distribute_prizes(_ctx: Context<DistributePrizes>) -> Result<()> {
        Ok(())
    }

    pub fn cancel_tournament(_ctx: Context<CancelTournament>) -> Result<()> {
        Ok(())
    }

    pub fn add_comment(_ctx: Context<AddComment>) -> Result<()> {
        Ok(())
    }
}

// ---------------
// Contextos
// ---------------

#[derive(Accounts)]
pub struct CreateTournament<'info> {
    #[account(
        init,
        payer = organizer,
        space = 8 + 811, // tamaño estimado de Tournament
        seeds = [b"tournament", organizer.key().as_ref(), created_at_seed().as_ref()],
        bump
    )]
    pub tournament: Account<'info, Tournament>,

    #[account(
        init_if_needed,
        payer = organizer,
        space = 8 + 56, // tamaño estimado de OrganizerStats
        seeds = [b"organizer_stats", organizer.key().as_ref()],
        bump
    )]
    pub organizer_stats: Account<'info, OrganizerStats>,

    #[account(mut)]
    pub organizer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// NOTA: truco para tener una semilla variable simple (puede mejorarse luego)
fn created_at_seed() -> [u8; 8] {
    // Por ahora un valor fijo para compilar; luego se puede cambiar por algo más elaborado.
    0u64.to_le_bytes()
}

#[derive(Accounts)]
pub struct JoinTournament<'info> {
    // TODO: Se implementará en Fase 2
}

#[derive(Accounts)]
pub struct StartTournament<'info> {
    // TODO
}

#[derive(Accounts)]
pub struct SetResults<'info> {
    // TODO
}

#[derive(Accounts)]
pub struct DistributePrizes<'info> {
    // TODO
}

#[derive(Accounts)]
pub struct CancelTournament<'info> {
    // TODO
}

#[derive(Accounts)]
pub struct AddComment<'info> {
    // TODO
}

// ---------------
// Cuentas
// ---------------

#[account]
pub struct Tournament {
    pub creator: Pubkey,
    pub entry_fee: u64,
    pub max_players: u8,
    pub platform_fee_bps: u16,
    pub organizer_fee_bps: u16,
    pub players: Vec<Pubkey>,
    pub status: TournamentStatus,
    pub prize_pool: u64,
    pub winners: [Pubkey; 3],
    pub prizes_paid: bool,
    pub created_at: i64,
}

#[account]
pub struct OrganizerStats {
    pub organizer: Pubkey,
    pub tournaments_created: u32,
    pub tournaments_finished: u32,
    pub prizes_paid: u32,
    pub tournaments_cancelled: u32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TournamentStatus {
    Open,
    Ongoing,
    Finished,
    Cancelled,
    PrizesPaid,
}

// ---------------
// Errores
// ---------------

#[error_code]
pub enum ArenaError {
    #[msg("Entry fee is below the minimum allowed.")]
    EntryFeeTooLow,
    #[msg("Entry fee is above the maximum allowed.")]
    EntryFeeTooHigh,
    #[msg("Max players exceeds the allowed limit.")]
    TooManyPlayers,
    #[msg("Math overflow.")]
    MathOverflow,
}
