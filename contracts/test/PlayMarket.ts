import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther, stringToHex } from "viem";

const NVDA = stringToHex("NVDA", { size: 32 });
const HOUR = 3600;
const WEEK = 7 * 24 * HOUR;
const WEEKLY_CHIPS = parseEther("0.1");

describe("PlayMarket", async function () {
  const { viem, networkHelpers } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [, alice, bob] = await viem.getWalletClients();

  async function deployMarket() {
    const feed = await viem.deployContract("MockAggregator", [
      "NVDA / USD (mock)",
      20000000000n, // $200.00, 8 decimals
    ]);
    const market = await viem.deployContract("PlayMarket");

    const now = await networkHelpers.time.latest();
    const locksAt = now + HOUR;
    const resolvesAt = locksAt + HOUR;

    await market.write.createMarket([NVDA, feed.address, locksAt, resolvesAt]);

    return { feed, market, locksAt, resolvesAt };
  }

  async function marketAs(address: `0x${string}`, wallet: typeof alice) {
    return viem.getContractAt("PlayMarket", address, {
      client: { wallet },
    });
  }

  it("gives WEEKLY_CHIPS on first claim", async function () {
    const { market } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);

    await asAlice.write.claimWeeklyChips();
    assert.equal(await market.read.chipBalance([alice.account.address]), WEEKLY_CHIPS);
  });

  it("rejects claiming twice in the same week", async function () {
    const { market } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);

    await asAlice.write.claimWeeklyChips();
    await viem.assertions.revertWith(asAlice.write.claimWeeklyChips(), "already claimed this week");
  });

  it("resets (not adds) balance on the next week's claim, win or loss", async function () {
    const { market } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);

    await asAlice.write.claimWeeklyChips();
    // Spend everything this week.
    // (no active market needed — just drain via a throwaway market below)
    const now = await networkHelpers.time.latest();
    const feed = await viem.deployContract("MockAggregator", ["NVDA / USD (mock)", 20000000000n]);
    await market.write.createMarket([NVDA, feed.address, now + HOUR, now + 2 * HOUR]);
    await asAlice.write.placeBet([1n, true, WEEKLY_CHIPS]);
    assert.equal(await market.read.chipBalance([alice.account.address]), 0n);

    await networkHelpers.time.increase(WEEK);
    await asAlice.write.claimWeeklyChips();
    assert.equal(await market.read.chipBalance([alice.account.address]), WEEKLY_CHIPS);
  });

  it("rejects betting more chips than the balance holds", async function () {
    const { market } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);

    await viem.assertions.revertWith(
      asAlice.write.placeBet([0n, true, WEEKLY_CHIPS]),
      "insufficient chips",
    );
  });

  it("rejects bets after locksAt", async function () {
    const { market, locksAt } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);
    await asAlice.write.claimWeeklyChips();

    await networkHelpers.time.increaseTo(locksAt + 1);

    await viem.assertions.revertWith(
      asAlice.write.placeBet([0n, true, WEEKLY_CHIPS]),
      "betting closed",
    );
  });

  it("rejects locking before locksAt", async function () {
    const { market } = await networkHelpers.loadFixture(deployMarket);
    await viem.assertions.revertWith(market.write.lockMarket([0n]), "too early to lock");
  });

  it("only the owner can create a market", async function () {
    const { feed, market } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);
    const now = await networkHelpers.time.latest();

    await viem.assertions.revertWith(
      asAlice.write.createMarket([NVDA, feed.address, now + HOUR, now + 2 * HOUR]),
      "not owner",
    );
  });

  it("pays winners their stake plus a share of the losing pool, credited back as chips", async function () {
    const { feed, market, locksAt, resolvesAt } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);
    const asBob = await marketAs(market.address, bob);
    await asAlice.write.claimWeeklyChips();
    await asBob.write.claimWeeklyChips();

    await asAlice.write.placeBet([0n, true, WEEKLY_CHIPS]); // Alice: UP, all-in
    await asBob.write.placeBet([0n, false, WEEKLY_CHIPS]); // Bob: DOWN, all-in

    await networkHelpers.time.increaseTo(locksAt);
    await feed.write.setAnswer([20000000000n]);
    await market.write.lockMarket([0n]);

    await networkHelpers.time.increaseTo(resolvesAt);
    await feed.write.setAnswer([22000000000n]); // price rose
    await viem.assertions.emitWithArgs(market.write.resolveMarket([0n]), market, "MarketResolved", [
      0n,
      1, // Outcome.Up
      20000000000n,
      22000000000n,
    ]);

    assert.equal(await market.read.claimableOf([0n, alice.account.address]), WEEKLY_CHIPS * 2n);
    assert.equal(await market.read.claimableOf([0n, bob.account.address]), 0n);

    await asAlice.write.claim([0n]);
    assert.equal(await market.read.chipBalance([alice.account.address]), WEEKLY_CHIPS * 2n);

    await viem.assertions.revertWith(asBob.write.claim([0n]), "nothing to claim");
  });

  it("refunds everyone on a Push (no price movement)", async function () {
    const { feed, market, locksAt, resolvesAt } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);
    const asBob = await marketAs(market.address, bob);
    await asAlice.write.claimWeeklyChips();
    await asBob.write.claimWeeklyChips();

    await asAlice.write.placeBet([0n, true, parseEther("0.04")]);
    await asBob.write.placeBet([0n, false, parseEther("0.06")]);

    await networkHelpers.time.increaseTo(locksAt);
    await feed.write.setAnswer([20000000000n]);
    await market.write.lockMarket([0n]);
    await networkHelpers.time.increaseTo(resolvesAt);
    await feed.write.setAnswer([20000000000n]); // same price -> Push
    await market.write.resolveMarket([0n]);

    assert.equal(await market.read.claimableOf([0n, alice.account.address]), parseEther("0.04"));
    assert.equal(await market.read.claimableOf([0n, bob.account.address]), parseEther("0.06"));
  });

  it("refunds both sides when the winning side has zero bettors", async function () {
    const { feed, market, locksAt, resolvesAt } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);
    await asAlice.write.claimWeeklyChips();

    await asAlice.write.placeBet([0n, true, WEEKLY_CHIPS]); // only UP bets exist

    await networkHelpers.time.increaseTo(locksAt);
    await feed.write.setAnswer([20000000000n]);
    await market.write.lockMarket([0n]);
    await networkHelpers.time.increaseTo(resolvesAt);
    await feed.write.setAnswer([18000000000n]); // price fell -> Down wins, but downPool is empty
    await market.write.resolveMarket([0n]);

    assert.equal(await market.read.claimableOf([0n, alice.account.address]), WEEKLY_CHIPS);
  });

  it("rejects a double claim", async function () {
    const { feed, market, locksAt, resolvesAt } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);
    await asAlice.write.claimWeeklyChips();

    await asAlice.write.placeBet([0n, true, WEEKLY_CHIPS]);
    await networkHelpers.time.increaseTo(locksAt);
    await feed.write.setAnswer([20000000000n]);
    await market.write.lockMarket([0n]);
    await networkHelpers.time.increaseTo(resolvesAt);
    await feed.write.setAnswer([20000000000n]);
    await market.write.resolveMarket([0n]); // Push, Alice gets a refund

    await asAlice.write.claim([0n]);
    await viem.assertions.revertWith(asAlice.write.claim([0n]), "already claimed");
  });

  it("rejects resolving on a stale price", async function () {
    const { feed, market, locksAt, resolvesAt } = await networkHelpers.loadFixture(deployMarket);

    await networkHelpers.time.increaseTo(locksAt);
    await feed.write.setAnswer([20000000000n]);
    await market.write.lockMarket([0n]);

    await networkHelpers.time.increaseTo(resolvesAt + 31 * 60);
    await viem.assertions.revertWith(market.write.resolveMarket([0n]), "stale price");
  });
});
