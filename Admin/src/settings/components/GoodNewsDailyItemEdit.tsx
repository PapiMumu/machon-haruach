import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { Save as SaveIcon, Cancel as CancelIcon, Delete as DeleteIcon, Article as ArticleIcon } from "@mui/icons-material";
import type { LinkInterface, GroupInterface } from "@machonharuach/helpers";
import { ApiHelper, UniqueIdHelper, ArrayHelper, Locale } from "@machonharuach/apphelper";
import { CommonEnvironmentHelper } from "@machonharuach/apphelper";
import axios from "axios";
import { CardWithHeader, LoadingButton } from "../../components/ui";
import { DashboardImageUploadModal } from "./DashboardImageUploadModal";

interface PageInterface {
  id?: string;
  churchId?: string;
  url?: string;
  title?: string;
}

interface Props {
  currentItem: LinkInterface;
  updatedFunction?: () => void;
}

interface GoodNewsMeta {
  subtitle?: string;
  contentCategory?: string;
  featured?: boolean;
  videoType?: string;
  videoData?: string;
}

const GOODNEWS_CATEGORY_OPTIONS = ["Events", "Videos", "Story", "News"];
const VIDEO_ENABLED_CATEGORIES = ["Videos", "Story", "News"];

type EditableItem = LinkInterface & {
  subtitle?: string;
  pageId?: string;
  contentCategory?: string;
  featured?: boolean;
  videoType?: string;
  videoData?: string;
};

function parseMeta(linkData?: string, linkType?: string): GoodNewsMeta & { pageId?: string } {
  const raw = (linkData || "").trim();
  if (!raw) return {};
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      return {};
    }
  }
  if (linkType === "page") return { pageId: raw };
  return {};
}

export function GoodNewsDailyItemEdit({ currentItem: currentItemFromProps, updatedFunction = () => {} }: Props) {
  const [currentItem, setCurrentItem] = useState<EditableItem>(null);
  const [pages, setPages] = useState<PageInterface[]>(null);
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [imageStatus, setImageStatus] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [videoStatus, setVideoStatus] = useState("");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const videoUploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const item: EditableItem = { ...(currentItemFromProps || {}) };
    const meta = parseMeta(item.linkData, item.linkType);
    if (!item.category) item.category = "b1GoodNewsDaily";
    if (!item.icon) item.icon = "article";
    item.subtitle = meta.subtitle || "";
    item.contentCategory = meta.contentCategory || "";
    item.featured = Boolean(meta.featured);
    item.videoType = meta.videoType || "youtube";
    item.videoData = meta.videoData || "";
    item.pageId = meta.pageId || (item.linkType === "page" && !item.linkData?.startsWith("{") ? item.linkData : "");
    setCurrentItem(item);
    setImageUrlInput((item as any)?.photo || "");
    setImageStatus("");
    setVideoStatus("");
    setVideoUploadProgress(0);
  }, [currentItemFromProps]);

  useEffect(() => {
    ApiHelper.get("/groups", "MembershipApi").then((data: GroupInterface[]) => setGroups(data || []));
  }, []);

  const handleSave = async () => {
    if (!currentItem) return;
    setIsSaving(true);
    try {
      const itemToSave: EditableItem = { ...currentItem };
      itemToSave.category = "b1GoodNewsDaily";
      if (itemToSave.linkType !== "url" && itemToSave.linkType !== "page") itemToSave.url = "";
      const selectedPage = ArrayHelper.getOne(pages || [], "id", itemToSave.pageId || "");
      if (itemToSave.linkType === "page") itemToSave.url = selectedPage?.url || "";
      const isVideoEnabledCategory = VIDEO_ENABLED_CATEGORIES.includes(itemToSave.contentCategory || "");
      if (isVideoEnabledCategory && itemToSave.linkType === "url") {
        itemToSave.url = getVideoUrl(itemToSave.videoType || "youtube", itemToSave.videoData || "");
      }

      const meta: GoodNewsMeta & { pageId?: string } = {
        subtitle: itemToSave.subtitle?.trim() || "",
        contentCategory: itemToSave.contentCategory?.trim() || "",
        featured: Boolean(itemToSave.featured),
        videoType: isVideoEnabledCategory ? (itemToSave.videoType || "youtube") : "",
        videoData: isVideoEnabledCategory ? (itemToSave.videoData || "") : ""
      };
      if (itemToSave.linkType === "page") meta.pageId = itemToSave.pageId || "";
      itemToSave.linkData = JSON.stringify(meta);

      delete (itemToSave as any).subtitle;
      delete (itemToSave as any).pageId;
      delete (itemToSave as any).contentCategory;
      delete (itemToSave as any).featured;
      delete (itemToSave as any).videoType;
      delete (itemToSave as any).videoData;
      await ApiHelper.post("/links", [itemToSave], "ContentApi");
      updatedFunction();
    } catch (error) {
      console.error("Error saving GoodNews item:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: any) => {
    const val = e.target.value;
    const t = { ...currentItem };
    switch (e.target.name) {
      case "text": t.text = val; break;
      case "subtitle": (t as EditableItem).subtitle = val; break;
      case "type": t.linkType = val; break;
      case "page": {
        (t as EditableItem).pageId = val;
        const selectedPage = ArrayHelper.getOne(pages || [], "id", val);
        t.url = selectedPage?.url || "";
        break;
      }
      case "contentCategory":
        (t as EditableItem).contentCategory = val;
        break;
      case "featured":
        (t as EditableItem).featured = Boolean((e.target as HTMLInputElement).checked);
        break;
      case "videoType":
        (t as EditableItem).videoType = val;
        break;
      case "videoData":
        (t as EditableItem).videoData = normalizeVideoData((t as EditableItem).videoType || "youtube", val);
        break;
      case "url": t.url = val; break;
      case "visibility":
        (t as any).visibility = val;
        if (val !== "groups") (t as any).groupIds = null;
        break;
    }
    setCurrentItem(t);
  };

  const handleDelete = () => {
    if (!currentItem?.id) return;
    if (window.confirm("Delete this GoodNews Daily item?")) {
      ApiHelper.delete(`/links/${currentItem.id}`, "ContentApi")
        .then(() => {
          setCurrentItem(null);
          updatedFunction();
        })
        .catch((error) => console.error("Error deleting item:", error));
    }
  };

  const handleGroupChange = (groupId: string, checked: boolean) => {
    const t = { ...currentItem } as any;
    let groupIds: string[] = t.groupIds ? JSON.parse(t.groupIds) : [];
    if (checked) {
      if (!groupIds.includes(groupId)) groupIds.push(groupId);
    } else {
      groupIds = groupIds.filter((id) => id !== groupId);
    }
    t.groupIds = groupIds.length > 0 ? JSON.stringify(groupIds) : null;
    setCurrentItem(t);
  };

  const getSelectedGroupIds = (): string[] => {
    const groupIds = (currentItem as any)?.groupIds;
    if (!groupIds) return [];
    try {
      return JSON.parse(groupIds);
    } catch {
      return [];
    }
  };

  const handlePhotoSelected = (image: string) => {
    const t = { ...currentItem };
    (t as any).photo = image;
    setCurrentItem(t);
    setImageUrlInput(image || "");
    setShowPhotoGallery(false);
    setImageStatus("Image selected and attached to this item.");
  };

  const handleApplyImageUrl = () => {
    const imageUrl = (imageUrlInput || "").trim();
    if (!imageUrl) {
      setImageStatus("Please enter an image URL first.");
      return;
    }
    const t = { ...currentItem };
    (t as any).photo = imageUrl;
    setCurrentItem(t);
    setImageStatus("Image URL attached to this item.");
  };

  const loadPages = useCallback(() => {
    ApiHelper.get("/pages", "ContentApi").then((_pages: PageInterface[]) => setPages(_pages || []));
  }, []);

  const handleVideoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setVideoStatus("");
    setIsUploadingVideo(true);
    setVideoUploadProgress(0);
    try {
      const safeFileName = `${Date.now()}-${selected.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const presigned = await ApiHelper.post(
        "/files/postUrl",
        { fileName: safeFileName, contentType: "goodnews", contentId: "daily" },
        "ContentApi"
      );
      if (!presigned?.key) throw new Error("Upload URL was not generated.");

      const formData = new FormData();
      formData.append("Content-Type", selected.type || "video/mp4");
      Object.keys(presigned.fields || {}).forEach((key) => formData.append(key, presigned.fields[key]));
      formData.append("file", selected);
      await axios.post(presigned.url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (!evt.total || evt.total <= 0) return;
          const pct = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
          setVideoUploadProgress(pct);
        }
      });
      const root = (CommonEnvironmentHelper.ContentRoot || "").replace(/\/$/, "");
      const uploadedUrl = `${root}/${String(presigned.key).replace(/^\/+/, "")}`;

      const next = { ...(currentItem as EditableItem) };
      next.videoType = "custom";
      next.videoData = uploadedUrl;
      next.url = uploadedUrl;
      if (!next.linkType || next.linkType === "page") next.linkType = "url";
      setCurrentItem(next);
      setVideoUploadProgress(100);
      setVideoStatus(`Video uploaded and attached successfully: ${selected.name}`);
    } catch (error) {
      console.error("Failed to upload video file:", error);
      setVideoStatus("Video upload failed. Please try again.");
      setVideoUploadProgress(0);
    } finally {
      setIsUploadingVideo(false);
      if (videoUploadInputRef.current) videoUploadInputRef.current.value = "";
    }
  };

  const normalizeVideoData = (videoType: string, input: string) => {
    let result = String(input || "").split("&")[0];
    if (videoType === "youtube") {
      result = result
        .replace("https://www.youtube.com/watch?v=", "")
        .replace("https://youtube.com/watch?v=", "")
        .replace("https://youtu.be/", "")
        .replace("https://www.youtube.com/embed/", "")
        .replace("https://studio.youtube.com/video/", "")
        .replace("/edit", "");
      return result;
    }
    if (videoType === "vimeo") {
      return result
        .replace("https://vimeo.com/", "")
        .replace("https://player.vimeo.com/video/", "");
    }
    if (videoType === "facebook") {
      return result.replace("https://facebook.com/video.php?v=", "");
    }
    return String(input || "").trim();
  };

  const getVideoUrl = (videoType: string, videoData: string) => {
    const key = normalizeVideoData(videoType, videoData);
    switch (videoType) {
      case "youtube":
        return `https://www.youtube.com/watch?v=${key}`;
      case "vimeo":
        return `https://vimeo.com/${key}`;
      case "facebook":
        return `https://facebook.com/video.php?v=${key}`;
      case "custom":
      default:
        return key;
    }
  };

  const fetchVideo = async () => {
    if (!currentItem?.videoType || !currentItem?.videoData) return;
    if (currentItem.videoType !== "youtube" && currentItem.videoType !== "vimeo") return;
    try {
      const normalizedData = normalizeVideoData(currentItem.videoType, currentItem.videoData);
      const d = await ApiHelper.getAnonymous(`/sermons/lookup?videoType=${currentItem.videoType}&videoData=${normalizedData}`, "ContentApi");
      const v = { ...currentItem } as EditableItem;
      v.videoData = normalizedData;
      v.text = d?.title || v.text;
      v.subtitle = d?.description || v.subtitle;
      (v as any).photo = d?.thumbnail || (v as any).photo;
      v.url = getVideoUrl(v.videoType || "youtube", normalizedData);
      setCurrentItem(v);
    } catch (error) {
      console.error("Failed to fetch video metadata:", error);
    }
  };

  useEffect(() => {
    if (currentItem?.linkType === "page" && pages === null) loadPages();
  }, [currentItem?.linkType, pages, loadPages]);

  useEffect(() => {
    const editable = currentItem as EditableItem;
    if (editable?.linkType === "page" && pages && pages.length > 0 && !editable.pageId) {
      const defaultPage = pages[0];
      setCurrentItem(prev => ({ ...prev, pageId: defaultPage?.id || "", url: defaultPage?.url || "" }));
    }
  }, [currentItem?.linkType, (currentItem as EditableItem)?.pageId, pages]);

  if (!currentItem) return null;

  return (
    <>
      <CardWithHeader
        title={UniqueIdHelper.isMissing(currentItem?.id) ? "Add GoodNews Item" : "Edit GoodNews Item"}
        icon={<ArticleIcon />}
        actions={(
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={updatedFunction} size="small" sx={{ textTransform: "none" }}>
              {Locale.label("common.cancel")}
            </Button>
            <LoadingButton
              loading={isSaving}
              loadingText={Locale.label("common.saving")}
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              size="small"
              sx={{ textTransform: "none" }}
            >
              Save Item
            </LoadingButton>
          </Stack>
        )}
      >
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Stack spacing={3}>
              <TextField fullWidth label="Title" name="text" value={currentItem?.text || ""} onChange={handleChange} helperText="Main title shown on the native GoodNews Daily page." />
              <FormControl fullWidth>
                <InputLabel id="contentCategory">Category</InputLabel>
                <Select
                  labelId="contentCategory"
                  label="Category"
                  name="contentCategory"
                  value={(currentItem as EditableItem)?.contentCategory || ""}
                  onChange={handleChange}
                >
                  <MenuItem value="">Uncategorized</MenuItem>
                  {GOODNEWS_CATEGORY_OPTIONS.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                  {(currentItem as EditableItem)?.contentCategory
                    && !GOODNEWS_CATEGORY_OPTIONS.includes((currentItem as EditableItem).contentCategory || "")
                    ? <MenuItem value={(currentItem as EditableItem).contentCategory}>Custom: {(currentItem as EditableItem).contentCategory}</MenuItem>
                    : null}
                </Select>
              </FormControl>
              {VIDEO_ENABLED_CATEGORIES.includes(((currentItem as EditableItem)?.contentCategory || "")) && (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                      <InputLabel id="videoType">Video Provider</InputLabel>
                      <Select
                        labelId="videoType"
                        label="Video Provider"
                        name="videoType"
                        value={(currentItem as EditableItem)?.videoType || "youtube"}
                        onChange={handleChange}
                      >
                        <MenuItem value="youtube">YouTube</MenuItem>
                        <MenuItem value="vimeo">Vimeo</MenuItem>
                        <MenuItem value="facebook">Facebook</MenuItem>
                        <MenuItem value="custom">Custom URL</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <TextField
                        fullWidth
                        label="Video ID or URL"
                        name="videoData"
                        value={(currentItem as EditableItem)?.videoData || ""}
                        onChange={handleChange}
                        placeholder={(currentItem as EditableItem)?.videoType === "youtube" ? "YouTube URL or ID" : (currentItem as EditableItem)?.videoType === "vimeo" ? "Vimeo URL or ID" : "Video URL"}
                      />
                      {(((currentItem as EditableItem)?.videoType || "") === "youtube" || ((currentItem as EditableItem)?.videoType || "") === "vimeo") && (
                        <Button variant="contained" onClick={fetchVideo} sx={{ textTransform: "none", minWidth: 110 }}>
                          Fetch
                        </Button>
                      )}
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
                      <input
                        ref={videoUploadInputRef}
                        type="file"
                        accept="video/*"
                        style={{ display: "none" }}
                        onChange={handleVideoFileSelected}
                      />
                      <Button
                        variant="outlined"
                        onClick={() => videoUploadInputRef.current?.click()}
                        disabled={isUploadingVideo}
                        sx={{ textTransform: "none", minWidth: 170 }}
                      >
                        {isUploadingVideo ? "Uploading Video..." : "Upload Video File"}
                      </Button>
                      <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                        Upload from your computer/local storage.
                      </Typography>
                    </Stack>
                    {videoStatus && (
                      <Alert severity={videoStatus.includes("failed") ? "error" : "success"} sx={{ mt: 1 }}>
                        {videoStatus}
                      </Alert>
                    )}
                    {isUploadingVideo && (
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress variant="determinate" value={videoUploadProgress} />
                        <Typography variant="caption" color="text.secondary">
                          Upload progress: {videoUploadProgress}%
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              )}
              <TextField
                fullWidth
                multiline
                minRows={5}
                maxRows={12}
                label="Description"
                name="subtitle"
                value={(currentItem as EditableItem)?.subtitle || ""}
                onChange={handleChange}
                helperText="Description shown under the title. You can add a long paragraph."
              />
              <FormControlLabel
                control={(
                  <Checkbox
                    name="featured"
                    checked={Boolean((currentItem as EditableItem)?.featured)}
                    onChange={handleChange}
                  />
                )}
                label="Show in Featured section"
              />

              <Box>
                {imageStatus && <Alert severity="info" sx={{ mb: 2 }}>{imageStatus}</Alert>}
                {String((currentItem as any)?.photo || "").trim() && (
                  <Box sx={{ mb: 2, maxWidth: 300 }}>
                    <img
                      src={String((currentItem as any).photo).trim()}
                      style={{ width: "100%", height: "auto", aspectRatio: "16/9", objectFit: "cover", borderRadius: 4 }}
                      alt="GoodNews item"
                    />
                  </Box>
                )}
                <Button variant="outlined" onClick={() => setShowPhotoGallery(true)} sx={{ textTransform: "none" }}>
                  {(currentItem as any)?.photo ? "Change Image" : "Select Image"}
                </Button>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Image URL"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://..."
                    helperText="Use this when gallery listing is unavailable."
                  />
                  <Button variant="outlined" onClick={handleApplyImageUrl} sx={{ textTransform: "none", minWidth: 150 }}>
                    Apply URL
                  </Button>
                </Stack>
              </Box>

              <FormControl fullWidth>
                <InputLabel id="type">Item Action</InputLabel>
                <Select
                  labelId="type"
                  label="Item Action"
                  name="type"
                  value={currentItem?.linkType || ""}
                  onChange={handleChange}
                >
                  <MenuItem value="url">{Locale.label("settings.appEdit.externalUrl")}</MenuItem>
                  <MenuItem value="page">{Locale.label("settings.appEdit.internalPage")}</MenuItem>
                  <MenuItem value="stream">{Locale.label("settings.appEdit.liveStream")}</MenuItem>
                  <MenuItem value="sermons">Sermons</MenuItem>
                  <MenuItem value="registrations">Registrations</MenuItem>
                  <MenuItem value="votd">{Locale.label("settings.appEdit.verseOfDay")}</MenuItem>
                </Select>
              </FormControl>

              {currentItem?.linkType === "url" && (
                <TextField
                  fullWidth
                  label={Locale.label("settings.appEdit.url")}
                  name="url"
                  type="url"
                  value={currentItem?.url || ""}
                  onChange={handleChange}
                  helperText={Locale.label("settings.app.urlHelper")}
                />
              )}

              {currentItem?.linkType === "page" && (
                <FormControl fullWidth>
                  <InputLabel id="page">Page</InputLabel>
                  <Select
                    labelId="page"
                    label="Page"
                    name="page"
                    value={(currentItem as EditableItem)?.pageId || ""}
                    onChange={handleChange}
                  >
                    {(pages || []).map(page => (
                      <MenuItem value={page.id} key={page.id}>{page.title}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <FormControl fullWidth>
                <InputLabel id="visibility">Visibility</InputLabel>
                <Select
                  labelId="visibility"
                  label="Visibility"
                  name="visibility"
                  value={(currentItem as any)?.visibility || "everyone"}
                  onChange={handleChange}
                >
                  <MenuItem value="everyone">Everyone (including anonymous)</MenuItem>
                  <MenuItem value="visitors">Logged-in Users</MenuItem>
                  <MenuItem value="members">Members & Staff</MenuItem>
                  <MenuItem value="staff">Staff Only</MenuItem>
                  <MenuItem value="team">Team Members (serving teams)</MenuItem>
                  <MenuItem value="groups">Specific Groups...</MenuItem>
                </Select>
              </FormControl>

              {(currentItem as any)?.visibility === "groups" && (
                <Box sx={{ pl: 2, border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Groups:</Typography>
                  <FormGroup>
                    {groups.map(group => (
                      <FormControlLabel
                        key={group.id}
                        control={(
                          <Checkbox
                            checked={getSelectedGroupIds().includes(group.id)}
                            onChange={(e) => handleGroupChange(group.id, e.target.checked)}
                          />
                        )}
                        label={group.name}
                      />
                    ))}
                  </FormGroup>
                  {groups.length === 0 && <Typography variant="body2" color="text.secondary">No groups found</Typography>}
                </Box>
              )}

              {!UniqueIdHelper.isMissing(currentItem?.id) && (
                <>
                  <Divider sx={{ mt: 2 }} />
                  <Box sx={{ textAlign: "center" }}>
                    <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete} size="small" sx={{ textTransform: "none" }}>
                      Delete Item
                    </Button>
                  </Box>
                </>
              )}
            </Stack>
          </Grid>
        </Grid>
      </CardWithHeader>

      {showPhotoGallery && (
        <DashboardImageUploadModal
          onClose={() => setShowPhotoGallery(false)}
          onSelect={handlePhotoSelected}
          aspectRatio={16 / 9}
        />
      )}
    </>
  );
}

