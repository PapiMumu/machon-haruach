import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  Stack,
  TableCell,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import {
  DragIndicator as DragIndicatorIcon,
  MusicNote as MusicNoteIcon
} from "@mui/icons-material";
import type { SongDetailInterface } from "../../../helpers";

export const ALBUM_TRACK_DND_TYPE = "albumTrack";

interface DragItem {
  id: string;
  index: number;
}

interface Props {
  track: SongDetailInterface;
  index: number;
  isCurrent: boolean;
  canEdit: boolean;
  trackNumberDisplay: string;
  onTrackNumberChange: (value: string) => void;
  onTrackNumberBlur: (value: string) => void;
  onMoveDrag: (dragIndex: number, hoverIndex: number) => void;
  onDragEnd: () => void;
  onNavigate: () => void;
}

const AlbumTrackTableRowInner = ({
  track,
  index,
  isCurrent,
  canEdit,
  trackNumberDisplay,
  onTrackNumberChange,
  onTrackNumberBlur,
  onNavigate,
  rowRef,
  dragHandleRef,
  isDragging
}: Props & {
  rowRef?: React.Ref<HTMLTableRowElement>;
  dragHandleRef?: React.Ref<HTMLDivElement>;
  isDragging?: boolean;
}) => (
    <TableRow
      ref={rowRef}
      hover
      selected={isCurrent}
      onClick={onNavigate}
      sx={{
        cursor: track.songId ? "pointer" : "default",
        opacity: isDragging ? 0.45 : 1
      }}>
      {canEdit ? (
        <TableCell sx={{ width: 40, px: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <div
              ref={dragHandleRef}
              style={{ display: "flex", alignItems: "center", cursor: "grab", padding: "4px" }}
              aria-label="Drag to reorder track">
              <DragIndicatorIcon sx={{ fontSize: 20, color: "text.secondary" }} />
            </div>
        </TableCell>
      ) : null}
      <TableCell onClick={(e) => e.stopPropagation()}>
        {canEdit ? (
          <TextField
            size="small"
            type="number"
            inputProps={{ min: 1, style: { textAlign: "center" } }}
            value={trackNumberDisplay}
            onChange={(e) => onTrackNumberChange(e.target.value)}
            onBlur={(e) => onTrackNumberBlur(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            sx={{ width: 56 }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {track.trackNumber ?? "—"}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          {isCurrent ? <MusicNoteIcon sx={{ fontSize: 18, color: "primary.main" }} /> : null}
          <Typography
            variant="body2"
            sx={{ fontWeight: isCurrent ? 600 : 400, color: isCurrent ? "primary.main" : "text.primary" }}>
            {track.title}
          </Typography>
        </Stack>
      </TableCell>
    </TableRow>
);

const AlbumTrackTableRowEditable = (props: Props) => {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: ALBUM_TRACK_DND_TYPE,
    item: (): DragItem => ({ id: props.track.id!, index: props.index }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: () => props.onDragEnd()
  });

  const [, drop] = useDrop({
    accept: ALBUM_TRACK_DND_TYPE,
    hover(item: DragItem) {
      if (!rowRef.current || item.index === props.index) return;
      props.onMoveDrag(item.index, props.index);
      item.index = props.index;
    }
  });

  drop(rowRef);
  drag(dragHandleRef);

  return (
    <AlbumTrackTableRowInner
      {...props}
      rowRef={rowRef}
      dragHandleRef={dragHandleRef}
      isDragging={isDragging}
    />
  );
};

export const AlbumTrackTableRow = (props: Props) => {
  if (props.canEdit) {
    return <AlbumTrackTableRowEditable {...props} />;
  }
  return <AlbumTrackTableRowInner {...props} />;
};
