import React from "react";
import { Card, CardActionArea, Box, Stack, Typography } from "@mui/material";
import { ChevronRight } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

interface Props {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkUrl?: string;
  external?: boolean;
  onClick?: () => void;
  actionLabel?: string;
}

export const FeatureCard: React.FC<Props> = ({ icon, title, description, linkUrl, external, onClick, actionLabel }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (external && linkUrl) {
      window.open(linkUrl, "_blank", "noopener,noreferrer");
    } else if (linkUrl) {
      navigate(linkUrl);
    }
  };

  const ctaLabel = actionLabel || (onClick ? "Start setup" : external ? "Open page in new tab" : "Open page");

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: 3,
        borderColor: "rgba(255,255,255,0.14)",
        backgroundColor: "var(--bg-card)",
        backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
        transition: "transform .2s ease, border-color .2s ease, box-shadow .2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: "rgba(255,255,255,0.25)",
          boxShadow: "0 12px 28px rgba(0,0,0,0.28)"
        }
      }}
    >
      <CardActionArea
        onClick={handleClick}
        sx={{ p: 2.2, height: "100%", display: "flex", alignItems: "stretch" }}
      >
        <Stack spacing={1.3} sx={{ width: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "flex-start" }}>
            <Box
              sx={{
                color: "text.primary",
                mr: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 42,
                height: 42,
                borderRadius: 2,
                backgroundColor: alpha("#ffffff", 0.09),
                border: "1px solid rgba(255,255,255,0.14)",
                flexShrink: 0
              }}
            >
              {icon}
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3, mb: 0.2 }}>{title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontSize: "0.84rem" }}>{description}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 0.7 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.25, textTransform: "uppercase", color: "text.secondary" }}>
              {ctaLabel}
            </Typography>
            <ChevronRight sx={{ fontSize: 20, opacity: 0.9 }} />
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
};
