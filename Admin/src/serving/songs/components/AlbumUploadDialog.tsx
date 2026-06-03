import React, { useRef, useState } from "react";
import {
  TextField,
  Alert,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from "@mui/material";
import {
  Album as AlbumIcon,
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon,
  AudioFile as AudioFileIcon,
  Image as ImageIcon
} from "@mui/icons-material";
import { ApiHelper, Locale } from "@machonharuach/apphelper";
import { applyCoverToSongDetail } from "../helpers/albumCoverHelper";
import { createAlbumTrackRecords, saveHostedAudioLink } from "../helpers/albumTrackUploadHelper";
import {
  mediaUrlFromUploadedFile,
  titleFromAudioFileName,
  uploadContentFile
} from "../helpers/songFileUploadHelper";
import type { SongInterface } from "../../../helpers";

interface Props {
  onClose: () => void;
  onComplete: (uploadedCount: number) => void;
}

export function AlbumUploadDialog({ onClose, onComplete }: Props) {
  const [album, setAlbum] = useState("");
  const [artist, setArtist] = useState("");
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
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

  const onCoverSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setCoverFile(file || null);
    e.target.value = "";
  };

  const handleUpload = async () => {
    setError("");
    if (!album.trim() || !artist.trim()) {
      setError(Locale.label("songs.albumUpload.albumArtistRequired", "Enter album name and artist."));
      return;
    }
    if (!audioFiles.length) {
      setError(Locale.label("songs.albumUpload.noTracks", "Add at least one audio file for this album."));
      return;
    }

    setUploading(true);
    setProgress(0);
    createdSongIdsRef.current = [];

    const albumName = album.trim();
    const artistName = artist.trim();
    const trackCount = audioFiles.length;
    const hasCover = Boolean(coverFile);
    const totalSteps = trackCount + (hasCover ? 1 : 0);
    let step = 0;

    const bumpProgress = () => {
      step += 1;
      setProgress(Math.min(100, Math.round((step / totalSteps) * 100)));
    };

    try {
      let coverUrl = "";
      let coverName = "";
      const detailIds: string[] = [];

      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        const trackTitle = titleFromAudioFileName(file.name) || `Track ${i + 1}`;

        setStatus(
          Locale.label("songs.albumUpload.uploadingTrack", "Uploading track {{n}} of {{total}}: {{title}}")
            .replace("{{n}}", String(i + 1))
            .replace("{{total}}", String(trackCount))
            .replace("{{title}}", trackTitle)
        );

        const { songDetailId, songId } = await createAlbumTrackRecords(artistName, albumName, trackTitle);
        createdSongIdsRef.current.push(songId);
        detailIds.push(songDetailId);

        if (hasCover && i === 0 && coverFile) {
          setStatus(Locale.label("songs.albumUpload.uploadingCover", "Uploading album cover…"));
          const uploadedCover = await uploadContentFile(coverFile, "songCover", songDetailId);
          coverUrl = mediaUrlFromUploadedFile(uploadedCover);
          coverName = coverFile.name;
          bumpProgress();
        }

        const uploadedAudio = await uploadContentFile(file, "song", songDetailId);
        const audioUrl = mediaUrlFromUploadedFile(uploadedAudio);
        await saveHostedAudioLink(songDetailId, audioUrl, file.name);
        bumpProgress();
      }

      if (coverUrl) {
        setStatus(Locale.label("songs.albumUpload.applyingCover", "Applying cover art to tracks…"));
        for (const detailId of detailIds) {
          await applyCoverToSongDetail(detailId, coverUrl, coverName);
        }
      }

      const count = createdSongIdsRef.current.length;
      createdSongIdsRef.current = [];
      onComplete(count);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || Locale.label("songs.albumUpload.failed", "Could not upload album."));
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
    <Dialog open onClose={handleClose} maxWidth="sm" fullWidth data-testid="album-upload-dialog">
      <DialogTitle>{Locale.label("songs.albumUpload.header", "Upload album")}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {Locale.label(
            "songs.albumUpload.instructions",
            "Enter album and artist, add track audio files, and optionally album cover art. All files are stored in your church AWS storage."
          )}
        </Typography>
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
        <TextField
          label={Locale.label("songs.albumUpload.albumName", "Album name")}
          value={album}
          onChange={(e) => setAlbum(e.target.value)}
          fullWidth
          required
          size="small"
          sx={{ mb: 2 }}
          disabled={uploading}
        />
        <TextField
          label={Locale.label("songs.details.artist", "Artist")}
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          fullWidth
          required
          size="small"
          sx={{ mb: 2 }}
          disabled={uploading}
        />
        <Box
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            border: "2px dashed",
            borderColor: "divider",
            bgcolor: "var(--bg-sub)"
          }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <AudioFileIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2">{Locale.label("songs.albumUpload.tracks", "Album tracks")}</Typography>
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
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: "2px dashed",
            borderColor: "divider",
            bgcolor: "var(--bg-sub)"
          }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <AlbumIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2">{Locale.label("songs.albumUpload.cover", "Album cover (optional)")}</Typography>
          </Stack>
          {coverFile ? (
            <Chip icon={<ImageIcon />} label={coverFile.name} size="small" sx={{ mb: 1.5 }} />
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {Locale.label("songs.albumUpload.coverHint", "One image used as cover art for every track on this album.")}
            </Typography>
          )}
          <Button variant="outlined" size="small" disabled={uploading} onClick={() => coverInputRef.current?.click()}>
            {Locale.label("songs.coverArt.chooseFile", "Choose image")}
          </Button>
          <input ref={coverInputRef} type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.gif" hidden onChange={onCoverSelected} />
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
          data-testid="album-upload-submit">
          {Locale.label("songs.albumUpload.uploadButton", "Upload album")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
