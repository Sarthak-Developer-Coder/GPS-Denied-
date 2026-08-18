import { ReactNode } from "react";
import { Card } from "./ui/Card";

export function KpiCard({ label, value, helper, icon }: { label: string; value: ReactNode; helper?: string; icon?: ReactNode }) {
  return (
    <Card className="rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</div>
          <div className="mt-4 text-3xl font-semibold tracking-tight text-white">{value}</div>
          {helper ? <div className="mt-2 text-sm text-slate-400">{helper}</div> : null}
        </div>
        {icon ? <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-accent-400">{icon}</div> : null}
      </div>
    </Card>
  );
}
