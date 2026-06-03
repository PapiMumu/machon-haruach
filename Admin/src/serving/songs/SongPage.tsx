import React, { memo, useCallback, useMemo } from "react";
import { ApiHelper, ArrayHelper, PageHeader, UserHelper, Permissions, Locale, SmallButton } from "@machonharuach/apphelper";
import { useParams, useNavigate } from "react-router-dom";
import { type ArrangementInterface, type ArrangementKeyInterface, type SongDetailInterface, type SongInterface } from "../../helpers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mergeSongDetailCredits } from "./helpers/albumTracksHelper";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  IconButton,
  Tabs,
  Tab
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Person as ArtistIcon } from "@mui/icons-material";
import { Arrangement } from "./components/Arrangement";
import { SongSearchDialog } from "./SongSearchDialog";
import { SongDetailsEdit } from "./components/SongDetailsEdit";
import { SongDetailLinks } from "./components/SongDetailLinks";
import { SongDetailLinksEdit } from "./components/SongDetailLinksEdit";
import { SongHostedAudio } from "./components/SongHostedAudio";
import { AlbumTracksSection } from "./components/AlbumTracksSection";
import { SongCreditsSection } from "./components/SongCreditsSection";
import { formatCatalogLyrics } from "./helpers/LyricsHelper";

export const SongPage = memo(() => {
  const [showSearch, setShowSearch] = React.useState(false);
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const [editSongDetails, setEditSongDetails] = React.useState(false);
  const [editLinks, setEditLinks] = React.useState(false);
  const [selectedArrangement, setSelectedArrangement] = React.useState<ArrangementInterface | null>(null);
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const song = useQuery<SongInterface>({
    queryKey: ["/songs/" + params.id, "ContentApi"],
    enabled: !!params.id
  });

  const arrangements = useQuery<ArrangementInterface[]>({
    queryKey: ["/arrangements/song/" + params.id, "ContentApi"],
    placeholderData: [],
    enabled: !!params.id
  });

  const songDetailId = useMemo(() => {
    if (arrangements.data && arrangements.data.length > 0 && arrangements.data[0].songDetailId) {
      return arrangements.data[0].songDetailId;
    }
    return null;
  }, [arrangements.data]);

  const songDetailQueryKey = useMemo(
    () => ["/songDetails/" + songDetailId, "ContentApi"] as const,
    [songDetailId]
  );

  const songDetail = useQuery<SongDetailInterface>({
    queryKey: songDetailQueryKey,
    queryFn: async () => {
      const prior = queryClient.getQueryData<SongDetailInterface>(songDetailQueryKey);
      const fetched = (await ApiHelper.get("/songDetails/" + songDetailId, "ContentApi")) as SongDetailInterface;
      return mergeSongDetailCredits(prior, fetched);
    },
    enabled: !!songDetailId
  });

  const handleCreditsUpdated = useCallback(
    (saved: SongDetailInterface) => {
      queryClient.setQueryData(songDetailQueryKey, (prev) =>
        mergeSongDetailCredits(prev as SongDetailInterface | undefined, saved)
      );
      void songDetail.refetch();
    },
    [queryClient, songDetailQueryKey, songDetail]
  );

  React.useEffect(() => {
    if (arrangements.data && arrangements.data.length > 0 && !selectedArrangement) {
      setSelectedArrangement(arrangements.data[0]);
    }
  }, [arrangements.data, selectedArrangement]);

  const selectArrangement = useCallback(
    (arrangementId: string) => {
      const arr = ArrayHelper.getOne(arrangements.data, "id", arrangementId);
      setSelectedArrangement(arr);
    },
    [arrangements.data]
  );

  const refetch = useCallback(async () => {
    const results = await Promise.all([song.refetch(), arrangements.refetch(), songDetail.refetch()]);

    if (selectedArrangement?.id) {
      const arrangementResult = results[1];
      if (Array.isArray(arrangementResult.data)) {
        const updatedArrangement = arrangementResult.data.find((arr) => arr.id === selectedArrangement.id);
        if (updatedArrangement) {
          setSelectedArrangement(updatedArrangement);
        }
      }
    }
  }, [song, arrangements, songDetail, selectedArrangement?.id]);

  const handleDeleteSong = useCallback(() => {
    if (window.confirm(Locale.label("songs.deleteSong.confirm"))) {
      ApiHelper.delete("/songs/" + song.data?.id, "ContentApi").then(() => {
        navigate("/sermons/songs");
      });
    }
  }, [song.data?.id, navigate]);

  const handleAdd = useCallback(
    async (detail: SongDetailInterface) => {
      if (!song.data?.id) return;

      let lyrics = "";
      if (detail.praiseChartsId) {
        try {
          const data: { details?: { lyrics?: string } } = await ApiHelper.get(
            "/praiseCharts/raw/" + detail.praiseChartsId,
            "ContentApi"
          );
          lyrics = formatCatalogLyrics(data?.details?.lyrics);
        } catch {
          /* arrangement sync on detail page will retry */
        }
      }

      const a: ArrangementInterface = {
        songId: song.data.id,
        songDetailId: detail.id,
        name: detail.artist || Locale.label("songs.versions.new", "New version"),
        lyrics
      };
      const created = await ApiHelper.post("/arrangements", [a], "ContentApi");
      const key: ArrangementKeyInterface = {
        arrangementId: created[0].id,
        keySignature: detail.keySignature || "",
        shortDescription: "Default"
      };
      await ApiHelper.post("/arrangementKeys", [key], "ContentApi");
      refetch();
      setShowSearch(false);
    },
    [song.data?.id, refetch]
  );

  const versionTabs = useMemo(() => {
    if (!arrangements.data || arrangements.data.length <= 1) return null;
    return (
      <Tabs
        value={selectedArrangement?.id || false}
        onChange={(_, id) => selectArrangement(id)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
        {arrangements.data.map((a) => (
          <Tab key={a.id} value={a.id} label={a.name || Locale.label("songs.versions.unnamed", "Version")} />
        ))}
      </Tabs>
    );
  }, [arrangements.data, selectedArrangement?.id, selectArrangement]);

  const mainContent = useMemo(() => {
    if (!selectedArrangement) {
      return (
        <Card sx={{ borderRadius: 2, border: "1px dashed", borderColor: "var(--border-main)" }}>
          <CardContent sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="body1" color="text.secondary">
              {Locale.label("songs.songPage.selectVersion", "Select a version below to view lyrics and files.")}
            </Typography>
          </CardContent>
        </Card>
      );
    }
    return <Arrangement arrangement={selectedArrangement} reload={refetch} />;
  }, [selectedArrangement, refetch]);

  const pageTitle = songDetail.data?.title || song.data?.name || Locale.label("songs.songPage.loading");
  const artistLine = songDetail.data?.artist;
  const isAlbumTrack = Boolean(songDetail.data?.album?.trim() && songDetail.data?.artist?.trim());

  return (
    <>
      <PageHeader title={pageTitle} subtitle={Locale.label("songs.songPage.subtitle", "Manage audio, lyrics, and resources for this song")}>
        {canEdit && (
          <IconButton
            onClick={() => setEditSongDetails(true)}
            aria-label={Locale.label("songs.songPage.editDetails", "Edit song details")}
            sx={{
              color: "rgba(255,255,255,0.8)",
              "&:hover": { color: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" }
            }}
            size="small">
            <EditIcon fontSize="small" />
          </IconButton>
        )}
        {canEdit && <SmallButton color="error" icon="delete" onClick={handleDeleteSong} />}
        {canEdit && arrangements.data && arrangements.data.length > 1 && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setShowSearch(true)}
            sx={{
              color: "#FFF",
              borderColor: "rgba(255,255,255,0.5)",
              "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" }
            }}>
            {Locale.label("songs.versions.add", "Add version")}
          </Button>
        )}
      </PageHeader>

      <Box sx={{ px: 3, pb: 4, maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
        {artistLine ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <ArtistIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body1" color="text.secondary">
              {artistLine}
            </Typography>
          </Stack>
        ) : null}

        {editSongDetails && canEdit ? (
          <SongDetailsEdit
            songDetail={songDetail.data}
            onCancel={() => setEditSongDetails(false)}
            onSave={() => {
              setEditSongDetails(false);
              refetch();
            }}
            reload={refetch}
          />
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 360px) minmax(0, 1fr)" },
              gap: 3,
              alignItems: "start",
              maxWidth: "100%",
              minWidth: 0
            }}>
            <Stack spacing={2} sx={{ minWidth: 0, maxWidth: "100%" }}>
              {isAlbumTrack && songDetail.data ? (
                <AlbumTracksSection
                  songDetail={songDetail.data}
                  currentSongId={song.data?.id}
                  currentSongDetailId={songDetailId || undefined}
                  onUpdated={refetch}
                />
              ) : songDetailId ? (
                <SongHostedAudio songDetailId={songDetailId} onUpdated={refetch} />
              ) : null}

              {songDetail.data ? (
                <SongCreditsSection songDetail={songDetail.data} canEdit={canEdit} onUpdated={handleCreditsUpdated} />
              ) : null}

              <Card variant="outlined" sx={{ borderRadius: 2, borderColor: "divider", minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
                <CardContent sx={{ py: 2, minWidth: 0 }}>
                  {songDetail.data &&
                    (editLinks && canEdit ? (
                      <SongDetailLinksEdit
                        songDetailId={songDetail.data.id}
                        hideHosted
                        hideCover
                        reload={() => {
                          setEditLinks(false);
                          refetch();
                        }}
                      />
                    ) : (
                      <SongDetailLinks
                        songDetail={songDetail.data}
                        hideHosted
                        hideCover
                        onEdit={canEdit ? () => setEditLinks(true) : undefined}
                      />
                    ))}
                </CardContent>
              </Card>
            </Stack>

            <Stack spacing={2} sx={{ minWidth: 0, maxWidth: "100%" }}>
              {versionTabs}
              {mainContent}
            </Stack>
          </Box>
        )}
      </Box>

      {showSearch && canEdit && <SongSearchDialog searchText={song.data?.name} onClose={() => setShowSearch(false)} onSelect={handleAdd} />}
    </>
  );
});
