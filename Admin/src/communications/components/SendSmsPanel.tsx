import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent
} from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import { ApiHelper, DisplayBox, Locale } from "@machonharuach/apphelper";
import type { GroupInterface } from "@machonharuach/helpers";
import { Link } from "react-router-dom";

const MESSAGE_TEMPLATES = [
  {
    key: "announcement",
    labelKey: "communications.send.templateAnnouncement",
    defaultLabel: "Announcement",
    text: "Join us this Sunday! We look forward to seeing you."
  },
  {
    key: "thankYou",
    labelKey: "communications.send.templateThankYou",
    defaultLabel: "Thank you",
    text: "Thank you for joining us today. We are grateful you were part of our service."
  },
  {
    key: "reminder",
    labelKey: "communications.send.templateReminder",
    defaultLabel: "Reminder",
    text: "Reminder: Our service starts soon. See you there!"
  }
];

interface SendResult {
  totalMembers?: number;
  recipientCount: number;
  successCount: number;
  failCount: number;
  optedOutCount?: number;
  noPhoneCount?: number;
  error?: string;
}

export const SendSmsPanel: React.FC = () => {
  const [groups, setGroups] = React.useState<GroupInterface[]>([]);
  const [groupId, setGroupId] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [hasProvider, setHasProvider] = React.useState<boolean | null>(null);
  const [preview, setPreview] = React.useState<{ eligibleCount: number; totalMembers: number; optedOutCount: number; noPhoneCount: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<SendResult | null>(null);
  const [error, setError] = React.useState("");

  const charCount = message.length;
  const segmentCount = charCount <= 160 ? 1 : Math.ceil(charCount / 153);

  React.useEffect(() => {
    ApiHelper.get("/groups", "MembershipApi").then((data: GroupInterface[]) => {
      const list = (data || []).filter((g) => g.id && g.name).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setGroups(list);
      if (list.length && !groupId) setGroupId(list[0].id!);
    });
    ApiHelper.get("/texting/providers", "MessagingApi")
      .then((providers: { enabled?: boolean }[]) => setHasProvider(!!providers?.length && !!providers[0]?.enabled))
      .catch(() => setHasProvider(false));
  }, []);

  React.useEffect(() => {
    if (!groupId) {
      setPreview(null);
      return;
    }
    setLoadingPreview(true);
    ApiHelper.get("/texting/preview/" + groupId, "MessagingApi")
      .then((data) => setPreview(data))
      .catch(() => setPreview(null))
      .finally(() => setLoadingPreview(false));
  }, [groupId]);

  const handleGroupChange = (e: SelectChangeEvent) => {
    setGroupId(e.target.value);
    setResult(null);
    setError("");
  };

  const applyTemplate = (text: string) => {
    setMessage(text);
    setResult(null);
    setError("");
  };

  const handleSend = async () => {
    if (!groupId || !message.trim()) return;
    setSending(true);
    setError("");
    setResult(null);
    try {
      const resp = await ApiHelper.post("/texting/send", { groupId, message: message.trim() }, "MessagingApi");
      if (resp?.error) {
        setError(resp.error);
      } else {
        setResult(resp);
        setMessage("");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send text message.");
    } finally {
      setSending(false);
    }
  };

  const canSend = hasProvider && groupId && message.trim() && !sending && (!preview || preview.eligibleCount > 0);

  return (
    <DisplayBox headerIcon="sms" headerText={Locale.label("communications.send.title")} editContent={false} id="sendSmsBox">
      <Stack spacing={2.5}>
        {hasProvider === false ? (
          <Alert severity="warning">
            {Locale.label("communications.send.noProvider")}{" "}
            <Link to="/settings">{Locale.label("communications.send.configureProvider")}</Link>
          </Alert>
        ) : null}

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            {Locale.label("communications.send.quickTemplates")}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {MESSAGE_TEMPLATES.map((t) => (
              <Chip
                key={t.key}
                label={Locale.label(t.labelKey, t.defaultLabel)}
                onClick={() => applyTemplate(t.text)}
                variant="outlined"
                clickable
              />
            ))}
          </Stack>
        </Box>

        <FormControl fullWidth size="small">
          <InputLabel>{Locale.label("communications.send.recipientGroup")}</InputLabel>
          <Select label={Locale.label("communications.send.recipientGroup")} value={groupId} onChange={handleGroupChange}>
            {groups.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {loadingPreview ? (
          <Typography variant="body2" color="text.secondary">
            {Locale.label("communications.send.loadingRecipients")}
          </Typography>
        ) : preview ? (
          <Alert severity={preview.eligibleCount > 0 ? "info" : "warning"}>
            <strong>{preview.eligibleCount}</strong> of {preview.totalMembers}{" "}
            {Locale.label("communications.send.willReceive")}
            {preview.optedOutCount > 0 ? ` · ${preview.optedOutCount} opted out` : ""}
            {preview.noPhoneCount > 0 ? ` · ${preview.noPhoneCount} no phone` : ""}
          </Alert>
        ) : null}

        <TextField
          fullWidth
          multiline
          minRows={4}
          label={Locale.label("communications.send.message")}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setResult(null);
            setError("");
          }}
          disabled={sending}
          inputProps={{ maxLength: 1600 }}
        />
        <Typography variant="caption" color="text.secondary">
          {charCount} {Locale.label("communications.send.characters")} ({segmentCount}{" "}
          {Locale.label("communications.send.segments")})
        </Typography>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {result ? (
          <Alert severity={result.failCount === 0 ? "success" : "warning"}>
            {Locale.label("communications.send.sentSummary", "{{success}} of {{total}} delivered")
              .replace("{{success}}", String(result.successCount))
              .replace("{{total}}", String(result.recipientCount))}
            {result.failCount > 0 ? ` · ${result.failCount} failed` : ""}
          </Alert>
        ) : null}

        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
            onClick={handleSend}
            disabled={!canSend}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {sending ? Locale.label("communications.send.sending") : Locale.label("communications.send.sendButton")}
          </Button>
        </Stack>
      </Stack>
    </DisplayBox>
  );
};
