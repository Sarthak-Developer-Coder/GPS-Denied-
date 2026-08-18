import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PolarAngleAxis,
  PolarGrid,
  RadarChart,
  Radar,
  PolarRadiusAxis,
} from "recharts";

export function ScoreTrendChart({ data }: { data: Array<{ date: string; score: number; stackName: string; version: string }> }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4, fill: "#22d3ee" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ScoreBreakdownChart({ data }: { data: Array<{ label: string; value: number }> }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="label" interval={0} angle={-18} height={56} textAnchor="end" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Bar dataKey="value" fill="#5eead4" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} outerRadius={94}>
          <PolarGrid stroke="rgba(255,255,255,0.12)" />
          <PolarAngleAxis dataKey="label" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.35} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
