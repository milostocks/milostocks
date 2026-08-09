"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";

export default function SonyAdminPage() {
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; msg: string }>({
    type: null,
    msg: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/token-address")
      .then((res) => res.json())
      .then((data) => {
        if (data.address) {
          setCurrentAddress(data.address);
          setAddress(data.address);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (password === "Sony123") {
      setAuthenticated(true);
      setStatus({ type: null, msg: "" });
    } else {
      setStatus({ type: "error", msg: "Incorrect password!" });
    }
  };

  const handleSaveAddress = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, msg: "" });

    try {
      const res = await fetch("/api/token-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentAddress(data.address);
        setStatus({ type: "success", msg: "Token address updated successfully!" });
      } else {
        setStatus({ type: "error", msg: data.error || "Failed to update address." });
      }
    } catch {
      setStatus({ type: "error", msg: "Network error. Failed to save." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-8">
      {/* Header Back Button */}
      <Link href="/token" className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-3 py-1 text-xs text-[#ccff00] w-max hover:bg-[#ccff00]/40">
        ← BACK TO TOKEN PAGE
      </Link>

      <section className="neo-card flex flex-col gap-4 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="neo-badge border-[#f59e0b]/40 bg-[#f59e0b]/20 px-3 py-1 text-xs font-black text-[#f59e0b]">
            SONY ADMIN PANEL
          </span>
          <span className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-2.5 py-1 text-xs font-black text-[#ccff00]">
            TOKEN ADDRESS MANAGER
          </span>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Sony Token Manager
        </h1>
        <p className="text-sm font-semibold text-[#f5ffcc]">
          Manage and update the active $MILO contract address displayed on the public token page.
        </p>
      </section>

      {!authenticated ? (
        /* Login Form */
        <section className="neo-card max-w-md p-6 flex flex-col gap-4">
          <h2 className="text-xl font-black text-white uppercase">Admin Authentication</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-[#ebff99] uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (Sony123)"
                className="mono neo-input px-3 py-2 text-sm font-bold text-white focus:outline-none rounded-lg"
              />
            </div>
            {status.type === "error" && (
              <p className="neo-badge bg-[#ea580c]/20 border-[#ea580c]/40 p-2 text-xs font-black text-[#ea580c]">{status.msg}</p>
            )}
            <button
              type="submit"
              className="neo-btn px-4 py-2.5 text-xs font-black text-white rounded-lg"
            >
              UNLOCK SONY PANEL →
            </button>
          </form>
        </section>
      ) : (
        /* Admin Dashboard */
        <section className="neo-card p-6 sm:p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-black text-white uppercase">Active Contract Address</h2>
            <div className="mono neo-box-sm p-3 text-xs font-black text-[#ccff00] break-all rounded-lg">
              {currentAddress || "0x0000000000000000000000000000000000000000"}
            </div>
          </div>

          <form onSubmit={handleSaveAddress} className="flex flex-col gap-4 border-t border-[#7a9900]/30 pt-6">
            <h3 className="text-lg font-black text-white uppercase">Update Token Contract Address</h3>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-[#ebff99] uppercase">New Contract Address (0x...)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x..."
                className="mono neo-input px-3 py-2.5 text-sm font-bold text-white focus:outline-none rounded-lg"
              />
            </div>

            {status.type === "success" && (
              <p className="neo-badge bg-[#ccff00]/20 border-[#ccff00]/40 p-2.5 text-xs font-black text-[#d4ff2a]">{status.msg}</p>
            )}
            {status.type === "error" && (
              <p className="neo-badge bg-[#ea580c]/20 border-[#ea580c]/40 p-2.5 text-xs font-black text-[#ea580c]">{status.msg}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="neo-btn px-5 py-3 text-xs font-black text-white disabled:opacity-50 rounded-lg"
            >
              {loading ? "SAVING..." : "SAVE TOKEN ADDRESS ✓"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
