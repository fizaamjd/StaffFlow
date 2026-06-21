
"use client"

import React, { useEffect, useState } from "react"
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Chip, CircularProgress, Button } from "@mui/material"
import { CalendarMonth, AccessTime } from "@mui/icons-material"
import { api } from "@/lib/api"

export function EmployeeSchedule() {
  const [shifts, setShifts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const res: any = await api.listShifts({ from: today, limit: 50 })
      setShifts(res.shifts || [])
    } catch {
      setShifts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const respond = async (id: string, action: "confirm" | "decline") => {
    try {
      await api.respondShift(id, action)
      load()
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (shifts.length === 0) {
    return (
      <Typography sx={{ color: "#64748b", fontFamily: '"Inter", sans-serif', p: 2 }}>
        You have no upcoming shifts.
      </Typography>
    )
  }

  return (
    <Box sx={{ width: "100%" }}>
      <TableContainer
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: "0.5rem",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          overflowX: "auto",
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              <TableCell>
                <Typography
                  sx={{
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: 600,
                    color: "#333",
                    fontSize: "0.875rem",
                  }}
                >
                  Day
                </Typography>
              </TableCell>
              <TableCell>
                <Typography
                  sx={{
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: 600,
                    color: "#333",
                    fontSize: "0.875rem",
                  }}
                >
                  Date
                </Typography>
              </TableCell>
              <TableCell>
                <Typography
                  sx={{
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: 600,
                    color: "#333",
                    fontSize: "0.875rem",
                  }}
                >
                  Time
                </Typography>
              </TableCell>
              <TableCell>
                <Typography
                  sx={{
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: 600,
                    color: "#333",
                    fontSize: "0.875rem",
                  }}
                >
                  Department
                </Typography>
              </TableCell>
              <TableCell>
                <Typography
                  sx={{
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: 600,
                    color: "#333",
                    fontSize: "0.875rem",
                  }}
                >
                  Status
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.map((shift) => (
              <TableRow
                key={shift._id}
                sx={{
                  "&:hover": {
                    bgcolor: "#f8fafc",
                    transition: "background-color 0.2s ease",
                  },
                }}
              >
                <TableCell>
                  <Typography
                    sx={{
                      fontFamily: '"Inter", sans-serif',
                      fontWeight: 500,
                      color: "#333",
                      fontSize: "0.875rem",
                    }}
                  >
                    {shift.day}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CalendarMonth sx={{ color: "#03306b", fontSize: 16 }} />
                    <Typography
                      sx={{
                        fontFamily: '"Inter", sans-serif',
                        fontSize: "0.875rem",
                        color: "#333",
                      }}
                    >
                      {shift.date}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <AccessTime sx={{ color: "#03306b", fontSize: 16 }} />
                    <Typography
                      sx={{
                        fontFamily: '"Inter", sans-serif',
                        fontSize: "0.875rem",
                        color: "#333",
                      }}
                    >
                      {shift.startTime} - {shift.endTime}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography
                    sx={{
                      fontFamily: '"Inter", sans-serif',
                      fontSize: "0.875rem",
                      color: "#333",
                    }}
                  >
                    {shift.department}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                      label={shift.status.charAt(0).toUpperCase() + shift.status.slice(1)}
                      color={shift.status === "confirmed" ? "primary" : "default"}
                      sx={{
                        fontFamily: '"Inter", sans-serif',
                        fontWeight: 500,
                        fontSize: "0.75rem",
                        bgcolor: shift.status === "confirmed" ? "#03306b" : "transparent",
                        color: shift.status === "confirmed" ? "white" : "#03306b",
                        borderColor: "#03306b",
                        borderWidth: shift.status === "confirmed" ? 0 : 1,
                        borderStyle: shift.status === "confirmed" ? "none" : "solid",
                      }}
                    />
                    {shift.status === "pending" && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => respond(shift._id, "confirm")}
                        sx={{ textTransform: "none", bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" }, fontSize: "0.7rem", py: 0.25 }}
                      >
                        Confirm
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
