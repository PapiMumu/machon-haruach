import React, { useEffect } from "react";
import { ApiHelper, Locale } from "@machonharuach/apphelper";
import { Box, Button, Stack, TextField } from "@mui/material";
import type { SongDetailInterface } from "../../../helpers";
import {
  mergeSongDetailCredits,
  normalizeSongDetailCredits,
  songDetailSavePayload
} from "../helpers/albumTracksHelper";

interface Props {
  songDetail: SongDetailInterface;
  onSave: (saved: SongDetailInterface) => void;
  onCancel: () => void;
}

export function SongCreditsEdit({ songDetail: initial, onSave, onCancel }: Props) {
  const [songDetail, setSongDetail] = React.useState<SongDetailInterface>(initial);

  useEffect(() => {
    setSongDetail(initial);
  }, [initial]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSongDetail((sd) => ({ ...sd, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    const payload = songDetailSavePayload(normalizeSongDetailCredits(songDetail));
    const result = (await ApiHelper.post("/songDetails", [payload], "ContentApi")) as SongDetailInterface[];
    const fromApi = Array.isArray(result) && result[0] ? result[0] : payload;
    onSave(mergeSongDetailCredits(payload, fromApi));
  };

  return (
    <Box>
      <Stack spacing={2}>
        <TextField
          label={Locale.label("songs.credits.featuredArtists", "Featured artists")}
          name="featuredArtists"
          value={songDetail.featuredArtists || ""}
          onChange={handleChange}
          fullWidth
          size="small"
          placeholder={Locale.label("placeholders.song.featuredArtists", "e.g. Jane Doe, John Smith")}
        />
        <TextField
          label={Locale.label("songs.credits.producer", "Producer")}
          name="producer"
          value={songDetail.producer || ""}
          onChange={handleChange}
          fullWidth
          size="small"
          placeholder={Locale.label("placeholders.song.producer", "Producer name")}
        />
        <TextField
          label={Locale.label("songs.credits.composer", "Composer")}
          name="composer"
          value={songDetail.composer || ""}
          onChange={handleChange}
          fullWidth
          size="small"
        />
        <TextField
          label={Locale.label("songs.credits.lyricist", "Lyricist")}
          name="lyricist"
          value={songDetail.lyricist || ""}
          onChange={handleChange}
          fullWidth
          size="small"
        />
        <TextField
          label={Locale.label("songs.credits.genre", "Genre")}
          name="genre"
          value={songDetail.genre || ""}
          onChange={handleChange}
          fullWidth
          size="small"
          placeholder={Locale.label("placeholders.song.genre", "e.g. Worship, Gospel")}
        />
        <TextField
          label={Locale.label("songs.credits.recordLabel", "Record label")}
          name="recordLabel"
          value={songDetail.recordLabel || ""}
          onChange={handleChange}
          fullWidth
          size="small"
        />
      </Stack>
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
        <Button size="small" onClick={onCancel}>
          {Locale.label("common.cancel", "Cancel")}
        </Button>
        <Button size="small" variant="contained" onClick={() => void handleSave()}>
          {Locale.label("common.save", "Save")}
        </Button>
      </Stack>
    </Box>
  );
}
