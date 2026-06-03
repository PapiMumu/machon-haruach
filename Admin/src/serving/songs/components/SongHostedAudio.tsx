import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ApiHelper, Locale, UserHelper, Permissions } from "@machonharuach/apphelper";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  AudioFile as AudioFileIcon,
  InsertDriveFile as FileIcon
} from "@mui/icons-material";
import { FileUpload } from "../../../components/FileUpload";
import { resolveContentUrl, resolveUploadedContentPath } from "../../../helpers/ContentUrlHelper";
import type { FileInterface } from "../../../helpers/Interfaces";
import type { SongDetailLinkInterface } from "../../../helpers";

const FILE_INPUT_ID = "song-hosted-audio-file";

interface Props {
  songDetailId: string;
  onUpdated?: () => void;
}

/** Hosted audio in AWS under streamingLive/songs/{songDetailId}/ */
export const SongHostedAudio = ({ songDetailId, onUpdated }: Props) => {
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const [hostedLink, setHostedLink] = useState<SongDetailLinkInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingFileSave, setPendingFileSave] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const loadLinks = useCallback(() => {
    if (!songDetailId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    ApiHelper.get("/songDetailLinks/songDetail/" + songDetailId, "ContentApi")
      .then((data: SongDetailLinkInterface[]) => {
        const hosted = data?.find((l) => l.service === "Hosted") || null;
        setHostedLink(hosted);
      })
      .finally(() => setLoading(false));
  }, [songDetailId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const playbackUrl = useMemo(() => resolveContentUrl(hostedLink?.url), [hostedLink?.url]);

  const persistHostedUrl = useCallback(
    async (rawUrl: string, fileName?: string) => {
      const url = resolveContentUrl(rawUrl);
      if (!url?.trim()) return;

      const payload: SongDetailLinkInterface = hostedLink?.id
        ? {
            ...hostedLink,
            url,
            serviceKey: (fileName || hostedLink.serviceKey || "audio").toString().slice(0, 120)
          }
        : {
            songDetailId,
            service: "Hosted",
            serviceKey: (fileName || "audio").toString().slice(0, 120),
            url
          };

      await ApiHelper.post("/songDetailLinks", [payload], "ContentApi");
      loadLinks();
      onUpdated?.();
    },
    [hostedLink, songDetailId, loadLinks, onUpdated]
  );

  /** Rewrite legacy churchapps.org URLs in the database to the church content root. */
  useEffect(() => {
    if (loading || !hostedLink?.url || !canEdit) return;
    const resolved = resolveContentUrl(hostedLink.url);
    if (resolved && resolved !== hostedLink.url) {
      persistHostedUrl(hostedLink.url, hostedLink.serviceKey);
    }
  }, [loading, hostedLink?.id, hostedLink?.url, hostedLink?.serviceKey, canEdit, persistHostedUrl]);

  const handleFileSaved = useCallback(
    async (f: FileInterface) => {
      setPendingFileSave(false);
      setUploading(false);
      setSelectedFileName("");
      if (!f?.contentPath?.trim()) return;

      const url = resolveUploadedContentPath(f.contentPath, (f as FileInterface & { key?: string }).key);
      await persistHostedUrl(url, f.fileName);
    },
    [persistHostedUrl]
  );

  const assignFileToInput = (file: File) => {
    const input = document.getElementById(FILE_INPUT_ID) as HTMLInputElement | null;
    if (!input) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    setSelectedFileName(file.name);
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canEdit) return;
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith("audio/") || /\.(mp3|m4a|wav|aac|ogg|flac)$/i.test(file.name))) {
      assignFileToInput(file);
    }
  };

  const openFilePicker = () => document.getElementById(FILE_INPUT_ID)?.click();

  const startUpload = () => {
    const input = document.getElementById(FILE_INPUT_ID) as HTMLInputElement | null;
    if (!input?.files?.length) {
      openFilePicker();
      return;
    }
    setUploading(true);
    setPendingFileSave(true);
  };

  if (!songDetailId) return null;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: "divider",
        bgcolor: "background.paper",
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden"
      }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, minWidth: 0 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "action.hover"
            }}>
            <AudioFileIcon color="primary" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              {Locale.label("songs.audio.title", "Audio")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {Locale.label(
                "songs.audio.subtitle",
                "MP3, M4A, WAV, and other formats stored in your church cloud storage."
              )}
            </Typography>
          </Box>
        </Stack>

        {loading ? (
          <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />
        ) : playbackUrl ? (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: "var(--bg-sub)",
              border: "1px solid",
              borderColor: "divider",
              maxWidth: "100%",
              minWidth: 0,
              overflow: "hidden"
            }}>
            <Box component="audio" controls src={playbackUrl} sx={{ width: "100%", maxWidth: "100%", height: 40 }} preload="metadata" />
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
              sx={{
                mt: 1,
                fontFamily: "monospace",
                fontSize: "0.7rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%"
              }}
              title={playbackUrl}>
              {Locale.label("songs.audio.hostedUrl", "Hosted file")}: {playbackUrl}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {Locale.label(
              "songs.audio.empty",
              "No audio uploaded yet. Add a track for playback in apps and admin."
            )}
          </Typography>
        )}

        {canEdit && (
          <>
            <Box
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: "2px dashed",
                borderColor: dragOver ? "primary.main" : "divider",
                bgcolor: dragOver ? "action.selected" : "var(--bg-sub)",
                textAlign: "center",
                transition: "border-color 0.15s, background-color 0.15s",
                maxWidth: "100%",
                minWidth: 0,
                overflow: "hidden",
                boxSizing: "border-box"
              }}>
              <CloudUploadIcon sx={{ fontSize: 36, color: "text.secondary", mb: 1 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {Locale.label("songs.audio.dropHint", "Drag an audio file here, or choose one below")}
              </Typography>
              {selectedFileName ? (
                <Chip
                  icon={<FileIcon />}
                  label={selectedFileName}
                  size="small"
                  sx={{
                    mb: 1.5,
                    maxWidth: "100%",
                    "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" }
                  }}
                />
              ) : null}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="center"
                flexWrap="wrap"
                sx={{ width: "100%" }}>
                <Button variant="outlined" size="small" onClick={openFilePicker} disabled={uploading}>
                  {Locale.label("songs.audio.chooseFile", "Choose file")}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CloudUploadIcon />}
                  onClick={startUpload}
                  disabled={uploading}
                  data-testid="song-hosted-audio-upload">
                  {playbackUrl
                    ? Locale.label("songs.audio.replace", "Replace audio")
                    : Locale.label("songs.audio.upload", "Upload audio")}
                </Button>
              </Stack>
            </Box>

            <FileUpload
              variant="hidden"
              inputId={FILE_INPUT_ID}
              contentType="song"
              contentId={songDetailId}
              accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac"
              pendingSave={pendingFileSave}
              saveCallback={handleFileSaved}
              onFileSelected={(file) => setSelectedFileName(file?.name || "")}
            />
            {uploading ? <LinearProgress sx={{ mt: 2, borderRadius: 1 }} /> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
};
