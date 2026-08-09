import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther, stringToHex } from "viem";

const NVDA = stringToHex("NVDA", { size: 32 });
const HOUR = 3600;

describe("GapMarket", async function () {
  const { viem, networkHelpers } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [, alice, bob] = await viem.getWalletClients();

  async function deployMarket() {
    const feed = await viem.deployContract("MockAggregator", [
      "NVDA / USD (mock)",
      20000000000n, // $200.00, 8 decimals
    ]);
    const market = await viem.deployContract("GapMarket");

    const now = await networkHelpers.time.latest();
    const locksAt = now + HOUR;
    const resolvesAt = locksAt + HOUR;

    await market.write.createMarket([NVDA, feed.address, locksAt, resolvesAt]);

    return { feed, market, locksAt, resolvesAt };
  }

  async function marketAs(address: `0x${string}`, wallet: typeof alice) {
    return viem.getContractAt("GapMarket", address, {
      client: { wallet },
    });
  }

  it("rejects bets after locksAt", async function () {
    const { market, locksAt } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);

    await networkHelpers.time.increaseTo(locksAt + 1);

    await viem.assertions.revertWith(
      asAlice.write.placeBet([0n, true], { value: parseEther("1") }),
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

  it("pays winners their stake plus a share of the losing pool", async function () {
    const { feed, market, locksAt, resolvesAt } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);
    const asBob = await marketAs(market.address, bob);

    await asAlice.write.placeBet([0n, true], { value: parseEther("1") }); // Alice: UP
    await asBob.write.placeBet([0n, false], { value: parseEther("1") }); // Bob: DOWN

    await networkHelpers.time.increaseTo(locksAt);
    await feed.write.setAnswer([20000000000n]); // refresh freshness at lock time
    await market.write.lockMarket([0n]);

    await networkHelpers.time.increaseTo(resolvesAt);
    await feed.write.setAnswer([22000000000n]); // $220 — price rose
    await viem.assertions.emitWithArgs(market.write.resolveMarket([0n]), market, "MarketResolved", [
      0n,
      1, // Outcome.Up
      20000000000n,
      22000000000n,
    ]);

    assert.equal(await market.read.claimableOf([0n, alice.account.address]), parseEther("2"));
    assert.equal(await market.read.claimableOf([0n, bob.account.address]), 0n);

    await viem.assertions.balancesHaveChanged(asAlice.write.claim([0n]), [
      { address: alice.account.address, amount: parseEther("2") },
    ]);

    await viem.assertions.revertWith(asBob.write.claim([0n]), "nothing to claim");
  });

  it("refunds everyone on a Push (no price movement)", async function () {
    const { feed, market, locksAt, resolvesAt } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);
    const asBob = await marketAs(market.address, bob);

    await asAlice.write.placeBet([0n, true], { value: parseEther("1") });
    await asBob.write.placeBet([0n, false], { value: parseEther("2") });

    await networkHelpers.time.increaseTo(locksAt);
    await feed.write.setAnswer([20000000000n]);
    await market.write.lockMarket([0n]);
    await networkHelpers.time.increaseTo(resolvesAt);
    await feed.write.setAnswer([20000000000n]); // refreshed, same price -> Push
    await market.write.resolveMarket([0n]);

    assert.equal(await market.read.claimableOf([0n, alice.account.address]), parseEther("1"));
    assert.equal(await market.read.claimableOf([0n, bob.account.address]), parseEther("2"));
  });

  it("refunds both sides when the winning side has zero bettors", async function () {
    const { feed, market, locksAt, resolvesAt } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);

    await asAlice.write.placeBet([0n, true], { value: parseEther("1") }); // only UP bets exist

    await networkHelpers.time.increaseTo(locksAt);
    await feed.write.setAnswer([20000000000n]);
    await market.write.lockMarket([0n]);
    await networkHelpers.time.increaseTo(resolvesAt);
    await feed.write.setAnswer([18000000000n]); // price fell -> Down wins, but downPool is empty
    await market.write.resolveMarket([0n]);

    assert.equal(await market.read.claimableOf([0n, alice.account.address]), parseEther("1"));
  });

  it("rejects a double claim", async function () {
    const { feed, market, locksAt, resolvesAt } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);

    await asAlice.write.placeBet([0n, true], { value: parseEther("1") });
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
    await feed.write.setAnswer([20000000000n]); // fresh at lock time
    await market.write.lockMarket([0n]);

    // Let the feed go stale past MAX_PRICE_STALENESS without another update.
    await networkHelpers.time.increaseTo(resolvesAt + 31 * 60);
    await viem.assertions.revertWith(market.write.resolveMarket([0n]), "stale price");
  });

  it("keeps totals consistent with the contract's own balance", async function () {
    const { feed, market, locksAt, resolvesAt } = await networkHelpers.loadFixture(deployMarket);
    const asAlice = await marketAs(market.address, alice);
    const asBob = await marketAs(market.address, bob);

    await asAlice.write.placeBet([0n, true], { value: parseEther("3") });
    await asBob.write.placeBet([0n, false], { value: parseEther("1") });

    const contractBalance = await publicClient.getBalance({ address: market.address });
    assert.equal(contractBalance, parseEther("4"));

    await networkHelpers.time.increaseTo(locksAt);
    await feed.write.setAnswer([20000000000n]);
    await market.write.lockMarket([0n]);
    await networkHelpers.time.increaseTo(resolvesAt);
    await feed.write.setAnswer([20000000000n]);
    await market.write.resolveMarket([0n]); // Push

    await asAlice.write.claim([0n]);
    await asBob.write.claim([0n]);

    assert.equal(await publicClient.getBalance({ address: market.address }), 0n);
  });
});
