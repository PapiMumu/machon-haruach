import React, { memo, useEffect, useMemo, useState } from "react";
import { Locale } from "@machonharuach/apphelper";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  Stack,
  Typography
} from "@mui/material";
import { Edit as EditIcon, InfoOutlined as InfoIcon } from "@mui/icons-material";
import { SongCreditsEdit } from "./SongCreditsEdit";
import type { SongDetailInterface } from "../../../helpers";

interface Props {
  songDetail: SongDetailInterface;
  canEdit?: boolean;
  onUpdated?: (saved: SongDetailInterface) => void;
}

type CreditRow = { label: string; value: string };

export const SongCreditsSection = memo(({ songDetail, canEdit, onUpdated }: Props) => {
  const [editMode, setEditMode] = useState(false);
  const [displayDetail, setDisplayDetail] = useState(songDetail);

  useEffect(() => {
    setDisplayDetail(songDetail);
  }, [songDetail]);

  const rows = useMemo((): CreditRow[] => {
    const items: CreditRow[] = [];
    const add = (labelKey: string, fallback: string, value?: string) => {
      const v = value?.trim();
      if (v) items.push({ label: Locale.label(labelKey, fallback), value: v });
    };
    add("songs.credits.featuredArtists", "Featured artists", displayDetail.featuredArtists);
    add("songs.credits.producer", "Producer", displayDetail.producer);
    add("songs.credits.composer", "Composer", displayDetail.composer);
    add("songs.credits.lyricist", "Lyricist", displayDetail.lyricist);
    add("songs.credits.genre", "Genre", displayDetail.genre);
    add("songs.credits.recordLabel", "Record label", displayDetail.recordLabel);
    return items;
  }, [displayDetail]);

  if (!rows.length && !canEdit) return null;

  const startEdit = () => setEditMode(true);
  const handleSaved = (saved: SongDetailInterface) => {
    setDisplayDetail(saved);
    setEditMode(false);
    onUpdated?.(saved);
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, borderColor: "divider", minWidth: 0, maxWidth: "100%" }}>
      <CardContent sx={{ py: 2, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between" sx={{ mb: editMode || rows.length ? 1.5 : 0 }}>
          <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
            <InfoIcon sx={{ fontSize: 20, color: "primary.main", mt: 0.25 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {Locale.label("songs.credits.title", "Credits & details")}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {Locale.label(
                  "songs.credits.subtitle",
                  "Featured artists, producer, and other information shown with this song."
                )}
              </Typography>
            </Box>
          </Stack>
          {canEdit && !editMode ? (
            <IconButton
              onClick={startEdit}
              size="small"
              aria-label={Locale.label("songs.credits.edit", "Edit credits and details")}
              sx={{
                color: "primary.main",
                flexShrink: 0,
                "&:hover": { backgroundColor: "action.hover" }
              }}>
              <EditIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>

        {editMode && canEdit ? (
          <SongCreditsEdit
            songDetail={displayDetail}
            onCancel={() => setEditMode(false)}
            onSave={handleSaved}
          />
        ) : rows.length > 0 ? (
          <Stack spacing={0} divider={<Divider />}>
            {rows.map((row) => (
              <Stack
                key={row.label}
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 0.25, sm: 2 }}
                sx={{ py: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, minWidth: { sm: 120 } }}>
                  {row.label}
                </Typography>
                <Typography variant="body2" sx={{ flex: 1, wordBreak: "break-word" }}>
                  {row.value}
                </Typography>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: canEdit ? 2 : 0 }}>
              {Locale.label(
                "songs.credits.empty",
                "No credits added yet. Click Edit to add featured artists, producer, and more."
              )}
            </Typography>
            {canEdit ? (
              <Button variant="contained" size="small" startIcon={<EditIcon />} onClick={startEdit}>
                {Locale.label("songs.credits.add", "Add credits")}
              </Button>
            ) : null}
          </Box>
        )}
      </CardContent>
    </Card>
  );
});
