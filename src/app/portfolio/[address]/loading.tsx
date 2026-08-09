export default function Loading() {
  return (
    <div className="flex max-w-3xl animate-pulse flex-col gap-6">
      <div className="h-4 w-32 rounded bg-bg-hover" />
      <div className="h-8 w-72 rounded bg-bg-hover" />
      <div className="h-20 rounded-xl bg-bg-secondary" />
      <div className="h-40 rounded-xl bg-bg-secondary" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-bg-secondary" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-bg-secondary" />
    </div>
  );
}
