import React from "react";
import { UserHelper, PageHeader } from "@machonharuach/apphelper";
import { Permissions } from "@machonharuach/apphelper";
import { Box, Typography, Card, Stack, Alert, List, ListItem, ListItemText } from "@mui/material";

export const DonorboxReconciliationPage = () => {
  if (!UserHelper.checkAccess(Permissions.givingApi.donations.edit)) return <></>;

  return (
    <>
      <PageHeader
        title="Donorbox Reconciliation"
        subtitle="Donorbox donations are synchronized from webhook events."
      />

      <Box sx={{ p: 3 }}>
        <Card sx={{ mb: 2 }}>
          <Box sx={{ p: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Stripe replay/import has been retired. Donorbox sync now happens through verified webhook delivery.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Use the checklist below when troubleshooting donation sync:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="1. Confirm Donorbox provider is selected in Giving Settings." />
              </ListItem>
              <ListItem>
                <ListItemText primary="2. Ensure campaign ID/slug and webhook signature secret are saved." />
              </ListItem>
              <ListItem>
                <ListItemText primary="3. Verify webhook endpoint in Donorbox points to this environment's /giving/donate/webhook/donorbox URL." />
              </ListItem>
              <ListItem>
                <ListItemText primary="4. Review Donation Events for recent webhook failures or signature issues." />
              </ListItem>
            </List>
            <Stack direction="row" spacing={2}>
              <Typography variant="body2">
                Open Donation Batches and Donation Events to verify that recent donations are arriving.
              </Typography>
            </Stack>
          </Box>
        </Card>
      </Box>
    </>
  );
};
