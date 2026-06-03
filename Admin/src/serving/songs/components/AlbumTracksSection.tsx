import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ApiHelper, Locale, UserHelper, Permissions } from "@machonharuach/apphelper";
import {
  Box,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import { Add as AddIcon, Album as AlbumIcon } from "@mui/icons-material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SongHostedAudio } from "./SongHostedAudio";
import { AlbumAddTracksDialog } from "./AlbumAddTracksDialog";
import { AlbumTrackTableRow } from "./AlbumTrackTableRow";
import {
  fetchAlbumTracks,
  normalizeSongDetailTrackNumber,
  saveAlbumTrackOrder,
  songDetailSavePayload,
  sortAlbumTracksList
} from "../helpers/albumTracksHelper";
import type { SongDetailInterface } from "../../../helpers";

interface Props {
  songDetail: SongDetailInterface;
  currentSongId?: string;
  currentSongDetailId?: string;
  onUpdated?: () => void;
}

export const AlbumTracksSection = ({ songDetail, currentSongId, currentSongDetailId, onUpdated }: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const album = songDetail?.album?.trim() || "";
  const artist = songDetail?.artist?.trim() || "";

  const albumTracksQueryKey = ["/songDetails/album", artist, album, "ContentApi"] as const;
  const songListQueryKey = ["/songDetails", "ContentApi"] as const;

  const albumTracks = useQuery<SongDetailInterface[]>({
    queryKey: albumTracksQueryKey,
    queryFn: async () => {
      const previous = queryClient.getQueryData<SongDetailInterface[]>(albumTracksQueryKey);
      const fetched = await fetchAlbumTracks(artist, album);
      if (!previous?.length) return fetched;
      return fetched.map((t) => {
        const prior = previous.find((p) => p.id === t.id);
        return normalizeSongDetailTrackNumber({
          ...t,
          trackNumber: t.trackNumber ?? prior?.trackNumber
        });
      });
    },
    enabled: Boolean(album && artist),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const [trackDrafts, setTrackDrafts] = useState<Record<string, string>>({});
  const [orderedTracks, setOrderedTracks] = useState<SongDetailInterface[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [showAddTracks, setShowAddTracks] = useState(false);
  const orderedTracksRef = useRef<SongDetailInterface[]>([]);

  const tracksFromQuery = useMemo(() => albumTracks.data || [], [albumTracks.data]);

  useEffect(() => {
    const sorted = sortAlbumTracksList(tracksFromQuery);
    setOrderedTracks(sorted);
    orderedTracksRef.current = sorted;
  }, [tracksFromQuery]);

  useEffect(() => {
    orderedTracksRef.current = orderedTracks;
  }, [orderedTracks]);

  const patchCaches = useCallback(
    (list: SongDetailInterface[]) => {
      queryClient.setQueryData(albumTracksQueryKey, list);
      queryClient.setQueryData(songListQueryKey, (prev) => {
        if (!Array.isArray(prev)) return prev;
        const byId = new Map(list.map((t) => [t.id, t]));
        return prev.map((sd) => (sd.id && byId.has(sd.id) ? { ...sd, ...byId.get(sd.id)! } : sd));
      });
    },
    [albumTracksQueryKey, queryClient, songListQueryKey]
  );

  const persistOrder = useCallback(
    async (ordered: SongDetailInterface[]) => {
      const renumbered = ordered.map((t, i) => ({ ...t, trackNumber: i + 1 }));
      setOrderedTracks(renumbered);
      setSavingOrder(true);
      try {
        const saved = await saveAlbumTrackOrder(renumbered);
        setOrderedTracks(saved);
        patchCaches(saved);
        setTrackDrafts({});
      } finally {
        setSavingOrder(false);
      }
    },
    [patchCaches]
  );

  const moveDrag = useCallback((dragIndex: number, hoverIndex: number) => {
    setOrderedTracks((prev) => {
      const next = [...prev];
      const [removed] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, removed);
      return next.map((t, i) => ({ ...t, trackNumber: i + 1 }));
    });
  }, []);

  const getTrackNumberDisplay = (track: SongDetailInterface) => {
    if (trackDrafts[track.id!] !== undefined) return trackDrafts[track.id!];
    return track.trackNumber != null ? String(track.trackNumber) : "";
  };

  const saveTrackNumber = useCallback(
    async (track: SongDetailInterface, raw: string) => {
      if (!track.id) return;
      const parsed = raw.trim() === "" ? undefined : Math.max(1, parseInt(raw, 10) || 1);
      const normalized = normalizeSongDetailTrackNumber(track);
      const existing =
        normalized.trackNumber != null && !Number.isNaN(Number(normalized.trackNumber))
          ? Number(normalized.trackNumber)
          : undefined;
      if (parsed === existing || (parsed === undefined && existing == null)) {
        setTrackDrafts((d) => {
          const next = { ...d };
          delete next[track.id!];
          return next;
        });
        return;
      }

      const payload = songDetailSavePayload(normalized, { trackNumber: parsed });
      const result = (await ApiHelper.post("/songDetails", [payload], "ContentApi")) as SongDetailInterface[];
      const saved = normalizeSongDetailTrackNumber(
        Array.isArray(result) && result[0] ? result[0] : { ...payload, trackNumber: parsed }
      );
      const trackNumber = saved.trackNumber ?? parsed;

      const updated = orderedTracks.map((t) => (t.id === track.id ? { ...t, trackNumber } : t));
      const sorted = sortAlbumTracksList(updated);
      setOrderedTracks(sorted);
      patchCaches(sorted);

      setTrackDrafts((d) => {
        const next = { ...d };
        delete next[track.id!];
        return next;
      });
    },
    [orderedTracks, patchCaches]
  );

  const handleTracksAdded = useCallback(async () => {
    const fetched = await fetchAlbumTracks(artist, album);
    const sorted = sortAlbumTracksList(fetched);
    const renumbered = sorted.map((t, i) => ({ ...t, trackNumber: i + 1 }));
    try {
      const saved = await saveAlbumTrackOrder(renumbered);
      setOrderedTracks(saved);
      patchCaches(saved);
    } catch {
      setOrderedTracks(renumbered);
      patchCaches(renumbered);
    }
    await albumTracks.refetch();
    await queryClient.invalidateQueries({ queryKey: songListQueryKey });
    onUpdated?.();
  }, [album, artist, albumTracks, onUpdated, patchCaches, queryClient, songListQueryKey]);

  if (!album || !artist) return null;

  const tableBody = (
    <TableBody>
      {orderedTracks.map((track, index) => {
        const isCurrent = track.songId === currentSongId;
        return (
          <AlbumTrackTableRow
            key={track.id}
            track={track}
            index={index}
            isCurrent={isCurrent}
            canEdit={canEdit}
            trackNumberDisplay={getTrackNumberDisplay(track)}
            onTrackNumberChange={(value) => setTrackDrafts((d) => ({ ...d, [track.id!]: value }))}
            onTrackNumberBlur={(value) => saveTrackNumber(track, value)}
            onMoveDrag={moveDrag}
            onDragEnd={() => void persistOrder(orderedTracksRef.current)}
            onNavigate={() => {
              if (track.songId && track.songId !== currentSongId) {
                navigate("/sermons/songs/" + track.songId);
              }
            }}
          />
        );
      })}
    </TableBody>
  );

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, borderColor: "divider" }}>
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
              bgcolor: "action.hover",
              flexShrink: 0
            }}>
            <AlbumIcon color="primary" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              {album}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {Locale.label("songs.albumTracks.subtitle", "{{artist}} · {{count}} tracks")
                .replace("{{artist}}", artist)
                .replace("{{count}}", String(orderedTracks.length))}
            </Typography>
            {canEdit ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                {Locale.label(
                  "songs.albumTracks.reorderHint",
                  "Drag tracks to reorder. Track numbers update automatically."
                )}
              </Typography>
            ) : null}
          </Box>
          {canEdit ? (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setShowAddTracks(true)}
              sx={{ flexShrink: 0 }}>
              {Locale.label("songs.albumTracks.addTracks", "Add tracks")}
            </Button>
          ) : null}
        </Stack>

        {albumTracks.isLoading || savingOrder ? (
          <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />
        ) : null}

        <Box
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
            mb: 2
          }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "var(--bg-sub)" }}>
                {canEdit ? <TableCell sx={{ width: 40, px: 0.5 }} /> : null}
                <TableCell sx={{ width: 72, fontWeight: 600 }}>
                  {Locale.label("songs.albumTracks.trackNumber", "#")}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{Locale.label("songs.table.title", "Title")}</TableCell>
              </TableRow>
            </TableHead>
            {canEdit ? (
              <DndProvider backend={HTML5Backend}>{tableBody}</DndProvider>
            ) : (
              tableBody
            )}
          </Table>
        </Box>

        {currentSongDetailId ? (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              {Locale.label("songs.albumTracks.nowPlaying", "Now playing")}
            </Typography>
            <SongHostedAudio songDetailId={currentSongDetailId} onUpdated={onUpdated} />
          </Box>
        ) : null}
      </CardContent>

      {showAddTracks && canEdit ? (
        <AlbumAddTracksDialog
          album={album}
          artist={artist}
          existingTracks={orderedTracks}
          onClose={() => setShowAddTracks(false)}
          onComplete={() => {
            setShowAddTracks(false);
            void handleTracksAdded();
          }}
        />
      ) : null}
    </Card>
  );
};
