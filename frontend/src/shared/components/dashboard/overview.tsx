"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface OverviewProps {
  data: { name: string; total: number; orders: number }[];
}

export function Overview({ data }: OverviewProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `Rs ${value}`}
        />
        <Tooltip 
          cursor={{ fill: 'rgba(0, 240, 255, 0.1)' }}
          contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '8px' }}
          formatter={(value: any) => [`Rs ${value}`, 'Revenue']}
        />
        <Bar
          dataKey="total"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
          className="fill-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
