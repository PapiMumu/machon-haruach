import React, { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography
} from "@mui/material";
import {
  AudioFile as AudioFileIcon,
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon
} from "@mui/icons-material";
import { ApiHelper, Locale } from "@machonharuach/apphelper";
import { applyCoverToSongDetail } from "../helpers/albumCoverHelper";
import {
  createAlbumTrackRecords,
  findAlbumCoverUrlFromTracks,
  saveHostedAudioLink
} from "../helpers/albumTrackUploadHelper";
import {
  mediaUrlFromUploadedFile,
  titleFromAudioFileName,
  uploadContentFile
} from "../helpers/songFileUploadHelper";
import type { SongDetailInterface } from "../../../helpers";

interface Props {
  album: string;
  artist: string;
  existingTracks: SongDetailInterface[];
  onClose: () => void;
  onComplete: (addedCount: number) => void;
}

export function AlbumAddTracksDialog({ album, artist, existingTracks, onClose, onComplete }: Props) {
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const audioInputRef = useRef<HTMLInputElement>(null);
  const createdSongIdsRef = useRef<string[]>([]);

  const rollbackSongs = async () => {
    for (const id of createdSongIdsRef.current) {
      try {
        await ApiHelper.delete("/songs/" + id, "ContentApi");
      } catch {
        /* best effort */
      }
    }
    createdSongIdsRef.current = [];
  };

  const onAudioSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    setAudioFiles(Array.from(list));
    e.target.value = "";
  };

  const handleUpload = async () => {
    setError("");
    if (!audioFiles.length) {
      setError(Locale.label("songs.albumTracks.addTracksNoFiles", "Select at least one audio file to add."));
      return;
    }

    setUploading(true);
    setProgress(0);
    createdSongIdsRef.current = [];

    const albumName = album.trim();
    const artistName = artist.trim();
    const trackCount = audioFiles.length;
    const albumCoverUrl = findAlbumCoverUrlFromTracks(existingTracks);

    try {
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        const trackTitle = titleFromAudioFileName(file.name) || `Track ${existingTracks.length + i + 1}`;

        setStatus(
          Locale.label("songs.albumUpload.uploadingTrack", "Uploading track {{n}} of {{total}}: {{title}}")
            .replace("{{n}}", String(i + 1))
            .replace("{{total}}", String(trackCount))
            .replace("{{title}}", trackTitle)
        );

        const { songDetailId, songId } = await createAlbumTrackRecords(artistName, albumName, trackTitle);
        createdSongIdsRef.current.push(songId);

        const uploadedAudio = await uploadContentFile(file, "song", songDetailId);
        const audioUrl = mediaUrlFromUploadedFile(uploadedAudio);
        await saveHostedAudioLink(songDetailId, audioUrl, file.name);

        if (albumCoverUrl) {
          await applyCoverToSongDetail(songDetailId, albumCoverUrl, "album-cover");
        }

        setProgress(Math.min(100, Math.round(((i + 1) / trackCount) * 100)));
      }

      const count = createdSongIdsRef.current.length;
      createdSongIdsRef.current = [];
      onComplete(count);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || Locale.label("songs.albumTracks.addTracksFailed", "Could not add tracks to this album."));
      await rollbackSongs();
    } finally {
      setUploading(false);
      setStatus("");
    }
  };

  const handleClose = () => {
    if (uploading) return;
    void rollbackSongs();
    onClose();
  };

  return (
    <Dialog open onClose={handleClose} maxWidth="sm" fullWidth data-testid="album-add-tracks-dialog">
      <DialogTitle>{Locale.label("songs.albumTracks.addTracksTitle", "Add tracks to album")}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {Locale.label(
            "songs.albumTracks.addTracksInstructions",
            "Upload additional audio files for this album. They are stored in your church cloud storage."
          )}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Chip label={album} size="small" variant="outlined" />
          <Chip label={artist} size="small" variant="outlined" />
        </Stack>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        ) : null}
        {uploading ? (
          <Box sx={{ mb: 2 }}>
            <LinearProgress variant="determinate" value={progress} sx={{ mb: 1, borderRadius: 1 }} />
            <Typography variant="caption" color="text.secondary">
              {status || `${progress}%`}
            </Typography>
          </Box>
        ) : null}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: "2px dashed",
            borderColor: "divider",
            bgcolor: "var(--bg-sub)"
          }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <AudioFileIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2">
              {Locale.label("songs.albumUpload.tracks", "Album tracks")}
            </Typography>
          </Stack>
          {audioFiles.length > 0 ? (
            <List dense disablePadding sx={{ mb: 1.5, maxHeight: 160, overflow: "auto" }}>
              {audioFiles.map((f) => (
                <ListItem key={f.name + f.size} disableGutters sx={{ py: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <FileIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={titleFromAudioFileName(f.name) || f.name}
                    secondary={f.name}
                    primaryTypographyProps={{ variant: "body2" }}
                    secondaryTypographyProps={{ variant: "caption" }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {Locale.label("songs.albumUpload.tracksHint", "Select one or more audio files (MP3, M4A, WAV, etc.).")}
            </Typography>
          )}
          <Button variant="outlined" size="small" disabled={uploading} onClick={() => audioInputRef.current?.click()}>
            {Locale.label("songs.albumUpload.chooseTracks", "Choose tracks")}
          </Button>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac"
            multiple
            hidden
            onChange={onAudioSelected}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          {Locale.label("common.cancel", "Cancel")}
        </Button>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={handleUpload}
          disabled={uploading}
          data-testid="album-add-tracks-submit">
          {Locale.label("songs.albumTracks.addTracksButton", "Add tracks")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
