"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { isAddress } from "viem";

export default function WalletSearch({ basePath = "/predict/wallet" }: { basePath?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!isAddress(trimmed)) {
      setError(true);
      return;
    }
    setError(false);
    router.push(`${basePath}/${trimmed}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex items-center neo-input rounded-lg overflow-hidden">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          placeholder="Look up a wallet (0x…)"
          className="mono w-60 bg-transparent px-3 py-2 text-xs font-bold text-white placeholder:text-[#ebff99] focus:outline-none"
        />
        <button
          type="submit"
          className="neo-btn px-4 py-2 text-xs font-black text-white"
        >
          VIEW →
        </button>
      </div>
      {error && <p className="text-xs font-black text-[#ea580c] bg-[#ea580c]/15 p-1.5 rounded-lg border border-[#ea580c]/30">Not a valid address.</p>}
    </form>
  );
}
