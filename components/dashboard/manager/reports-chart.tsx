'use client';

import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Box, styled } from '@mui/material';
import { api } from '@/lib/api';

const ChartContainer = styled(Box)(() => ({
  width: '100%',
  height: '100%',
  backgroundColor: 'white',
  borderRadius: '0.375rem',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  '&:hover': {
    boxShadow: '0 3px 6px rgba(0, 0, 0, 0.1)',
  },
}));

export function ManagerReportsChart() {
  const [data, setData] = React.useState<any[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const res: any = await api.reports();
        setData(
          (res.hoursByMonth || []).map((m: any) => ({
            name: m.month,
            hours: Math.round(m.hours),
            overtime: Math.round(m.overtime || 0),
          }))
        );
      } catch {
        setData([]);
      }
    })();
  }, []);

  return (
    <ChartContainer>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis
            dataKey="name"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            fontFamily="'Inter', 'Segoe UI', 'Helvetica Neue', 'Arial', sans-serif"
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}h`}
            fontFamily="'Inter', 'Segoe UI', 'Helvetica Neue', 'Arial', sans-serif"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif',
            }}
            labelStyle={{ color: '#03306b', fontWeight: 600 }}
          />
          <Legend />
          <Bar dataKey="hours" name="Total Hours" fill="#03306b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="overtime" name="Overtime" fill="#c61111" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
