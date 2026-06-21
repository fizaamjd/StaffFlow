'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Card, CardHeader, CardContent, Tabs, Tab, Button, Avatar, Badge, Table, TableBody, TableCell, TableHead, TableRow, TextField, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Alert, styled } from '@mui/material';
import { CalendarMonth, AccessTime, Edit, Add, Save, Delete, EventAvailable } from '@mui/icons-material';
import { format } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { api } from '@/lib/api';

const DAY_FULL: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PageContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  backgroundColor: 'white',
  padding: theme.spacing(2),
}));

const StyledCard = styled(Card)(({ theme }) => ({
  width: '100%',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', // From global.css
  '&:hover': {
    boxShadow: '0 3px 6px rgba(0, 0, 0, 0.1)', // From global.css
  },
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  '& .MuiTabs-indicator': {
    backgroundColor: '#03306b', // Primary color from global.css
  },
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif',
  textTransform: 'none',
  color: '#1a1a1a', // Body color from global.css
  '&.Mui-selected': {
    color: 'white',
    backgroundColor: '#03306b', // Primary color from global.css
  },
  '&:hover': {
    //color: '#c61111', // Secondary color from global.css
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif',
  textTransform: 'none',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', // From global.css
  transition: 'box-shadow 0.2s ease-in-out, color 0.2s ease-in-out',
  '&:hover': {
    boxShadow: '0 3px 6px rgba(0, 0, 0, 0.1)', // From global.css
    color: '#c61111', // Secondary color from global.css
  },
}));

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif',
    textTransform: 'capitalize',
  },
}));

const EmployeeShiftsPage: React.FC<{ params: Promise<{ id: string }> }> = ({ params }) => {
  const { id } = React.use(params);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [date, setDate] = useState<Date | null>(null);
  const [isAddingShift, setIsAddingShift] = useState(false);
  const [isEditingShift, setIsEditingShift] = useState<string | null>(null);
  const [newShift, setNewShift] = useState({ date: '', startTime: '09:00', endTime: '17:00' });
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const notify = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const loadShifts = useCallback(async () => {
    try {
      const res: any = await api.listShifts({ employee: id, limit: 100 });
      setShifts(res.shifts || []);
    } catch {
      setShifts([]);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.getEmployee(id);
        setEmployeeData(res.employee);
      } catch {
        /* ignore */
      }
      loadShifts();
    })();
  }, [id, loadShifts]);

  const availability = WEEK.map((d) => {
    const a = (employeeData?.availability || []).find((x: any) => x.day === d);
    return { day: DAY_FULL[d], available: !!a, startTime: a?.start || '', endTime: a?.end || '' };
  });

  const handleDeleteShift = async (shiftId: string) => {
    try {
      await api.deleteShift(shiftId);
      setShifts(shifts.filter((shift) => shift._id !== shiftId));
      notify('success', 'The shift has been deleted successfully.');
    } catch (e: any) {
      notify('error', e?.message || 'Failed to delete shift');
    }
  };

  const handleAddShift = async () => {
    if (!date) {
      notify('error', 'Please select a date for the shift.');
      return;
    }
    const formattedDate = format(date, 'yyyy-MM-dd');
    const dayName = format(date, 'EEEE');
    try {
      await api.createShift({
        employee: id,
        department: employeeData?.department || 'Sales',
        date: formattedDate,
        startTime: newShift.startTime,
        endTime: newShift.endTime,
      });
      setIsAddingShift(false);
      setDate(null);
      setNewShift({ date: '', startTime: '09:00', endTime: '17:00' });
      notify('success', `New shift added for ${dayName}, ${formattedDate}.`);
      loadShifts();
    } catch (e: any) {
      notify('error', e?.message || 'Failed to add shift');
    }
  };

  const handleEditShift = async (shiftId: string) => {
    try {
      await api.updateShift(shiftId, { startTime: newShift.startTime, endTime: newShift.endTime });
      setIsEditingShift(null);
      notify('success', 'The shift has been updated successfully.');
      loadShifts();
    } catch (e: any) {
      notify('error', e?.message || 'Failed to update shift');
    }
  };

  return (
    <PageContainer>
      {alert && (
        <Alert severity={alert.type} sx={{ fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif' }}>
          <Typography variant="body2">{alert.message}</Typography>
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: '"Poppins", "Inter", "Arial", sans-serif', fontWeight: 600, color: '#0d1b2a' }}>
            Employee Shifts
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Manage shifts for {employeeData?.name}
          </Typography>
        </Box>
        <Dialog open={isAddingShift} onClose={() => setIsAddingShift(false)}>
          <DialogTitle>Add New Shift</DialogTitle>
          <DialogContent>
            <DialogContentText>Create a new shift for {employeeData?.name}.</DialogContentText>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif', color: '#1a1a1a' }}>
                  Date
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    value={date}
                    onChange={(newValue) => setDate(newValue)}
                    slots={{
                      textField: (params) => (
                        <TextField
                          {...params}
                          fullWidth
                          sx={{
                            '& .MuiInputBase-root': {
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                              transition: 'box-shadow 0.2s ease-in-out',
                              '&:hover, &:focus': {
                                boxShadow: '0 3px 6px rgba(0, 0, 0, 0.1)',
                              },
                            },
                          }}
                        />
                      ),
                    }}
                  />
                </LocalizationProvider>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif', color: '#1a1a1a' }}>
                    Start Time
                  </Typography>
                  <Select
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    fullWidth
                    sx={{
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      transition: 'box-shadow 0.2s ease-in-out',
                      '&:hover, &:focus': {
                        boxShadow: '0 3px 6px rgba(0, 0, 0, 0.1)',
                      },
                    }}
                  >
                    {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map((time) => (
                      <MenuItem key={time} value={time}>
                        {time}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif', color: '#1a1a1a' }}>
                    End Time
                  </Typography>
                  <Select
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    fullWidth
                    sx={{
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      transition: 'box-shadow 0.2s ease-in-out',
                      '&:hover, &:focus': {
                        boxShadow: '0 3px 6px rgba(0, 0, 0, 0.1)',
                      },
                    }}
                  >
                    {['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map((time) => (
                      <MenuItem key={time} value={time}>
                        {time}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <StyledButton variant="outlined" onClick={() => setIsAddingShift(false)}>
              Cancel
            </StyledButton>
            <StyledButton onClick={handleAddShift}>Add Shift</StyledButton>
          </DialogActions>
        </Dialog>
        <StyledButton onClick={() => setIsAddingShift(true)} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Add sx={{ fontSize: 16 }} /> Add Shift
        </StyledButton>
      </Box>

      <StyledCard>
        <CardHeader
          title={<Typography variant="h6" sx={{ fontFamily: '"Poppins", "Inter", "Arial", sans-serif', fontWeight: 600, color: '#0d1b2a' }}>Employee Information</Typography>}
          subheader={<Typography variant="body2" sx={{ color: '#64748b' }}>Basic information about the employee</Typography>}
        />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'flex-start', gap: 3 }}>
            <Avatar sx={{ width: 80, height: 80 }}>
              <img src={employeeData?.avatar || '/placeholder.svg'} alt={employeeData?.name} />
            </Avatar>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, flex: 1 }}>
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b', fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif' }}>Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{employeeData?.name}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b', fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif' }}>Email</Typography>
                <Typography variant="body1">{employeeData?.email}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b', fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif' }}>Department</Typography>
                <Typography variant="body1">{employeeData?.department}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b', fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif' }}>Position</Typography>
                <Typography variant="body1">{employeeData?.position}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b', fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif' }}>Status</Typography>
                <StyledBadge badgeContent={employeeData?.status === 'active' ? 'Active' : 'Inactive'} color={employeeData?.status === 'active' ? 'success' : 'default'} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#64748b', fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif' }}>Joined</Typography>
                <Typography variant="body1">{employeeData?.createdAt ? new Date(employeeData.createdAt).toLocaleDateString() : '—'}</Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </StyledCard>

      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <StyledTabs value="shifts" aria-label="shift tabs">
          <StyledTab label="Shifts" value="shifts" />
          <StyledTab label="Availability" value="availability" />
          <StyledTab label="Shift History" value="history" />
        </StyledTabs>

        <Box sx={{ display: 'block' }}>
          <StyledCard>
            <CardHeader
              title={<Typography variant="h6" sx={{ fontFamily: '"Poppins", "Inter", "Arial", sans-serif', fontWeight: 600, color: '#0d1b2a' }}>Upcoming Shifts</Typography>}
              subheader={<Typography variant="body2" sx={{ color: '#64748b' }}>Manage upcoming shifts for {employeeData?.name}</Typography>}
            />
            <CardContent>
              <Table sx={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'medium' }}>Day</TableCell>
                    <TableCell sx={{ fontWeight: 'medium' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'medium' }}>Start Time</TableCell>
                    <TableCell sx={{ fontWeight: 'medium' }}>End Time</TableCell>
                    <TableCell sx={{ fontWeight: 'medium' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'medium', textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift._id} sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}>
                      <TableCell sx={{ fontWeight: 'medium' }}>{shift.day}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarMonth sx={{ fontSize: 16, color: '#03306b' }} />
                          {shift.date}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {isEditingShift === shift._id ? (
                          <Select
                            value={newShift.startTime}
                            onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                            sx={{ width: 100 }}
                          >
                            {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map((time) => (
                              <MenuItem key={time} value={time}>
                                {time}
                              </MenuItem>
                            ))}
                          </Select>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccessTime sx={{ fontSize: 16, color: '#03306b' }} />
                            {shift.startTime}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditingShift === shift._id ? (
                          <Select
                            value={newShift.endTime}
                            onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                            sx={{ width: 100 }}
                          >
                            {['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map((time) => (
                              <MenuItem key={time} value={time}>
                                {time}
                              </MenuItem>
                            ))}
                          </Select>
                        ) : (
                          shift.endTime
                        )}
                      </TableCell>
                      <TableCell>
                        <StyledBadge
                          badgeContent={shift.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                          color={shift.status === 'confirmed' ? 'primary' : 'warning'}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {isEditingShift === shift._id ? (
                          <StyledButton variant="text" onClick={() => handleEditShift(shift._id)}>
                            <Save sx={{ fontSize: 16 }} />
                          </StyledButton>
                        ) : (
                          <StyledButton
                            variant="text"
                            onClick={() => {
                              setIsEditingShift(shift._id);
                              setNewShift({ date: shift.date, startTime: shift.startTime, endTime: shift.endTime });
                            }}
                          >
                            <Edit sx={{ fontSize: 16 }} />
                          </StyledButton>
                        )}
                        <StyledButton variant="text" onClick={() => handleDeleteShift(shift._id)}>
                          <Delete sx={{ fontSize: 16 }} />
                        </StyledButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </StyledCard>
        </Box>

        <Box sx={{ display: 'none' }}>
          <StyledCard>
            <CardHeader
              title={<Typography variant="h6" sx={{ fontFamily: '"Poppins", "Inter", "Arial", sans-serif', fontWeight: 600, color: '#0d1b2a' }}>Employee Availability</Typography>}
              subheader={<Typography variant="body2" sx={{ color: '#64748b' }}>Weekly availability for {employeeData?.name}</Typography>}
            />
            <CardContent>
              <Table sx={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'medium' }}>Day</TableCell>
                    <TableCell sx={{ fontWeight: 'medium' }}>Available</TableCell>
                    <TableCell sx={{ fontWeight: 'medium' }}>Start Time</TableCell>
                    <TableCell sx={{ fontWeight: 'medium' }}>End Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availability.map((day) => (
                    <TableRow key={day.day} sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}>
                      <TableCell sx={{ fontWeight: 'medium' }}>{day.day}</TableCell>
                      <TableCell>
                        <StyledBadge
                          badgeContent={day.available ? 'Available' : 'Unavailable'}
                          color={day.available ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{day.startTime || 'N/A'}</TableCell>
                      <TableCell>{day.endTime || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </StyledCard>
        </Box>

        <Box sx={{ display: 'none' }}>
          <StyledCard>
            <CardHeader
              title={<Typography variant="h6" sx={{ fontFamily: '"Poppins", "Inter", "Arial", sans-serif', fontWeight: 600, color: '#0d1b2a' }}>Shift History</Typography>}
              subheader={<Typography variant="body2" sx={{ color: '#64748b' }}>Past shifts worked by {employeeData?.name}</Typography>}
            />
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Shift history will be available in the next update.
              </Typography>
            </CardContent>
          </StyledCard>
        </Box>
      </Box>
    </PageContainer>
  );
};

export default EmployeeShiftsPage;