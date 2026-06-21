
"use client"

import React from "react"
import { Box, Typography } from "@mui/material"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { api } from "@/lib/api"

export function EmployeeReportsChart() {
  const [data, setData] = React.useState<any[]>([])

  React.useEffect(() => {
    (async () => {
      try {
        const res: any = await api.reports()
        setData((res.hoursByMonth || []).map((m: any) => ({ name: m.month, hours: Math.round(m.hours), target: 160 })))
      } catch {
        setData([])
      }
    })()
  }, [])

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        p: 2,
        border: "1px solid #e2e8f0",
        borderRadius: "0.5rem",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontFamily: '"Poppins", sans-serif',
          fontWeight: 600,
          color: "#333",
          mb: 2,
        }}
      >
        Hours Worked vs Target
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="name"
            stroke="#4a5568"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            fontFamily='"Inter", sans-serif'
          />
          <YAxis
            stroke="#4a5568"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}h`}
            fontFamily='"Inter", sans-serif'
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "0.375rem",
              fontFamily: '"Inter", sans-serif',
              fontSize: "0.875rem",
            }}
            labelStyle={{ color: "#03306b", fontWeight: 600 }}
          />
          <Line
            type="monotone"
            dataKey="hours"
            name="Hours Worked"
            stroke="#03306b"
            strokeWidth={2}
            dot={{ r: 4, fill: "#03306b" }}
          />
          <Line
            type="monotone"
            dataKey="target"
            name="Target Hours"
            stroke="#c61111"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}
