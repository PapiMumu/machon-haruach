import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Icon,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import { Edit as EditIcon, ArrowUpward as ArrowUpIcon, ArrowDownward as ArrowDownIcon, Article as ArticleIcon, Add as AddIcon } from "@mui/icons-material";
import { ApiHelper } from "@machonharuach/apphelper";
import type { LinkInterface } from "@machonharuach/helpers";
import { CardWithHeader, EmptyState } from "../../components/ui";
import { ensureSequentialSort, moveItemDown, moveItemUp } from "../../helpers/SortHelper";

interface Props {
  onSelected?: (item: LinkInterface) => void;
  refreshKey?: number;
  onAdd?: () => void;
}

function parseMeta(linkData?: string): { subtitle?: string; contentCategory?: string; featured?: boolean } {
  const raw = (linkData || "").trim();
  if (!raw.startsWith("{")) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function GoodNewsDailyItems({ onSelected = () => {}, refreshKey = 0, onAdd = () => {} }: Props) {
  const [items, setItems] = useState<LinkInterface[]>([]);

  const loadData = () => {
    ApiHelper.get("/links?category=b1GoodNewsDaily", "ContentApi").then((data: any) => setItems(data || []));
  };

  const saveChanges = () => {
    ApiHelper.post("/links", items, "ContentApi").then(loadData);
  };

  const moveUp = (idx: number) => {
    ensureSequentialSort(items);
    moveItemUp(items, idx);
    saveChanges();
  };

  const moveDown = (idx: number) => {
    ensureSequentialSort(items);
    moveItemDown(items, idx);
    saveChanges();
  };

  useEffect(loadData, []);
  useEffect(loadData, [refreshKey]);

  return (
    <CardWithHeader
      title="GoodNews Daily Content"
      icon={<ArticleIcon />}
      actions={(
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={onAdd}
          sx={{ textTransform: "none" }}
        >
          Add Content
        </Button>
      )}
    >
      {items.length === 0
        ? (
          <EmptyState
            icon={<ArticleIcon />}
            title="No GoodNews items yet"
            description="Add items to build the native GoodNews Daily page in Mobile."
            variant="card"
          />
        )
        : (
          <List sx={{ p: 0 }}>
            {items.map((item, index) => {
              const meta = parseMeta(item.linkData);
              const subtitle = meta.subtitle;
              return (
                <React.Fragment key={item.id || `${item.text}_${index}`}>
                  <ListItem
                    sx={{ py: 2, alignItems: "flex-start" }}
                    secondaryAction={(
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Move up" arrow>
                          <span>
                            <IconButton size="small" onClick={() => moveUp(index)} disabled={index === 0} sx={{ color: "text.secondary" }}>
                              <ArrowUpIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Move down" arrow>
                          <span>
                            <IconButton size="small" onClick={() => moveDown(index)} disabled={index === items.length - 1} sx={{ color: "text.secondary" }}>
                              <ArrowDownIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Edit item" arrow>
                          <IconButton size="small" onClick={() => onSelected(item)} sx={{ color: "primary.main" }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  >
                    <ListItemIcon sx={{ mr: 2 }}>
                      {(item as any)?.photo ? (
                        <Box
                          sx={{
                            borderRadius: "8px",
                            overflow: "hidden",
                            width: 71,
                            height: 40,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <img
                            src={(item as any).photo}
                            alt={item.text || "GoodNews item"}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            backgroundColor: "primary.main",
                            borderRadius: "8px",
                            width: 71,
                            height: 40,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white"
                          }}
                        >
                          <Icon sx={{ fontSize: 20 }}>article</Icon>
                        </Box>
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={(
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {item.text || "Untitled item"}
                          </Typography>
                          <Chip label={item.linkType || "url"} size="small" sx={{ fontSize: "0.7rem", height: 20 }} />
                          {meta.contentCategory ? <Chip label={meta.contentCategory} size="small" sx={{ fontSize: "0.7rem", height: 20 }} /> : null}
                          {meta.featured ? <Chip label="featured" color="warning" size="small" sx={{ fontSize: "0.7rem", height: 20 }} /> : null}
                        </Stack>
                      )}
                      secondary={(
                        <Typography variant="body2" color="text.secondary">
                          {subtitle || item.url || "No subtitle"}
                        </Typography>
                      )}
                      slotProps={{
                        primary: { component: "div" },
                        secondary: { component: "div" }
                      }}
                      sx={{ pr: 10 }}
                    />
                  </ListItem>
                  {index < items.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        )}
    </CardWithHeader>
  );
}

