"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Ponto {
  mes: string;
  valor: number;
}

export default function VendasChart({ dados }: { dados: Ponto[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="corVenda" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2E5E3E" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2E5E3E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Area type="monotone" dataKey="valor" stroke="#2E5E3E" strokeWidth={2} fill="url(#corVenda)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
