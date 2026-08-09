export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="h-8 w-48 rounded bg-bg-hover" />
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-7 w-24 rounded-full bg-bg-hover" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-bg-secondary" />
      <div className="h-40 rounded-xl bg-bg-secondary" />
    </div>
  );
}
