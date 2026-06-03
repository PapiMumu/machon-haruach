import React, { memo, useCallback, useMemo } from "react";
import { CampusEdit } from "./";
import { Link } from "react-router-dom";
import { Icon, IconButton, Paper, Box, Typography, Button, Stack, Grid, TextField } from "@mui/material";
import {
  type CampusInterface,
  type ServiceInterface,
  type ServiceTimeInterface
} from "@machonharuach/helpers";
import { ApiHelper, Loading, Locale } from "@machonharuach/apphelper";
import { useQuery } from "@tanstack/react-query";

export const AttendanceSetup = memo(() => {
  const [selectedCampus, setSelectedCampus] = React.useState<CampusInterface>(null);
  const [searchTerm, setSearchTerm] = React.useState("");

  const campuses = useQuery<CampusInterface[]>({
    queryKey: ["/campuses", "AttendanceApi"],
    placeholderData: []
  });

  const services = useQuery<ServiceInterface[]>({
    queryKey: ["/services", "AttendanceApi"],
    placeholderData: []
  });

  const serviceTimes = useQuery<ServiceTimeInterface[]>({
    queryKey: ["/servicetimes", "AttendanceApi"],
    placeholderData: []
  });

  const removeEditors = useCallback(() => {
    setSelectedCampus(null);
  }, []);

  const refetch = useCallback(() => {
    campuses.refetch();
    services.refetch();
    serviceTimes.refetch();
  }, [campuses, services, serviceTimes]);

  const handleUpdated = useCallback(() => {
    removeEditors();
    refetch();
  }, [removeEditors, refetch]);

  const selectCampus = useCallback(
    (campus: CampusInterface) => {
      removeEditors();
      if (campus?.name === "Undefined") return;

      // The attendance "tree" endpoint may not include all campus fields (address/phone/etc).
      // Load the full campus record so the editor repopulates after navigation/reload.
      if (campus?.id) {
        ApiHelper.get(`/campuses/${campus.id}`, "AttendanceApi")
          .then((full: any) => {
            // `{}` from API (e.g. no access / not found) is truthy — do not replace a good tree campus with it.
            if (full && typeof full === "object" && full.id) {
              setSelectedCampus({ ...campus, ...full });
            } else {
              setSelectedCampus(campus);
            }
          })
          .catch(() => setSelectedCampus(campus));
      } else {
        setSelectedCampus(campus);
      }
    },
    [removeEditors]
  );

  const handleAddCampus = useCallback(() => {
    selectCampus({ id: "", name: Locale.label("attendance.attendanceSetup.newCampus") });
  }, [selectCampus]);

  const servicesByCampus = useMemo(() => {
    const map = new Map<string, ServiceInterface[]>();
    services.data.forEach((s) => {
      const list = map.get(s.campusId || "") || [];
      list.push(s);
      map.set(s.campusId || "", list);
    });
    map.forEach((list, key) => {
      map.set(key, [...list].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    });
    return map;
  }, [services.data]);

  const serviceTimesByService = useMemo(() => {
    const map = new Map<string, ServiceTimeInterface[]>();
    serviceTimes.data.forEach((st) => {
      const list = map.get(st.serviceId || "") || [];
      list.push(st);
      map.set(st.serviceId || "", list);
    });
    map.forEach((list, key) => {
      map.set(key, [...list].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    });
    return map;
  }, [serviceTimes.data]);

  const campusesSorted = useMemo(
    () => [...campuses.data].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [campuses.data]
  );

  const getAddress = useCallback((campus: CampusInterface) => {
    const c = campus as any;
    const line1 = [c.address1, c.address2].filter(Boolean).join(", ");
    const line2 = [c.city, c.state, c.zip, c.country].filter(Boolean).join(", ");
    if (line1 && line2) return `${line1} • ${line2}`;
    return line1 || line2 || "Address not set";
  }, []);

  const filteredCampuses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return campusesSorted;
    return campusesSorted.filter((campus) => {
      const name = (campus.name || "").toLowerCase();
      const address = getAddress(campus).toLowerCase();
      return name.includes(term) || address.includes(term);
    });
  }, [campusesSorted, searchTerm, getAddress]);

  const timesByService = useMemo(() => {
    const map = new Map<string, ServiceTimeInterface[]>();
    serviceTimes.data.forEach((st) => {
      const list = map.get(st.serviceId || "") || [];
      list.push(st);
      map.set(st.serviceId || "", list);
    });
    return map;
  }, [serviceTimes.data]);

  const structureView = useMemo(() => {
    const cardSx = { border: "1px solid var(--border-main)", borderRadius: 2, backgroundColor: "var(--bg-main)" };

    if (!campusesSorted.length) {
      return (
        <Paper sx={{ p: 4, textAlign: "center", border: "1px solid var(--border-main)", borderRadius: 2 }}>
          <Stack spacing={2} alignItems="center">
            <Icon sx={{ fontSize: 48, color: "#ccc" }}>church</Icon>
            <Typography variant="h6" color="text.secondary">
              No branches found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add your first branch to start building your attendance structure.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Icon>add</Icon>}
              onClick={handleAddCampus}
            >
              Add Branch
            </Button>
          </Stack>
        </Paper>
      );
    }

    return (
      <Stack spacing={2}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search branches by name or address"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ maxWidth: 420 }}
        />

        {!filteredCampuses.length && (
          <Paper sx={{ p: 3, border: "1px solid var(--border-main)", borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No branches found for "{searchTerm}".
            </Typography>
          </Paper>
        )}

        <Grid container spacing={2}>
          {filteredCampuses.map((campus) => {
            const campusServices = servicesByCampus.get(campus.id || "") || [];
            const serviceCount = campusServices.length;
            const eventCount = campusServices.reduce((acc, s) => acc + (timesByService.get(s.id || "") || []).length, 0);

            return (
              <Grid key={campus.id || campus.name} size={{ xs: 12, md: 6, lg: 4 }}>
                <Paper sx={{ p: 2, ...cardSx }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Stack spacing={0.5}>
                        <Link to={`/attendance/branch/${campus.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                            {campus.name}
                          </Typography>
                        </Link>
                        <Typography variant="body2" color="text.secondary">
                          {getAddress(campus)}
                        </Typography>
                      </Stack>
                      <IconButton size="small" onClick={() => selectCampus(campus)}>
                        <Icon>edit</Icon>
                      </IconButton>
                    </Stack>

                    <Stack direction="row" spacing={2}>
                      <Typography variant="caption" color="text.secondary">
                        {serviceCount} service{serviceCount === 1 ? "" : "s"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {eventCount} event{eventCount === 1 ? "" : "s"}
                      </Typography>
                    </Stack>

                    <Link to={`/attendance/branch/${campus.id}`} style={{ textDecoration: "none" }}>
                      <Button variant="outlined" fullWidth>
                        Open Branch
                      </Button>
                    </Link>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Stack>
    );
  }, [
    campusesSorted,
    filteredCampuses,
    servicesByCampus,
    timesByService,
    selectCampus,
    handleAddCampus,
    getAddress,
    searchTerm
  ]);

  return (
    <>
      <CampusEdit campus={selectedCampus} updatedFunction={handleUpdated} />

      {/* Modern Header Section */}
      <Box sx={{ p: 3, borderBottom: "1px solid var(--border-main)" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Icon sx={{ color: "text.primary", fontSize: 28 }}>group</Icon>
            <Typography variant="h5" sx={{ fontWeight: 600, color: "text.primary" }}>
              Attendance Structure
            </Typography>
          </Stack>
          <Button
            variant="text"
            aria-label="Add Branch"
            data-cy="add-campus-button"
            onClick={handleAddCampus}
            data-testid="add-campus-button"
            startIcon={<Icon sx={{ color: "text.primary" }}>add</Icon>}
            sx={{ color: "text.primary", textTransform: "none" }}
          >
            Add Branch
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Manage branches, services, and events in one place.
        </Typography>
      </Box>

      {/* Structure Section */}
      <Box sx={{ p: 2 }}>
        {(campuses.isLoading || services.isLoading || serviceTimes.isLoading) ? <Loading /> : structureView}
      </Box>
    </>
  );
});
