import React from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import {
  CalendarMonth as CalendarMonthIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  LiveTv as LiveTvIcon
} from "@mui/icons-material";
import { Locale, Loading } from "@machonharuach/apphelper";
import type { AttendanceScheduleItem } from "../helpers/attendanceSchedule";

interface Props {
  items: AttendanceScheduleItem[];
  isLoading: boolean;
  linkedStreamingIds: Set<string>;
  onConfigureStream: (item: AttendanceScheduleItem) => void;
  onDelete?: (item: AttendanceScheduleItem) => void;
}

export const AttendanceScheduleList: React.FC<Props> = ({
  items,
  isLoading,
  linkedStreamingIds,
  onConfigureStream,
  onDelete
}) => {
  if (isLoading) return <Loading />;

  if (!items.length) {
    return (
      <Paper sx={{ p: 2.5, mb: 2, border: "1px solid var(--border-main)" }}>
        <Typography variant="body2" color="text.secondary">
          {Locale.label("sermons.liveStreamTimes.attendanceSchedule.empty")}
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ mb: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {Locale.label("sermons.liveStreamTimes.attendanceSchedule.title")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {Locale.label("sermons.liveStreamTimes.attendanceSchedule.subtitle")}
      </Typography>
      {items.map((item) => {
        const isLinked = linkedStreamingIds.has(`${item.sourceType}:${item.sourceId}`);
        return (
          <Paper
            key={`${item.sourceType}-${item.sourceId}`}
            sx={{
              p: 1.5,
              border: "1px solid var(--border-main)",
              borderRadius: 2,
              background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)"
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  {item.sourceType === "service" ? (
                    <CalendarMonthIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  ) : (
                    <EventIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  )}
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {item.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={
                      item.sourceType === "service"
                        ? Locale.label("sermons.liveStreamTimes.attendanceSchedule.service")
                        : Locale.label("sermons.liveStreamTimes.attendanceSchedule.event")
                    }
                    sx={{ height: 22 }}
                  />
                  {item.campusName ? (
                    <Chip size="small" variant="outlined" label={item.campusName} sx={{ height: 22 }} />
                  ) : null}
                  {isLinked ? (
                    <Chip
                      size="small"
                      color="success"
                      label={Locale.label("sermons.liveStreamTimes.attendanceSchedule.linked")}
                      sx={{ height: 22 }}
                    />
                  ) : null}
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Box sx={{ px: 1.1, py: 0.5, borderRadius: 999, border: "1px solid var(--border-main)" }}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>{Locale.label("sermons.liveStreamTimes.attendanceSchedule.date")}:</strong> {item.dateLabel}
                    </Typography>
                  </Box>
                  <Box sx={{ px: 1.1, py: 0.5, borderRadius: 999, border: "1px solid var(--border-main)" }}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>{Locale.label("sermons.liveStreamTimes.attendanceSchedule.time")}:</strong> {item.timeLabel}
                    </Typography>
                  </Box>
                  {item.leader ? (
                    <Box sx={{ px: 1.1, py: 0.5, borderRadius: 999, border: "1px solid var(--border-main)" }}>
                      <Typography variant="caption" color="text.secondary">
                        <strong>{Locale.label("sermons.liveStreamTimes.attendanceSchedule.leader")}:</strong> {item.leader}
                      </Typography>
                    </Box>
                  ) : null}
                </Stack>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<LiveTvIcon />}
                  onClick={() => onConfigureStream(item)}
                  sx={{ textTransform: "none" }}
                >
                  {isLinked
                    ? Locale.label("sermons.liveStreamTimes.attendanceSchedule.editStream")
                    : Locale.label("sermons.liveStreamTimes.attendanceSchedule.configureStream")}
                </Button>
                {onDelete ? (
                  <Tooltip
                    title={
                      isLinked
                        ? Locale.label("sermons.liveStreamTimes.attendanceSchedule.deleteLinked")
                        : Locale.label("common.delete", "Delete")
                    }
                    arrow
                  >
                    <IconButton
                      size="small"
                      variant="outlined"
                      onClick={() => onDelete(item)}
                      aria-label={Locale.label("common.delete", "Delete")}
                      sx={{
                        borderColor: "var(--border-main)",
                        color: "error.main",
                        "&:hover": {
                          backgroundColor: "error.main",
                          color: "white",
                          borderColor: "error.main"
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </Stack>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
};
