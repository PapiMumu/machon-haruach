import React from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Grid, Stack, Typography } from "@mui/material";
import { ExpandMore as ExpandMoreIcon, Build as ToolsIcon } from "@mui/icons-material";
import { Locale, UserHelper } from "@machonharuach/apphelper";
import { TaskList } from "../../serving/tasks/components/TaskList";
import { PeopleSearch } from "./PeopleSearch";
import { Groups } from "../../people/components";

export function DashboardQuickTools() {
  return (
    <Accordion
      defaultExpanded={false}
      sx={{
        borderRadius: "8px !important",
        border: "1px solid",
        borderColor: "var(--border-light)",
        "&:before": { display: "none" }
      }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ToolsIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {Locale.label("dashboard.quickTools.title", "Quick tools")}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ pt: 1 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={3}>
                <PeopleSearch />
                <Groups personId={UserHelper.person?.id} title={Locale.label("dashboard.myGroups")} />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TaskList compact status={Locale.label("tasks.taskPage.open")} />
            </Grid>
          </Grid>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
