import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  Album as AlbumIcon,
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon
} from "@mui/icons-material";
import { FileUpload } from "../../../components/FileUpload";
import { isChurchContentUrl, resolveContentUrl, resolveUploadedContentPath } from "../../../helpers/ContentUrlHelper";
import {
  applyCoverToAllAlbumTracks,
  applyCoverToSongDetail,
  COVER_SERVICE
} from "../helpers/albumCoverHelper";
import { fetchAlbumTracks } from "../helpers/albumTracksHelper";
import type { FileInterface } from "../../../helpers/Interfaces";
import type { SongDetailInterface, SongDetailLinkInterface } from "../../../helpers";

const FILE_INPUT_ID = "song-cover-art-file";

interface Props {
  songDetail: SongDetailInterface | null;
  onUpdated?: () => void;
}

/**
 * Cover art uploaded to AWS under streamingLive/songs/{songDetailId}/cover/
 * (same storage family as hosted song audio).
 */
export const SongCoverArt = ({ songDetail, onUpdated }: Props) => {
  const queryClient = useQueryClient();
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const songDetailId = songDetail?.id || "";
  const [detail, setDetail] = useState<SongDetailInterface | null>(songDetail);
  const [coverLink, setCoverLink] = useState<SongDetailLinkInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingFileSave, setPendingFileSave] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [albumSiblingCoverUrl, setAlbumSiblingCoverUrl] = useState("");

  useEffect(() => {
    setDetail(songDetail);
    setImageError(false);
  }, [songDetail]);

  const loadLinks = useCallback(() => {
    if (!songDetailId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    ApiHelper.get("/songDetailLinks/songDetail/" + songDetailId, "ContentApi")
      .then((data: SongDetailLinkInterface[]) => {
        const cover = data?.find((l) => l.service === COVER_SERVICE) || null;
        setCoverLink(cover);
      })
      .finally(() => setLoading(false));
  }, [songDetailId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const cloudCoverUrl = useMemo(() => resolveContentUrl(coverLink?.url), [coverLink?.url]);

  const albumName = detail?.album?.trim() || "";
  const artistName = detail?.artist?.trim() || "";
  const isAlbumTrack = Boolean(albumName && artistName);

  useEffect(() => {
    if (!isAlbumTrack || cloudCoverUrl || detail?.thumbnail?.trim()) {
      setAlbumSiblingCoverUrl("");
      return;
    }
    let cancelled = false;
    fetchAlbumTracks(artistName, albumName).then((tracks) => {
      if (cancelled) return;
      for (const t of tracks) {
        if (t.id === songDetailId) continue;
        const thumb = t.thumbnail?.trim();
        if (thumb) {
          setAlbumSiblingCoverUrl(resolveContentUrl(thumb));
          return;
        }
      }
      setAlbumSiblingCoverUrl("");
    });
    return () => {
      cancelled = true;
    };
  }, [isAlbumTrack, albumName, artistName, cloudCoverUrl, detail?.thumbnail, songDetailId]);

  const previewUrl = useMemo(() => {
    if (cloudCoverUrl) return cloudCoverUrl;
    const thumb = detail?.thumbnail?.trim();
    if (thumb && isChurchContentUrl(thumb)) return resolveContentUrl(thumb);
    if (thumb && !isChurchContentUrl(thumb)) return thumb;
    if (albumSiblingCoverUrl) return albumSiblingCoverUrl;
    return "";
  }, [cloudCoverUrl, detail?.thumbnail, albumSiblingCoverUrl]);

  const hasCloudCover = Boolean(cloudCoverUrl?.trim());
  const hasPreview = Boolean(previewUrl?.trim()) && !imageError;
  const showExternalHint =
    hasPreview &&
    !hasCloudCover &&
    !albumSiblingCoverUrl &&
    detail?.thumbnail &&
    !isChurchContentUrl(detail.thumbnail);

  const persistCover = useCallback(
    async (rawUrl: string, fileName?: string) => {
      const url = resolveContentUrl(rawUrl);
      if (!url?.trim() || !songDetailId || !detail) return;

      const coverName = (fileName || "cover").toString();

      if (isAlbumTrack) {
        await applyCoverToAllAlbumTracks(artistName, albumName, url, coverName);
      } else {
        await applyCoverToSongDetail(songDetailId, url, coverName);
      }

      const updatedDetail = { ...detail, thumbnail: url };
      setDetail(updatedDetail);
      setAlbumSiblingCoverUrl("");
      loadLinks();
      await queryClient.invalidateQueries({ queryKey: ["/songDetails", "ContentApi"], exact: true });
      if (isAlbumTrack) {
        await queryClient.invalidateQueries({
          queryKey: ["/songDetails/album", artistName, albumName, "ContentApi"]
        });
      }
      onUpdated?.();
    },
    [songDetailId, detail, loadLinks, onUpdated, isAlbumTrack, artistName, albumName, queryClient]
  );

  /** Rewrite legacy churchapps.org cover URLs in the database to the church content root. */
  useEffect(() => {
    if (loading || !coverLink?.url || !canEdit) return;
    const resolved = resolveContentUrl(coverLink.url);
    if (resolved && resolved !== coverLink.url) {
      persistCover(coverLink.url, coverLink.serviceKey);
    }
  }, [loading, coverLink?.id, coverLink?.url, coverLink?.serviceKey, canEdit, persistCover]);

  const handleFileSaved = useCallback(
    async (f: FileInterface) => {
      setPendingFileSave(false);
      setUploading(false);
      setSelectedFileName("");
      if (!f?.contentPath?.trim()) return;

      const url = resolveUploadedContentPath(f.contentPath, (f as FileInterface & { key?: string }).key);
      await persistCover(url, f.fileName);
      setImageError(false);
    },
    [persistCover]
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
    if (file && file.type.startsWith("image/")) assignFileToInput(file);
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
    <Card variant="outlined" sx={{ borderRadius: 2, borderColor: "divider", minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
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
            <AlbumIcon color="primary" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              {Locale.label("songs.coverArt.title", "Cover art")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {isAlbumTrack
                ? Locale.label(
                    "songs.coverArt.albumSubtitle",
                    "Shared for all tracks on this album. Stored in your church AWS storage."
                  )
                : Locale.label(
                    "songs.coverArt.subtitle",
                    "Stored in your church AWS storage, like song audio and sermon media."
                  )}
            </Typography>
          </Box>
        </Stack>

        {loading ? <LinearProgress sx={{ mb: 2, borderRadius: 1 }} /> : null}

        <Box
          sx={{
            mb: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            p: 2,
            borderRadius: 2,
            bgcolor: "var(--bg-sub)",
            border: "1px solid",
            borderColor: "divider",
            minHeight: 200
          }}>
          {hasPreview ? (
            <>
              <Box
                component="img"
                src={previewUrl}
                alt={detail?.title || Locale.label("songs.coverArt.title", "Cover art")}
                onError={() => setImageError(true)}
                sx={{
                  maxWidth: "100%",
                  maxHeight: 280,
                  width: "auto",
                  height: "auto",
                  borderRadius: 1.5,
                  objectFit: "contain",
                  boxShadow: 2
                }}
              />
              {hasCloudCover ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    mt: 1.5,
                    fontFamily: "monospace",
                    fontSize: "0.7rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "100%"
                  }}
                  title={cloudCoverUrl}>
                  {Locale.label("songs.coverArt.hostedUrl", "Hosted file")}: {cloudCoverUrl}
                </Typography>
              ) : showExternalHint ? (
                <Typography variant="caption" color="warning.main" sx={{ mt: 1.5, textAlign: "center", maxWidth: 360 }}>
                  {Locale.label(
                    "songs.coverArt.externalHint",
                    "Preview from catalog. Upload an image to save cover art in your church cloud storage."
                  )}
                </Typography>
              ) : null}
            </>
          ) : (
            <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ py: 4 }}>
              <ImageIcon sx={{ fontSize: 48, color: "text.disabled", opacity: 0.6 }} />
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", maxWidth: 320 }}>
                {Locale.label(
                  "songs.coverArt.empty",
                  "No cover art uploaded yet. Upload an image to store it in your church cloud storage."
                )}
              </Typography>
            </Stack>
          )}
        </Box>

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
                transition: "border-color 0.15s, background-color 0.15s"
              }}>
              <CloudUploadIcon sx={{ fontSize: 36, color: "text.secondary", mb: 1 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {Locale.label("songs.coverArt.dropHint", "Drag an image here, or choose one below")}
              </Typography>
              {selectedFileName ? (
                <Chip icon={<FileIcon />} label={selectedFileName} size="small" sx={{ mb: 1.5, maxWidth: "100%" }} />
              ) : null}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="center">
                <Button variant="outlined" size="small" onClick={openFilePicker} disabled={uploading}>
                  {Locale.label("songs.coverArt.chooseFile", "Choose image")}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CloudUploadIcon />}
                  onClick={startUpload}
                  disabled={uploading}
                  data-testid="song-cover-art-upload">
                  {hasCloudCover
                    ? Locale.label("songs.coverArt.replace", "Replace cover")
                    : Locale.label("songs.coverArt.upload", "Upload cover")}
                </Button>
              </Stack>
            </Box>

            <FileUpload
              variant="hidden"
              inputId={FILE_INPUT_ID}
              contentType="songCover"
              contentId={songDetailId}
              accept="image/*,.jpg,.jpeg,.png,.webp,.gif"
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
