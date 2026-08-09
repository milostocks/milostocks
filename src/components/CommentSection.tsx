"use client";

import { useState, type FormEvent } from "react";
import TimeAgo from "./TimeAgo";
import { truncateAddress } from "@/lib/predictFormat";
import type { CommentView } from "@/lib/comments";

const MAX_LENGTH = 280;

/** Flat discussion thread for one Predict market — posts through the cookie-based fETH identity (offchainWallet.ts), no wallet-connect needed. See lib/comments.ts. */
export default function CommentSection({ ticker, initial }: { ticker: string; initial: CommentView[] }) {
  const [comments, setComments] = useState<CommentView[]>(initial);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/comments/${ticker}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data: { ok: boolean; error?: string; comment?: CommentView } = await res.json();
      if (!res.ok || !data.ok || !data.comment) {
        setError(data.error ?? "Couldn't post — try again.");
      } else {
        setComments((prev) => [data.comment!, ...prev]);
        setText("");
      }
    } catch {
      setError("Couldn't post — try again.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="neo-card flex flex-col gap-3 p-5">
      <p className="text-xs uppercase font-black tracking-wide text-[#ebff99]">Discussion ({comments.length})</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          placeholder={`Share your read on ${ticker}'s gap…`}
          rows={2}
          className="mono neo-input w-full resize-none rounded-lg p-3 text-sm text-white placeholder:text-[#ebff99] focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-[#ebff99]">
            {text.length}/{MAX_LENGTH} · posts as a pseudo-address, no login
          </span>
          <button
            type="submit"
            disabled={posting || !text.trim()}
            className="neo-btn px-4 py-1.5 text-xs font-black text-white rounded-lg disabled:opacity-50"
          >
            {posting ? "Posting…" : "POST COMMENT"}
          </button>
        </div>
        {error && <p className="text-xs font-black text-[#ea580c] bg-[#ea580c]/15 p-2 rounded-lg border border-[#ea580c]/30">{error}</p>}
      </form>

      {comments.length === 0 ? (
        <p className="py-2 text-center text-sm font-bold text-[#ebff99]">No comments yet — be the first.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div key={c.id} className="flex flex-col gap-0.5 border-t border-[#7a9900]/30 pt-3 first:border-0 first:pt-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="mono font-black text-[#ccff00]">{truncateAddress(c.address)}</span>
                <span className="text-[#ebff99]">
                  <TimeAgo unixSeconds={c.at} />
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm font-medium text-white">{c.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
