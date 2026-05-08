use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("At428xvcEnhjVXxensriSeXm7hQo6Kzx7KEgTcPW9o3y");

// ─── Constants ────────────────────────────────────────────────────────────────

pub const MAX_TITLE_LEN:     usize = 32;
pub const MAX_PLAYERS_LIMIT: u8    = 64;
pub const REFUND_TIMEOUT:    i64   = 259_200; // 3 days in seconds

// ─── Account space helpers ────────────────────────────────────────────────────

impl ArenaState {
    // 8 disc | 32 authority | 2 fee_bps | 1 bump | 8 total_tournaments | 8 total_volume
    pub const LEN: usize = 8 + 32 + 2 + 1 + 8 + 8;
}

impl Tournament {
    // 8  disc
    // 36 title (4-byte len prefix + 32 chars max)
    // 8  entry_fee u64
    // 1  max_players u8
    // 1  player_count u8
    // 8  prize_pool u64
    // 32 organizer Pubkey
    // 1  is_active bool
    // 33 proposed_winner Option<Pubkey> (1 tag + 32)
    // 8  created_at i64
    // 1  bump u8
    // 1  completed bool
    // 1  registration_closed bool
    pub const LEN: usize =
        8 + (4 + MAX_TITLE_LEN) + 8 + 1 + 1 + 8 + 32 + 1 + (1 + 32) + 8 + 1 + 1 + 1;
}

impl PlayerList {
    // 8 disc | 32 tournament | (4 + 32*n) Vec<Pubkey> | 1 bump
    pub fn space(max_players: usize) -> usize {
        8 + 32 + (4 + 32 * max_players) + 1
    }
}

impl OrgReputation {
    // 8 disc | 32 organizer | 8 tournaments_created | 8 tournaments_completed
    // | 8 reputation_score | 1 bump
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 1;
}

// ─── Program ──────────────────────────────────────────────────────────────────

#[program]
pub mod arena_war {
    use super::*;

    // ── initialize ─────────────────────────────────────────────────────────────
    /// Creates the global ArenaState PDA.
    /// `authority` — platform wallet that confirms prize distributions.
    /// `fee_bps`   — stored for future on-chain fee logic (informational in v1).
    pub fn initialize(
        ctx:       Context<Initialize>,
        authority: Pubkey,
        fee_bps:   u16,
    ) -> Result<()> {
        let arena               = &mut ctx.accounts.arena_state;
        arena.authority         = authority;
        arena.fee_bps           = fee_bps;
        arena.bump              = ctx.bumps.arena_state;
        arena.total_tournaments = 0;
        arena.total_volume      = 0;
        Ok(())
    }

    // ── create_tournament ──────────────────────────────────────────────────────
    /// Creates a Tournament PDA and its companion PlayerList PDA.
    /// The organizer pays a 0.009 SOL creation fee (anti-spam) to the platform
    /// authority. Players join by paying the entry_fee later.
    /// `created_at` is stamped with the current on-chain Clock timestamp.
    pub fn create_tournament(
        ctx:         Context<CreateTournament>,
        title:       String,
        entry_fee:   u64,
        max_players: u8,
    ) -> Result<()> {
        require!(
            title.len() >= 1 && title.len() <= MAX_TITLE_LEN,
            ArenaError::InvalidTitle
        );
        require!(entry_fee > 0, ArenaError::InvalidEntryFee);
        require!(max_players >= 2, ArenaError::InvalidMaxPlayers);
        require!(max_players <= MAX_PLAYERS_LIMIT, ArenaError::MaxPlayersExceeded);

        // Anti-spam creation fee: 0.009 SOL → platform authority
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.organizer.to_account_info(),
                    to:   ctx.accounts.platform_authority.to_account_info(),
                },
            ),
            9_000_000,
        )?;

        let clock = Clock::get()?;

        // ── Tournament ────────────────────────────────────────────────────────
        let t             = &mut ctx.accounts.tournament;
        t.title           = title;
        t.entry_fee       = entry_fee;
        t.max_players     = max_players;
        t.player_count    = 0;
        t.prize_pool      = 0;
        t.organizer       = ctx.accounts.organizer.key();
        t.is_active       = true;
        t.proposed_winner = None;
        t.created_at      = clock.unix_timestamp;
        t.bump                = ctx.bumps.tournament;
        t.completed           = false;
        t.registration_closed = false;

        // ── PlayerList ────────────────────────────────────────────────────────
        let pl        = &mut ctx.accounts.player_list;
        pl.tournament = ctx.accounts.tournament.key();
        pl.players    = vec![];
        pl.bump       = ctx.bumps.player_list;

        // ── OrgReputation: initialise fields only on first creation ───────────
        let rep = &mut ctx.accounts.org_reputation;
        if rep.organizer == Pubkey::default() {
            rep.organizer             = ctx.accounts.organizer.key();
            rep.bump                  = ctx.bumps.org_reputation;
            rep.tournaments_created   = 0;
            rep.tournaments_completed = 0;
            rep.reputation_score      = 0;
        }
        rep.tournaments_created = rep
            .tournaments_created
            .checked_add(1)
            .ok_or(ArenaError::ArithmeticOverflow)?;

        // ── Global stats ──────────────────────────────────────────────────────
        ctx.accounts.arena_state.total_tournaments = ctx
            .accounts
            .arena_state
            .total_tournaments
            .checked_add(1)
            .ok_or(ArenaError::ArithmeticOverflow)?;

        Ok(())
    }

    // ── join_tournament ────────────────────────────────────────────────────────
    /// Player pays `entry_fee` into the escrow and is appended to PlayerList.
    pub fn join_tournament(ctx: Context<JoinTournament>) -> Result<()> {
        require!(
            ctx.accounts.player.key() != ctx.accounts.tournament.organizer,
            ArenaError::OrganizerCannotJoin
        );
        require!(ctx.accounts.tournament.is_active, ArenaError::TournamentNotActive);
        require!(
            !ctx.accounts.tournament.registration_closed,
            ArenaError::RegistrationClosed
        );
        require!(
            ctx.accounts.tournament.player_count < ctx.accounts.tournament.max_players,
            ArenaError::TournamentFull
        );
        require!(
            !ctx.accounts.player_list.players.contains(&ctx.accounts.player.key()),
            ArenaError::AlreadyJoined
        );

        let entry_fee = ctx.accounts.tournament.entry_fee;

        // Player pays entry_fee → tournament PDA escrow
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to:   ctx.accounts.tournament.to_account_info(),
                },
            ),
            entry_fee,
        )?;

        // Checked arithmetic — prize_pool and total_volume could theoretically
        // approach u64::MAX with enough large-fee tournaments.
        ctx.accounts.tournament.prize_pool = ctx
            .accounts
            .tournament
            .prize_pool
            .checked_add(entry_fee)
            .ok_or(ArenaError::ArithmeticOverflow)?;

        ctx.accounts.tournament.player_count = ctx
            .accounts
            .tournament
            .player_count
            .checked_add(1)
            .ok_or(ArenaError::ArithmeticOverflow)?;

        ctx.accounts.player_list.players.push(ctx.accounts.player.key());

        ctx.accounts.arena_state.total_volume = ctx
            .accounts
            .arena_state
            .total_volume
            .checked_add(entry_fee)
            .ok_or(ArenaError::ArithmeticOverflow)?;

        Ok(())
    }

    // ── start_tournament_early ─────────────────────────────────────────────────
    /// Organizer closes registration before the tournament is full.
    /// Requires ≥ 2 players already joined.  After this, `join_tournament`
    /// will reject new entrants with `RegistrationClosed`.
    pub fn start_tournament_early(ctx: Context<StartTournamentEarly>) -> Result<()> {
        let t = &mut ctx.accounts.tournament;
        require!(t.is_active, ArenaError::TournamentNotActive);
        require!(!t.registration_closed, ArenaError::AlreadyClosed);
        require!(
            t.player_count < t.max_players,
            ArenaError::TournamentAlreadyFull
        );
        require!(t.player_count >= 2, ArenaError::NotEnoughPlayers);

        t.registration_closed = true;
        Ok(())
    }

    // ── declare_winner ─────────────────────────────────────────────────────────
    /// The organizer nominates a winner who must be in the PlayerList.
    /// Tournament must still be active.
    pub fn declare_winner(
        ctx:    Context<DeclareWinner>,
        winner: Pubkey,
    ) -> Result<()> {
        require!(ctx.accounts.tournament.is_active, ArenaError::TournamentNotActive);
        require!(
            ctx.accounts.player_list.players.contains(&winner),
            ArenaError::WinnerNotPlayer
        );

        ctx.accounts.tournament.proposed_winner = Some(winner);
        Ok(())
    }

    // ── distribute_prizes ──────────────────────────────────────────────────────
    /// The tournament organizer OR the platform authority can call this.
    /// Splits the escrow:
    ///   80 % → winner
    ///   15 % → organizer
    ///    5 % → platform_authority (arena_state.authority; absorbs rounding dust)
    pub fn distribute_prizes(ctx: Context<DistributePrizes>) -> Result<()> {
        require!(
            ctx.accounts.signer.key() == ctx.accounts.tournament.organizer
                || ctx.accounts.signer.key() == ctx.accounts.arena_state.authority,
            ArenaError::Unauthorized
        );
        require!(ctx.accounts.tournament.is_active, ArenaError::TournamentNotActive);

        let proposed = ctx
            .accounts
            .tournament
            .proposed_winner
            .ok_or(ArenaError::NoWinnerDeclared)?;
        require!(ctx.accounts.winner.key() == proposed, ArenaError::InvalidWinner);

        let prize_pool      = ctx.accounts.tournament.prize_pool;
        let winner_share    = prize_pool
            .checked_mul(80)
            .and_then(|v| v.checked_div(100))
            .ok_or(ArenaError::ArithmeticOverflow)?;
        let organizer_share = prize_pool
            .checked_mul(15)
            .and_then(|v| v.checked_div(100))
            .ok_or(ArenaError::ArithmeticOverflow)?;
        // Platform receives the remainder (~5 %) — absorbs any rounding dust.
        let platform_share = prize_pool
            .checked_sub(winner_share)
            .and_then(|v| v.checked_sub(organizer_share))
            .ok_or(ArenaError::ArithmeticOverflow)?;

        // ── Lamport transfers out of the escrow PDA ───────────────────────────
        // Explicit scoped borrows: each {} drops the RefMut before the next
        // borrow, which is required by Solana 2.x's stricter RefCell rules.
        {
            let tournament_info = ctx.accounts.tournament.to_account_info();
            let mut escrow  = tournament_info.try_borrow_mut_lamports()?;
            let mut dest    = ctx.accounts.winner.try_borrow_mut_lamports()?;
            **escrow  = escrow.checked_sub(winner_share).ok_or(ArenaError::ArithmeticOverflow)?;
            **dest    = dest.checked_add(winner_share).ok_or(ArenaError::ArithmeticOverflow)?;
        }
        {
            let tournament_info = ctx.accounts.tournament.to_account_info();
            let mut escrow  = tournament_info.try_borrow_mut_lamports()?;
            let mut dest    = ctx.accounts.organizer.try_borrow_mut_lamports()?;
            **escrow  = escrow.checked_sub(organizer_share).ok_or(ArenaError::ArithmeticOverflow)?;
            **dest    = dest.checked_add(organizer_share).ok_or(ArenaError::ArithmeticOverflow)?;
        }
        {
            let tournament_info  = ctx.accounts.tournament.to_account_info();
            let mut escrow       = tournament_info.try_borrow_mut_lamports()?;
            let platform_info    = ctx.accounts.platform_authority.to_account_info();
            let mut dest         = platform_info.try_borrow_mut_lamports()?;
            **escrow = escrow.checked_sub(platform_share).ok_or(ArenaError::ArithmeticOverflow)?;
            **dest   = dest.checked_add(platform_share).ok_or(ArenaError::ArithmeticOverflow)?;
        }

        // ── State updates ─────────────────────────────────────────────────────
        ctx.accounts.tournament.is_active = false;
        ctx.accounts.tournament.completed = true;

        ctx.accounts.org_reputation.tournaments_completed = ctx
            .accounts
            .org_reputation
            .tournaments_completed
            .checked_add(1)
            .ok_or(ArenaError::ArithmeticOverflow)?;
        ctx.accounts.org_reputation.reputation_score = ctx
            .accounts
            .org_reputation
            .reputation_score
            .checked_add(10)
            .ok_or(ArenaError::ArithmeticOverflow)?;

        Ok(())
    }

    // ── refund_players ─────────────────────────────────────────────────────────
    /// If REFUND_TIMEOUT seconds have passed since `created_at` and no winner
    /// was declared, anyone can call this instruction to refund every player.
    ///
    /// The caller must pass all player accounts as `remaining_accounts`, in the
    /// same order as `player_list.players`, each marked writable.
    pub fn refund_players(ctx: Context<RefundPlayers>) -> Result<()> {
        require!(ctx.accounts.tournament.is_active, ArenaError::TournamentNotActive);
        require!(
            ctx.accounts.tournament.proposed_winner.is_none(),
            ArenaError::WinnerAlreadyDeclared
        );

        let clock     = Clock::get()?;
        let elapsed   = clock
            .unix_timestamp
            .checked_sub(ctx.accounts.tournament.created_at)
            .unwrap_or(0);
        require!(elapsed > REFUND_TIMEOUT, ArenaError::RefundNotAvailableYet);

        let players   = ctx.accounts.player_list.players.clone();
        let entry_fee = ctx.accounts.tournament.entry_fee;

        require!(
            ctx.remaining_accounts.len() == players.len(),
            ArenaError::InvalidPlayerAccounts
        );

        for (i, account) in ctx.remaining_accounts.iter().enumerate() {
            require!(account.key() == players[i], ArenaError::InvalidPlayerAccounts);
            {
                let tournament_info = ctx.accounts.tournament.to_account_info();
                let mut escrow = tournament_info.try_borrow_mut_lamports()?;
                let mut dest   = account.try_borrow_mut_lamports()?;
                **escrow = escrow.checked_sub(entry_fee).ok_or(ArenaError::ArithmeticOverflow)?;
                **dest   = dest.checked_add(entry_fee).ok_or(ArenaError::ArithmeticOverflow)?;
            }
        }

        ctx.accounts.tournament.is_active = false;
        Ok(())
    }
}

// ─── Account contexts ─────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = ArenaState::LEN,
        seeds = [b"arena_state"],
        bump,
    )]
    pub arena_state: Account<'info, ArenaState>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// Only args used in constraints need to appear in #[instruction].
// In Anchor 0.30+, args must be listed in declaration order up to the last
// arg referenced by a constraint; unused trailing args can be omitted.
#[derive(Accounts)]
#[instruction(title: String, entry_fee: u64, max_players: u8)]
pub struct CreateTournament<'info> {
    #[account(
        mut,
        seeds = [b"arena_state"],
        bump  = arena_state.bump,
    )]
    pub arena_state: Account<'info, ArenaState>,

    #[account(
        init,
        payer = organizer,
        space = Tournament::LEN,
        seeds = [b"tournament", organizer.key().as_ref(), title.as_bytes()],
        bump,
    )]
    pub tournament: Account<'info, Tournament>,

    /// Space is pre-allocated for `max_players` pubkeys so `join_tournament`
    /// never needs a realloc.
    #[account(
        init,
        payer = organizer,
        space = PlayerList::space(max_players as usize),
        seeds = [b"player_list", tournament.key().as_ref()],
        bump,
    )]
    pub player_list: Account<'info, PlayerList>,

    /// Created on the organizer's first tournament; reused for subsequent ones.
    #[account(
        init_if_needed,
        payer = organizer,
        space = OrgReputation::LEN,
        seeds = [b"org_reputation", organizer.key().as_ref()],
        bump,
    )]
    pub org_reputation: Account<'info, OrgReputation>,

    #[account(mut)]
    pub organizer: Signer<'info>,

    /// CHECK: receives 0.009 SOL creation fee; key verified against arena_state.authority.
    #[account(mut, constraint = platform_authority.key() == arena_state.authority @ ArenaError::Unauthorized)]
    pub platform_authority: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinTournament<'info> {
    #[account(
        mut,
        seeds = [b"arena_state"],
        bump  = arena_state.bump,
    )]
    pub arena_state: Account<'info, ArenaState>,

    #[account(
        mut,
        seeds = [b"tournament", tournament.organizer.as_ref(), tournament.title.as_bytes()],
        bump  = tournament.bump,
    )]
    pub tournament: Account<'info, Tournament>,

    #[account(
        mut,
        seeds = [b"player_list", tournament.key().as_ref()],
        bump  = player_list.bump,
    )]
    pub player_list: Account<'info, PlayerList>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartTournamentEarly<'info> {
    #[account(
        mut,
        seeds   = [b"tournament", tournament.organizer.as_ref(), tournament.title.as_bytes()],
        bump    = tournament.bump,
        has_one = organizer,
    )]
    pub tournament: Account<'info, Tournament>,

    pub organizer: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeclareWinner<'info> {
    /// `has_one = organizer` enforces tournament.organizer == organizer.key().
    #[account(
        mut,
        seeds   = [b"tournament", tournament.organizer.as_ref(), tournament.title.as_bytes()],
        bump    = tournament.bump,
        has_one = organizer,
    )]
    pub tournament: Account<'info, Tournament>,

    #[account(
        seeds = [b"player_list", tournament.key().as_ref()],
        bump  = player_list.bump,
    )]
    pub player_list: Account<'info, PlayerList>,

    pub organizer: Signer<'info>,
}

#[derive(Accounts)]
pub struct DistributePrizes<'info> {
    #[account(
        seeds = [b"arena_state"],
        bump  = arena_state.bump,
    )]
    pub arena_state: Account<'info, ArenaState>,

    #[account(
        mut,
        seeds = [b"tournament", tournament.organizer.as_ref(), tournament.title.as_bytes()],
        bump  = tournament.bump,
    )]
    pub tournament: Account<'info, Tournament>,

    /// CHECK: receives winner_share lamports; key is verified against
    ///        tournament.proposed_winner inside the instruction body.
    #[account(mut)]
    pub winner: AccountInfo<'info>,

    /// CHECK: receives organizer_share lamports; address verified against
    ///        tournament.organizer via the `address` constraint.
    #[account(mut, address = tournament.organizer)]
    pub organizer: AccountInfo<'info>,

    /// Caller who triggers distribution — must be the tournament organizer
    /// OR the platform authority stored in ArenaState.
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK: always receives the platform fee (~5 %); verified against arena_state.authority.
    #[account(mut, address = arena_state.authority)]
    pub platform_authority: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"org_reputation", tournament.organizer.as_ref()],
        bump  = org_reputation.bump,
    )]
    pub org_reputation: Account<'info, OrgReputation>,
}

#[derive(Accounts)]
pub struct RefundPlayers<'info> {
    #[account(
        mut,
        seeds = [b"tournament", tournament.organizer.as_ref(), tournament.title.as_bytes()],
        bump  = tournament.bump,
    )]
    pub tournament: Account<'info, Tournament>,

    #[account(
        seeds = [b"player_list", tournament.key().as_ref()],
        bump  = player_list.bump,
    )]
    pub player_list: Account<'info, PlayerList>,
    // remaining_accounts: all player AccountInfos, writable, same order as
    // player_list.players. Anyone can pay the transaction fee.
}

// ─── Account structs ──────────────────────────────────────────────────────────

#[account]
pub struct ArenaState {
    /// Platform wallet that confirms prize distributions.
    pub authority:         Pubkey,
    /// Basis points — reserved for future on-chain fee computation.
    pub fee_bps:           u16,
    pub bump:              u8,
    pub total_tournaments: u64,
    pub total_volume:      u64,
}

#[account]
pub struct Tournament {
    pub title:           String,
    pub entry_fee:       u64,
    pub max_players:     u8,
    pub player_count:    u8,
    /// Running sum of all entry fees in the escrow (lamports).
    pub prize_pool:      u64,
    pub organizer:       Pubkey,
    pub is_active:           bool,
    /// Set by declare_winner; confirmed and paid out by distribute_prizes.
    pub proposed_winner:     Option<Pubkey>,
    /// Unix timestamp from Clock sysvar at tournament creation.
    pub created_at:          i64,
    pub bump:                u8,
    /// True once distribute_prizes succeeds.
    pub completed:           bool,
    /// True once organizer calls start_tournament_early (closes registration).
    pub registration_closed: bool,
}

#[account]
pub struct PlayerList {
    pub tournament: Pubkey,
    /// Ordered list of player pubkeys. Capacity pre-allocated for max_players.
    pub players:    Vec<Pubkey>,
    pub bump:       u8,
}

#[account]
pub struct OrgReputation {
    pub organizer:             Pubkey,
    pub tournaments_created:   u64,
    pub tournaments_completed: u64,
    /// +10 per successfully distributed tournament.
    pub reputation_score:      u64,
    pub bump:                  u8,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[error_code]
pub enum ArenaError {
    #[msg("Title must be between 1 and 32 characters")]
    InvalidTitle,
    #[msg("Entry fee must be greater than 0")]
    InvalidEntryFee,
    #[msg("Tournament requires at least 2 players")]
    InvalidMaxPlayers,
    #[msg("Max players cannot exceed 64")]
    MaxPlayersExceeded,
    #[msg("Tournament is not active")]
    TournamentNotActive,
    #[msg("Tournament is full")]
    TournamentFull,
    #[msg("Player has already joined this tournament")]
    AlreadyJoined,
    #[msg("Proposed winner is not a registered player in this tournament")]
    WinnerNotPlayer,
    #[msg("No winner has been declared yet")]
    NoWinnerDeclared,
    #[msg("Winner account does not match the proposed winner")]
    InvalidWinner,
    #[msg("A winner has already been declared for this tournament")]
    WinnerAlreadyDeclared,
    #[msg("Refund available only after 3 days with no declared winner")]
    RefundNotAvailableYet,
    #[msg("Provided player accounts do not match the stored player list")]
    InvalidPlayerAccounts,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Caller is not the organizer or platform authority")]
    Unauthorized,
    #[msg("Need at least 2 players to start tournament early")]
    NotEnoughPlayers,
    #[msg("Tournament registration is closed")]
    RegistrationClosed,
    #[msg("Tournament registration is already closed")]
    AlreadyClosed,
    #[msg("Tournament is already full; no need to start early")]
    TournamentAlreadyFull,
    #[msg("Organizer cannot join their own tournament")]
    OrganizerCannotJoin,
}
