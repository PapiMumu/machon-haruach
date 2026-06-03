import { IconButton, Stack, Tooltip } from "@mui/material";
import { ArrowDownward as ArrowDownIcon, ArrowUpward as ArrowUpIcon } from "@mui/icons-material";
import React from "react";
import { Locale } from "@machonharuach/apphelper";

interface Props {
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const SortOrderButtons = ({ index, total, onMoveUp, onMoveDown }: Props) => (
  <Stack direction="row" spacing={0.25} sx={{ display: "inline-flex", verticalAlign: "middle" }}>
    <Tooltip title={Locale.label("common.moveUp", "Move up")} arrow>
      <span>
        <IconButton size="small" disabled={index <= 0} onClick={onMoveUp} aria-label="Move up">
          <ArrowUpIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
    <Tooltip title={Locale.label("common.moveDown", "Move down")} arrow>
      <span>
        <IconButton size="small" disabled={index >= total - 1} onClick={onMoveDown} aria-label="Move down">
          <ArrowDownIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  </Stack>
);
