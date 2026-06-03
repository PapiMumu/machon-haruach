import React from "react";
import { BatchEdit, DonationEvents } from "./components";
import { DateHelper, UserHelper, ExportLink, Loading, CurrencyHelper, Locale, PageHeader } from "@machonharuach/apphelper";
import { Link } from "react-router-dom";
import { Permissions } from "@machonharuach/apphelper";
import { type DonationBatchInterface } from "@machonharuach/helpers";
import { useQuery } from "@tanstack/react-query";
import { Icon, Table, TableBody, TableCell, TableRow, TableHead, Box, Typography, Card, Stack, Button, IconButton, Menu, MenuItem } from "@mui/material";
import { VolunteerActivism as DonationIcon, Add as AddIcon } from "@mui/icons-material";
import { FilterList as FilterListIcon } from "@mui/icons-material";
import { formatBatchListName } from "./helpers/batchDisplayName";

/** API fields beyond @machonharuach/helpers `DonationBatchInterface`. */
type DonationBatchListRow = DonationBatchInterface & { branchName?: string | null; branchFromNotes?: string | null };

function getBatchBranchDisplayLabel(b: DonationBatchListRow): string {
  const fromColumn = String(b.branchName ?? "").trim();
  if (fromColumn) return fromColumn;
  return String(b.branchFromNotes ?? "").trim();
}

export const DonationBatchesPage = () => {
  const [editBatchId, setEditBatchId] = React.useState("notset");
  const [sortDirection, setSortDirection] = React.useState<boolean | null>(null);
  const [currentSortedCol, setCurrentSortedCol] = React.useState<string>("");
  const [currency, setCurrency] = React.useState<string>("usd");
  const [selectedBranch, setSelectedBranch] = React.useState<string>("all");
  const [branchAnchorEl, setBranchAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedName, setSelectedName] = React.useState<string>("all");
  const [nameAnchorEl, setNameAnchorEl] = React.useState<null | HTMLElement>(null);

  const batches = useQuery<DonationBatchListRow[]>({
    queryKey: ["/donationbatches", "GivingApi"],
    placeholderData: []
  });

  const batchUpdated = () => {
    setEditBatchId("notset");
    batches.refetch();
  };

  const branchOptions = React.useMemo(() => {
    const set = new Set<string>();
    (batches.data || []).forEach((b) => {
      const branch = getBatchBranchDisplayLabel(b).trim();
      if (branch) set.add(branch);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [batches.data]);

  const nameOptions = React.useMemo(() => {
    const set = new Set<string>();
    (batches.data || []).forEach((b) => {
      const name = formatBatchListName(b.name).trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [batches.data]);

  const filteredBatches = React.useMemo(() => {
    if (!batches.data) return [];
    return batches.data.filter((b) => {
      const branchMatch = selectedBranch === "all" || getBatchBranchDisplayLabel(b).trim() === selectedBranch;
      const nameMatch = selectedName === "all" || formatBatchListName(b.name).trim() === selectedName;
      return branchMatch && nameMatch;
    });
  }, [batches.data, selectedBranch, selectedName]);

  const [stats, setStats] = React.useState({
    totalBatches: 0,
    totalDonations: 0,
    totalAmount: 0
  });

  React.useEffect(() => {
    if (batches.data) {
      const totalBatches = batches.data.length;
      const totalDonations = batches.data.reduce((sum, batch) => sum + (batch.donationCount || 0), 0);
      const totalAmount = batches.data.reduce((sum, batch) => sum + (batch.totalAmount || 0), 0);

      setStats({
        totalBatches,
        totalDonations,
        totalAmount
      });
    }
  }, [batches.data]);

  const getSidebarModules = () => {
    const result = [];
    if (editBatchId !== "notset") result.push(<BatchEdit key={result.length - 1} batchId={editBatchId} updatedFunction={batchUpdated} />);
    return result;
  };

  const sortTable = (key: string, asc: boolean | null) => {
    if (asc === null) asc = false;
    setCurrentSortedCol(key);

    batches.data.sort(function (a: DonationBatchListRow, b: DonationBatchListRow) {
      if (key === "batchDate") {
        if (typeof new Date(a[key] as any).getMonth === "function") {
          return asc
            ? new Date(a[key] as any)?.getTime() - new Date(b[key] as any)?.getTime()
            : new Date(b[key] as any)?.getTime() - new Date(a[key] as any)?.getTime();
        }
      }

      if (key === "donationCount" || key === "totalAmount") {
        const na = Number(a[key as keyof DonationBatchListRow] ?? 0);
        const nb = Number(b[key as keyof DonationBatchListRow] ?? 0);
        return asc ? na - nb : nb - na;
      }

      if (key === "branchName") {
        const valA = getBatchBranchDisplayLabel(a).toUpperCase();
        const valB = getBatchBranchDisplayLabel(b).toUpperCase();
        if (valA < valB) return asc ? 1 : -1;
        if (valA > valB) return asc ? -1 : 1;
        return 0;
      }

      const valA = (a[key as keyof DonationBatchListRow] ?? "").toString().toUpperCase();
      const valB = (b[key as keyof DonationBatchListRow] ?? "").toString().toUpperCase();
      if (valA < valB) return asc ? 1 : -1;
      if (valA > valB) return asc ? -1 : 1;
      return 0;
    });
    batches.refetch();
    setSortDirection(!asc);
  };

  const getSortArrows = (key: string) => (
    <div style={{ display: "flex" }}>
      <div style={{ marginTop: "5px" }} className={`${sortDirection && currentSortedCol === key ? "sortAscActive" : "sortAsc"}`}></div>
      <div style={{ marginTop: "14px" }} className={`${!sortDirection && currentSortedCol === key ? "sortDescActive" : "sortDesc"}`}></div>
    </div>
  );

  const getRows = () => {
    const result: JSX.Element[] = [];

    if (filteredBatches.length === 0) {
      result.push(
        <TableRow key="0">
          <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {selectedBranch === "all" && selectedName === "all"
                ? Locale.label("donations.donationsPage.noBatch")
                : "No batches found for the selected filter."}
            </Typography>
          </TableCell>
        </TableRow>
      );
      return result;
    }

    const canViewBatch = UserHelper.checkAccess(Permissions.givingApi.donations.view);

    for (let i = 0; i < filteredBatches.length; i++) {
      const b = filteredBatches[i] as DonationBatchListRow;

      const batchDisplayName = formatBatchListName(b.name);
      const branchLabel = getBatchBranchDisplayLabel(b);
      const batchLink = canViewBatch ? (
        <Link
          to={"/donations/batches/" + b.id}
          style={{
            textDecoration: "none",
            color: "var(--c1l2)",
            fontWeight: 500
          }}>
          {batchDisplayName}
        </Link>
      ) : (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {batchDisplayName}
        </Typography>
      );

      const dateObj = b.batchDate ? new Date(b.batchDate.toString().split("T")[0] + "T00:00:00") : new Date();

      result.push(
        <TableRow
          key={b.id || i}
          sx={{
            "&:hover": { backgroundColor: "action.hover" },
            transition: "background-color 0.2s ease"
          }}>
          <TableCell>{batchLink}</TableCell>
          <TableCell>
            <Typography variant="body2" color={branchLabel ? "text.primary" : "text.secondary"}>
              {branchLabel || "—"}
            </Typography>
          </TableCell>
          <TableCell>
            <Typography variant="body2">{DateHelper.prettyDate(dateObj)}</Typography>
          </TableCell>
          <TableCell>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {b.donationCount}
            </Typography>
          </TableCell>
          <TableCell>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "success.main" }}>
              {CurrencyHelper.formatCurrencyWithLocale(b.totalAmount, currency)}
            </Typography>
          </TableCell>
        </TableRow>
      );
    }
    return result;
  };

  const getTableHeader = () => {
    const rows: JSX.Element[] = [];

    if (filteredBatches.length === 0) {
      return rows;
    }

    rows.push(
      <TableRow key="header">
        <TableCell
          sx={{
            fontWeight: 600,
            "&:hover": { backgroundColor: "action.hover" }
          }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {Locale.label("common.name")}
            </Typography>
            <IconButton
              size="small"
              aria-label="Filter batches by name"
              onClick={(e) => {
                e.stopPropagation();
                setNameAnchorEl(e.currentTarget);
              }}
              sx={{ color: selectedName === "all" ? "text.secondary" : "primary.main" }}
            >
              <FilterListIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={nameAnchorEl}
              open={Boolean(nameAnchorEl)}
              onClose={() => setNameAnchorEl(null)}
            >
              <MenuItem
                selected={selectedName === "all"}
                onClick={() => {
                  setSelectedName("all");
                  setNameAnchorEl(null);
                }}
              >
                All names
              </MenuItem>
              {nameOptions.map((name) => (
                <MenuItem
                  key={name}
                  selected={selectedName === name}
                  onClick={() => {
                    setSelectedName(name);
                    setNameAnchorEl(null);
                  }}
                >
                  {name}
                </MenuItem>
              ))}
            </Menu>
          </Stack>
        </TableCell>
        <TableCell
          sx={{
            fontWeight: 600,
            "&:hover": { backgroundColor: "action.hover" }
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Branch
            </Typography>
            <IconButton
              size="small"
              aria-label="Filter batches by branch"
              onClick={(e) => {
                e.stopPropagation();
                setBranchAnchorEl(e.currentTarget);
              }}
              sx={{ color: selectedBranch === "all" ? "text.secondary" : "primary.main" }}
            >
              <FilterListIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={branchAnchorEl}
              open={Boolean(branchAnchorEl)}
              onClose={() => setBranchAnchorEl(null)}
            >
              <MenuItem
                selected={selectedBranch === "all"}
                onClick={() => {
                  setSelectedBranch("all");
                  setBranchAnchorEl(null);
                }}
              >
                All branches
              </MenuItem>
              {branchOptions.map((branch) => (
                <MenuItem
                  key={branch}
                  selected={selectedBranch === branch}
                  onClick={() => {
                    setSelectedBranch(branch);
                    setBranchAnchorEl(null);
                  }}
                >
                  {branch}
                </MenuItem>
              ))}
            </Menu>
          </Stack>
        </TableCell>
        <TableCell
          sx={{
            fontWeight: 600,
            cursor: "pointer",
            "&:hover": { backgroundColor: "action.hover" }
          }}
          onClick={() => sortTable("batchDate", sortDirection)}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {Locale.label("donations.donationsPage.date")}
            </Typography>
            {getSortArrows("batchDate")}
          </Stack>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {Locale.label("donations.donationsPage.don")}
          </Typography>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {Locale.label("donations.donationsPage.total")}
          </Typography>
        </TableCell>
      </TableRow>
    );
    return rows;
  };

  const getTable = () => {
    if (batches.isLoading) return <Loading />;
    else {
      return (
        <Table sx={{ minWidth: 650 }}>
          <TableHead
            sx={{
              backgroundColor: "var(--bg-card)",
              "& .MuiTableCell-root": {
                borderBottom: "2px solid",
                borderBottomColor: "divider",
                color: "text.primary"
              }
            }}>
            {getTableHeader()}
          </TableHead>
          <TableBody>{getRows()}</TableBody>
        </Table>
      );
    }
  };

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      setCurrency(result);
    });
  }, []);

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) return <></>;

  return (
    <>
      <PageHeader
        title={Locale.label("donations.donations.batches")}
        subtitle={Locale.label("donations.donationBatchesPage.subtitle")}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          sx={{ width: "100%" }}
        >
          {stats.totalBatches > 0 && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 2, sm: 4, md: 5 }}
              sx={{
                position: { xs: "static", md: "absolute" },
                left: { md: "50%" },
                top: { md: "50%" },
                transform: { md: "translateY(-50%)" },
                flexWrap: "wrap"
              }}
            >
              <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <DonationIcon sx={{ color: "#FFF", fontSize: 24 }} />
                  <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.totalBatches}</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Batches</Typography>
              </Stack>
              <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Icon sx={{ color: "#FFF", fontSize: 24 }}>receipt</Icon>
                  <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.totalDonations}</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Donations</Typography>
              </Stack>
              <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 100 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  {/* <Icon sx={{ color: "#FFF", fontSize: 24 }}>attach_money</Icon> */}
                  <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{CurrencyHelper.formatCurrencyWithLocale(stats.totalAmount, currency, 0)}</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Total Amount</Typography>
              </Stack>
            </Stack>
          )}
          {UserHelper.checkAccess(Permissions.givingApi.donations.edit) && (
            <Button
              variant="outlined"
              sx={{
                color: "#FFF",
                borderColor: "rgba(255,255,255,0.5)",
                "&:hover": {
                  borderColor: "#FFF",
                  backgroundColor: "rgba(255,255,255,0.1)"
                },
                position: { md: "relative" },
                ml: { md: "auto" },
                zIndex: 1
              }}
              startIcon={<AddIcon />}
              onClick={() => {
                setEditBatchId("");
              }}
              data-testid="add-batch-button">
              Add Batch
            </Button>
          )}
        </Stack>
      </PageHeader>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        {/* Edit content appears above when editing */}
        {editBatchId !== "notset" && <Box sx={{ mb: 3 }}>{getSidebarModules()}</Box>}

        {/* Main table */}
        <Card>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">{Locale.label("donations.donationsPage.batch")}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {batches.data && (
                  <Button size="small" variant="outlined" component={ExportLink} data={batches.data} filename="donationbatches.csv" sx={{ mr: 1 }}>
                    Export
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>
          <Box>{getTable()}</Box>
        </Card>

        {/* Events section */}
        <Box sx={{ mt: 3 }}>
          <DonationEvents />
        </Box>

        {/* Donorbox reconciliation link */}
        {UserHelper.checkAccess(Permissions.givingApi.donations.edit) && (
          <Box sx={{ mt: 4, textAlign: "center" }}>
            <Link to="/donations/donorbox-reconciliation" style={{ color: "#999", fontSize: "0.85rem", textDecoration: "none" }}>
              Review Donorbox reconciliation status
            </Link>
          </Box>
        )}
      </Box>
    </>
  );
};
