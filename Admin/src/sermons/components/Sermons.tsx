import { Loading, Locale } from "@machonharuach/apphelper";
import { ApiHelper } from "@machonharuach/apphelper";
import { UserHelper } from "@machonharuach/apphelper";
import { ArrayHelper } from "@machonharuach/apphelper";
import { DateHelper } from "@machonharuach/apphelper";
import { PageHeader } from "@machonharuach/apphelper";
import type { SermonInterface, PlaylistInterface } from "@machonharuach/helpers";
import { Permissions } from "@machonharuach/helpers";
import { Box, Button, Card, CardContent, Chip, FormControl, IconButton, InputAdornment, InputLabel, Menu, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography, type SelectChangeEvent } from "@mui/material";
import { Add as AddIcon, CalendarMonth as CalendarIcon, LiveTv as LiveTvIcon, PlaylistPlay as PlaylistIcon, Search as SearchIcon, ArrowDropDown as ArrowDropDownIcon, Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import React from "react";
import { SermonEdit } from "./SermonEdit";
import { SortableTableRow } from "../../components/ui";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  MEDIA_CATEGORY_OPTIONS,
  DEFAULT_MEDIA_CATEGORY,
  normalizeMediaCategory,
  mediaCategoryLocaleKey,
  type MediaCategory
} from "../../helpers/mediaCategories";

export const Sermons = () => {
  const [sermons, setSermons] = React.useState<SermonInterface[]>([]);
  const [filteredSermons, setFilteredSermons] = React.useState<SermonInterface[]>([]);
  const [playlists, setPlaylists] = React.useState<PlaylistInterface[]>([]);
  const [currentSermon, setCurrentSermon] = React.useState<SermonInterface>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<MediaCategory | "all">("all");
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const orderedSermonsRef = React.useRef<SermonInterface[]>([]);
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit);

  const handleUpdated = () => { setCurrentSermon(null); loadData(); };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAddSermon = () => {
    handleMenuClose();
    handleAdd(false);
  };

  const handleAddPermanentLiveUrl = () => {
    handleMenuClose();
    handleAdd(true);
  };

  const getActionButtons = () => (
    <>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        endIcon={<ArrowDropDownIcon />}
        onClick={handleMenuClick}
        data-testid="add-sermon-button"
        sx={{
          color: "#FFF",
          borderColor: "rgba(255,255,255,0.5)",
          "&:hover": {
            borderColor: "#FFF",
            backgroundColor: "rgba(255,255,255,0.1)"
          }
        }}
      >
        {Locale.label("sermons.addVideo", "Add Video")}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right"
        }}
      >
        <MenuItem onClick={handleAddSermon}>
          <Stack direction="row" spacing={1} alignItems="center">
            <LiveTvIcon fontSize="small" />
            <Typography>{Locale.label("sermons.addVideo", "Add Video")}</Typography>
          </Stack>
        </MenuItem>
        <MenuItem onClick={handleAddPermanentLiveUrl}>
          <Stack direction="row" spacing={1} alignItems="center">
            <LiveTvIcon fontSize="small" sx={{ color: "error.main" }} />
            <Typography>{Locale.label("sermons.addPermanentLiveUrl")}</Typography>
          </Stack>
        </MenuItem>
      </Menu>
    </>
  );

  const getPlaylistTitle = (playlistId: string) => {
    let result = "";
    if (playlists) {
      const p: PlaylistInterface = ArrayHelper.getOne(playlists, "id", playlistId);
      if (p) result = p.title;
    }
    return result;
  };

  const applyFilters = (list: SermonInterface[], search: string, category: MediaCategory | "all") => {
    let result = list;
    if (category !== "all") {
      result = result.filter((s) => normalizeMediaCategory(s.mediaCategory) === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((sermon) => {
        const playlistTitle = getPlaylistTitle(sermon.playlistId);
        const categoryLabel = Locale.label(mediaCategoryLocaleKey(normalizeMediaCategory(sermon.mediaCategory)));
        return (
          sermon.title?.toLowerCase().includes(q)
          || playlistTitle.toLowerCase().includes(q)
          || categoryLabel.toLowerCase().includes(q)
        );
      });
    }
    return result;
  };

  const loadData = () => {
    ApiHelper.get("/playlists", "ContentApi").then((data: any) => { setPlaylists(data); });
    ApiHelper.get("/sermons", "ContentApi").then((data: any) => {
      setSermons(data);
      setFilteredSermons(applyFilters(data, searchTerm, categoryFilter));
      setIsLoading(false);
    });
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilteredSermons(applyFilters(sermons, value, categoryFilter));
  };

  const handleCategoryFilter = (event: SelectChangeEvent<string>) => {
    const value = event.target.value as MediaCategory | "all";
    setCategoryFilter(value);
    setFilteredSermons(applyFilters(sermons, searchTerm, value));
  };

  const handleAdd = (permanentUrl: boolean) => {
    const v: SermonInterface = {
      churchId: UserHelper.currentUserChurch.church.id,
      duration: 5400,
      videoType: "youtube",
      videoData: "",
      title: Locale.label("sermons.sermonEdit.newVideo", "New Video"),
      mediaCategory: DEFAULT_MEDIA_CATEGORY,
      sort: 0,
      permanentUrl
    };
    if (permanentUrl) {
      v.videoType = "youtube_channel";
      v.videoData = Locale.label("sermons.sermonEdit.channelIdPlaceholder");
      v.title = Locale.label("sermons.sermonEdit.currentLiveService");
    }
    setCurrentSermon(v);
    loadData();
  };

  const saveSermonOrder = (ordered: SermonInterface[]) => {
    const ids = ordered.map((s) => s.id).filter(Boolean) as string[];
    if (!ids.length) return;
    ApiHelper.post("/sermons/sort", { ids }, "ContentApi").then(loadData);
  };

  const moveSermonDrag = (dragIndex: number, hoverIndex: number) => {
    setFilteredSermons((prev) => {
      const next = [...prev];
      const [removed] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, removed);
      orderedSermonsRef.current = next;
      return next;
    });
  };

  React.useEffect(() => {
    orderedSermonsRef.current = filteredSermons;
  }, [filteredSermons]);

  const handleDeleteSermon = (video: SermonInterface) => {
    if (!video?.id) return;
    if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) {
      window.alert(Locale.label("sermons.sermonEdit.unauthorizedDelete"));
      return;
    }
    if (!window.confirm(Locale.label("sermons.sermonEdit.deleteConfirm"))) return;

    ApiHelper.delete("/sermons/" + video.id, "ContentApi").then(() => {
      if (currentSermon?.id === video.id) setCurrentSermon(null);
      loadData();
    });
  };

  const getRowActions = (video: SermonInterface) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
      <Tooltip title={Locale.label("common.edit", "Edit")} arrow>
        <IconButton
          size="small"
          onClick={() => setCurrentSermon(video)}
          data-testid={`edit-sermon-${video.id}`}
          aria-label={`Edit ${video.title}`}
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
      {video.id && (
        <Tooltip title={Locale.label("common.delete", "Delete")} arrow>
          <IconButton
            size="small"
            onClick={() => handleDeleteSermon(video)}
            data-testid={`delete-sermon-${video.id}`}
            aria-label={`Delete ${video.title}`}
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

  const getCategoryChip = (video: SermonInterface) => {
    const category = normalizeMediaCategory(video.mediaCategory);
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

  const getRows = () =>
    filteredSermons.map((video: SermonInterface, index: number) => (
      <SortableTableRow
        key={video.id || `sermon-${index}`}
        id={video.id || `sermon-${index}`}
        index={index}
        sortable={canEdit && !!video.id}
        onMoveDrag={moveSermonDrag}
        onDragEnd={() => saveSermonOrder(orderedSermonsRef.current)}
        sx={{
          "&:hover": { backgroundColor: "action.hover" },
          transition: "background-color 0.2s ease"
        }}
      >
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <PlaylistIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2">
              {getPlaylistTitle(video.playlistId) || Locale.label("sermons.noPlaylist")}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell>{getCategoryChip(video)}</TableCell>
        <TableCell>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {video.title}
          </Typography>
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              {(video.publishDate) ? DateHelper.prettyDate(DateHelper.toDate(video.publishDate)) : Locale.label("sermons.notScheduled")}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell align="right">{getRowActions(video)}</TableCell>
      </SortableTableRow>
    ));

  const getEmptyState = () => (
    <TableRow>
      <TableCell colSpan={6} sx={{ textAlign: "center", py: 8 }}>
        <Stack spacing={2} alignItems="center">
          <LiveTvIcon sx={{ fontSize: 64, color: "text.secondary" }} />
          <Typography variant="h6" color="text.secondary">
            {searchTerm || categoryFilter !== "all" ? Locale.label("sermons.noVideosFound", "No videos found") : Locale.label("sermons.noVideosYet", "No videos yet")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm ? Locale.label("sermons.adjustSearchTerms") : Locale.label("sermons.getStarted")}
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleAdd(false)}
            >
              {Locale.label("sermons.addFirstVideo", "Add First Video")}
            </Button>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );

  const getTable = () => {
    if (isLoading) return <Loading data-testid="sermons-loading" />;
    else {
      return (
        <Table id="sermons-table" sx={{ minWidth: 650 }}>
          <TableHead
            sx={{
              backgroundColor: "var(--bg-card)",
              "& .MuiTableCell-root": {
                borderBottom: "2px solid",
                borderBottomColor: "divider",
                fontWeight: 600
              }
            }}
          >
            <TableRow>
              {canEdit ? <TableCell sx={{ width: 40, px: 0.5 }} /> : null}
              <TableCell sx={{ width: "22%" }}>{Locale.label("sermons.playlist")}</TableCell>
              <TableCell sx={{ width: "14%" }}>{Locale.label("sermons.contentType", "Content Type")}</TableCell>
              <TableCell sx={{ width: "39%" }}>{Locale.label("sermons.video", "Video")}</TableCell>
              <TableCell sx={{ width: "20%" }}>{Locale.label("sermons.publishDate")}</TableCell>
              <TableCell sx={{ width: "5%" }} align="right">
                {Locale.label("sermons.playlists.actions", "Actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <DndProvider backend={HTML5Backend}>
              {filteredSermons.length === 0 ? getEmptyState() : getRows()}
            </DndProvider>
          </TableBody>
        </Table>
      );
    }
  };

  React.useEffect(() => { loadData(); }, []);

  if (currentSermon !== null) return <SermonEdit currentSermon={currentSermon} updatedFunction={handleUpdated} />;
  else {
    return (
      <>
        <Box sx={{ mb: 3 }}>
          <PageHeader
            title={Locale.label("sermons.videosTitle", "Videos")}
            subtitle={Locale.label("sermons.subtitle")}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                flexShrink: 0,
                justifyContent: { xs: "flex-start", md: "flex-end" },
                width: { xs: "100%", md: "auto" }
              }}
            >
              {getActionButtons()}
            </Stack>
          </PageHeader>
        </Box>

        {/* Content */}
        <Box sx={{ px: 3 }}>
          <Card id="sermons-card" sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "var(--border-light)"
          }}>
            {/* Search Bar */}
            {sermons.length > 0 && (
              <Box
                id="sermons-search-bar"
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: "divider",
                  display: "flex",
                  alignItems: { xs: "stretch", sm: "center" },
                  justifyContent: "space-between",
                  gap: 2,
                  flexDirection: { xs: "column", sm: "row" }
                }}
              >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ flex: 1, maxWidth: 720 }}>
                  <TextField
                    fullWidth
                    placeholder={Locale.label("sermons.searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      )
                    }}
                  />
                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>{Locale.label("sermons.contentType", "Content Type")}</InputLabel>
                    <Select
                      label={Locale.label("sermons.contentType", "Content Type")}
                      value={categoryFilter}
                      onChange={handleCategoryFilter}
                      data-testid="video-category-filter">
                      <MenuItem value="all">{Locale.label("sermons.filterAllTypes", "All content types")}</MenuItem>
                      {MEDIA_CATEGORY_OPTIONS.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {Locale.label(mediaCategoryLocaleKey(cat))}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
                  {getActionButtons()}
                </Stack>
              </Box>
            )}

            <CardContent sx={{ p: 0 }}>
              {getTable()}
            </CardContent>
          </Card>
        </Box>
      </>
    );
  }
};
