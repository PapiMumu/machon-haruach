import React, { useState, useEffect } from "react";
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Grid
} from "@mui/material";
import {
  Edit as EditIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  ViewCarousel as ViewCarouselIcon
} from "@mui/icons-material";
import { ApiHelper, UserHelper } from "@machonharuach/apphelper";
import type { LinkInterface } from "@machonharuach/helpers";
import { CardWithHeader, EmptyState } from "../../components/ui";
import { ensureSequentialSort, moveItemDown, moveItemUp } from "../../helpers/SortHelper";

interface Props {
  onSelected?: (card: LinkInterface) => void;
  refreshKey?: number;
}

type DashboardSection = "hero" | "quick" | "featured" | "carousel";

function parseCardMeta(linkData?: string): { subtitle?: string; sectionLabel?: string } {
  const raw = (linkData || "").trim();
  if (!raw.startsWith("{")) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function DashboardCards({ onSelected = () => { }, refreshKey = 0 }: Props) {
  const [cards, setCards] = useState<LinkInterface[]>([]);
  const [activeSection, setActiveSection] = useState<DashboardSection>("hero");
  const [activeSlotLabel, setActiveSlotLabel] = useState("Hero (Top Banner)");

  const loadData = () => {
    ApiHelper.get("/links?category=b1DashboardCard", "ContentApi").then((data: any) => setCards(data || []));
  };

  const saveChanges = () => {
    ApiHelper.post("/links", cards, "ContentApi").then(loadData);
  };

  const moveUp = (idx: number) => {
    ensureSequentialSort(cards);
    moveItemUp(cards, idx);
    saveChanges();
  };

  const moveDown = (idx: number) => {
    ensureSequentialSort(cards);
    moveItemDown(cards, idx);
    saveChanges();
  };

  const getSectionLabel = (icon: string) => {
    switch ((icon || "").toLowerCase()) {
      case "hero": return "hero";
      case "featured": return "featured";
      case "quick": return "quick";
      case "carousel":
      default: return "carousel";
    }
  };

  const getCardsBySection = (section: DashboardSection) =>
    cards
      .filter(c => getSectionLabel(c.icon) === section)
      .sort((a, b) => (a.sort || 0) - (b.sort || 0));

  const getCardIndex = (card?: LinkInterface) => cards.findIndex(c => c.id === card?.id);

  const createDraftCard = (section: DashboardSection): LinkInterface => {
    const highestSort = cards.reduce((max, c) => Math.max(max, c.sort || 0), 0);
    const defaultNames: Record<DashboardSection, string> = {
      hero: "New Hero Card",
      quick: "New Quick Action",
      featured: "New Featured Card",
      carousel: "New Carousel Card"
    };
    return {
      churchId: "",
      category: "b1DashboardCard",
      text: defaultNames[section],
      sort: highestSort + 1,
      linkType: "url",
      linkData: JSON.stringify({ subtitle: "", sectionLabel: "" }),
      icon: section,
      url: "",
      visibility: "everyone",
      ...(UserHelper.currentUserChurch?.church?.id ? { churchId: UserHelper.currentUserChurch.church.id } : {})
    } as unknown as LinkInterface;
  };

  const getSectionGuidance = (section: DashboardSection, slotLabel: string): string[] => {
    if (section === "hero") {
      return [
        "Add a clear title for the top banner message.",
        "Set a subtitle to explain the main purpose of the dashboard.",
        "Upload a wide image for the hero background.",
        "Optional: set section heading override and design options."
      ];
    }
    if (section === "quick") {
      return [
        "Use a short action title (e.g. Prayer Requests, Partner).",
        "Set the action target (link type and URL/page).",
        "Keep text short so it fits button space well.",
        "Use CTA design style to control button appearance."
      ];
    }
    if (section === "featured") {
      return [
        "Add a card title and subtitle for the featured block.",
        "Choose an image and optional badge text.",
        "Set action target for where the card should open.",
        "Use section heading override for block title text."
      ];
    }
    return [
      "Add multiple cards to build the horizontal carousel.",
      "Set title, subtitle and image for each card.",
      "Assign action target for each card click.",
      "Use sort order to control left-to-right sequence."
    ];
  };

  const handleSlotClick = (section: DashboardSection, slotLabel: string, card?: LinkInterface) => {
    setActiveSection(section);
    setActiveSlotLabel(slotLabel);
    if (card) onSelected(card);
    else onSelected(createDraftCard(section));
  };

  const renderSlot = (section: DashboardSection, label: string, card?: LinkInterface, compact = false) => {
    const meta = parseCardMeta(card?.linkData);
    const cardIndex = getCardIndex(card);
    return (
      <Box
        onClick={() => handleSlotClick(section, label, card)}
        sx={{
          border: "1px solid",
          borderColor: card ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.22)",
          borderStyle: card ? "solid" : "dashed",
          borderRadius: 2.5,
          p: 1.25,
          minHeight: compact ? 120 : 144,
          position: "relative",
          overflow: "hidden",
          backgroundColor: card ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
          cursor: "pointer",
          transition: "all 0.18s ease",
          "&:hover": {
            borderColor: "primary.main",
            transform: "translateY(-1px)",
            boxShadow: "0 8px 20px rgba(0,0,0,0.18)"
          }
        }}
      >
        {card?.photo && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              opacity: 0.3,
              backgroundImage: `url(${card.photo})`,
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          />
        )}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(8,12,24,0.2) 0%, rgba(8,12,24,0.88) 100%)"
          }}
        />

        <Stack sx={{ position: "relative", zIndex: 1, height: "100%" }} spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
              {label}
            </Typography>
            {card && (
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Move up" arrow>
                  <span>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (cardIndex > 0) moveUp(cardIndex);
                      }}
                      disabled={cardIndex <= 0}
                      sx={{ color: "text.secondary", p: 0.5 }}
                    >
                      <ArrowUpIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Move down" arrow>
                  <span>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (cardIndex >= 0 && cardIndex < cards.length - 1) moveDown(cardIndex);
                      }}
                      disabled={cardIndex < 0 || cardIndex >= cards.length - 1}
                      sx={{ color: "text.secondary", p: 0.5 }}
                    >
                      <ArrowDownIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Edit card" arrow>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (card) onSelected(card);
                    }}
                    sx={{ color: "primary.main", p: 0.5 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
          </Stack>

          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {card?.text || "Empty slot"}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {card ? (meta.subtitle || "No subtitle added yet.") : "Click to add a card into this slot."}
          </Typography>

          {card && (
            <Stack direction="row" spacing={0.75} sx={{ mt: "auto", pt: 0.5 }}>
              <Chip label={getSectionLabel(card.icon)} size="small" sx={{ height: 20, fontSize: "0.66rem" }} />
              <Chip label={card.linkType || "url"} size="small" sx={{ height: 20, fontSize: "0.66rem" }} />
            </Stack>
          )}
        </Stack>
      </Box>
    );
  };

  const renderDashboardLayoutPreview = () => {
    const heroCards = getCardsBySection("hero");
    const quickCards = getCardsBySection("quick");
    const featuredCards = getCardsBySection("featured");
    const carouselCards = getCardsBySection("carousel");

    return (
      <Box
        sx={{
          mb: 2.5,
          p: 2,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "rgba(255,255,255,0.12)",
          backgroundColor: "rgba(10,20,50,0.28)"
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Dashboard Layout + Cards
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          This mirrors the current Mobile home structure and shows live card content. Click a slot to add/edit cards.
        </Typography>

        <Stack spacing={2}>
          {renderSlot("hero", "Hero (Top Banner)", heroCards[0])}

          <Box sx={{ mt: 0.75 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                {renderSlot("quick", "Quick Action 1", quickCards[0], true)}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                {renderSlot("quick", "Quick Action 2", quickCards[1], true)}
              </Grid>
            </Grid>
          </Box>

          {renderSlot("featured", "Featured Card 1 (Healing Block)", featuredCards[0])}
          {renderSlot("featured", "Featured Card 2 (GoodNews Daily Block)", featuredCards[1])}

          <Box sx={{ mt: 0.75 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                {renderSlot("carousel", "Carousel 1", carouselCards[0], true)}
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                {renderSlot("carousel", "Carousel 2", carouselCards[1], true)}
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                {renderSlot("carousel", "Carousel 3", carouselCards[2], true)}
              </Grid>
            </Grid>
          </Box>

          {carouselCards.length > 3 && (
            <Grid container spacing={2}>
              {carouselCards.slice(3).map((card, idx) => (
                <Grid key={card.id || `carousel-extra-${idx}`} size={{ xs: 12, md: 4 }}>
                  {renderSlot("carousel", `Carousel ${idx + 4}`, card, true)}
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>

        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "rgba(255,255,255,0.12)",
            backgroundColor: "rgba(255,255,255,0.02)"
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Selected Slot: {activeSlotLabel}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
            Click any slot to open or create the card for that section.
          </Typography>
          <Stack spacing={0.5}>
            {getSectionGuidance(activeSection, activeSlotLabel).map((line, index) => (
              <Typography key={`${activeSection}_${index}`} variant="caption" sx={{ color: "text.secondary" }}>
                - {line}
              </Typography>
            ))}
          </Stack>
        </Box>
      </Box>
    );
  };

  useEffect(loadData, []);
  useEffect(loadData, [refreshKey]);

  return (
    <CardWithHeader title="Dashboard Cards" icon={<ViewCarouselIcon />}>
      {renderDashboardLayoutPreview()}
      {cards.length === 0 && (
        <EmptyState
          icon={<ViewCarouselIcon />}
          title="No dashboard cards yet"
          description="Click any slot above to add a dashboard card."
          variant="card"
        />
      )}
    </CardWithHeader>
  );
}
