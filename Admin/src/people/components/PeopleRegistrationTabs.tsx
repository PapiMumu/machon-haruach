import React from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import { type RegistrationSource } from "../helpers/registrationSource";

interface Props {
  value: RegistrationSource;
  onChange: (value: RegistrationSource) => void;
  mobileCount: number;
  adminCount: number;
}

const tabSx = {
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

export function PeopleRegistrationTabs(props: Props) {
  return (
    <Box
      sx={{
        p: 0.75,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "rgba(255,255,255,0.12)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)"
      }}
    >
      <Tabs
        value={props.value}
        onChange={(_event, value: RegistrationSource) => props.onChange(value)}
        variant="fullWidth"
        TabIndicatorProps={{ style: { display: "none" } }}
        sx={{
          minHeight: 0,
          "& .MuiTabs-flexContainer": { gap: 1 }
        }}
      >
        <Tab
          value="mobile"
          disableRipple
          label={(
            <Box sx={{ textAlign: "left" }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.96rem" }}>Mobile ({props.mobileCount})</Typography>
              <Typography sx={{ opacity: 0.72, fontSize: "0.72rem" }}>Mobile app registrations</Typography>
            </Box>
          )}
          sx={tabSx}
        />
        <Tab
          value="admin"
          disableRipple
          label={(
            <Box sx={{ textAlign: "left" }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.96rem" }}>Admin ({props.adminCount})</Typography>
              <Typography sx={{ opacity: 0.72, fontSize: "0.72rem" }}>Admin directory records</Typography>
            </Box>
          )}
          sx={tabSx}
        />
      </Tabs>
    </Box>
  );
}
