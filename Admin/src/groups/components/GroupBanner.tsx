import { type GroupInterface, type GroupServiceTimeInterface } from "@machonharuach/helpers";
import { UserHelper, Permissions, ApiHelper, Locale } from "@machonharuach/apphelper";
import { Typography, Chip, IconButton, Stack, Box, Tooltip } from "@mui/material";
import {
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  GroupOutlined as GroupIcon,
  Sms as SmsIcon,
  Email as EmailIcon
} from "@mui/icons-material";
import React, { memo, useMemo } from "react";
import { SendTextDialog } from "./SendTextDialog";
import { SendEmailDialog } from "./SendEmailDialog";

interface Props {
  group: GroupInterface;
  onEdit?: () => void;
  editMode?: boolean;
}

const OTHER_CATEGORY_LABEL = "Other Category";

export const GroupBanner = memo((props: Props) => {
  const { group, onEdit, editMode } = props;
  const [groupServiceTimes, setGroupServiceTimes] = React.useState<GroupServiceTimeInterface[]>([]);
  const [showTextDialog, setShowTextDialog] = React.useState(false);
  const [showEmailDialog, setShowEmailDialog] = React.useState(false);
  const [hasTextingProvider, setHasTextingProvider] = React.useState(false);

  const canEdit = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.groups.edit), []);
  const canText = useMemo(() => UserHelper.checkAccess(Permissions.messagingApi.texting.send), []);

  React.useEffect(() => {
    if (canText) {
      ApiHelper.get("/texting/providers", "MessagingApi")
        .then((data: any[]) => setHasTextingProvider(data?.length > 0))
        .catch(() => setHasTextingProvider(false));
    }
  }, [canText]);

  React.useEffect(() => {
    if (group?.id) {
      ApiHelper.get("/groupservicetimes?groupId=" + group.id, "AttendanceApi")
        .then((data) => setGroupServiceTimes(data))
        .catch(() => setGroupServiceTimes([]));
    }
  }, [group?.id]);

  const isStandard = useMemo(() => group?.tags?.indexOf("standard") > -1, [group?.tags]);

  const groupType = useMemo(() => {
    if (!group?.tags) return null;
    if (group.tags.indexOf("team") > -1) {
      return (
        <Chip
          label={Locale.label("groups.groupBanner.team")}
          size="small"
          sx={{
            backgroundColor: "rgba(255,255,255,0.14)",
            color: "#FFF",
            border: "1px solid rgba(255,255,255,0.22)",
            fontWeight: 500,
            fontSize: "0.78rem"
          }}
        />
      );
    }
    if (group.tags.indexOf("standard") > -1) {
      const categoryLabel = (group.categoryName || "").trim() || OTHER_CATEGORY_LABEL;
      return (
        <Chip
          label={categoryLabel}
          size="small"
          sx={{
            backgroundColor: "rgba(255,255,255,0.14)",
            color: "#FFF",
            border: "1px solid rgba(255,255,255,0.22)",
            fontWeight: 500,
            fontSize: "0.78rem"
          }}
        />
      );
    }
    return null;
  }, [group?.tags, group?.categoryName]);

  const quickStats = useMemo(() => {
    if (!group) return [];
    const stats = [];

    if (isStandard && group.meetingTime) {
      stats.push({
        icon: <ScheduleIcon sx={{ color: "#fff", fontSize: 16, mr: 0.5 }} />,
        value: group.meetingTime
      });
    }

    if (group.meetingLocation) {
      stats.push({
        icon: <LocationIcon sx={{ color: "#fff", fontSize: 16, mr: 0.5 }} />,
        value: group.meetingLocation
      });
    }

    return stats;
  }, [group, isStandard, groupServiceTimes]);

  if (!group) return null;

  return (
    <Box
      sx={{
        color: "#FFF",
        backgroundColor: "var(--bg-card)",
        backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderTop: "none",
        borderRadius: "0 0 14px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
        px: { xs: 2, sm: 3 },
        py: 2
      }}
    >
      <Stack spacing={1.75}>
        <Stack direction="row" justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2} flexWrap="wrap">
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 60,
                height: 36,
                borderRadius: 1.5,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.2)",
                flexShrink: 0,
                backgroundColor: group.photoUrl ? "transparent" : "rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {group.photoUrl
                ? <img src={group.photoUrl} alt={group.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <GroupIcon sx={{ fontSize: 22, color: "rgba(255,255,255,0.75)" }} />}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography sx={{ color: "#FFF", fontWeight: 500, fontSize: { xs: "1.08rem", md: "1.28rem" }, lineHeight: 1.2, wordBreak: "break-word" }}>
                  {group.name}
                </Typography>
                {groupType}
              </Stack>
              {quickStats.length > 0 && (
                <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                  {quickStats.map((stat, idx) => (
                    <Stack key={`quickstat-${stat.value}-${idx}`} direction="row" alignItems="center" spacing={0.5}>
                      {stat.icon}
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)", fontSize: "0.86rem" }}>
                        {stat.value}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="Email this group">
              <IconButton size="small" sx={{ color: "#FFF", backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }} onClick={() => setShowEmailDialog(true)}>
                <EmailIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canText && hasTextingProvider && (
              <Tooltip title="Text this group">
                <IconButton size="small" sx={{ color: "#FFF", backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }} onClick={() => setShowTextDialog(true)}>
                  <SmsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canEdit && (
              <Tooltip title="Edit group">
                <IconButton size="small" sx={{ color: "#FFF", backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }} onClick={onEdit}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Stack>
      {showTextDialog && (
        <SendTextDialog
          groupId={group?.id}
          groupName={group?.name}
          onClose={() => setShowTextDialog(false)}
        />
      )}
      {showEmailDialog && (
        <SendEmailDialog
          groupId={group?.id}
          groupName={group?.name}
          onClose={() => setShowEmailDialog(false)}
        />
      )}
    </Box>
  );
});
