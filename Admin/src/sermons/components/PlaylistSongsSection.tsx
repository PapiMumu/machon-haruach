import React from "react";
import {
  Box,
  Typography,
  Stack,
  Checkbox,
  FormControlLabel,
  TextField,
  InputAdornment,
  CircularProgress
} from "@mui/material";
import { Search as SearchIcon, MusicNote as MusicNoteIcon } from "@mui/icons-material";
import { ApiHelper, Locale } from "@machonharuach/apphelper";
import { useQuery } from "@tanstack/react-query";
import type { SongDetailInterface } from "../../helpers";

interface Props {
  playlistId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const PlaylistSongsSection: React.FC<Props> = ({ playlistId, selectedIds, onChange }) => {
  const [search, setSearch] = React.useState("");

  const songs = useQuery<SongDetailInterface[]>({
    queryKey: ["/songDetails", "ContentApi", "playlist-picker"],
    queryFn: async () => {
      const data = await ApiHelper.get("/songDetails", "ContentApi");
      return Array.isArray(data) ? data : [];
    }
  });

  const playlistSongs = useQuery<{ songDetailId: string }[]>({
    queryKey: ["/playlists/" + playlistId + "/songs", "ContentApi"],
    enabled: !!playlistId,
    queryFn: async () => {
      const data = await ApiHelper.get("/playlists/" + playlistId + "/songs", "ContentApi");
      return Array.isArray(data) ? data : [];
    }
  });

  React.useEffect(() => {
    if (!playlistSongs.data?.length || selectedIds.length > 0) return;
    onChange(playlistSongs.data.map((r) => r.songDetailId).filter(Boolean));
  }, [playlistSongs.data]);

  const filtered = React.useMemo(() => {
    const list = songs.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        (s.title || "").toLowerCase().includes(q) ||
        (s.artist || "").toLowerCase().includes(q) ||
        (s.album || "").toLowerCase().includes(q)
    );
  }, [songs.data, search]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  };

  if (songs.isLoading || playlistSongs.isLoading) {
    return (
      <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <MusicNoteIcon sx={{ color: "primary.main" }} />
        <Typography variant="h6" sx={{ color: "primary.main" }}>
          {Locale.label("sermons.playlists.playlistEdit.musicTracks", "Tracks in this playlist")}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {Locale.label(
          "sermons.playlists.playlistEdit.musicTracksHelp",
          "Select songs from your church music library. Members will see these tracks in the Machon HaRuach Mobile Music tab."
        )}
      </Typography>
      <TextField
        fullWidth
        size="small"
        placeholder={Locale.label("sermons.playlists.playlistEdit.searchSongs", "Search songs…")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          )
        }}
      />
      <Stack spacing={0.5} sx={{ maxHeight: 320, overflow: "auto" }}>
        {filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {Locale.label("sermons.playlists.playlistEdit.noSongsMatch", "No songs match your search.")}
          </Typography>
        ) : (
          filtered.map((song) => {
            const id = song.id!;
            const label = [song.title, song.artist].filter(Boolean).join(" · ") || id;
            return (
              <FormControlLabel
                key={id}
                control={<Checkbox checked={selectedIds.includes(id)} onChange={() => toggle(id)} />}
                label={
                  <Box>
                    <Typography variant="body2">{label}</Typography>
                    {song.album ? (
                      <Typography variant="caption" color="text.secondary">
                        {song.album}
                      </Typography>
                    ) : null}
                  </Box>
                }
              />
            );
          })
        )}
      </Stack>
    </Box>
  );
};
