'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, Avatar, Chip, Tooltip, CircularProgress, Alert, styled } from '@mui/material';
import { Check, Delete, CalendarToday } from '@mui/icons-material';
import { api } from '@/lib/api';

const Container = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  backgroundColor: 'white',
}));

const TableContainer = styled(Box)(({ theme }) => ({
  border: '1px solid #e2e8f0',
  borderRadius: '0.375rem',
  overflow: 'hidden',
}));

const TableHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: '#f8fafc',
}));

const TableRow = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  borderBottom: '1px solid #e2e8f0',
  '&:last-child': { borderBottom: 'none' },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Inter", sans-serif',
  textTransform: 'none',
  backgroundColor: '#03306b',
  color: 'white',
  '&:hover': { backgroundColor: '#022a5b' },
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const StyledChip = styled(Chip)(() => ({
  backgroundColor: '#03306b',
  color: 'white',
  fontFamily: '"Inter", sans-serif',
}));

const initials = (name: string) =>
  (name || '')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const scoreColor = (s: number) => (s >= 80 ? '#16a34a' : s >= 60 ? '#ca8a04' : '#dc2626');

export function AISchedulingResults({ data, onPublished }: { data?: any; onPublished?: () => void }) {
  const [publishing, setPublishing] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [shifts, setShifts] = useState<any[]>(data?.shifts || []);

  // keep local copy in sync when a new generation arrives
  React.useEffect(() => {
    setShifts(data?.shifts || []);
  }, [data]);

  if (!data || !data.shifts || data.shifts.length === 0) {
    return (
      <Typography sx={{ color: '#64748b', fontFamily: '"Inter", sans-serif', py: 2 }}>
        Configure the options above and click <strong>Generate AI Schedule</strong> to preview an optimized schedule here.
      </Typography>
    );
  }

  const removeRow = (tempId: number) => setShifts((prev) => prev.filter((s) => s.tempId !== tempId));

  const handlePublish = async () => {
    setPublishing(true);
    setAlert(null);
    try {
      const payload = shifts.map((s) => ({
        employee: s.employee.id,
        department: s.department,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
      }));
      const res: any = await api.publishSchedule(payload);
      setAlert({ type: 'success', message: `Published ${res.count} shifts and notified employees.` });
      onPublished?.();
    } catch (e: any) {
      setAlert({ type: 'error', message: e?.message || 'Failed to publish schedule' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Container>
      {alert && <Alert severity={alert.type}>{alert.message}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
          <StyledChip label="AI Generated" sx={{ mb: 1 }} />
          <Typography variant="h6" sx={{ fontFamily: '"Poppins", sans-serif', color: '#0d1b2a' }}>
            {data.params?.startDate} → {data.params?.endDate}
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', fontFamily: '"Inter", sans-serif' }}>
            {data.stats?.filled} shifts • {data.stats?.coverage}% coverage • avg match {data.stats?.avgMatchScore} •{' '}
            {data.stats?.employeesUsed} staff
            {data.stats?.unfilled ? ` • ${data.stats.unfilled} unfilled` : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
          <StyledButton size="small" onClick={handlePublish} disabled={publishing || shifts.length === 0}>
            {publishing ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <Check sx={{ fontSize: 16 }} />}
            Approve &amp; Publish
          </StyledButton>
        </Box>
      </Box>

      <TableContainer>
        <TableHeader>
          <Box sx={{ display: 'flex', gap: 2, fontWeight: 500, fontFamily: '"Inter", sans-serif', color: '#1a1a1a' }}>
            <Box sx={{ flex: 1.5 }}>Employee</Box>
            <Box sx={{ flex: 1 }}>Department</Box>
            <Box sx={{ flex: 1 }}>Day</Box>
            <Box sx={{ flex: 1 }}>Date</Box>
            <Box sx={{ flex: 1 }}>Time</Box>
            <Box sx={{ flex: 1 }}>Match</Box>
            <Box sx={{ flex: 0.6, textAlign: 'right' }}>Actions</Box>
          </Box>
        </TableHeader>
        {shifts.map((shift) => (
          <TableRow key={shift.tempId}>
            <Box sx={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#03306b', color: 'white', fontSize: '0.75rem' }}>
                {shift.employee.initials || initials(shift.employee.name)}
              </Avatar>
              <Typography sx={{ fontWeight: 500, fontFamily: '"Inter", sans-serif' }}>{shift.employee.name}</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontFamily: '"Inter", sans-serif' }}>{shift.department}</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 500, fontFamily: '"Inter", sans-serif' }}>{shift.day}</Typography>
            </Box>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday sx={{ fontSize: 16, color: '#64748b' }} />
              <Typography sx={{ fontFamily: '"Inter", sans-serif' }}>{shift.date}</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontFamily: '"Inter", sans-serif' }}>
                {shift.startTime} - {shift.endTime}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Tooltip title={(shift.reasons || []).join(' • ')} arrow>
                <Chip
                  size="small"
                  label={`${shift.matchScore}`}
                  sx={{ backgroundColor: scoreColor(shift.matchScore), color: 'white', fontWeight: 600 }}
                />
              </Tooltip>
            </Box>
            <Box sx={{ flex: 0.6, display: 'flex', justifyContent: 'flex-end' }}>
              <Button sx={{ minWidth: 'auto', p: 1, color: '#c61111' }} onClick={() => removeRow(shift.tempId)}>
                <Delete sx={{ fontSize: 16 }} />
              </Button>
            </Box>
          </TableRow>
        ))}
      </TableContainer>
    </Container>
  );
}
