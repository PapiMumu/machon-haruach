import React, { useState, useEffect, useCallback } from "react";
import {
  Alert,
  Button,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Divider,
  Grid,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Typography
} from "@mui/material";
import { Save as SaveIcon, Cancel as CancelIcon, Delete as DeleteIcon, ViewCarousel as ViewCarouselIcon } from "@mui/icons-material";
import type { LinkInterface, GroupInterface } from "@machonharuach/helpers";
import { ApiHelper, UniqueIdHelper, ArrayHelper, Locale } from "@machonharuach/apphelper";
import { CardWithHeader, LoadingButton } from "../../components/ui";
import { DashboardImageUploadModal } from "./DashboardImageUploadModal";

interface PageInterface {
  id?: string;
  churchId?: string;
  url?: string;
  title?: string;
}

interface Props {
  currentCard: LinkInterface;
  updatedFunction?: () => void;
}

interface DashboardCardMeta {
  subtitle?: string;
  sectionLabel?: string;
  pageId?: string;
  design?: DashboardCardDesign;
}

interface DashboardCardDesign {
  variant?: "featured" | "compact" | "simple";
  overlay?: "none" | "dark" | "gradient";
  ctaStyle?: "solid" | "outline" | "ghost";
  badgeText?: string;
  thumbShape?: "square" | "rounded" | "circle";
  thumbImage?: string;
  titleLines?: number;
  subtitleLines?: number;
}

type EditableDashboardCard = LinkInterface & {
  dashboardSubtitle?: string;
  dashboardSectionLabel?: string;
  dashboardPageId?: string;
  dashboardDesignVariant?: DashboardCardDesign["variant"];
  dashboardDesignOverlay?: DashboardCardDesign["overlay"];
  dashboardDesignCtaStyle?: DashboardCardDesign["ctaStyle"];
  dashboardDesignBadgeText?: string;
  dashboardDesignThumbShape?: DashboardCardDesign["thumbShape"];
  dashboardDesignThumbImage?: string;
  dashboardDesignTitleLines?: number;
  dashboardDesignSubtitleLines?: number;
};

function parseDashboardCardMeta(linkData?: string, linkType?: string): DashboardCardMeta {
  const raw = (linkData || "").trim();
  if (!raw) return {};
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed) return parsed;
    } catch {
      return {};
    }
  }
  if (linkType === "page") return { pageId: raw };
  return {};
}

export function DashboardCardEdit({ currentCard: currentCardFromProps, updatedFunction = () => { } }: Props) {
  const [currentCard, setCurrentCard] = useState<EditableDashboardCard>(null);
  const [pages, setPages] = useState<PageInterface[]>(null);
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState<boolean>(false);
  const [showSecondaryPhotoGallery, setShowSecondaryPhotoGallery] = useState<boolean>(false);
  const [imageStatus, setImageStatus] = useState<string>("");
  const [imageUrlInput, setImageUrlInput] = useState<string>("");
  const [secondaryImageStatus, setSecondaryImageStatus] = useState<string>("");
  const [secondaryImageUrlInput, setSecondaryImageUrlInput] = useState<string>("");
  const isCarouselCard = (currentCard?.icon || "").toLowerCase() === "carousel";
  const isFeaturedCard = (currentCard?.icon || "").toLowerCase() === "featured";
  const hasSavedSecondaryThumb = String((currentCard as EditableDashboardCard)?.dashboardDesignThumbImage || "").trim().length > 0;
  const isGoodNewsDailyCard = (
    isFeaturedCard &&
    (
      hasSavedSecondaryThumb ||
      String((currentCard as EditableDashboardCard)?.dashboardSectionLabel || "").toLowerCase().includes("goodnews daily") ||
      String(currentCard?.text || "").toLowerCase().includes("goodnews daily")
    )
  );
  const supportsSecondaryThumb = isGoodNewsDailyCard || isCarouselCard;

  useEffect(() => {
    const card: EditableDashboardCard = { ...(currentCardFromProps || {}) };
    const meta = parseDashboardCardMeta(card.linkData, card.linkType);
    if (!card.category) card.category = "b1DashboardCard";
    if (!card.icon) card.icon = "carousel";
    card.dashboardSubtitle = meta.subtitle || "";
    card.dashboardSectionLabel = meta.sectionLabel || "";
    card.dashboardPageId = meta.pageId || (card.linkType === "page" && !card.linkData?.startsWith("{") ? card.linkData : "");
    card.dashboardDesignVariant = meta.design?.variant || "featured";
    card.dashboardDesignOverlay = meta.design?.overlay || "gradient";
    card.dashboardDesignCtaStyle = meta.design?.ctaStyle || "solid";
    card.dashboardDesignBadgeText = meta.design?.badgeText || "";
    card.dashboardDesignThumbShape = meta.design?.thumbShape || "rounded";
    card.dashboardDesignThumbImage = meta.design?.thumbImage || "";
    card.dashboardDesignTitleLines = meta.design?.titleLines || 1;
    card.dashboardDesignSubtitleLines = meta.design?.subtitleLines || 2;
    setCurrentCard(card);
    setImageUrlInput((card as any)?.photo || "");
    setSecondaryImageUrlInput(card.dashboardDesignThumbImage || "");
    setImageStatus("");
    setSecondaryImageStatus("");
  }, [currentCardFromProps]);

  useEffect(() => {
    ApiHelper.get("/groups", "MembershipApi").then((data: GroupInterface[]) => setGroups(data || []));
  }, []);

  const handleSave = async () => {
    if (!currentCard) return;
    setIsSaving(true);
    try {
      const cardToSave: EditableDashboardCard = { ...currentCard };
      cardToSave.category = "b1DashboardCard";
      if (cardToSave.linkType !== "url" && cardToSave.linkType !== "page") cardToSave.url = "";
      const selectedPage = ArrayHelper.getOne(pages || [], "id", cardToSave.dashboardPageId || "");
      if (cardToSave.linkType === "page") cardToSave.url = selectedPage?.url || "";

      const meta: DashboardCardMeta = {
        subtitle: cardToSave.dashboardSubtitle?.trim() || "",
        sectionLabel: cardToSave.dashboardSectionLabel?.trim() || ""
      };
      if (cardToSave.linkType === "page") meta.pageId = cardToSave.dashboardPageId || "";
      meta.design = {
        variant: cardToSave.dashboardDesignVariant || "featured",
        overlay: cardToSave.dashboardDesignOverlay || "gradient",
        ctaStyle: cardToSave.dashboardDesignCtaStyle || "solid",
        badgeText: cardToSave.dashboardDesignBadgeText?.trim() || "",
        thumbShape: cardToSave.dashboardDesignThumbShape || "rounded",
        thumbImage: cardToSave.dashboardDesignThumbImage?.trim() || "",
        titleLines: cardToSave.dashboardDesignTitleLines || 1,
        subtitleLines: cardToSave.dashboardDesignSubtitleLines || 2
      };
      cardToSave.linkData = JSON.stringify(meta);

      delete (cardToSave as any).dashboardSubtitle;
      delete (cardToSave as any).dashboardSectionLabel;
      delete (cardToSave as any).dashboardPageId;
      delete (cardToSave as any).dashboardDesignVariant;
      delete (cardToSave as any).dashboardDesignOverlay;
      delete (cardToSave as any).dashboardDesignCtaStyle;
      delete (cardToSave as any).dashboardDesignBadgeText;
      delete (cardToSave as any).dashboardDesignThumbShape;
      delete (cardToSave as any).dashboardDesignThumbImage;
      delete (cardToSave as any).dashboardDesignTitleLines;
      delete (cardToSave as any).dashboardDesignSubtitleLines;
      await ApiHelper.post("/links", [cardToSave], "ContentApi");
      updatedFunction();
    } catch (error) {
      console.error("Error saving dashboard card:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const val = e.target.value;
    const t = { ...currentCard };
    switch (e.target.name) {
      case "text": t.text = val; break;
      case "type": t.linkType = val; break;
      case "page": {
        (t as EditableDashboardCard).dashboardPageId = val;
        const selectedPage = ArrayHelper.getOne(pages || [], "id", val);
        t.url = selectedPage?.url || "";
        break;
      }
      case "url": t.url = val; break;
      case "section": t.icon = val; break;
      case "subtitle": (t as EditableDashboardCard).dashboardSubtitle = val; break;
      case "sectionLabel": (t as EditableDashboardCard).dashboardSectionLabel = val; break;
      case "designVariant": (t as EditableDashboardCard).dashboardDesignVariant = val; break;
      case "designOverlay": (t as EditableDashboardCard).dashboardDesignOverlay = val; break;
      case "designCtaStyle": (t as EditableDashboardCard).dashboardDesignCtaStyle = val; break;
      case "designBadgeText": (t as EditableDashboardCard).dashboardDesignBadgeText = val; break;
      case "designThumbShape": (t as EditableDashboardCard).dashboardDesignThumbShape = val; break;
      case "designThumbImage": (t as EditableDashboardCard).dashboardDesignThumbImage = val; break;
      case "designTitleLines": (t as EditableDashboardCard).dashboardDesignTitleLines = Number(val || 1); break;
      case "designSubtitleLines": (t as EditableDashboardCard).dashboardDesignSubtitleLines = Number(val || 2); break;
      case "visibility":
        (t as any).visibility = val;
        if (val !== "groups") (t as any).groupIds = null;
        break;
    }
    setCurrentCard(t);
  };

  const handleGroupChange = (groupId: string, checked: boolean) => {
    const t = { ...currentCard } as any;
    let groupIds: string[] = t.groupIds ? JSON.parse(t.groupIds) : [];
    if (checked) {
      if (!groupIds.includes(groupId)) groupIds.push(groupId);
    } else {
      groupIds = groupIds.filter(id => id !== groupId);
    }
    t.groupIds = groupIds.length > 0 ? JSON.stringify(groupIds) : null;
    setCurrentCard(t);
  };

  const getSelectedGroupIds = (): string[] => {
    const groupIds = (currentCard as any)?.groupIds;
    if (!groupIds) return [];
    try {
      return JSON.parse(groupIds);
    } catch {
      return [];
    }
  };

  const handleDelete = () => {
    if (!currentCard?.id) return;
    if (window.confirm("Delete this dashboard card?")) {
      ApiHelper.delete(`/links/${currentCard.id}`, "ContentApi")
        .then(() => {
          setCurrentCard(null);
          updatedFunction();
        })
        .catch((error) => console.error("Error deleting dashboard card:", error));
    }
  };

  const handlePhotoSelected = (image: string) => {
    const t = { ...currentCard };
    (t as any).photo = image;
    setCurrentCard(t);
    setImageUrlInput(image || "");
    setShowPhotoGallery(false);
    setImageStatus("Image selected and attached to this card.");
  };

  const handleApplyImageUrl = () => {
    const imageUrl = (imageUrlInput || "").trim();
    if (!imageUrl) {
      setImageStatus("Please enter an image URL first.");
      return;
    }
    const t = { ...currentCard };
    (t as any).photo = imageUrl;
    setCurrentCard(t);
    setImageStatus("Image URL attached to this card.");
  };

  const handleSecondaryPhotoSelected = (image: string) => {
    const t = { ...currentCard } as EditableDashboardCard;
    t.dashboardDesignThumbImage = image;
    setCurrentCard(t);
    setSecondaryImageUrlInput(image || "");
    setShowSecondaryPhotoGallery(false);
    setSecondaryImageStatus("Secondary image selected and attached to this card.");
  };

  const handleApplySecondaryImageUrl = () => {
    const imageUrl = (secondaryImageUrlInput || "").trim();
    if (!imageUrl) {
      setSecondaryImageStatus("Please enter a secondary image URL first.");
      return;
    }
    const t = { ...currentCard } as EditableDashboardCard;
    t.dashboardDesignThumbImage = imageUrl;
    setCurrentCard(t);
    setSecondaryImageStatus("Secondary image URL attached to this card.");
  };

  const loadPages = useCallback(() => {
    ApiHelper.get("/pages", "ContentApi").then((_pages: PageInterface[]) => {
      setPages(_pages || []);
    });
  }, []);

  useEffect(() => {
    if (currentCard?.linkType === "page" && pages === null) {
      loadPages();
    }
  }, [currentCard?.linkType, pages, loadPages]);

  useEffect(() => {
    const editableCard = currentCard as EditableDashboardCard;
    if (editableCard?.linkType === "page" && pages && pages.length > 0 && !editableCard.dashboardPageId) {
      const defaultPage = pages[0];
      setCurrentCard(prev => ({ ...prev, dashboardPageId: defaultPage?.id || "", url: defaultPage?.url || "" }));
    }
  }, [currentCard?.linkType, (currentCard as EditableDashboardCard)?.dashboardPageId, pages]);

  const getPageSelect = () => {
    if (currentCard?.linkType !== "page") return null;
    return (
      <FormControl fullWidth>
        <InputLabel id="page">Page</InputLabel>
        <Select
          labelId="page"
          label="Page"
          name="page"
          value={(currentCard as EditableDashboardCard)?.dashboardPageId || ""}
          onChange={handleChange}
        >
          {(pages || []).map(page => (
            <MenuItem value={page.id} key={page.id}>{page.title}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  if (!currentCard) return null;

  return (
    <>
      <CardWithHeader
        title={UniqueIdHelper.isMissing(currentCard?.id) ? "Add Dashboard Card" : "Edit Dashboard Card"}
        icon={<ViewCarouselIcon />}
        actions={(
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={updatedFunction}
              size="small"
              sx={{ textTransform: "none" }}
            >
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
              Save Card
            </LoadingButton>
          </Stack>
        )}
      >
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Stack spacing={3}>
              {!isGoodNewsDailyCard && (
                <TextField
                  fullWidth
                  label="Card Title"
                  name="text"
                  value={currentCard?.text || ""}
                  onChange={handleChange}
                  helperText="This appears as the card title in Mobile."
                />
              )}

              <TextField
                fullWidth
                label="Card Subtitle"
                name="subtitle"
                value={(currentCard as EditableDashboardCard)?.dashboardSubtitle || ""}
                onChange={handleChange}
                helperText="Optional supporting text shown on featured and carousel cards."
              />

              <FormControl fullWidth>
                <InputLabel id="section">Dashboard Section</InputLabel>
                <Select
                  labelId="section"
                  label="Dashboard Section"
                  name="section"
                  value={currentCard?.icon || "carousel"}
                  onChange={handleChange}
                >
                  <MenuItem value="hero">Hero</MenuItem>
                  <MenuItem value="featured">Featured</MenuItem>
                  <MenuItem value="quick">Quick Action</MenuItem>
                  <MenuItem value="carousel">Carousel</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Section Heading Override"
                name="sectionLabel"
                value={(currentCard as EditableDashboardCard)?.dashboardSectionLabel || ""}
                onChange={handleChange}
                helperText="Optional heading text for the section this card belongs to."
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="designVariant">Design Variant</InputLabel>
                    <Select
                      labelId="designVariant"
                      label="Design Variant"
                      name="designVariant"
                      value={(currentCard as EditableDashboardCard)?.dashboardDesignVariant || "featured"}
                      onChange={handleChange}
                    >
                      <MenuItem value="featured">Featured</MenuItem>
                      <MenuItem value="compact">Compact</MenuItem>
                      <MenuItem value="simple">Simple</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="designOverlay">Image Overlay</InputLabel>
                    <Select
                      labelId="designOverlay"
                      label="Image Overlay"
                      name="designOverlay"
                      value={(currentCard as EditableDashboardCard)?.dashboardDesignOverlay || "gradient"}
                      onChange={handleChange}
                    >
                      <MenuItem value="gradient">Gradient</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                      <MenuItem value="none">None</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="designCtaStyle">CTA Style</InputLabel>
                    <Select
                      labelId="designCtaStyle"
                      label="CTA Style"
                      name="designCtaStyle"
                      value={(currentCard as EditableDashboardCard)?.dashboardDesignCtaStyle || "solid"}
                      onChange={handleChange}
                    >
                      <MenuItem value="solid">Solid</MenuItem>
                      <MenuItem value="outline">Outline</MenuItem>
                      <MenuItem value="ghost">Ghost</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="designThumbShape">Thumb Shape</InputLabel>
                    <Select
                      labelId="designThumbShape"
                      label="Thumb Shape"
                      name="designThumbShape"
                      value={(currentCard as EditableDashboardCard)?.dashboardDesignThumbShape || "rounded"}
                      onChange={handleChange}
                    >
                      <MenuItem value="rounded">Rounded</MenuItem>
                      <MenuItem value="square">Square</MenuItem>
                      <MenuItem value="circle">Circle</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Title Lines"
                    name="designTitleLines"
                    type="number"
                    value={(currentCard as EditableDashboardCard)?.dashboardDesignTitleLines || 1}
                    onChange={handleChange}
                    inputProps={{ min: 1, max: 3 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Subtitle Lines"
                    name="designSubtitleLines"
                    type="number"
                    value={(currentCard as EditableDashboardCard)?.dashboardDesignSubtitleLines || 2}
                    onChange={handleChange}
                    inputProps={{ min: 1, max: 4 }}
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                label="Badge Text"
                name="designBadgeText"
                value={(currentCard as EditableDashboardCard)?.dashboardDesignBadgeText || ""}
                onChange={handleChange}
                helperText="Optional small badge text shown on media cards."
              />

              <Box>
                {imageStatus && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {imageStatus}
                  </Alert>
                )}
                {String((currentCard as any)?.photo || "").trim() && (
                  <Box sx={{ mb: 2, maxWidth: 300 }}>
                    <img
                      src={String((currentCard as any).photo).trim()}
                      style={{ width: "100%", height: "auto", aspectRatio: "16/9", objectFit: "cover", borderRadius: 4 }}
                      alt="Card image"
                    />
                  </Box>
                )}
                <Button variant="outlined" onClick={() => setShowPhotoGallery(true)} sx={{ textTransform: "none" }}>
                  {(currentCard as any)?.photo ? "Change Image" : "Select Image"}
                </Button>
                <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
                  Upload crops the image and attaches it to this card. Or paste a public image URL below.
                </Typography>

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

                {supportsSecondaryThumb && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Secondary Thumbnail Image
                    </Typography>
                    {secondaryImageStatus && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        {secondaryImageStatus}
                      </Alert>
                    )}
                    {String((currentCard as EditableDashboardCard)?.dashboardDesignThumbImage || "").trim() && (
                      <Box sx={{ mb: 2, maxWidth: 300 }}>
                        <img
                          src={String((currentCard as EditableDashboardCard).dashboardDesignThumbImage).trim()}
                          style={{ width: "100%", height: "auto", aspectRatio: "16/9", objectFit: "cover", borderRadius: 4 }}
                          alt="Secondary card thumbnail"
                        />
                      </Box>
                    )}
                    <Button variant="outlined" onClick={() => setShowSecondaryPhotoGallery(true)} sx={{ textTransform: "none" }}>
                      {(currentCard as EditableDashboardCard)?.dashboardDesignThumbImage ? "Change Secondary Image" : "Select Secondary Image"}
                    </Button>
                    <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
                      Upload crops the secondary image and attaches it to this card.
                    </Typography>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
                      <TextField
                        fullWidth
                        label="Secondary Thumbnail Image URL"
                        value={secondaryImageUrlInput}
                        onChange={(e) => setSecondaryImageUrlInput(e.target.value)}
                        placeholder="https://..."
                        helperText="Optional small image shown in the lower card row."
                      />
                      <Button variant="outlined" onClick={handleApplySecondaryImageUrl} sx={{ textTransform: "none", minWidth: 150 }}>
                        Apply URL
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Box>

              <FormControl fullWidth>
                <InputLabel id="type">Card Action</InputLabel>
                <Select
                  labelId="type"
                  label="Card Action"
                  name="type"
                  value={currentCard?.linkType || ""}
                  onChange={handleChange}
                >
                  <MenuItem value="bible">{Locale.label("settings.appEdit.bible")}</MenuItem>
                  <MenuItem value="stream">{Locale.label("settings.appEdit.liveStream")}</MenuItem>
                  <MenuItem value="votd">{Locale.label("settings.appEdit.verseOfDay")}</MenuItem>
                  <MenuItem value="checkin">{Locale.label("settings.appEdit.checkin")}</MenuItem>
                  <MenuItem value="donation">{Locale.label("settings.appEdit.donation")}</MenuItem>
                  <MenuItem value="donationLanding">{Locale.label("settings.appEdit.donationLanding")}</MenuItem>
                  <MenuItem value="directory">{Locale.label("settings.appEdit.memberDirectory")}</MenuItem>
                  <MenuItem value="groups">{Locale.label("settings.appEdit.myGroups")}</MenuItem>
                  <MenuItem value="lessons">{Locale.label("settings.appEdit.lessons")}</MenuItem>
                  <MenuItem value="volunteer">Volunteer Opportunities</MenuItem>
                  <MenuItem value="url">{Locale.label("settings.appEdit.externalUrl")}</MenuItem>
                  <MenuItem value="page">{Locale.label("settings.appEdit.internalPage")}</MenuItem>
                </Select>
              </FormControl>

              {currentCard?.linkType === "url" && (
                <TextField
                  fullWidth
                  label={Locale.label("settings.appEdit.url")}
                  name="url"
                  type="url"
                  value={currentCard?.url || ""}
                  onChange={handleChange}
                  helperText={Locale.label("settings.app.urlHelper")}
                />
              )}

              {getPageSelect()}

              <FormControl fullWidth>
                <InputLabel id="visibility">Visibility</InputLabel>
                <Select
                  labelId="visibility"
                  label="Visibility"
                  name="visibility"
                  value={(currentCard as any)?.visibility || "everyone"}
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

              {(currentCard as any)?.visibility === "groups" && (
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

              {!UniqueIdHelper.isMissing(currentCard?.id) && (
                <>
                  <Divider sx={{ mt: 2 }} />
                  <Box sx={{ textAlign: "center" }}>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={handleDelete}
                      size="small"
                      sx={{ textTransform: "none" }}
                    >
                      Delete Card
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
      {showSecondaryPhotoGallery && (
        <DashboardImageUploadModal
          onClose={() => setShowSecondaryPhotoGallery(false)}
          onSelect={handleSecondaryPhotoSelected}
          aspectRatio={16 / 9}
        />
      )}
    </>
  );
}
