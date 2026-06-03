import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { TableCell, TableRow } from "@mui/material";
import { DragIndicator as DragIndicatorIcon } from "@mui/icons-material";

export const MEDIA_SORT_ROW_TYPE = "mediaSortRow";

export interface MediaSortDragItem {
  id: string;
  index: number;
}

interface Props {
  id: string;
  index: number;
  sortable?: boolean;
  onMoveDrag: (dragIndex: number, hoverIndex: number) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
  onClick?: () => void;
  sx?: object;
}

export const SortableTableRow = ({
  id,
  index,
  sortable = true,
  onMoveDrag,
  onDragEnd,
  children,
  onClick,
  sx
}: Props) => {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: MEDIA_SORT_ROW_TYPE,
    item: (): MediaSortDragItem => ({ id, index }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: () => onDragEnd(),
    canDrag: sortable
  });

  const [, drop] = useDrop({
    accept: MEDIA_SORT_ROW_TYPE,
    hover(item: MediaSortDragItem) {
      if (!rowRef.current || item.index === index) return;
      onMoveDrag(item.index, index);
      item.index = index;
    }
  });

  if (sortable) {
    drop(rowRef);
    drag(dragHandleRef);
  }

  return (
    <TableRow
      ref={sortable ? rowRef : undefined}
      onClick={onClick}
      sx={{
        opacity: isDragging ? 0.45 : 1,
        ...sx
      }}
    >
      {sortable ? (
        <TableCell sx={{ width: 40, px: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <div
            ref={dragHandleRef}
            style={{ display: "flex", alignItems: "center", cursor: "grab", padding: "4px" }}
            aria-label="Drag to reorder"
          >
            <DragIndicatorIcon sx={{ fontSize: 20, color: "text.secondary" }} />
          </div>
        </TableCell>
      ) : null}
      {children}
    </TableRow>
  );
};
