import { Loading, Locale } from "@machonharuach/apphelper";
import { ApiHelper } from "@machonharuach/apphelper";
import { UserHelper } from "@machonharuach/apphelper";
import { PageHeader } from "@machonharuach/apphelper";
import { ImageEditor } from "@machonharuach/apphelper";
import type { PlaylistInterface } from "@machonharuach/helpers";
import { Permissions } from "@machonharuach/helpers";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Box,
  Tooltip,
  Chip
} from "@mui/material";
import { NavigationTabs, SortableTableRow } from "../../components/ui";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VideoLibrary as VideoLibraryIcon,
  LibraryMusic as LibraryMusicIcon,
  Search as SearchIcon
} from "@mui/icons-material";
import React from "react";
import { PlaylistEdit } from "./PlaylistEdit";
import type { MediaCategory } from "../../helpers/mediaCategories";
import {
  mediaCategoryLocaleKey,
  normalizeMediaCategory
} from "../../helpers/mediaCategories";

export const Playlists = () => {
  const [playlists, setPlaylists] = React.useState<PlaylistInterface[]>([]);
  const [filteredPlaylists, setFilteredPlaylists] = React.useState<PlaylistInterface[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = React.useState<PlaylistInterface>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [showSearch, setShowSearch] = React.useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = React.useState<string>(null);
  const [photoType, setPhotoType] = React.useState<string>(null);
  const [playlistTab, setPlaylistTab] = React.useState<"video" | "music">("video");
  const imageEditorRef = React.useRef<HTMLDivElement>(null);
  const orderedPlaylistsRef = React.useRef<PlaylistInterface[]>([]);
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit);

  const handleUpdated = () => {
    setCurrentPlaylist(null);
    loadData();
  };

  const showPhotoEditor = (pType: string, url: string) => {
    setPhotoUrl(url);
    setPhotoType(pType);
  };

  const handlePhotoUpdated = (dataUrl: string) => {
    setPhotoUrl(dataUrl);
    setPhotoType(photoType);
  };

  const loadData = () => {
    ApiHelper.get("/playlists", "ContentApi").then((data: any) => {
      setPlaylists(data);
      setFilteredPlaylists(data);
      setIsLoading(false);
    });
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);

    const base = tabPlaylists;
    if (term === "") {
      setFilteredPlaylists(base);
    } else {
      const filtered = base.filter((playlist: any) =>
        playlist.title.toLowerCase().includes(term)
        || (playlist.description && playlist.description.toLowerCase().includes(term)));
      setFilteredPlaylists(filtered);
    }
  };

  const handleAdd = (type: "video" | "music") => {
    const churchId = UserHelper.currentUserChurch.church.id;
    const title =
      type === "music"
        ? Locale.label("sermons.playlists.playlistEdit.newMusicPlaylist", "New Music Playlist")
        : Locale.label("sermons.playlists.playlistEdit.newVideoPlaylist", "New Video Playlist");
    const v: PlaylistInterface = {
      churchId,
      title,
      description: "",
      publishDate: new Date(),
      thumbnail: "",
      playlistType: type,
      sort: 0,
      mediaCategory: "sermon"
    };
    setCurrentPlaylist(v);
    loadData();
  };

  const tabPlaylists = React.useMemo(
    () => playlists.filter((p) => (p.playlistType || "video") === playlistTab),
    [playlists, playlistTab]
  );

  const playlistPanelTabs = React.useMemo(
    () => [
      {
        value: "video",
        label: Locale.label("sermons.playlists.videoTab", "Videos"),
        subtitle: Locale.label("sermons.playlists.videoTabSubtitle", "Sermons and series in Watch")
      },
      {
        value: "music",
        label: Locale.label("sermons.playlists.musicTab", "Music"),
        subtitle: Locale.label("sermons.playlists.musicTabSubtitle", "Audio tracks in the Music tab")
      }
    ],
    []
  );

  const handlePlaylistTabChange = (tab: string) => {
    setPlaylistTab(tab as "video" | "music");
    setSearchTerm("");
  };

  const savePlaylistOrder = (ordered: PlaylistInterface[]) => {
    const ids = ordered.map((p) => p.id).filter(Boolean) as string[];
    if (!ids.length) return;
    ApiHelper.post("/playlists/sort", { ids }, "ContentApi").then(loadData);
  };

  const movePlaylistDrag = (dragIndex: number, hoverIndex: number) => {
    setFilteredPlaylists((prev) => {
      const next = [...prev];
      const [removed] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, removed);
      orderedPlaylistsRef.current = next;
      return next;
    });
  };

  React.useEffect(() => {
    orderedPlaylistsRef.current = filteredPlaylists;
  }, [filteredPlaylists]);

  const handleDeletePlaylist = (playlist: PlaylistInterface) => {
    if (!playlist?.id) return;
    if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) {
      window.alert(Locale.label("sermons.playlists.playlistEdit.unauthorizedDelete"));
      return;
    }
    if (!window.confirm(Locale.label("sermons.playlists.playlistEdit.deleteConfirm"))) return;

    ApiHelper.delete("/playlists/" + playlist.id, "ContentApi").then(() => {
      if (currentPlaylist?.id === playlist.id) setCurrentPlaylist(null);
      loadData();
    });
  };

  const getRowActions = (playlist: PlaylistInterface) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
      <Tooltip title={Locale.label("sermons.playlists.editPlaylist")} arrow>
        <IconButton
          size="small"
          onClick={() => setCurrentPlaylist(playlist)}
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
      {playlist.id && (
        <Tooltip title={Locale.label("common.delete", "Delete")} arrow>
          <IconButton
            size="small"
            onClick={() => handleDeletePlaylist(playlist)}
            data-testid={`delete-playlist-${playlist.id}`}
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
      )}
    </Stack>
  );

  const getContentTypeChip = (playlist: PlaylistInterface) => {
    const category = normalizeMediaCategory(playlist.mediaCategory);
    const colorMap: Record<MediaCategory, "default" | "primary" | "secondary" | "success" | "info" | "warning"> = {
      sermon: "primary",
      movie: "secondary",
      kids: "success",
      dance: "info",
      musicVideo: "warning",
      other: "default"
    };
    return (
      <Chip
        size="small"
        label={Locale.label(mediaCategoryLocaleKey(category))}
        color={colorMap[category]}
        variant="outlined"
        sx={{ fontWeight: 600 }}
      />
    );
  };

  const rowSx = {
    "&:hover": { backgroundColor: "action.hover" },
    transition: "background-color 0.2s ease",
    "&:last-child td": { borderBottom: 0 }
  };

  const getVideoTableRows = () => filteredPlaylists.map((playlist, index) => (
    <SortableTableRow
      key={playlist.id || `playlist-video-${index}`}
      id={playlist.id || `playlist-video-${index}`}
      index={index}
      sortable={canEdit && !!playlist.id}
      onMoveDrag={movePlaylistDrag}
      onDragEnd={() => savePlaylistOrder(orderedPlaylistsRef.current)}
      sx={rowSx}
    >
      <TableCell>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {playlist.title}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {playlist.description || "—"}
        </Typography>
      </TableCell>
      <TableCell>{getContentTypeChip(playlist)}</TableCell>
      <TableCell align="right">{getRowActions(playlist)}</TableCell>
    </SortableTableRow>
  ));

  const getMusicTableRows = () => filteredPlaylists.map((playlist, index) => (
    <SortableTableRow
      key={playlist.id || `playlist-music-${index}`}
      id={playlist.id || `playlist-music-${index}`}
      index={index}
      sortable={canEdit && !!playlist.id}
      onMoveDrag={movePlaylistDrag}
      onDragEnd={() => savePlaylistOrder(orderedPlaylistsRef.current)}
      sx={rowSx}
    >
      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Chip
            size="small"
            label={Locale.label("sermons.playlists.musicType", "Music")}
            color="success"
            variant="outlined"
          />
        </Stack>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {playlist.title}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {playlist.description || "—"}
        </Typography>
      </TableCell>
      <TableCell align="right">{getRowActions(playlist)}</TableCell>
    </SortableTableRow>
  ));

  const getEmptyState = () => {
    const isSearching = searchTerm.length > 0;

    return (
      <TableRow>
        <TableCell colSpan={playlistTab === "video" ? 5 : 4} sx={{ textAlign: "center", py: 6, borderBottom: 0 }}>
          <Stack spacing={2} alignItems="center">
            {playlistTab === "music" ? (
              <LibraryMusicIcon sx={{ fontSize: 48, color: "text.secondary" }} />
            ) : (
              <VideoLibraryIcon sx={{ fontSize: 48, color: "text.secondary" }} />
            )}
            <Typography variant="h6" color="text.secondary">
              {isSearching
                ? Locale.label("sermons.playlists.noPlaylistsMatch")
                : playlistTab === "music"
                  ? Locale.label("sermons.playlists.noMusicPlaylistsFound", "No music playlists found")
                  : Locale.label("sermons.playlists.noVideoPlaylistsFound", "No video playlists found")}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {isSearching
                ? Locale.label("sermons.playlists.adjustSearchTerms")
                : playlistTab === "music"
                  ? Locale.label("sermons.playlists.getStartedMusic", "Get started by creating your first music playlist")
                  : Locale.label("sermons.playlists.getStarted")}
            </Typography>
            {!isSearching && (
              <Button
                variant="contained"
                startIcon={playlistTab === "music" ? <LibraryMusicIcon /> : <AddIcon />}
                onClick={() => handleAdd(playlistTab)}
                data-testid="add-playlist-button"
              >
                {playlistTab === "music"
                  ? Locale.label("sermons.playlists.createFirstMusicPlaylist", "Create First Music Playlist")
                  : Locale.label("sermons.playlists.createFirstPlaylist")}
              </Button>
            )}
          </Stack>
        </TableCell>
      </TableRow>
    );
  };

  const getTable = () => {
    if (isLoading) return <Loading />;

    const isVideo = playlistTab === "video";

    return (
      <TableContainer>
        <Table id="playlists-table" sx={{ minWidth: 650 }}>
          <TableHead
            sx={{
              backgroundColor: "var(--bg-card)",
              "& .MuiTableCell-root": {
                borderBottom: "2px solid",
                borderBottomColor: "divider"
              }
            }}
          >
            <TableRow>
              {canEdit ? <TableCell sx={{ width: 40, px: 0.5 }} /> : null}
              {isVideo ? (
                <>
                  <TableCell sx={{ width: "28%" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {Locale.label("sermons.playlists.playlistName", "Playlist Name")}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: "40%" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {Locale.label("sermons.playlists.playlistEdit.description")}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: "18%" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {Locale.label("sermons.contentType", "Content Type")}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ width: "14%" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {Locale.label("sermons.playlists.actions")}
                    </Typography>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell sx={{ width: "36%" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {Locale.label("sermons.playlists.playlistName", "Playlist Name")}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: "50%" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {Locale.label("sermons.playlists.playlistEdit.description")}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ width: "14%" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {Locale.label("sermons.playlists.actions")}
                    </Typography>
                  </TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            <DndProvider backend={HTML5Backend}>
              {filteredPlaylists.length === 0
                ? getEmptyState()
                : (isVideo ? getVideoTableRows() : getMusicTableRows())}
            </DndProvider>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    if (searchTerm === "") {
      setFilteredPlaylists(tabPlaylists);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredPlaylists(
        tabPlaylists.filter(
          (playlist: PlaylistInterface) =>
            playlist.title?.toLowerCase().includes(term) ||
            (playlist.description && playlist.description.toLowerCase().includes(term))
        )
      );
    }
  }, [tabPlaylists, searchTerm]);

  React.useEffect(() => {
    if (!showSearch) {
      setSearchTerm("");
      setFilteredPlaylists(tabPlaylists);
    }
  }, [showSearch, tabPlaylists]);

  React.useEffect(() => {
    if ((photoUrl || photoUrl === "") && imageEditorRef.current) {
      imageEditorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [photoUrl]);

  const imageEditor = (photoUrl || photoUrl === "") && (
    <div ref={imageEditorRef}>
      <ImageEditor
        aspectRatio={16 / 9}
        outputWidth={640}
        outputHeight={360}
        photoUrl={photoUrl}
        onCancel={() => { setPhotoUrl(null); setPhotoType(null); }}
        onUpdate={handlePhotoUpdated}
      />
    </div>
  );

  if (currentPlaylist !== null) {
    return (
      <>
        {imageEditor}
        <PlaylistEdit
          currentPlaylist={currentPlaylist}
          updatedFunction={handleUpdated}
          showPhotoEditor={showPhotoEditor}
          updatedPhoto={(photoType === "playlist" && photoUrl) || null}
        />
      </>
    );
  }

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <PageHeader
          title={Locale.label("sermons.playlists.title")}
          subtitle={Locale.label("sermons.playlists.subtitle")}
        >
          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            onClick={() => setShowSearch(!showSearch)}
            sx={{
              color: "#FFF",
              borderColor: showSearch ? "#FFF" : "rgba(255,255,255,0.5)",
              backgroundColor: showSearch ? "rgba(255,255,255,0.1)" : "transparent",
              "&:hover": {
                borderColor: "#FFF",
                backgroundColor: "rgba(255,255,255,0.1)"
              }
            }}
          >
            {Locale.label("sermons.playlists.search")}
          </Button>
        </PageHeader>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        {imageEditor}
        <NavigationTabs
          appearance="panel"
          embedded
          selectedTab={playlistTab}
          onTabChange={handlePlaylistTabChange}
          tabs={playlistPanelTabs}
        />
        <Card id="playlists-card" sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "var(--border-light)"
        }}>
          {/* Search Bar - Conditionally Rendered */}
          {showSearch && (
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder={Locale.label("sermons.playlists.searchPlaceholder")}
                value={searchTerm}
                onChange={handleSearch}
                size="small"
                autoFocus
                InputProps={{
                  startAdornment: (
                    <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />
                  )
                }}
                sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "var(--bg-card)" } }}
              />
            </Box>
          )}

          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: 1,
              borderColor: "divider",
              display: "flex",
              justifyContent: "flex-end"
            }}
          >
            <Button
              variant="contained"
              startIcon={playlistTab === "music" ? <LibraryMusicIcon /> : <AddIcon />}
              onClick={() => handleAdd(playlistTab)}
              data-testid={playlistTab === "music" ? "add-music-playlist-button" : "add-playlist-button"}
              sx={{ whiteSpace: "nowrap" }}
            >
              {playlistTab === "music"
                ? Locale.label("sermons.playlists.addMusicPlaylist", "Add Music Playlist")
                : Locale.label("sermons.playlists.addVideoPlaylist", "Add Video Playlist")}
            </Button>
          </Box>

          <CardContent sx={{ p: 0 }}>
            {getTable()}
          </CardContent>
        </Card>
      </Box>
    </>
  );
};
