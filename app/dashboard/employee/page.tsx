"use client"

import React, { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Divider,
} from "@mui/material"
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth"
import AccessTimeIcon from "@mui/icons-material/AccessTime"
import CreditCardIcon from "@mui/icons-material/CreditCard"
import NotificationsIcon from "@mui/icons-material/Notifications"

import { EmployeeSchedule } from "@/components/dashboard/employee/employee-schedule"
import { EmployeeStats } from "@/components/dashboard/employee/employee-stats"
import { api } from "@/lib/api"
import { useRequireAuth } from "@/lib/auth"

export default function EmployeeDashboardPageMUI() {
  const [tabIndex, setTabIndex] = useState(0)
  useRequireAuth("employee")

  const [s, setS] = useState({ upcomingShifts: 0, hoursThisWeek: 0, totalEarnings: 0, notifications: 0 })

  useEffect(() => {
    ;(async () => {
      try {
        const [dash, notif]: any = await Promise.all([
          api.employeeDashboard(),
          api.notifications({ unread: true }),
        ])
        setS({
          upcomingShifts: dash.stats?.upcomingShifts ?? 0,
          hoursThisWeek: dash.stats?.hoursThisWeek ?? 0,
          totalEarnings: dash.stats?.totalEarnings ?? 0,
          notifications: notif.unreadCount ?? 0,
        })
      } catch {
        /* keep zeros */
      }
    })()
  }, [])

  const stats = [
    { label: "Upcoming Shifts", value: s.upcomingShifts, sub: "Next 7 days", icon: <CalendarMonthIcon color="primary" /> },
    { label: "Hours Worked", value: s.hoursThisWeek, sub: "This week", icon: <AccessTimeIcon color="primary" /> },
    { label: "Earnings", value: `$${s.totalEarnings.toLocaleString()}`, sub: "Lifetime", icon: <CreditCardIcon color="primary" /> },
    { label: "Notifications", value: s.notifications, sub: "Unread messages", icon: <NotificationsIcon color="primary" /> },
  ]

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {stats.map((item) => (
          <Paper
            key={item.label}
            elevation={3}
            sx={{
              p: 2,
              flex: "1 1 200px",
              minWidth: "200px",
              transition: "box-shadow 0.2s",
              "&:hover": { boxShadow: 6 },
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="subtitle2" color="text.secondary">
                {item.label}
              </Typography>
              {item.icon}
            </Box>
            <Typography variant="h5" fontWeight="bold">
              {item.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.sub}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Box>
        <Tabs
          value={tabIndex}
          onChange={(_, newValue) => setTabIndex(newValue)}
          sx={{ mb: 2 }}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="My Schedule" />
          <Tab label="My Stats" />
        </Tabs>

        {tabIndex === 0 && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6">Upcoming Schedule</Typography>
            <Typography variant="body2" color="text.secondary">
              View your upcoming shifts for the next 7 days
            </Typography>
            <Divider sx={{ my: 2 }} />
            <EmployeeSchedule />
          </Paper>
        )}

        {tabIndex === 1 && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6">Work Statistics</Typography>
            <Typography variant="body2" color="text.secondary">
              Your work hours and performance over time
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ height: 300 }}>
              <EmployeeStats />
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  )
}
