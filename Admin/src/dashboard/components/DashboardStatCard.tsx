import { Card, CardContent, Typography, Box } from "@mui/material";
import type { ReactNode } from "react";

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  /** Structured content below the value (modern KPI layout). */
  footer?: ReactNode;
  /** Content-height card (does not stretch with taller neighbors in a grid row). */
  compact?: boolean;
}

export const kpiCardPanelSx = {
  px: 1.25,
  py: 1,
  borderRadius: 1.5,
  bgcolor: "action.hover",
  border: "1px solid",
  borderColor: "divider"
} as const;

export const kpiCardPanelLabelSx = {
  display: "block",
  mb: 0.5,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  fontSize: "0.65rem",
  color: "text.secondary"
} as const;

export function KpiCardFooter({ children, compact }: { children: ReactNode; compact?: boolean }) {
  return (
    <Box sx={{ mt: compact ? 1 : 1.5, display: "flex", flexDirection: "column", gap: compact ? 0.75 : 1 }}>
      {children}
    </Box>
  );
}

/** Optional leading text with period caption on the right. */
export function KpiCardMetaRow({
  leading,
  period,
  leadingEmphasis = false
}: {
  leading?: ReactNode;
  period?: ReactNode;
  /** Use stronger typography for numeric highlights (e.g. branch total). */
  leadingEmphasis?: boolean;
}) {
  if (!leading && !period) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
      {leading ? (
        <Typography
          variant={leadingEmphasis ? "subtitle1" : "subtitle2"}
          color={leadingEmphasis ? "text.primary" : "text.secondary"}
          sx={{ fontWeight: leadingEmphasis ? 600 : 500, minWidth: 0, letterSpacing: leadingEmphasis ? "-0.01em" : undefined }}
          noWrap>
          {leading}
        </Typography>
      ) : (
        <span />
      )}
      {period ? (
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
          {period}
        </Typography>
      ) : null}
    </Box>
  );
}

export function KpiCardDetailPanel({
  title,
  children,
  compact
}: {
  title: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <Box sx={{ ...kpiCardPanelSx, py: compact ? 0.75 : kpiCardPanelSx.py, px: compact ? 1 : kpiCardPanelSx.px }}>
      <Typography variant="caption" sx={kpiCardPanelLabelSx}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export function DashboardStatCard({ label, value, hint, icon, footer, compact }: Props) {
  return (
    <Card
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "var(--border-light)",
        width: "100%",
        height: compact ? "auto" : "100%",
        alignSelf: compact ? "flex-start" : undefined
      }}>
      <CardContent sx={compact ? { py: 1.5, px: 2, "&:last-child": { pb: 1.5 } } : undefined}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4, letterSpacing: 0.6 }}>
              {label}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, lineHeight: 1.25 }}>
              {value}
            </Typography>
            {footer ?? (hint ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                {hint}
              </Typography>
            ) : null)}
          </Box>
          {icon ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "action.hover",
                color: "primary.main"
              }}>
              {icon}
            </Box>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  );
}
