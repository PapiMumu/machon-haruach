import React from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent
} from "@mui/material";
import {
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
  LiveTv as LiveTvIcon,
  SettingsInputAntenna as SettingsInputAntennaIcon
} from "@mui/icons-material";
import { DisplayBox, Locale, UserHelper, CommonEnvironmentHelper } from "@machonharuach/apphelper";

type ObsProvider = "youtube_live" | "facebook_live" | "vimeo_live";

const OBS_SERVERS: Record<ObsProvider, { serverUrl: string; streamKeyUrl: string }> = {
  youtube_live: {
    serverUrl: "rtmps://a.rtmp.youtube.com/live2",
    streamKeyUrl: "https://studio.youtube.com/"
  },
  facebook_live: {
    serverUrl: "rtmps://live-api-s.facebook.com:443/rtmp/",
    streamKeyUrl: "https://www.facebook.com/live/producer"
  },
  vimeo_live: {
    serverUrl: "rtmps://rtmp-global.cloud.vimeo.com/live",
    streamKeyUrl: "https://vimeo.com/manage/events"
  }
};

export const ObsStreamSetup: React.FC = () => {
  const [provider, setProvider] = React.useState<ObsProvider>("youtube_live");
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const server = OBS_SERVERS[provider];
  const streamUrl =
    CommonEnvironmentHelper.B1Root.replace("{key}", UserHelper.currentUserChurch.church.subDomain) + "/stream";

  const copyText = (text: string, field: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const handleProviderChange = (e: SelectChangeEvent) => {
    setProvider(e.target.value as ObsProvider);
  };

  return (
    <DisplayBox
      headerIcon="settings_input_antenna"
      headerText={Locale.label("sermons.liveStreamTimes.obsSetup.title")}
      editContent={false}
      id="obsStreamSetupBox"
    >
      <Stack spacing={2.5}>
        <Alert severity="info" icon={<SettingsInputAntennaIcon />}>
          {Locale.label("sermons.liveStreamTimes.obsSetup.summary")}
        </Alert>

        <FormControl fullWidth size="small">
          <InputLabel>{Locale.label("sermons.liveStreamTimes.obsSetup.platform")}</InputLabel>
          <Select
            label={Locale.label("sermons.liveStreamTimes.obsSetup.platform")}
            value={provider}
            onChange={handleProviderChange}
          >
            <MenuItem value="youtube_live">{Locale.label("sermons.liveStreamTimes.obsSetup.youtube")}</MenuItem>
            <MenuItem value="facebook_live">{Locale.label("sermons.liveStreamTimes.obsSetup.facebook")}</MenuItem>
            <MenuItem value="vimeo_live">{Locale.label("sermons.liveStreamTimes.obsSetup.vimeo")}</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label={Locale.label("sermons.liveStreamTimes.obsSetup.serverUrl")}
          value={server.serverUrl}
          InputProps={{
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={Locale.label("sermons.liveStreamTimes.obsSetup.copy")}
                  onClick={() => copyText(server.serverUrl, "server")}
                  edge="end"
                >
                  {copiedField === "server" ? <CheckIcon color="success" /> : <ContentCopyIcon />}
                </IconButton>
              </InputAdornment>
            )
          }}
          helperText={Locale.label("sermons.liveStreamTimes.obsSetup.serverHelp")}
        />

        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {Locale.label("sermons.liveStreamTimes.obsSetup.streamKeyHelp")}
          </Typography>
          <Button variant="outlined" size="small" href={server.streamKeyUrl} target="_blank" rel="noopener noreferrer">
            {Locale.label("sermons.liveStreamTimes.obsSetup.openStreamKey")}
          </Button>
        </Box>

        <TextField
          fullWidth
          label={Locale.label("sermons.liveStreamTimes.obsSetup.memberViewUrl")}
          value={streamUrl}
          InputProps={{
            readOnly: true,
            startAdornment: (
              <InputAdornment position="start">
                <LiveTvIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={Locale.label("sermons.liveStreamTimes.obsSetup.copy")}
                  onClick={() => copyText(streamUrl, "view")}
                  edge="end"
                >
                  {copiedField === "view" ? <CheckIcon color="success" /> : <ContentCopyIcon />}
                </IconButton>
              </InputAdornment>
            )
          }}
          helperText={Locale.label("sermons.liveStreamTimes.obsSetup.memberViewHelp")}
        />
      </Stack>
    </DisplayBox>
  );
};
