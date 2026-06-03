import React, { useState, useCallback } from "react";
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
  Chip
} from "@mui/material";
import { CloudUpload as CloudUploadIcon, InsertDriveFile as FileIcon } from "@mui/icons-material";
import { ApiHelper, Locale } from "@machonharuach/apphelper";
import { FileUpload } from "../../../components/FileUpload";
import { resolveContentUrl, resolveUploadedContentPath } from "../../../helpers/ContentUrlHelper";
import type { FileInterface } from "../../../helpers/Interfaces";
import type { ArrangementInterface, ArrangementKeyInterface, SongDetailInterface, SongInterface } from "../../../helpers";

interface Props {
  onClose: () => void;
  onComplete: (songId: string) => void;
}

type CreatedIds = { songDetailId: string; songId: string };

/**
 * Create song records, then upload audio to AWS (streamingLive/songs/{songDetailId}/) via /files.
 */
export function MusicUploadDialog({ onClose, onComplete }: Props) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [songDetailId, setSongDetailId] = useState("");
  const [createdSongId, setCreatedSongId] = useState("");
  const [pendingFileSave, setPendingFileSave] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");

  const createSongEntities = useCallback(async (): Promise<CreatedIds> => {
    const songDetailPayload: SongDetailInterface = {
      title: title.trim(),
      artist: artist.trim(),
      album: album.trim() || undefined,
      seconds: 0,
      praiseChartsId: undefined
    };
    const [sd] = (await ApiHelper.post("/songDetails", [songDetailPayload], "ContentApi")) as SongDetailInterface[];
    const s: SongInterface = { name: sd.title || title.trim(), dateAdded: new Date() };
    const songsRes = (await ApiHelper.post("/songs", [s], "ContentApi")) as SongInterface[];
    const a: ArrangementInterface = {
      songId: songsRes[0].id,
      songDetailId: sd.id,
      name: "(Default)",
      lyrics: ""
    };
    const arrangements = (await ApiHelper.post("/arrangements", [a], "ContentApi")) as ArrangementInterface[];
    const key: ArrangementKeyInterface = {
      arrangementId: arrangements[0].id,
      keySignature: sd.keySignature || "",
      shortDescription: "Default"
    };
    await ApiHelper.post("/arrangementKeys", [key], "ContentApi");
    return { songDetailId: sd.id!, songId: songsRes[0].id! };
  }, [title, artist, album]);

  const rollbackCreated = useCallback(async (songId: string) => {
    if (!songId) return;
    try {
      await ApiHelper.delete("/songs/" + songId, "ContentApi");
    } catch {
      /* best effort */
    }
  }, []);

  const handleFileSaved = useCallback(
    async (f: FileInterface) => {
      setPendingFileSave(false);
      if (!f?.contentPath?.trim()) {
        setError(Locale.label("songs.upload.noFileSelected", "Select an audio file, then click Upload again."));
        setSaving(false);
        return;
      }
      if (!songDetailId || !createdSongId) {
        setSaving(false);
        return;
      }
      setError("");
      try {
        const url = resolveUploadedContentPath(f.contentPath, (f as FileInterface & { key?: string }).key);
        await ApiHelper.post(
          "/songDetailLinks",
          [
            {
              songDetailId,
              service: "Hosted",
              serviceKey: (f.fileName || "audio").toString().slice(0, 120),
              url: resolveContentUrl(url)
            }
          ],
          "ContentApi"
        );
        onComplete(createdSongId);
        onClose();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || Locale.label("songs.upload.failed", "Could not save song."));
        await rollbackCreated(createdSongId);
        setSongDetailId("");
        setCreatedSongId("");
      } finally {
        setSaving(false);
      }
    },
    [songDetailId, createdSongId, onComplete, onClose, rollbackCreated]
  );

  const startUpload = async () => {
    setError("");
    if (!title.trim() || !artist.trim()) {
      setError(Locale.label("songs.upload.titleArtistRequired", "Enter title and artist first."));
      return;
    }
    setSaving(true);
    try {
      let detailId = songDetailId;
      let songId = createdSongId;
      if (!detailId) {
        const ids = await createSongEntities();
        detailId = ids.songDetailId;
        songId = ids.songId;
        setSongDetailId(detailId);
        setCreatedSongId(songId);
      }
      setPendingFileSave(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || Locale.label("songs.upload.failed", "Could not save song."));
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    if (createdSongId) rollbackCreated(createdSongId);
    onClose();
  };

  return (
    <Dialog open onClose={handleClose} maxWidth="sm" fullWidth data-testid="music-upload-dialog">
      <DialogTitle>{Locale.label("songs.upload.header", "Upload music")}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {Locale.label(
            "songs.upload.instructions",
            "Enter song details, choose an audio file, then upload. Audio is stored in your church AWS storage (same as sermon media)."
          )}
        </Typography>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        ) : null}
        <TextField
          label={Locale.label("songs.details.title", "Title")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          required
          size="small"
          sx={{ mb: 2 }}
          disabled={saving || !!songDetailId}
        />
        <TextField
          label={Locale.label("songs.details.artist", "Artist")}
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          fullWidth
          required
          size="small"
          sx={{ mb: 2 }}
          disabled={saving || !!songDetailId}
        />
        <TextField
          label={Locale.label("songs.details.album", "Album (optional)")}
          value={album}
          onChange={(e) => setAlbum(e.target.value)}
          fullWidth
          size="small"
          sx={{ mb: 2 }}
          disabled={saving || !!songDetailId}
          helperText={Locale.label("songs.upload.singleAlbumHint", "Leave blank for a single track. Albums are added via Upload album.")}
        />
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: "2px dashed",
            borderColor: "divider",
            bgcolor: "var(--bg-sub)",
            textAlign: "center"
          }}>
          {selectedFileName ? (
            <Chip icon={<FileIcon />} label={selectedFileName} size="small" sx={{ mb: 1.5 }} />
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {Locale.label("songs.audio.dropHint", "Drag an audio file here, or choose one below")}
            </Typography>
          )}
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              size="small"
              disabled={saving}
              onClick={() => document.getElementById("music-upload-dialog-file")?.click()}>
              {Locale.label("songs.audio.chooseFile", "Choose file")}
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<CloudUploadIcon />}
              onClick={startUpload}
              disabled={saving}
              data-testid="music-upload-submit-file">
              {Locale.label("songs.upload.uploadButton", "Upload song")}
            </Button>
          </Stack>
        </Box>
        <FileUpload
          variant="hidden"
          inputId="music-upload-dialog-file"
          contentType="song"
          contentId={songDetailId}
          accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac"
          pendingSave={pendingFileSave && !!songDetailId}
          saveCallback={handleFileSaved}
          onFileSelected={(file) => setSelectedFileName(file?.name || "")}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          {Locale.label("common.close", "Close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
