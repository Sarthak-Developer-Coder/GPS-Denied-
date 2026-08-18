import { ERROR_CODE_COPY } from "../lib/constants";

export function DiagnosticsPanel({ errorCodes }: { errorCodes: string[] }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
      <div className="mb-4 text-lg font-semibold text-white">Diagnostics</div>
      <div className="space-y-3">
        {errorCodes.length === 0 ? (
          <div className="rounded-2xl border border-status-pass/20 bg-status-pass/10 p-4 text-sm text-status-pass">
            No diagnostic codes triggered. The run stayed within the platform's known failure envelope.
          </div>
        ) : (
          errorCodes.map((code) => (
            <div key={code} className="rounded-2xl border border-status-warn/20 bg-status-warn/10 p-4">
              <div className="text-sm font-semibold text-white">{code}</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">{ERROR_CODE_COPY[code] ?? "Unknown diagnostic code."}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
