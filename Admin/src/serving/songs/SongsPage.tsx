import React, { memo, useMemo, useCallback } from "react";
import { ApiHelper, Loading, Locale, PageHeader, UserHelper, Permissions } from "@machonharuach/apphelper";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Button,
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Avatar,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
  Chip
} from "@mui/material";
import {
  MusicNote as MusicIcon,
  LibraryMusic as LibraryIcon,
  Add as AddIcon,
  Search as SearchIcon,
  ArrowDropDown as ArrowDropDownIcon,
  CloudUpload as CloudUploadIcon,
  Timer as TimerIcon,
  Person as ArtistIcon,
  Album as AlbumIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from "@mui/icons-material";
import { SongSearchDialog } from "./SongSearchDialog";
import { MusicUploadDialog } from "./components/MusicUploadDialog";
import { AlbumUploadDialog } from "./components/AlbumUploadDialog";
import { type ArrangementInterface, type ArrangementKeyInterface, type SongDetailInterface, type SongInterface } from "../../helpers";
import {
  entryMatchesSearch,
  groupSongsForLibrary,
  primarySongId,
  totalAlbumSeconds,
  type SongLibraryEntry
} from "./helpers/groupSongsForLibrary";
import { libraryEntryToSortPayload, sortLibraryEntries } from "./helpers/sortLibraryEntries";
import { SortableTableRow } from "../../components/ui";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useQuery } from "@tanstack/react-query";

export const SongsPage = memo(() => {
  const [showSearch, setShowSearch] = React.useState(false);
  const [showMusicUpload, setShowMusicUpload] = React.useState(false);
  const [showAlbumUpload, setShowAlbumUpload] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const [redirect, setRedirect] = React.useState("");
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [failedImages, setFailedImages] = React.useState<Set<string>>(new Set());
  const orderedEntriesRef = React.useRef<SongLibraryEntry[]>([]);

  const songs = useQuery<SongDetailInterface[]>({
    queryKey: ["/songDetails", "ContentApi"],
    placeholderData: [],
    queryFn: async () => {
      const data = await ApiHelper.get("/songDetails", "ContentApi");
      return Array.isArray(data) ? data : [];
    }
  });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleUploadMusic = () => {
    handleMenuClose();
    setShowMusicUpload(true);
  };

  const handleUploadAlbum = () => {
    handleMenuClose();
    setShowAlbumUpload(true);
  };

  const handleAddFromCatalog = () => {
    handleMenuClose();
    setShowSearch(true);
  };

  const getAddMenu = () => (
    <>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        endIcon={<ArrowDropDownIcon />}
        onClick={handleMenuClick}
        data-testid="add-song-button"
        aria-label="Add song"
        sx={{
          color: "#FFF",
          borderColor: "rgba(255,255,255,0.5)",
          "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" }
        }}>
        {Locale.label("songs.addSong")}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}>
        <MenuItem onClick={handleUploadMusic} data-testid="add-song-upload-music">
          <Stack direction="row" spacing={1} alignItems="center">
            <CloudUploadIcon fontSize="small" />
            <Typography>{Locale.label("songs.add.uploadSingle", "Upload single")}</Typography>
          </Stack>
        </MenuItem>
        <MenuItem onClick={handleUploadAlbum} data-testid="add-song-upload-album">
          <Stack direction="row" spacing={1} alignItems="center">
            <AlbumIcon fontSize="small" />
            <Typography>{Locale.label("songs.add.uploadAlbum", "Upload album")}</Typography>
          </Stack>
        </MenuItem>
        <MenuItem onClick={handleAddFromCatalog} data-testid="add-song-from-catalog">
          <Stack direction="row" spacing={1} alignItems="center">
            <LibraryIcon fontSize="small" />
            <Typography>{Locale.label("songs.add.fromCatalog", "Add from catalog")}</Typography>
          </Stack>
        </MenuItem>
      </Menu>
    </>
  );

  const handleAdd = useCallback(
    async (songDetail: SongDetailInterface) => {
      let selectedSong = null;
      if (!songDetail.id) {
        songDetail = await ApiHelper.post("/songDetails/create", songDetail, "ContentApi");
      }

      const existing = await ApiHelper.get("/arrangements/songDetail/" + songDetail.id, "ContentApi");
      if (existing.length > 0) {
        const song = await ApiHelper.get("/songs/" + existing[0].songId, "ContentApi");
        selectedSong = song;
      } else {
        const s: SongInterface = { name: songDetail.title, dateAdded: new Date() };
        const createdSongs = await ApiHelper.post("/songs", [s], "ContentApi");
        const a: ArrangementInterface = {
          songId: createdSongs[0].id,
          songDetailId: songDetail.id,
          name: "(Default)",
          lyrics: ""
        };
        const arrangements = await ApiHelper.post("/arrangements", [a], "ContentApi");
        const key: ArrangementKeyInterface = {
          arrangementId: arrangements[0].id,
          keySignature: songDetail.keySignature || "",
          shortDescription: "Default"
        };
        await ApiHelper.post("/arrangementKeys", [key], "ContentApi");
        selectedSong = createdSongs[0];
      }

      songs.refetch();
      setShowSearch(false);
      setRedirect("/sermons/songs/" + selectedSong.id);
    },
    [songs]
  );

  const handleMusicUploadComplete = useCallback(
    (songId: string) => {
      songs.refetch();
      setShowMusicUpload(false);
      setRedirect("/sermons/songs/" + songId);
    },
    [songs]
  );

  const handleAlbumUploadComplete = useCallback(
    (_count: number) => {
      songs.refetch();
      setShowAlbumUpload(false);
    },
    [songs]
  );

  const handleDeleteSong = useCallback(
    async (songId: string, title?: string) => {
      const message = Locale.label(
        "songs.deleteSong.confirm",
        title ? `Are you sure you wish to delete "${title}"?` : "Are you sure you wish to delete this song?"
      );
      if (!window.confirm(message)) return;
      await ApiHelper.delete("/songs/" + songId, "ContentApi");
      songs.refetch();
    },
    [songs]
  );

  const handleDeleteAlbum = useCallback(
    async (entry: Extract<SongLibraryEntry, { kind: "album" }>) => {
      const tracks = entry.tracks ?? [];
      const message = Locale.label(
        "songs.deleteAlbum.confirm",
        `Delete album "${entry.album}" and all ${tracks.length} tracks? This cannot be undone.`
      );
      if (!window.confirm(message)) return;
      for (const track of tracks) {
        if (track.songId) {
          await ApiHelper.delete("/songs/" + track.songId, "ContentApi");
        }
      }
      songs.refetch();
    },
    [songs]
  );

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const imgSrc = e.currentTarget.src;
    setFailedImages((prev) => new Set(prev).add(imgSrc));
  }, []);

  const formatSeconds = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  }, []);

  const libraryEntriesFromData = useMemo(() => {
    if (!Array.isArray(songs.data)) return null;
    const grouped = sortLibraryEntries(groupSongsForLibrary(songs.data));
    if (!searchTerm.trim()) return grouped;
    return grouped.filter((e) => entryMatchesSearch(e, searchTerm.trim()));
  }, [songs.data, searchTerm]);

  const [libraryEntries, setLibraryEntries] = React.useState<SongLibraryEntry[] | null>(null);

  React.useEffect(() => {
    setLibraryEntries(libraryEntriesFromData);
  }, [libraryEntriesFromData]);

  React.useEffect(() => {
    if (libraryEntries) orderedEntriesRef.current = libraryEntries;
  }, [libraryEntries]);

  const saveLibraryOrder = useCallback(
    (entries: SongLibraryEntry[]) => {
      const payload = entries.map(libraryEntryToSortPayload).filter((e) => e.songIds.length > 0);
      if (!payload.length) return;
      ApiHelper.post("/songs/sort", { entries: payload }, "ContentApi").then(() => songs.refetch());
    },
    [songs]
  );

  const moveLibraryEntryDrag = useCallback((dragIndex: number, hoverIndex: number) => {
    setLibraryEntries((prev) => {
      if (!prev?.length) return prev;
      const next = [...prev];
      const [removed] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, removed);
      orderedEntriesRef.current = next;
      return next;
    });
  }, []);

  const getEmptyState = () => (
    <TableRow>
      <TableCell colSpan={7} sx={{ textAlign: "center", py: 8 }}>
        <Stack spacing={2} alignItems="center">
          <LibraryIcon sx={{ fontSize: 64, color: "text.secondary" }} />
          <Typography variant="h6" color="text.secondary">
            {searchTerm ? Locale.label("songs.library.noResults", "No songs match your search.") : Locale.label("songs.library.empty.title", "No songs yet")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm
              ? Locale.label("songs.library.adjustSearch", "Try different search words.")
              : Locale.label("songs.library.empty.message", "Upload a single track, upload an album, or add from the catalog.")}
          </Typography>
          {!searchTerm && canEdit && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => setShowMusicUpload(true)} size="large">
                {Locale.label("songs.add.uploadSingle", "Upload single")}
              </Button>
              <Button variant="contained" startIcon={<AlbumIcon />} onClick={() => setShowAlbumUpload(true)} size="large">
                {Locale.label("songs.add.uploadAlbum", "Upload album")}
              </Button>
              <Button variant="outlined" startIcon={<LibraryIcon />} onClick={() => setShowSearch(true)} size="large">
                {Locale.label("songs.add.fromCatalog", "Add from catalog")}
              </Button>
            </Stack>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );

  const getRowActions = (
    songId: string | undefined,
    to: string,
    onDelete: () => void,
    editTestId: string,
    deleteTestId: string,
    editAriaLabel: string,
    deleteAriaLabel: string
  ) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
      {songId ? (
        <>
          <Tooltip title={Locale.label("common.edit", "Edit")} arrow>
            <IconButton
              size="small"
              onClick={() => navigate(to)}
              data-testid={editTestId}
              aria-label={editAriaLabel}
              sx={{
                color: "primary.main",
                "&:hover": {
                  backgroundColor: "primary.main",
                  color: "white",
                  transform: "scale(1.05)"
                },
                transition: "all 0.2s ease-in-out"
              }}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          {canEdit ? (
            <Tooltip title={Locale.label("common.delete", "Delete")} arrow>
              <IconButton
                size="small"
                onClick={onDelete}
                data-testid={deleteTestId}
                aria-label={deleteAriaLabel}
                sx={{
                  color: "error.main",
                  "&:hover": {
                    backgroundColor: "error.main",
                    color: "white",
                    transform: "scale(1.05)"
                  },
                  transition: "all 0.2s ease-in-out"
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          ) : null}
        </>
      ) : null}
    </Stack>
  );

  const renderRow = (entry: SongLibraryEntry, index: number, entries: SongLibraryEntry[]) => {
    const songId = primarySongId(entry);
    const to = songId ? `/sermons/songs/${songId}` : "#";
    const rowKey =
      entry.kind === "album"
        ? `album-${entry.album}-${entry.artist}`
        : `single-${entry.track?.id ?? entry.track?.songId ?? "unknown"}`;

    if (entry.kind === "album") {
      const tracks = entry.tracks ?? [];
      const cover = tracks.find((t) => t.thumbnail)?.thumbnail;
      const totalSec = totalAlbumSeconds(tracks);
      return (
        <SortableTableRow
          key={rowKey}
          id={rowKey}
          index={index}
          sortable={canEdit && !!songId && !searchTerm.trim()}
          onMoveDrag={moveLibraryEntryDrag}
          onDragEnd={() => {
            if (orderedEntriesRef.current) saveLibraryOrder(orderedEntriesRef.current);
          }}
          sx={{
            "&:hover": { backgroundColor: "action.hover" },
            transition: "background-color 0.2s ease"
          }}
        >
          <TableCell sx={{ minWidth: 200 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                src={cover && !failedImages.has(cover) ? cover : undefined}
                sx={{ width: 40, height: 40, bgcolor: "primary.light" }}
                onError={handleImageError}>
                <AlbumIcon sx={{ fontSize: 22, color: "primary.main" }} />
              </Avatar>
              <Box>
                <Typography
                  variant="body1"
                  component={songId ? Link : "span"}
                  to={songId ? to : undefined}
                  sx={{ fontWeight: 600, color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                  {entry.album}
                </Typography>
              </Box>
            </Stack>
          </TableCell>
          <TableCell>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <ArtistIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {entry.artist || "—"}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell>
            <Chip label={Locale.label("songs.library.albumBadge", "Album")} size="small" variant="outlined" sx={{ height: 22 }} />
          </TableCell>
          <TableCell>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {tracks.length}
            </Typography>
          </TableCell>
          <TableCell>
            {totalSec > 0 ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <TimerIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  {formatSeconds(totalSec)}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.disabled">
                —
              </Typography>
            )}
          </TableCell>
          <TableCell align="right">
            {getRowActions(
              songId,
              to,
              () => handleDeleteAlbum(entry),
              `edit-album-${rowKey}`,
              `delete-album-${rowKey}`,
              `Edit album ${entry.album}`,
              `Delete album ${entry.album}`
            )}
          </TableCell>
        </SortableTableRow>
      );
    }

    const songDetail = entry.track;
    if (!songDetail) return null;
    return (
      <SortableTableRow
        key={rowKey}
        id={rowKey}
        index={index}
        sortable={canEdit && !!songId && !searchTerm.trim()}
        onMoveDrag={moveLibraryEntryDrag}
        onDragEnd={() => {
          if (orderedEntriesRef.current) saveLibraryOrder(orderedEntriesRef.current);
        }}
        sx={{
          "&:hover": { backgroundColor: "action.hover" },
          transition: "background-color 0.2s ease"
        }}
      >
        <TableCell sx={{ minWidth: 200 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              src={songDetail.thumbnail && !failedImages.has(songDetail.thumbnail) ? songDetail.thumbnail : undefined}
              sx={{ width: 40, height: 40, bgcolor: "primary.light" }}
              onError={handleImageError}>
              <MusicIcon sx={{ fontSize: 22, color: "primary.main" }} />
            </Avatar>
            <Box>
              <Typography
                variant="body1"
                component={songId ? Link : "span"}
                to={songId ? to : undefined}
                sx={{ fontWeight: 500, color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                {songDetail.title}
              </Typography>
            </Box>
          </Stack>
        </TableCell>
        <TableCell>
          {songDetail.artist ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <ArtistIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {songDetail.artist}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Chip label={Locale.label("songs.library.singleBadge", "Single")} size="small" variant="outlined" sx={{ height: 22 }} />
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            1
          </Typography>
        </TableCell>
        <TableCell>
          {songDetail.seconds ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <TimerIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {formatSeconds(songDetail.seconds)}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          )}
        </TableCell>
        <TableCell align="right">
          {getRowActions(
            songId,
            to,
            () => handleDeleteSong(songId!, songDetail.title),
            `edit-song-${songId}`,
            `delete-song-${songId}`,
            `Edit ${songDetail.title}`,
            `Delete ${songDetail.title}`
          )}
        </TableCell>
      </SortableTableRow>
    );
  };

  const getRows = () => {
    if (!libraryEntries?.length) return [];
    return libraryEntries
      .map((entry, index) => renderRow(entry, index, libraryEntries))
      .filter((row): row is React.ReactElement => row != null);
  };

  const getTable = () => {
    if (songs.isLoading) return <Loading size="sm" data-testid="songs-loading" />;
    return (
      <Table id="songs-table" sx={{ minWidth: 650 }}>
        <TableHead
          sx={{
            backgroundColor: "var(--bg-card)",
            "& .MuiTableCell-root": {
              borderBottom: "2px solid",
              borderBottomColor: "divider",
              fontWeight: 600
            }
          }}>
          <TableRow>
            {canEdit && !searchTerm.trim() ? <TableCell sx={{ width: 40, px: 0.5 }} /> : null}
            <TableCell sx={{ width: "30%" }}>{Locale.label("songs.table.title", "Title")}</TableCell>
            <TableCell sx={{ width: "20%" }}>{Locale.label("songs.table.artist", "Artist")}</TableCell>
            <TableCell sx={{ width: "14%" }}>{Locale.label("songs.table.releaseType", "Release Type")}</TableCell>
            <TableCell sx={{ width: "12%" }}>{Locale.label("songs.table.tracks", "Tracks")}</TableCell>
            <TableCell sx={{ width: "12%" }}>{Locale.label("songs.table.length", "Length")}</TableCell>
            <TableCell sx={{ width: "12%" }} align="right">
              {Locale.label("sermons.playlists.actions", "Actions")}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <DndProvider backend={HTML5Backend}>
            {!libraryEntries?.length ? getEmptyState() : getRows()}
          </DndProvider>
        </TableBody>
      </Table>
    );
  };

  if (redirect) return <Navigate to={redirect} />;

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <PageHeader title={Locale.label("songs.title") || Locale.label("songs.songsPage.songs")} subtitle={Locale.label("songs.songsPage.subtitle")}>
          {canEdit ? (
            <Stack direction="row" spacing={1} sx={{ flexShrink: 0, justifyContent: { xs: "flex-start", md: "flex-end" }, width: { xs: "100%", md: "auto" } }}>
              {getAddMenu()}
            </Stack>
          ) : null}
        </PageHeader>
      </Box>

      <Box sx={{ px: 3 }}>
        <Card
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "var(--border-light)"
          }}>
          {libraryEntries && libraryEntries.length > 0 && (
            <Box
              sx={{
                p: 2,
                borderBottom: 1,
                borderColor: "divider",
                display: "flex",
                alignItems: { xs: "stretch", sm: "center" },
                justifyContent: "space-between",
                gap: 2,
                flexDirection: { xs: "column", sm: "row" }
              }}>
              <TextField
                fullWidth
                placeholder={Locale.label("songs.search.placeholder", "Search by title, artist, or album…")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
                sx={{ maxWidth: 400 }}
              />
              {canEdit ? (
                <Stack direction="row" sx={{ justifyContent: { xs: "flex-start", sm: "flex-end" } }}>{getAddMenu()}</Stack>
              ) : null}
            </Box>
          )}

          <CardContent sx={{ p: 0, overflowX: "auto" }}>{getTable()}</CardContent>
        </Card>
      </Box>

      {showSearch && canEdit && <SongSearchDialog onClose={() => setShowSearch(false)} onSelect={handleAdd} />}
      {showMusicUpload && canEdit && (
        <MusicUploadDialog onClose={() => setShowMusicUpload(false)} onComplete={handleMusicUploadComplete} />
      )}
      {showAlbumUpload && canEdit && (
        <AlbumUploadDialog onClose={() => setShowAlbumUpload(false)} onComplete={handleAlbumUploadComplete} />
      )}
    </>
  );
});
