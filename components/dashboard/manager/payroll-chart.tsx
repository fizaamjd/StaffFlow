'use client';

import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Box, styled } from '@mui/material';
import { api } from '@/lib/api';

const ChartContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  backgroundColor: 'white',
  borderRadius: '0.375rem',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', // From global.css
  '&:hover': {
    boxShadow: '0 3px 6px rgba(0, 0, 0, 0.1)', // From global.css
  },
}));

export function ManagerPayrollChart() {
  const [data, setData] = React.useState<any[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const res: any = await api.payrollTrend();
        setData((res.trend || []).map((t: any) => ({ name: t.month, regular: Math.round(t.regular), overtime: Math.round(t.overtime) })));
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
            stroke="#64748b" // Muted color from global.css
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
            tickFormatter={(value) => `$${value}`}
            fontFamily="'Inter', 'Segoe UI', 'Helvetica Neue', 'Arial', sans-serif"
          />
          <Tooltip
            formatter={(value) => [`$${value}`, '']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif',
            }}
            labelStyle={{ color: '#03306b', fontWeight: 600 }}
          />
          <Legend />
          <Bar dataKey="regular" name="Regular Pay" fill="#03306b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="overtime" name="Overtime Pay" fill="#c61111" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}