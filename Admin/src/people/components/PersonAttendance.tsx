import React, { memo, useMemo } from "react";
import { type AttendanceRecordInterface, type GroupInterface } from "@machonharuach/helpers";
import { ArrayHelper, DateHelper, UniqueIdHelper, Loading, Locale } from "@machonharuach/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Box, Card, CardContent, Typography, Stack, Divider, Paper, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { CalendarMonth as CalendarIcon, Group as GroupIcon, EventAvailable as EventIcon } from "@mui/icons-material";

interface Props {
  personId: string;
  updatedFunction?: () => void;
}

type PersonAttendanceRecord = AttendanceRecordInterface & { checkinTime?: Date | string };

export const PersonAttendance: React.FC<Props> = memo((props) => {
  const attendanceRecords = useQuery<PersonAttendanceRecord[]>({
    queryKey: ["/attendancerecords?personId=" + props.personId, "AttendanceApi"],
    enabled: !UniqueIdHelper.isMissing(props.personId),
    placeholderData: []
  });

  const groups = useQuery<GroupInterface[]>({
    queryKey: ["/groups", "MembershipApi"],
    placeholderData: []
  });

  const attendanceCards = useMemo(() => {
    if (!attendanceRecords.data || !groups.data) return null;
    const records = attendanceRecords.data;

    if (records.length === 0) {
      return (
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            backgroundColor: "grey.50",
            border: "1px dashed",
            borderColor: "grey.300"
          }}>
          <EventIcon sx={{ fontSize: 48, color: "grey.400", mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            {Locale.label("people.personAttendance.noAttMsg")}
          </Typography>
        </Paper>
      );
    }

    // Group records by date for better visual organization
    const groupedRecords = records.reduce(
      (acc, record) => {
        const dateKey = DateHelper.formatHtml5Date(record.visitDate);
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(record);
        return acc;
      },
      {} as Record<string, AttendanceRecordInterface[]>
    );

    return Object.entries(groupedRecords)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([date, dateRecords]) => (
        <Card
          key={date}
          sx={{
            mb: 2,
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: 2
            },
            "&:last-child": { mb: 0 }
          }}>
          <CardContent sx={{ pb: "16px !important" }}>
            <Stack spacing={2}>
              {/* Date Header */}
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <CalendarIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                  {new Date(new Date(date).getTime() + new Date(date).getTimezoneOffset() * 60000).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </Typography>
              </Box>

              <Divider sx={{ my: 1 }} />

              <Table sx={{ "& .MuiTableCell-root": { px: 1.5, py: 1.25, borderBottomColor: "grey.100" } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Check-in Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Check-in Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Group</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dateRecords.map((record, index) => {
                  const group = ArrayHelper.getOne(groups.data, "id", record.groupId);
                    const isEvent = !!record.serviceTime?.name && record.serviceTime.name !== record.service?.name;
                    const categoryLabel = isEvent ? "Event" : "Service";
                    const nameLabel = isEvent ? (record.serviceTime?.name || "-") : (record.service?.name || record.serviceTime?.name || "-");
                    const branchName = record.campus?.name || "Unassigned branch";
                    const rawCheckin = record.checkinTime ? new Date(record.checkinTime) : null;
                    const checkinTimeLabel = rawCheckin && !Number.isNaN(rawCheckin.getTime())
                      ? rawCheckin.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Time unavailable";
                    const rawVisitDate = record.visitDate ? new Date(record.visitDate) : null;
                    const checkinDateLabel = rawVisitDate && !Number.isNaN(rawVisitDate.getTime())
                      ? rawVisitDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                      : "-";

                  return (
                    <TableRow
                      key={`${date}-${index}`}
                      sx={{
                        "&:hover": { backgroundColor: "action.hover" },
                        "&:last-child td": { borderBottom: "none" }
                      }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                          {nameLabel}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: isEvent ? "info.main" : "secondary.main"
                          }}
                        >
                          {categoryLabel}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.primary">
                          {branchName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.primary">
                          {checkinDateLabel}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.primary">
                          {checkinTimeLabel}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {group ? (
                          <Link
                            to={`/groups/${group.id}`}
                            style={{
                              textDecoration: "none",
                              color: "inherit"
                            }}
                          >
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <GroupIcon sx={{ fontSize: 16, color: "success.main" }} />
                              <Typography variant="body2" sx={{ color: "success.main", fontWeight: 600 }}>
                                {group.name}
                              </Typography>
                            </Stack>
                          </Link>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </Stack>
          </CardContent>
        </Card>
      ));
  }, [attendanceRecords.data, groups.data]);

  const content = useMemo(() => {
    if (attendanceRecords.isLoading || groups.isLoading) return <Loading size="sm" />;
    return (
      <Box
        sx={{
          "& .MuiCard-root": {
            borderRadius: 2,
            border: "1px solid",
            borderColor: "grey.200"
          },
          "& .MuiChip-root": {
            fontWeight: 500,
            fontSize: "0.875rem"
          }
        }}>
        {attendanceCards}
      </Box>
    );
  }, [attendanceRecords.isLoading, groups.isLoading, attendanceCards]);

  return content;
});
