export function LoadingScreen({ label = "Loading SpaceBorn..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-space-950 text-white">
      <div className="text-center">
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-2 border-white/10 border-t-accent-400" />
        <div className="mt-5 text-sm uppercase tracking-[0.35em] text-slate-400">{label}</div>
      </div>
    </div>
  );
}
