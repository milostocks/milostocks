import Link from "next/link";

export default function RhamTokenButton() {
  return (
    <Link
      href="/token"
      className="neo-badge bg-gradient-to-r from-[#7a9900] to-[#f59e0b] border-white/20 px-3 py-1.5 text-xs text-white hover:brightness-110 transition-all flex items-center justify-center font-black rounded-lg"
    >
      $MILO
    </Link>
  );
}
