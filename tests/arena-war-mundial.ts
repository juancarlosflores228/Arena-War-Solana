import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { startAnchor } from "solana-bankrun";
import { BankrunProvider } from "anchor-bankrun";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { assert } from "chai";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const IDL = require("../target/idl/arena_war_mundial.json");

const PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// ─── Helpers ────────────────────────────────────────────────────────────────
function partidoSeeds(id: BN) {
  return [Buffer.from("partido"), id.toArrayLike(Buffer, "le", 8)];
}
function vaultSeeds(id: BN) {
  return [Buffer.from("vault"), id.toArrayLike(Buffer, "le", 8)];
}
function apuestaSeeds(user: PublicKey, id: BN) {
  return [
    Buffer.from("apuesta"),
    user.toBuffer(),
    id.toArrayLike(Buffer, "le", 8),
  ];
}
function findPda(seeds: Buffer[], programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(seeds, programId)[0];
}

// Process a legacy transaction through bankrun's banksClient
async function sendTx(
  ctx: Awaited<ReturnType<typeof startAnchor>>,
  tx: Transaction,
  signers: Keypair[]
) {
  const blockhashResult = await ctx.banksClient.getLatestBlockhash();
  if (!blockhashResult) throw new Error("Could not get latest blockhash");
  tx.recentBlockhash = blockhashResult[0];
  tx.feePayer = signers[0].publicKey;
  tx.sign(...signers);
  await ctx.banksClient.processTransaction(tx);
}

// ─── Test suite ─────────────────────────────────────────────────────────────
describe("arena-war-mundial (bankrun)", () => {
  let context: Awaited<ReturnType<typeof startAnchor>>;
  let provider: BankrunProvider;
  let program: anchor.Program;

  let usdtMint: PublicKey;
  let adminTokenAccount: PublicKey;
  let userTokenAccount: PublicKey;

  const admin = Keypair.generate();
  const user  = Keypair.generate();

  const PARTIDO_ID  = new BN(1);
  const MONTO       = new BN(5_000_000); // 5 USDT
  const INICIO_UNIX = new BN(Math.floor(Date.now() / 1000) + 3600);

  let statePda: PublicKey;
  let partidoPoolPda: PublicKey;
  let vaultPda: PublicKey;
  let apuestaPda: PublicKey;

  // ── Setup ─────────────────────────────────────────────────────────────────
  before(async () => {
    context = await startAnchor(
      ".",
      [],
      [
        { address: admin.publicKey, info: { lamports: 100e9, data: Buffer.alloc(0), owner: SystemProgram.programId, executable: false } },
        { address: user.publicKey,  info: { lamports: 100e9, data: Buffer.alloc(0), owner: SystemProgram.programId, executable: false } },
      ]
    );

    provider = new BankrunProvider(context);
    anchor.setProvider(provider);
    program = new anchor.Program(IDL, provider);

    // Create mock USDT mint
    const mintKeypair = Keypair.generate();
    const mintRent = await provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
    await sendTx(context, new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: admin.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMint2Instruction(mintKeypair.publicKey, 6, admin.publicKey, null)
    ), [admin, mintKeypair]);
    usdtMint = mintKeypair.publicKey;

    // Create ATA for admin
    adminTokenAccount = getAssociatedTokenAddressSync(usdtMint, admin.publicKey);
    await sendTx(context, new Transaction().add(
      createAssociatedTokenAccountInstruction(admin.publicKey, adminTokenAccount, admin.publicKey, usdtMint)
    ), [admin]);

    // Create ATA for user
    userTokenAccount = getAssociatedTokenAddressSync(usdtMint, user.publicKey);
    await sendTx(context, new Transaction().add(
      createAssociatedTokenAccountInstruction(admin.publicKey, userTokenAccount, user.publicKey, usdtMint)
    ), [admin]);

    // Fund user with 100 USDT
    await sendTx(context, new Transaction().add(
      createMintToInstruction(usdtMint, userTokenAccount, admin.publicKey, 100_000_000)
    ), [admin]);

    // Derive PDAs
    statePda       = findPda([Buffer.from("state")], PROGRAM_ID);
    partidoPoolPda = findPda(partidoSeeds(PARTIDO_ID), PROGRAM_ID);
    vaultPda       = findPda(vaultSeeds(PARTIDO_ID), PROGRAM_ID);
    apuestaPda     = findPda(apuestaSeeds(user.publicKey, PARTIDO_ID), PROGRAM_ID);
  });

  // ── 1 ─────────────────────────────────────────────────────────────────────
  it("Inicializa el estado global", async () => {
    await (program.methods as any)
      .inicializar(admin.publicKey)
      .accounts({
        state: statePda,
        payer: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const state = await (program.account as any).arenaWarState.fetch(statePda);
    assert.ok(state.admin.equals(admin.publicKey));
    assert.equal(state.totalPartidos.toNumber(), 0);
  });

  // ── 2 ─────────────────────────────────────────────────────────────────────
  it("Crea un partido", async () => {
    await (program.methods as any)
      .crearPartido(PARTIDO_ID, INICIO_UNIX, "Mexico vs Argentina")
      .accounts({
        state: statePda,
        partidoPool: partidoPoolPda,
        vault: vaultPda,
        usdtMint,
        admin: admin.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([admin])
      .rpc();

    const pool  = await (program.account as any).partidoPool.fetch(partidoPoolPda);
    const state = await (program.account as any).arenaWarState.fetch(statePda);

    assert.equal(pool.descripcion, "Mexico vs Argentina");
    assert.deepEqual(pool.estado, { abierto: {} });
    assert.equal(pool.totalApostado.toNumber(), 0);
    assert.equal(state.totalPartidos.toNumber(), 1);
  });

  // ── 3 ─────────────────────────────────────────────────────────────────────
  it("Usuario apuesta a Local (5 USDT)", async () => {
    await (program.methods as any)
      .apostar(PARTIDO_ID, { local: {} }, MONTO)
      .accounts({
        partidoPool: partidoPoolPda,
        apuesta: apuestaPda,
        vault: vaultPda,
        userTokenAccount,
        usuario: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const pool    = await (program.account as any).partidoPool.fetch(partidoPoolPda);
    const apuesta = await (program.account as any).apuesta.fetch(apuestaPda);
    const vault   = await getAccount(provider.connection, vaultPda);

    assert.equal(pool.totalApostado.toNumber(), 5_000_000);
    assert.equal(pool.poolLocal.toNumber(), 5_000_000);
    assert.equal(apuesta.monto.toNumber(), 5_000_000);
    assert.deepEqual(apuesta.seleccion, { local: {} });
    assert.equal(apuesta.reclamado, false);
    assert.equal(vault.amount, BigInt(5_000_000));
  });

  // ── 4 ─────────────────────────────────────────────────────────────────────
  it("Rechaza apuesta con monto menor al minimo", async () => {
    const small = Keypair.generate();
    context.setAccount(small.publicKey, {
      lamports: 10e9,
      data: Buffer.alloc(0),
      owner: SystemProgram.programId,
      executable: false,
    });

    const smallAcc = getAssociatedTokenAddressSync(usdtMint, small.publicKey);
    await sendTx(context, new Transaction().add(
      createAssociatedTokenAccountInstruction(admin.publicKey, smallAcc, small.publicKey, usdtMint)
    ), [admin]);
    await sendTx(context, new Transaction().add(
      createMintToInstruction(usdtMint, smallAcc, admin.publicKey, 500_000)
    ), [admin]);

    const smallPda = findPda(apuestaSeeds(small.publicKey, PARTIDO_ID), PROGRAM_ID);

    try {
      await (program.methods as any)
        .apostar(PARTIDO_ID, { local: {} }, new BN(500_000))
        .accounts({
          partidoPool: partidoPoolPda,
          apuesta: smallPda,
          vault: vaultPda,
          userTokenAccount: smallAcc,
          usuario: small.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([small])
        .rpc();
      assert.fail("Debio rechazar monto insuficiente");
    } catch (e: any) {
      assert.include(e.message, "MontoInsuficiente");
    }
  });

  // ── 5 ─────────────────────────────────────────────────────────────────────
  it("Cierra apuestas (admin)", async () => {
    await (program.methods as any)
      .cerrarApuestas(PARTIDO_ID)
      .accounts({
        state: statePda,
        partidoPool: partidoPoolPda,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    const pool = await (program.account as any).partidoPool.fetch(partidoPoolPda);
    assert.deepEqual(pool.estado, { cerrado: {} });
  });

  // ── 6 ─────────────────────────────────────────────────────────────────────
  it("Rechaza apuesta cuando esta cerrado (usuario nuevo)", async () => {
    const late = Keypair.generate();
    context.setAccount(late.publicKey, {
      lamports: 10e9,
      data: Buffer.alloc(0),
      owner: SystemProgram.programId,
      executable: false,
    });

    const lateAcc = getAssociatedTokenAddressSync(usdtMint, late.publicKey);
    await sendTx(context, new Transaction().add(
      createAssociatedTokenAccountInstruction(admin.publicKey, lateAcc, late.publicKey, usdtMint)
    ), [admin]);
    await sendTx(context, new Transaction().add(
      createMintToInstruction(usdtMint, lateAcc, admin.publicKey, 10_000_000)
    ), [admin]);

    const latePda = findPda(apuestaSeeds(late.publicKey, PARTIDO_ID), PROGRAM_ID);

    try {
      await (program.methods as any)
        .apostar(PARTIDO_ID, { local: {} }, MONTO)
        .accounts({
          partidoPool: partidoPoolPda,
          apuesta: latePda,
          vault: vaultPda,
          userTokenAccount: lateAcc,
          usuario: late.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([late])
        .rpc();
      assert.fail("Debio rechazar apuesta cerrada");
    } catch (e: any) {
      assert.include(e.message, "ApuestasCerradas");
    }
  });

  // ── 7 ─────────────────────────────────────────────────────────────────────
  it("Declara resultado: Local gana", async () => {
    await (program.methods as any)
      .declararResultado(PARTIDO_ID, { local: {} })
      .accounts({
        state: statePda,
        partidoPool: partidoPoolPda,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    const pool = await (program.account as any).partidoPool.fetch(partidoPoolPda);
    assert.deepEqual(pool.estado, { finalizado: {} });
    assert.deepEqual(pool.resultado, { local: {} });
  });

  // ── 8 ─────────────────────────────────────────────────────────────────────
  it("Admin cobra fee (3%)", async () => {
    const vaultBefore = await getAccount(provider.connection, vaultPda);
    const adminBefore = await getAccount(provider.connection, adminTokenAccount);

    await (program.methods as any)
      .cobrarFee(PARTIDO_ID)
      .accounts({
        state: statePda,
        partidoPool: partidoPoolPda,
        vault: vaultPda,
        adminTokenAccount,
        admin: admin.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();

    const vaultAfter = await getAccount(provider.connection, vaultPda);
    const adminAfter = await getAccount(provider.connection, adminTokenAccount);

    // fee = 5_000_000 * 300 / 10_000 = 150_000
    assert.equal(adminAfter.amount - adminBefore.amount, BigInt(150_000));
    assert.equal(vaultBefore.amount - vaultAfter.amount, BigInt(150_000));
  });

  // ── 9 ─────────────────────────────────────────────────────────────────────
  it("Usuario ganador reclama ganancias (parimutuel)", async () => {
    const userBefore = await getAccount(provider.connection, userTokenAccount);

    await (program.methods as any)
      .reclamarGanancias(PARTIDO_ID)
      .accounts({
        partidoPool: partidoPoolPda,
        apuesta: apuestaPda,
        vault: vaultPda,
        userTokenAccount,
        usuario: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const userAfter = await getAccount(provider.connection, userTokenAccount);
    // neto = 5_000_000 - 150_000 = 4_850_000; user bet 100% of pool → receives all
    assert.equal(userAfter.amount - userBefore.amount, BigInt(4_850_000));

    const apuesta = await (program.account as any).apuesta.fetch(apuestaPda);
    assert.equal(apuesta.reclamado, true);
  });

  // ── 10 ────────────────────────────────────────────────────────────────────
  it("Rechaza doble reclamo", async () => {
    try {
      await (program.methods as any)
        .reclamarGanancias(PARTIDO_ID)
        .accounts({
          partidoPool: partidoPoolPda,
          apuesta: apuestaPda,
          vault: vaultPda,
          userTokenAccount,
          usuario: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();
      assert.fail("Debio rechazar doble reclamo");
    } catch (e: any) {
      assert.include(e.message, "YaReclamado");
    }
  });

  // ── Flujo cancelacion ──────────────────────────────────────────────────────
  describe("Cancelacion y devolucion", () => {
    const PARTIDO_ID_2 = new BN(2);
    let pool2Pda: PublicKey;
    let vault2Pda: PublicKey;
    let apuesta2Pda: PublicKey;
    const user3 = Keypair.generate();
    let user3TokenAcc: PublicKey;

    before(async () => {
      context.setAccount(user3.publicKey, {
        lamports: 10e9,
        data: Buffer.alloc(0),
        owner: SystemProgram.programId,
        executable: false,
      });

      user3TokenAcc = getAssociatedTokenAddressSync(usdtMint, user3.publicKey);
      await sendTx(context, new Transaction().add(
        createAssociatedTokenAccountInstruction(admin.publicKey, user3TokenAcc, user3.publicKey, usdtMint)
      ), [admin]);
      await sendTx(context, new Transaction().add(
        createMintToInstruction(usdtMint, user3TokenAcc, admin.publicKey, 20_000_000)
      ), [admin]);

      pool2Pda    = findPda(partidoSeeds(PARTIDO_ID_2), PROGRAM_ID);
      vault2Pda   = findPda(vaultSeeds(PARTIDO_ID_2), PROGRAM_ID);
      apuesta2Pda = findPda(apuestaSeeds(user3.publicKey, PARTIDO_ID_2), PROGRAM_ID);
    });

    it("Crea partido 2, apuesta y cancela", async () => {
      const inicio2 = new BN(Math.floor(Date.now() / 1000) + 7200);

      await (program.methods as any)
        .crearPartido(PARTIDO_ID_2, inicio2, "Brasil vs Francia")
        .accounts({
          state: statePda,
          partidoPool: pool2Pda,
          vault: vault2Pda,
          usdtMint,
          admin: admin.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([admin])
        .rpc();

      await (program.methods as any)
        .apostar(PARTIDO_ID_2, { visita: {} }, new BN(10_000_000))
        .accounts({
          partidoPool: pool2Pda,
          apuesta: apuesta2Pda,
          vault: vault2Pda,
          userTokenAccount: user3TokenAcc,
          usuario: user3.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user3])
        .rpc();

      await (program.methods as any)
        .cancelarPartido(PARTIDO_ID_2)
        .accounts({
          state: statePda,
          partidoPool: pool2Pda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      const pool = await (program.account as any).partidoPool.fetch(pool2Pda);
      assert.deepEqual(pool.estado, { cancelado: {} });
    });

    it("Usuario reclama devolucion por cancelacion", async () => {
      const before = await getAccount(provider.connection, user3TokenAcc);

      await (program.methods as any)
        .reclamarDevolucion(PARTIDO_ID_2)
        .accounts({
          partidoPool: pool2Pda,
          apuesta: apuesta2Pda,
          vault: vault2Pda,
          userTokenAccount: user3TokenAcc,
          usuario: user3.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user3])
        .rpc();

      const after = await getAccount(provider.connection, user3TokenAcc);
      assert.equal(after.amount - before.amount, BigInt(10_000_000));
    });
  });
});
