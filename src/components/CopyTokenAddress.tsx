"use client";

import { useState, useEffect } from "react";

export default function CopyTokenAddress({
  address: addrProp,
  initialAddress = "0x0000000000000000000000000000000000000000",
}: {
  address?: string;
  initialAddress?: string;
}) {
  const [address, setAddress] = useState(addrProp || initialAddress);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/token-address")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.address) {
          setAddress(data.address);
        }
      })
      .catch(() => {});
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-2.5 py-1 text-xs text-[#ccff00] font-black">
          CONTRACT ADDRESS
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="neo-input flex-1 min-w-[280px] px-3 py-2 border border-[#7a9900]/40 flex items-center justify-between rounded-lg">
          <span className="mono text-xs font-black text-white truncate select-all">{address}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="neo-btn px-4 py-2 text-xs font-black text-white rounded-lg shrink-0"
        >
          {copied ? "COPIED! ✓" : "COPY ADDRESS 📋"}
        </button>
      </div>
    </div>
  );
}
