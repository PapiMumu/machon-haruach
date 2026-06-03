import React, { useEffect, memo, useCallback, useMemo, useRef } from "react";
import { type ArrangementInterface, type SongDetailInterface } from "../../../helpers";
import { ChordProHelper } from "../../../helpers/ChordProHelper";
import { ApiHelper, Locale, UserHelper, Permissions } from "@machonharuach/apphelper";
import { Card, CardContent, Typography, Stack, IconButton, Box, Chip, LinearProgress } from "@mui/material";
import { Edit as EditIcon, Lyrics as LyricsIcon } from "@mui/icons-material";
import { SongCoverArt } from "./SongCoverArt";
import { ArrangementEdit } from "./ArrangementEdit";
import { useNavigate } from "react-router-dom";
import { formatCatalogLyrics } from "../helpers/LyricsHelper";

interface Props {
  arrangement: ArrangementInterface;
  reload: () => void;
}

export const Arrangement = memo((props: Props) => {
  const navigate = useNavigate();
  const [songDetail, setSongDetail] = React.useState<SongDetailInterface>(null);
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const [edit, setEdit] = React.useState(false);
  const [syncingLyrics, setSyncingLyrics] = React.useState(false);
  const syncAttemptedRef = useRef<string | null>(null);

  const loadData = useCallback(async () => {
    if (props.arrangement?.songDetailId) {
      const sd: SongDetailInterface = await ApiHelper.get("/songDetails/" + props.arrangement.songDetailId, "ContentApi");
      setSongDetail(sd);
    }
  }, [props.arrangement?.songDetailId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const lyricsText = (props.arrangement?.lyrics || "").trim();
  const hasLyrics = lyricsText.length > 0;

  /** Load lyrics from the linked song catalog entry when the arrangement has none yet. */
  useEffect(() => {
    const arrangementId = props.arrangement?.id;
    if (!arrangementId || hasLyrics || !songDetail?.praiseChartsId || !canEdit) return;
    if (syncAttemptedRef.current === arrangementId) return;

    syncAttemptedRef.current = arrangementId;
    let cancelled = false;

    (async () => {
      setSyncingLyrics(true);
      try {
        const data: { details?: { lyrics?: string } } = await ApiHelper.get(
          "/praiseCharts/raw/" + songDetail.praiseChartsId,
          "ContentApi"
        );
        const formatted = formatCatalogLyrics(data?.details?.lyrics);
        if (cancelled || !formatted) return;

        await ApiHelper.post("/arrangements", [{ ...props.arrangement, lyrics: formatted }], "ContentApi");
        if (!cancelled) props.reload();
      } catch {
        /* leave empty — user can edit manually */
      } finally {
        if (!cancelled) setSyncingLyrics(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.arrangement, props.arrangement?.id, hasLyrics, songDetail?.praiseChartsId, canEdit, props.reload]);

  useEffect(() => {
    syncAttemptedRef.current = null;
  }, [props.arrangement?.id]);

  const handleSave = useCallback(
    (arrangement: ArrangementInterface) => {
      setEdit(false);
      if (arrangement) {
        props.reload();
      } else {
        navigate("/sermons/songs");
      }
    },
    [props.reload, navigate]
  );

  const emptyPlaceholder = Locale.label(
    "songs.lyrics.empty",
    "No lyrics for this song yet. Tap edit to add them."
  );

  const arrangementCard = useMemo(
    () => (
      <Card variant="outlined" sx={{ borderRadius: 2, borderColor: "divider" }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <LyricsIcon sx={{ color: "primary.main", fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {Locale.label("songs.lyrics.title", "Lyrics")}
              </Typography>
              {props.arrangement?.name ? (
                <Chip label={props.arrangement.name} size="small" variant="outlined" sx={{ color: "text.secondary" }} />
              ) : null}
            </Stack>
            {canEdit && (
              <IconButton
                onClick={() => setEdit(true)}
                sx={{
                  color: "primary.main",
                  "&:hover": { backgroundColor: "primary.light" }
                }}
                aria-label="Edit arrangement">
                <EditIcon />
              </IconButton>
            )}
          </Stack>

          <Box
            sx={{
              backgroundColor: "var(--bg-sub)",
              color: "var(--text-main)",
              border: "1px solid",
              borderColor: "var(--border-light)",
              borderRadius: 1,
              p: 2,
              minHeight: { xs: 160, md: 240 },
              position: "relative"
            }}>
            {syncingLyrics ? (
              <Stack spacing={1.5} alignItems="center" justifyContent="center" sx={{ minHeight: { xs: 120, md: 200 } }}>
                <LinearProgress sx={{ width: "100%", maxWidth: 280, borderRadius: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {Locale.label("songs.lyrics.loading", "Loading lyrics for this song…")}
                </Typography>
              </Stack>
            ) : hasLyrics ? (
              <Box
                className="chordPro"
                sx={{
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                  lineHeight: 1.6,
                  "& pre": {
                    margin: 0,
                    whiteSpace: "pre-wrap"
                  }
                }}
                dangerouslySetInnerHTML={{ __html: ChordProHelper.formatLyrics(lyricsText, 0) }}
              />
            ) : (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: { xs: 120, md: 200 }, textAlign: "center", px: 2 }}>
                <LyricsIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1.5, opacity: 0.6 }} />
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, lineHeight: 1.6 }}>
                  {emptyPlaceholder}
                </Typography>
              </Stack>
            )}
          </Box>
        </CardContent>
      </Card>
    ),
    [props.arrangement, canEdit, syncingLyrics, hasLyrics, lyricsText, emptyPlaceholder]
  );

  return (
    <Stack spacing={3} sx={{ minWidth: 0, maxWidth: "100%" }}>
      {!edit || !canEdit ? arrangementCard : <ArrangementEdit arrangement={props.arrangement} onSave={handleSave} onCancel={() => setEdit(false)} />}
      <SongCoverArt
        songDetail={songDetail}
        onUpdated={() => {
          loadData();
          props.reload();
        }}
      />
    </Stack>
  );
});
