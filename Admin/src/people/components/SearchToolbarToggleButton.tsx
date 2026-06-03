import React from "react";
import { Button } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

interface Props {
  label: string;
  expanded: boolean;
  onClick: () => void;
}

export function SearchToolbarToggleButton(props: Props) {
  return (
    <Button
      size="small"
      variant={props.expanded ? "contained" : "outlined"}
      onClick={props.onClick}
      endIcon={props.expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
      sx={{
        whiteSpace: "nowrap",
        flexShrink: 0,
        textTransform: "none",
        fontWeight: 500,
        minWidth: "auto"
      }}
    >
      {props.label}
    </Button>
  );
}
