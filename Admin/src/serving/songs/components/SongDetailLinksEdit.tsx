import React, { useEffect, useMemo } from "react";
import { ApiHelper, InputBox, Locale } from "@machonharuach/apphelper";
import { type SongDetailLinkInterface } from "../../../helpers";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  type SelectChangeEvent,
  Stack,
  Typography,
  Box,
  Button
} from "@mui/material";
import { Link as LinkIcon } from "@mui/icons-material";

const INTERNAL_SERVICES = new Set(["Hosted", "Cover"]);

interface Props {
  songDetailId: string;
  reload: () => void;
  hideHosted?: boolean;
  hideCover?: boolean;
}

export const SongDetailLinksEdit = (props: Props) => {
  const [songDetailLinks, setSongDetailLinks] = React.useState<SongDetailLinkInterface[]>([]);
  const [editLink, setEditLink] = React.useState<SongDetailLinkInterface>(null);

  const visibleLinks = useMemo(() => {
    let links = songDetailLinks || [];
    if (props.hideHosted) links = links.filter((l) => l.service !== "Hosted");
    if (props.hideCover) links = links.filter((l) => l.service !== "Cover");
    return links.filter((l) => !INTERNAL_SERVICES.has(l.service || ""));
  }, [songDetailLinks, props.hideHosted, props.hideCover]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const l = { ...editLink };
    switch (e.target.name) {
      case "serviceKey": l.serviceKey = e.target.value; break;
      case "service": l.service = e.target.value; break;
      case "url": l.url = e.target.value; break;
    }
    setEditLink(l);
  };

  const loadData = () => {
    if (props.songDetailId) {
      ApiHelper.get("/songDetailLinks/songDetail/" + props.songDetailId, "ContentApi").then((data) => {
        setSongDetailLinks(data);
      });
    }
  };

  useEffect(() => {
    loadData();
  }, [props.songDetailId]);

  const getPlaceholder = (link: SongDetailLinkInterface) => {
    switch (link.service) {
      case "Apple": return "10-000-reasons-bless-the-lord-10th-anniversary-feat/1618341399";
      case "CCLI": return "6016351";
      case "Genius": return "Matt-redman-10000-reasons-bless-the-lord-lyrics";
      case "Hymnary": return "amazing-grace-how-sweet-the-sound";
      case "MusicBrainz": return "00000000-0000-0000-0000-000000000000";
      case "Spotify": return "2I9pjIezpupeJfVM1r9ZIm";
      case "YouTube": return "XtwIT8JjddM";
      default: return "";
    }
  };

  const determineUrl = (link: SongDetailLinkInterface) => {
    switch (link.service) {
      case "Apple": return "https://music.apple.com/us/album/" + link.serviceKey;
      case "CCLI": return "https://songselect.ccli.com/Songs/" + link.serviceKey;
      case "Genius": return "https://genius.com/" + link.serviceKey;
      case "Hymnary": return "https://hymnary.org/text/" + link.serviceKey;
      case "MusicBrainz": return "https://musicbrainz.org/recording/" + link.serviceKey;
      case "Spotify": return "https://open.spotify.com/track/" + link.serviceKey;
      case "YouTube": return "https://www.youtube.com/watch?v=" + link.serviceKey;
      default: return (link.url || "").trim();
    }
  };

  const handleAdd = () => {
    setEditLink({ songDetailId: props.songDetailId, service: "Spotify", serviceKey: "" });
  };

  const handleDelete = () => {
    ApiHelper.delete("/songDetailLinks/" + editLink.id, "ContentApi").then(() => {
      loadData();
      setEditLink(null);
    });
  };

  const handleSave = () => {
    const l = { ...editLink };
    l.url = determineUrl(l);

    ApiHelper.post("/songDetailLinks", [l], "ContentApi").then(() => {
      loadData();
      setEditLink(null);
      if (l.service === "MusicBrainz") props.reload();
    });
  };

  const getRow = (link: SongDetailLinkInterface) => (
    <TableRow key={link.id}>
      <TableCell>
        <button
          type="button"
          onClick={() => setEditLink(link)}
          style={{ background: "none", border: 0, padding: 0, color: "inherit", cursor: "pointer", textDecoration: "underline" }}>
          {link.service}
        </button>
      </TableCell>
      <TableCell>{link.serviceKey}</TableCell>
    </TableRow>
  );

  if (editLink) {
    return (
      <InputBox
        headerText={Locale.label("songs.links.editLink", "Edit link")}
        headerIcon="link"
        cancelFunction={() => setEditLink(null)}
        saveFunction={handleSave}
        deleteFunction={editLink.id ? handleDelete : null}>
        <FormControl fullWidth size="small">
          <InputLabel>{Locale.label("songs.links.service", "Service")}</InputLabel>
          <Select size="small" name="service" label={Locale.label("songs.links.service", "Service")} value={editLink.service} onChange={handleChange}>
            <MenuItem value="Spotify">Spotify</MenuItem>
            <MenuItem value="Apple">Apple Music</MenuItem>
            <MenuItem value="YouTube">YouTube</MenuItem>
            <MenuItem value="CCLI">CCLI</MenuItem>
            <MenuItem value="Genius">Genius</MenuItem>
            <MenuItem value="Hymnary">Hymnary</MenuItem>
            <MenuItem value="MusicBrainz">MusicBrainz</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          name="serviceKey"
          placeholder={getPlaceholder(editLink)}
          fullWidth
          label={Locale.label("songs.links.serviceKey", "ID or path")}
          value={editLink.serviceKey || ""}
          onChange={handleChange}
          sx={{ mt: 2 }}
          helperText={Locale.label("songs.links.serviceKeyHelp", "Paste the ID or slug from the streaming service URL.")}
        />
      </InputBox>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <LinkIcon sx={{ color: "primary.main", fontSize: 24, mt: 0.25 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {Locale.label("songs.links.title", "Streaming links")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Locale.label("songs.links.subtitle", "Spotify, YouTube, Apple Music, and other external links for this song.")}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexShrink={0} useFlexGap>
          <Button variant="outlined" size="small" onClick={handleAdd}>
            {Locale.label("songs.links.add", "Add link")}
          </Button>
          <Button variant="contained" size="small" onClick={props.reload}>
            {Locale.label("common.done", "Done")}
          </Button>
        </Stack>
      </Stack>

      {visibleLinks.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {Locale.label("songs.links.empty", "No streaming links added yet")}
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{Locale.label("songs.links.service", "Service")}</TableCell>
              <TableCell>{Locale.label("songs.links.serviceKey", "ID or path")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{visibleLinks.map((sd) => getRow(sd))}</TableBody>
        </Table>
      )}
    </Box>
  );
};
