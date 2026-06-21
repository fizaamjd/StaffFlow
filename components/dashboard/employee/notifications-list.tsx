
"use client"

import { useState, useEffect } from "react"
import { Box, Typography, Avatar, Chip, IconButton, Button, CircularProgress } from "@mui/material"
import { CalendarToday, AccessTime, Message, Star, Delete } from "@mui/icons-material"
import { api } from "@/lib/api"

type Notification = {
  _id: string
  title: string
  message: string
  read: boolean
  important?: boolean
  type: string
  createdAt: string
}

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function EmployeeNotificationsList({ filter = "all" }: { filter?: "all" | "unread" | "important" }) {
  const [notificationState, setNotificationState] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res: any = await api.notifications({ limit: 50 })
        setNotificationState(res.notifications || [])
      } catch {
        setNotificationState([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filteredNotifications = notificationState.filter((notification) => {
    if (filter === "unread") return !notification.read
    if (filter === "important") return notification.important
    return true
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "shift":
      case "schedule":
        return <CalendarToday sx={{ color: "#3b82f6", fontSize: 20 }} />
      case "success":
        return <Message sx={{ color: "#22c55e", fontSize: 20 }} />
      case "payroll":
      case "system":
        return <AccessTime sx={{ color: "#f97316", fontSize: 20 }} />
      default:
        return <Message sx={{ color: "#4a5568", fontSize: 20 }} />
    }
  }

  const toggleImportant = (id: string) => {
    setNotificationState(
      notificationState.map((notification) =>
        notification._id === id ? { ...notification, important: !notification.important } : notification,
      ),
    )
  }

  const deleteNotification = async (id: string) => {
    setNotificationState(notificationState.filter((notification) => notification._id !== id))
    try {
      await api.deleteNotification(id)
    } catch {
      /* ignore */
    }
  }

  const markAsRead = async (id: string) => {
    setNotificationState(
      notificationState.map((notification) =>
        notification._id === id ? { ...notification, read: true } : notification,
      ),
    )
    try {
      await api.markNotificationRead(id)
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  return (
    <Box>
      {filteredNotifications.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4, color: "#4a5568" }}>
          <Typography sx={{ fontFamily: '"Inter", sans-serif', fontSize: "1rem" }}>
            No notifications found
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filteredNotifications.map((notification) => (
            <Box
              key={notification._id}
              sx={{
                bgcolor: notification.read ? "white" : "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "0.5rem",
                p: 2,
                transition: "all 0.2s ease",
                "&:hover": {
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                },
                cursor: "pointer",
              }}
              onClick={() => markAsRead(notification._id)}
            >
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      bgcolor: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Box>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        sx={{
                          fontFamily: '"Inter", sans-serif',
                          fontWeight: 500,
                          color: "#333",
                          fontSize: "1rem",
                        }}
                      >
                        {notification.title}
                      </Typography>
                      {!notification.read && (
                        <Chip
                          label="New"
                          size="small"
                          sx={{
                            bgcolor: "#03306b",
                            color: "white",
                            fontFamily: '"Inter", sans-serif',
                            fontSize: "0.75rem",
                          }}
                        />
                      )}
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleImportant(notification._id)
                        }}
                        sx={{
                          color: notification.important ? "#f59e0b" : "#737373",
                          "&:hover": { color: "#333" },
                        }}
                      >
                        <Star sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification._id)
                        }}
                        sx={{
                          color: "#737373",
                          "&:hover": { color: "#333" },
                        }}
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: '"Inter", sans-serif',
                      fontSize: "0.875rem",
                      color: "#4a5568",
                      mb: 2,
                      lineHeight: 1.5,
                    }}
                  >
                    {notification.message}
                  </Typography>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography
                      sx={{
                        fontFamily: '"Inter", sans-serif',
                        fontSize: "0.75rem",
                        color: "#737373",
                      }}
                    >
                      {relativeTime(notification.createdAt)}
                    </Typography>
                    {notification.type === "message" && (
                      <Button
                        variant="contained"
                        size="small"
                        sx={{
                          bgcolor: "#03306b",
                          color: "white",
                          fontFamily: '"Inter", sans-serif',
                          fontWeight: 500,
                          textTransform: "none",
                          borderRadius: "0.375rem",
                          "&:hover": {
                            bgcolor: "#022555",
                            boxShadow: "0 2px 4px rgba(3, 48, 107, 0.2)",
                          },
                        }}
                        startIcon={<Message sx={{ fontSize: 16 }} />}
                      >
                        Reply
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
