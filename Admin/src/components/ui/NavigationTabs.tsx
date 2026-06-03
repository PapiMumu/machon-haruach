import { Tabs, Tab, Menu, MenuItem, Stack, useTheme, Box, Typography } from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import React, { memo, useState } from "react";

export interface NavigationTab {
  value: string;
  label: string;
  icon?: React.ReactNode;
  subtitle?: string;
}

export interface NavigationDropdown<T = any> {
  value: string;
  label: string;
  icon?: React.ReactNode;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  onItemSelect: (item: T) => void;
}

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  tabs: NavigationTab[];
  dropdown?: NavigationDropdown;
  appearance?: "default" | "panel";
  /** When true with panel appearance, omits outer page padding wrapper */
  embedded?: boolean;
}

export const panelModeTabSx = {
  minHeight: 0,
  alignItems: "flex-start",
  textTransform: "none",
  borderRadius: 2,
  px: 2,
  py: 1.2,
  color: "rgba(255,255,255,0.8)",
  border: "1px solid transparent",
  transition: "all .16s ease",
  "&.Mui-selected": {
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.2)"
  }
} as const;

export const NavigationTabs = memo((props: Props) => {
  const { selectedTab, onTabChange, tabs, dropdown, appearance = "default", embedded = false } = props;
  const [dropdownAnchor, setDropdownAnchor] = useState<null | HTMLElement>(null);
  const theme = useTheme();

  const handleDropdownOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setDropdownAnchor(event.currentTarget);
  };

  const handleDropdownClose = () => {
    setDropdownAnchor(null);
  };

  const handleItemSelect = (item: any) => {
    dropdown?.onItemSelect(item);
    handleDropdownClose();
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    if (newValue !== dropdown?.value) onTabChange(newValue);
  };

  if (appearance === "panel") {
    const panel = (
      <Box
        sx={{
          mb: 2.5,
          p: 0.75,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "rgba(255,255,255,0.12)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)"
        }}
      >
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          variant="fullWidth"
          TabIndicatorProps={{ style: { display: "none" } }}
          sx={{
            minHeight: 0,
            "& .MuiTabs-flexContainer": { gap: 1 }
          }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              disableRipple
              icon={tab.icon}
              iconPosition="start"
              label={(
                <Box sx={{ textAlign: "left" }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.96rem" }}>{tab.label}</Typography>
                  {tab.subtitle ? <Typography sx={{ opacity: 0.72, fontSize: "0.72rem" }}>{tab.subtitle}</Typography> : null}
                </Box>
              )}
              sx={{
                ...panelModeTabSx,
                "& .MuiSvgIcon-root": { opacity: 0.9 }
              }}
            />
          ))}
          {dropdown && dropdown.items && dropdown.items.length > 0 && (
            <Tab
              value={dropdown.value}
              disableRipple
              icon={dropdown.icon}
              iconPosition="start"
              onClick={handleDropdownOpen}
              label={(
                <Box sx={{ textAlign: "left" }}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.96rem" }}>{dropdown.label}</Typography>
                    <ExpandMoreIcon sx={{ fontSize: 18 }} />
                  </Stack>
                </Box>
              )}
              sx={{
                ...panelModeTabSx,
                "& .MuiSvgIcon-root": { opacity: 0.9 }
              }}
            />
          )}
        </Tabs>

        {dropdown && (
          <Menu
            anchorEl={dropdownAnchor}
            open={Boolean(dropdownAnchor)}
            onClose={handleDropdownClose}
            PaperProps={{
              sx: {
                minWidth: 200,
                maxHeight: 300,
                mt: 0.5
              }
            }}>
            {dropdown.items?.map((item: any, index) => (
              <MenuItem
                key={item.id || index}
                onClick={() => handleItemSelect(item)}
                sx={{
                  py: 1.5,
                  px: 2,
                  "&:hover": { backgroundColor: "action.hover" }
                }}>
                {dropdown.renderItem(item)}
              </MenuItem>
            ))}
          </Menu>
        )}
      </Box>
    );

    if (embedded) return panel;
    return <Box sx={{ px: 3, pt: 1 }}>{panel}</Box>;
  }

  return (
    <div
      style={{
        backgroundColor: theme.palette.mode === "dark" ? "#0b1220" : theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`
      }}
    >
      <Tabs
        value={selectedTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          minHeight: 48,
          "& .MuiTabs-indicator": { backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.85)" : theme.palette.text.primary },
          "& .MuiTab-root": {
            minHeight: 48,
            textTransform: "none",
            fontSize: "0.95rem",
            fontWeight: 700,
            color: theme.palette.text.primary,
            opacity: 0.92,
            "& .MuiSvgIcon-root, & .MuiIcon-root": {
              color: theme.palette.text.primary,
              opacity: 0.92
            }
          },
          // Override global theme rule that tints selected tabs/icons to spirit blue
          "& .MuiTab-root.Mui-selected": {
            color: theme.palette.text.primary,
            opacity: 1,
            "& .MuiSvgIcon-root, & .MuiIcon-root": {
              color: theme.palette.text.primary,
              opacity: 1
            }
          }
        }}>
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={tab.label}
            icon={tab.icon}
            iconPosition="start"
            sx={{ gap: 1 }}
          />
        ))}

        {dropdown && dropdown.items && dropdown.items.length > 0 && (
          <Tab
            value={dropdown.value}
            label={
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <span>{dropdown.label}</span>
                <ExpandMoreIcon sx={{ fontSize: 18 }} />
              </Stack>
            }
            icon={dropdown.icon}
            iconPosition="start"
            onClick={handleDropdownOpen}
            sx={{ gap: 1 }}
          />
        )}
      </Tabs>

      {dropdown && (
        <Menu
          anchorEl={dropdownAnchor}
          open={Boolean(dropdownAnchor)}
          onClose={handleDropdownClose}
          PaperProps={{
            sx: {
              minWidth: 200,
              maxHeight: 300,
              mt: 0.5
            }
          }}>
          {dropdown.items?.map((item: any, index) => (
            <MenuItem
              key={item.id || index}
              onClick={() => handleItemSelect(item)}
              sx={{
                py: 1.5,
                px: 2,
                "&:hover": { backgroundColor: "action.hover" }
              }}>
              {dropdown.renderItem(item)}
            </MenuItem>
          ))}
        </Menu>
      )}
    </div>
  );
});
