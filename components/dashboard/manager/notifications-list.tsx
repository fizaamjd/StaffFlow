'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Avatar, Chip, Button, CircularProgress, styled } from '@mui/material';
import { Person, Message, CalendarToday, AccessTime, Star, Delete, PersonAdd, CheckCircle } from '@mui/icons-material';
import { api } from '@/lib/api';

type Notification = {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  important?: boolean;
  type: string;
  createdAt: string;
};

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const NotificationContainer = styled(Box)<{ read?: boolean }>(({ theme, read }) => ({
  marginBottom: theme.spacing(2),
  border: '1px solid #e2e8f0', // From global.css
  borderRadius: '0.5rem',
  padding: theme.spacing(2),
  backgroundColor: read ? 'white' : '#f8fafc', // Unread background
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', // From global.css
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', // Hover shadow
  },
}));

const NotificationIcon = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f1f5f9', // Light background
  color: '#1a1a1a',
  marginRight: theme.spacing(2),
}));

const StyledButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif',
  textTransform: 'none',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', // From global.css
  transition: 'box-shadow 0.2s ease-in-out, background-color 0.2s ease-in-out',
  backgroundColor: '#03306b', // Primary color
  color: 'white',
  '&:hover': {
    boxShadow: '0 3px 6px rgba(0, 0, 0, 0.1)', // From global.css
    backgroundColor: '#022a5b', // Darker primary
  },
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  fontSize: '0.75rem',
  padding: theme.spacing(0.75, 1.5),
}));

const StyledOutlineButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif',
  textTransform: 'none',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', // From global.css
  transition: 'box-shadow 0.2s ease-in-out, color 0.2s ease-in-out',
  borderColor: '#e2e8f0',
  color: '#1a1a1a',
  '&:hover': {
    boxShadow: '0 3px 6px rgba(0, 0, 0, 0.1)', // From global.css
    color: '#c61111', // Secondary color
    borderColor: '#c61111',
  },
  fontSize: '0.75rem',
  padding: theme.spacing(0.75, 1.5),
}));

const ActionButton = styled(Button)(({ theme }) => ({
  minWidth: 'auto',
  padding: theme.spacing(0.5),
  color: '#64748b', // Muted color
  '&:hover': {
    color: '#1a1a1a', // Body color
  },
  '&.important': {
    color: '#f59e0b', // Amber for important
  },
}));

const EmptyState = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(4),
  color: '#64748b', // Muted color
  fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif',
}));

export function ManagerNotificationsList({ filter = 'all' }: { filter?: 'all' | 'unread' | 'important' }) {
  const [notificationState, setNotificationState] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res: any = await api.notifications({ limit: 50 });
        setNotificationState(res.notifications || []);
      } catch {
        setNotificationState([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredNotifications = notificationState.filter((notification) => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'important') return notification.important;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'shift':
        return <Person sx={{ fontSize: 20, color: '#3b82f6' }} />;
      case 'success':
        return <CheckCircle sx={{ fontSize: 20, color: '#16a34a' }} />;
      case 'schedule':
        return <CalendarToday sx={{ fontSize: 20, color: '#9333ea' }} />;
      case 'payroll':
      case 'system':
        return <AccessTime sx={{ fontSize: 20, color: '#f97316' }} />;
      default:
        return <Message sx={{ fontSize: 20 }} />;
    }
  };

  const toggleImportant = (id: string) => {
    setNotificationState(
      notificationState.map((notification) =>
        notification._id === id ? { ...notification, important: !notification.important } : notification
      )
    );
  };

  const deleteNotification = async (id: string) => {
    setNotificationState(notificationState.filter((notification) => notification._id !== id));
    try {
      await api.deleteNotification(id);
    } catch {
      /* ignore */
    }
  };

  const markAsRead = async (id: string) => {
    setNotificationState(
      notificationState.map((notification) =>
        notification._id === id ? { ...notification, read: true } : notification
      )
    );
    try {
      await api.markNotificationRead(id);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box>
      {filteredNotifications.length === 0 ? (
        <EmptyState>No notifications found</EmptyState>
      ) : (
        filteredNotifications.map((notification) => (
          <NotificationContainer
            key={notification._id}
            read={notification.read}
            onClick={() => markAsRead(notification._id)}
          >
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box>
                <NotificationIcon>{getNotificationIcon(notification.type)}</NotificationIcon>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 500, color: '#333', fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif' }}
                    >
                      {notification.title}
                    </Typography>
                    {!notification.read && (
                      <Chip label="New" sx={{ bgcolor: '#03306b', color: 'white', fontSize: '0.75rem', height: 24 }} />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <ActionButton
                      className={notification.important ? 'important' : ''}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleImportant(notification._id);
                      }}
                    >
                      <Star sx={{ fontSize: 16 }} />
                    </ActionButton>
                    <ActionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification._id);
                      }}
                    >
                      <Delete sx={{ fontSize: 16 }} />
                    </ActionButton>
                  </Box>
                </Box>
                <Typography
                  sx={{ fontSize: '0.875rem', color: '#4a5568', mb: 1.5, lineHeight: 1.5, fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif' }}
                >
                  {notification.message}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.75rem', color: '#64748b', fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", "Arial", sans-serif' }}>
                    {relativeTime(notification.createdAt)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {notification.type === 'shift_request' && (
                      <>
                        <StyledOutlineButton>Decline</StyledOutlineButton>
                        <StyledButton>
                          <PersonAdd sx={{ fontSize: 12 }} />
                          Approve
                        </StyledButton>
                      </>
                    )}
                    {notification.type === 'message' && (
                      <StyledButton>
                        <Message sx={{ fontSize: 12 }} />
                        Reply
                      </StyledButton>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          </NotificationContainer>
        ))
      )}
    </Box>
  );
}