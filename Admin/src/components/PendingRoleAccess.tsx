import React from "react";
import { Box, Button, Container, Paper, Typography } from "@mui/material";
import { HourglassEmpty, Logout } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { UserHelper } from "@machonharuach/apphelper";

export const PendingRoleAccess: React.FC = () => {
  const navigate = useNavigate();
  const firstName = (UserHelper.user?.firstName || "").trim();
  const email = UserHelper.user?.email || "";

  const handleSignOut = () => {
    navigate("/login?action=logout&returnUrl=/login");
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 4
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            width: "100%",
            textAlign: "center",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper"
          }}
        >
          <HourglassEmpty sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography variant="h5" component="h1" fontWeight={700} gutterBottom>
            {firstName ? `Welcome, ${firstName}` : "Welcome"}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Your account is signed in, but you do not have access to Machon HaRuach Admin yet.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            An administrator must add you to a role before you can view any part of the admin. If you
            just registered, please contact your church admin{email ? ` (${email})` : ""}.
          </Typography>
          <Button variant="contained" startIcon={<Logout />} onClick={handleSignOut}>
            Sign out
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};
