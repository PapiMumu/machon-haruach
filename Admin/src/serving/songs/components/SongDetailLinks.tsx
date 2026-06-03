import React, { useEffect, memo, useMemo } from "react";
import { ApiHelper, Locale } from "@machonharuach/apphelper";
import { type SongDetailInterface, type SongDetailLinkInterface } from "../../../helpers";
import { Stack, Box, Typography, Avatar, Button, IconButton } from "@mui/material";
import { Link as LinkIcon, Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";

interface Props {
  songDetail: SongDetailInterface;
  onEdit?: () => void;
  /** Hide cloud-hosted audio; shown in SongHostedAudio instead. */
  hideHosted?: boolean;
  /** Hide cloud-hosted cover art; shown in SongCoverArt instead. */
  hideCover?: boolean;
}

const INTERNAL_SERVICES = new Set(["Hosted", "Cover"]);

export const SongDetailLinks = memo((props: Props) => {
  const [songDetailLinks, setSongDetailLinks] = React.useState<SongDetailLinkInterface[]>([]);

  useEffect(() => {
    if (props.songDetail?.id) {
      ApiHelper.get("/songDetailLinks/songDetail/" + props.songDetail?.id, "ContentApi").then((data) => {
        setSongDetailLinks(data);
      });
    }
  }, [props.songDetail?.id]);

  const serviceLogos: { [key: string]: string } = useMemo(
    () => ({
      PraiseCharts: "/images/praisecharts.png",
      Spotify: "https://upload.wikimedia.org/wikipedia/commons/2/26/Spotify_logo_with_text.svg",
      Apple: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/AppleMusic_2019.svg/300px-AppleMusic_2019.svg.png",
      YouTube: "https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg",
      CCLI: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a6/Christian_Copyright_Licensing_International_logo.svg/330px-Christian_Copyright_Licensing_International_logo.svg.png",
      Genius: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Genius-Wordmark.svg/330px-Genius-Wordmark.svg.png",
      Hymnary: "https://upload.wikimedia.org/wikipedia/commons/6/6c/Hymnary_logo.png",
      MusicBrainz: "https://upload.wikimedia.org/wikipedia/commons/0/01/MusicBrainz_Logo_with_text_%282016%29.svg"
    }),
    []
  );

  const serviceColors: { [key: string]: string } = useMemo(
    () => ({
      PraiseCharts: "#4f46e5",
      Spotify: "#1db954",
      Apple: "#fc3c44",
      YouTube: "#ff0000",
      CCLI: "#2563eb",
      Genius: "#ffff64",
      Hymnary: "#8b5cf6",
      MusicBrainz: "#ba68c8"
    }),
    []
  );

  const storedLinks = useMemo(() => {
    let links = [...songDetailLinks];
    if (props.hideHosted) links = links.filter((l) => l.service !== "Hosted");
    if (props.hideCover) links = links.filter((l) => l.service !== "Cover");
    return links.filter((l) => !INTERNAL_SERVICES.has(l.service || ""));
  }, [songDetailLinks, props.hideHosted, props.hideCover]);

  const allLinks = useMemo(() => {
    const links = [...storedLinks];
    if (props.songDetail?.praiseChartsId) {
      links.push({
        service: "PraiseCharts",
        url: `https://www.praisecharts.com/songs/details/${props.songDetail.praiseChartsId}?XID=churchapps`
      });
    }
    return links;
  }, [storedLinks, props.songDetail?.praiseChartsId]);

  const isEmpty = storedLinks.length === 0;

  const linkCards = useMemo(() => {
    return allLinks.map((link, index) => {
      const logo = serviceLogos[link.service];
      const color = serviceColors[link.service] || "primary.main";

      return (
        <Box
          key={link.id || `${link.service}-${index}`}
          component="a"
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            flex: "0 0 calc(50% - 8px)",
            minHeight: 72,
            maxHeight: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "var(--bg-sub)",
            textDecoration: "none",
            transition: "border-color 0.15s, transform 0.15s",
            "&:hover": {
              borderColor: "primary.main",
              transform: "translateY(-2px)"
            }
          }}>
          {logo ? (
            <Box
              component="img"
              src={logo}
              alt={link.service}
              sx={{ maxHeight: 40, maxWidth: "80%", objectFit: "contain" }}
            />
          ) : (
            <Avatar sx={{ bgcolor: color, width: 44, height: 44 }}>
              <LinkIcon sx={{ color: "white", fontSize: 24 }} />
            </Avatar>
          )}
        </Box>
      );
    });
  }, [allLinks, serviceLogos, serviceColors]);

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
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
            <LinkIcon color="primary" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              {Locale.label("songs.links.title", "Streaming links")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {Locale.label(
                "songs.links.subtitle",
                "Spotify, YouTube, Apple Music, and other external links for this song."
              )}
            </Typography>
          </Box>
        </Stack>
        {props.onEdit && (
          <IconButton
            onClick={props.onEdit}
            size="small"
            aria-label={Locale.label("songs.links.edit", "Edit streaming links")}
            sx={{
              color: "primary.main",
              "&:hover": { backgroundColor: "action.hover" }
            }}>
            <EditIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>

      {isEmpty ? (
        <Box
          sx={{
            p: 3,
            textAlign: "center",
            borderRadius: 2,
            bgcolor: "var(--bg-sub)",
            border: "2px dashed",
            borderColor: "divider"
          }}>
          <LinkIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5, opacity: 0.6 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {Locale.label("songs.links.empty", "No streaming links added yet")}
          </Typography>
          {props.onEdit && (
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={props.onEdit}>
              {Locale.label("songs.links.addFirst", "Add first link")}
            </Button>
          )}
        </Box>
      ) : (
        <Stack
          direction="row"
          spacing={2}
          useFlexGap
          sx={{
            flexWrap: "wrap",
            justifyContent: { xs: "center", sm: "flex-start" }
          }}>
          {linkCards}
        </Stack>
      )}

      {!isEmpty && props.onEdit && (
        <Button variant="text" size="small" startIcon={<AddIcon />} onClick={props.onEdit} sx={{ mt: 1.5, color: "text.secondary" }}>
          {Locale.label("songs.links.addAnother", "Add another link")}
        </Button>
      )}
    </Box>
  );
});
