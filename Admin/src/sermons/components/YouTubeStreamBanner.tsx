import React from "react";
import { Alert, Stack, Typography } from "@mui/material";
import { LiveTv as LiveTvIcon } from "@mui/icons-material";
import { Locale } from "@machonharuach/apphelper";

export const YouTubeStreamBanner: React.FC = () => (
  <Alert severity="info" icon={<LiveTvIcon />} sx={{ mb: 2 }}>
    <Stack spacing={0.5}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {Locale.label("sermons.liveStreamTimes.youtubeConnect.title")}
      </Typography>
      <Typography variant="body2">
        {Locale.label("sermons.liveStreamTimes.youtubeConnect.summary")}
      </Typography>
    </Stack>
  </Alert>
);
