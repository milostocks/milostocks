import { formatPct } from "@/lib/format";

export default function PremiumBadge({
  pct,
  size = "sm",
}: {
  pct: number;
  size?: "sm" | "lg";
}) {
  const tone =
    Math.abs(pct) < 0.15
      ? "bg-white/10 text-white/80 border-white/20"
      : pct > 0
        ? "bg-[#ccff00]/20 text-[#d4ff2a] border-[#ccff00]/40 shadow-[0_0_10px_rgba(0,198,255,0.3)]"
        : "bg-[#ea580c]/20 text-[#ea580c] border-[#ea580c]/40 shadow-[0_0_10px_rgba(255,42,109,0.3)]";
  const sizing =
    size === "lg" ? "px-4 py-1.5 text-2xl font-black rounded-xl" : "px-2.5 py-0.5 text-xs font-black rounded-lg";
  return (
    <span
      className={`mono inline-block border font-black ${tone} ${sizing}`}
    >
      {formatPct(pct)}
    </span>
  );
}
