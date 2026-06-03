import React from "react";
import { ApiHelper, DateHelper, UserHelper, ExportLink, Permissions, UniqueIdHelper, ArrayHelper, Loading, CurrencyHelper, Locale, PageHeader } from "@machonharuach/apphelper";
import { type DonationBatchInterface, type FundDonationInterface, type PersonInterface } from "@machonharuach/helpers";
import { useParams, Link } from "react-router-dom";
import { Table, TableBody, TableRow, TableCell, TableHead, TextField, Box, Typography, Card, Stack, Button, type Theme } from "@mui/material";
import {
  VolunteerActivism as FundIcon,
  FileDownload as ExportIcon,
  FilterAlt as FilterIcon,
  FilterList as FilterListIcon,
  CalendarMonth as DateIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon
} from "@mui/icons-material";
import { IconButton, Menu, MenuItem } from "@mui/material";
import { toPreferredGivingLabel } from "./helpers/fundLabel";
import { useQuery } from "@tanstack/react-query";

const tableChromeSx = (theme: Theme) => ({
  backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : theme.palette.grey[50],
  "& .MuiTableCell-root": {
    borderBottom: "2px solid",
    borderBottomColor: "divider",
    color: theme.palette.text.primary
  }
});

const GIVING_CAMPUS_NOTE_PREFIX = "givingCampus|";

function parseBranchFromNotes(notes?: string): string {
  const n = String(notes || "");
  const idx = n.indexOf(GIVING_CAMPUS_NOTE_PREFIX);
  if (idx === -1) return "";
  const tail = n.slice(idx + GIVING_CAMPUS_NOTE_PREFIX.length);
  const line = tail.split(/\r\n|\n|\r/)[0] ?? "";
  return line.trim();
}

type BatchBranchRow = DonationBatchInterface & { branchName?: string | null; branchFromNotes?: string | null };

export const FundPage = () => {
  const params = useParams();
  const initialDate = new Date();
  initialDate.setDate(initialDate.getDate() - 7);

  const [fund, setFund] = React.useState<DonationBatchInterface>({});
  const [fundDonations, setFundDonations] = React.useState<FundDonationInterface[]>(null);
  const [startDate, setStartDate] = React.useState<Date>(initialDate);
  const [endDate, setEndDate] = React.useState<Date>(new Date());
  const [people, setPeople] = React.useState<{ [key: string]: string }>({});
  const [stats, setStats] = React.useState({
    totalDonations: 0,
    totalAmount: 0,
    uniqueDonors: 0
  });
  const [currency, setCurrency] = React.useState<string>("usd");
  const batches = useQuery<BatchBranchRow[]>({ queryKey: ["/donationbatches", "GivingApi"], placeholderData: [] });
  const [selectedBranch, setSelectedBranch] = React.useState<string>("all");
  const [branchAnchorEl, setBranchAnchorEl] = React.useState<null | HTMLElement>(null);

  const loadData = () => {
    ApiHelper.get("/funds/" + params.id, "GivingApi").then((data: any) => {
      setFund(data);
    });
    loadDonations();
  };

  const loadDonations = () => {
    ApiHelper.get("/funddonations?fundId=" + params.id + "&startDate=" + DateHelper.formatHtml5Date(startDate) + "&endDate=" + DateHelper.formatHtml5Date(endDate), "GivingApi").then(
      (d: FundDonationInterface[]) => {
        // fetch people who have made donations if any
        const peopleIds = ArrayHelper.getUniqueValues(d, "donation.personId").filter((f) => f !== null);
        if (peopleIds.length > 0) {
          ApiHelper.get("/people/ids?ids=" + peopleIds.join(","), "MembershipApi").then((people: PersonInterface[]) => {
            const data: any = {};
            people.forEach((p) => {
              data[p.id] = p.name?.display;
            });

            setPeople(data);
          });
        }
        setFundDonations(d);

        // Calculate statistics
        const totalDonations = d.length;
        const totalAmount = d.reduce((sum, fd) => sum + (fd.amount || 0), 0);
        const uniqueDonors = new Set(d.map((fd) => fd.donation?.personId).filter((id) => id)).size;

        setStats({
          totalDonations,
          totalAmount,
          uniqueDonors
        });
      }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    switch (e.target.name) {
      case "startDate": setStartDate(new Date(e.target.value)); break;
      case "endDate": setEndDate(new Date(e.target.value)); break;
    }
  };

  const getDonationBranch = (fd: FundDonationInterface): string => {
    const branchFromNotes = parseBranchFromNotes((fd as any).donation?.notes);
    const batchRow = (batches.data || []).find((b) => b.id === fd.donation?.batchId);
    const batchBranch = batchRow?.branchName || batchRow?.branchFromNotes || "";
    return (branchFromNotes || String(batchBranch || "").trim()).trim();
  };

  const branchOptions = React.useMemo(() => {
    const set = new Set<string>();
    (fundDonations || []).forEach((fd) => {
      const b = getDonationBranch(fd);
      if (b) set.add(b);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [fundDonations, batches.data]);

  const filteredFundDonations = React.useMemo(() => {
    if (!fundDonations) return null;
    if (selectedBranch === "all") return fundDonations;
    return fundDonations.filter((fd) => getDonationBranch(fd) === selectedBranch);
  }, [fundDonations, selectedBranch, batches.data]);

  const getRows = () => {
    const result: JSX.Element[] = [];

    if (!filteredFundDonations || filteredFundDonations.length === 0) {
      result.push(
        <TableRow key="0">
          <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
            <Stack spacing={2} alignItems="center">
              <FundIcon sx={{ fontSize: 48, color: "text.secondary" }} />
              <Typography variant="body1" color="text.secondary">
                {selectedBranch === "all" ? Locale.label("donations.fundsPage.noDon") : "No donations found for the selected branch."}
              </Typography>
            </Stack>
          </TableCell>
        </TableRow>
      );
      return result;
    }

    for (let i = 0; i < filteredFundDonations.length; i++) {
      const fd = filteredFundDonations[i];
      const isAnonymous = UniqueIdHelper.isMissing(fd.donation?.personId);
      const branch = getDonationBranch(fd);
      const rowFundName = toPreferredGivingLabel(((fd as any).fundName || fund.name || fd.fundId || params.id || "").toString());

      const personCol = isAnonymous ? (
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonIcon sx={{ color: "text.secondary", fontSize: 18 }} />
            <Typography variant="body2" color="text.secondary">
              {Locale.label("donations.fundsPage.anon")}
            </Typography>
          </Stack>
        </TableCell>
      ) : (
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonIcon sx={{ color: "var(--c1l2)", fontSize: 18 }} />
            <Link
              to={"/people/" + fd.donation?.personId}
              style={{
                textDecoration: "none",
                color: "var(--c1l2)",
                fontWeight: 500
              }}>
              {people[fd.donation.personId] || Locale.label("donations.fundsPage.anon")}
            </Link>
          </Stack>
        </TableCell>
      );

      result.push(
        <TableRow
          key={i}
          sx={{
            "&:hover": { backgroundColor: "action.hover" },
            transition: "background-color 0.2s ease"
          }}>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <DateIcon sx={{ color: "text.secondary", fontSize: 18 }} />
              <Typography variant="body2">{DateHelper.formatHtml5Date(fd.donation.donationDate)}</Typography>
            </Stack>
          </TableCell>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <ReceiptIcon sx={{ color: "var(--c1l2)", fontSize: 18 }} />
              <Link
                data-cy={`batchId-${fd.donation.batchId}-${i}`}
                to={"/donations/" + fd.donation.batchId}
                style={{
                  textDecoration: "none",
                  color: "var(--c1l2)",
                  fontWeight: 500
                }}>
                {fd.donation.batchId}
              </Link>
            </Stack>
          </TableCell>
          {personCol}
          <TableCell>
            <Typography variant="body2">{rowFundName}</Typography>
          </TableCell>
          <TableCell>
            <Typography variant="body2" color={branch ? "text.primary" : "text.secondary"}>
              {branch || "—"}
            </Typography>
          </TableCell>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              {/* <MoneyIcon sx={{ color: "success.main", fontSize: 18 }} /> */}
              <Typography variant="body2" sx={{ fontWeight: 600, color: "success.main" }}>
                {CurrencyHelper.formatCurrencyWithLocale(fd.amount, currency)}
              </Typography>
            </Stack>
          </TableCell>
        </TableRow>
      );
    }

    const tableTotal = filteredFundDonations.reduce((sum, fd) => sum + Number(fd.amount || 0), 0);
    result.push(
      <TableRow
        key="fund-total-row"
        sx={{
          borderTop: 2,
          borderColor: "divider",
          backgroundColor: "action.hover"
        }}
      >
        <TableCell colSpan={5}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Total
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "success.main" }}>
            {CurrencyHelper.formatCurrencyWithLocale(tableTotal, currency)}
          </Typography>
        </TableCell>
      </TableRow>
    );
    return result;
  };

  const getTableHeader = () => {
    const rows: JSX.Element[] = [];

    if (!filteredFundDonations || filteredFundDonations.length === 0) {
      return rows;
    }

    rows.push(
      <TableRow key="header">
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
            {Locale.label("donations.fundsPage.date")}
          </Typography>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
            {Locale.label("donations.fundsPage.batch")}
          </Typography>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
            {Locale.label("donations.fundsPage.donor")}
          </Typography>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
            Fund Name
          </Typography>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
              Branch
            </Typography>
            <IconButton
              size="small"
              aria-label="Filter by branch"
              onClick={(e) => setBranchAnchorEl(e.currentTarget)}
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
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
            {Locale.label("donations.fundsPage.amt")}
          </Typography>
        </TableCell>
      </TableRow>
    );
    return rows;
  };

  React.useEffect(loadData, [params.id]);
  React.useEffect(() => {
    loadDonations();
  }, [startDate, endDate]);

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      setCurrency(result);
    });
  }, []);

  const getTable = () => {
    if (!fundDonations) return <Loading />;
    return (
      <Table sx={{ minWidth: 650 }}>
        <TableHead sx={tableChromeSx}>{getTableHeader()}</TableHead>
        <TableBody>{getRows()}</TableBody>
      </Table>
    );
  };

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.view)) return <></>;

  return (
    <>
      <PageHeader
        title={`${toPreferredGivingLabel(fund.name)} ${Locale.label("donations.fundsPage.don")}`}
        subtitle={Locale.label("donations.fundPage.subtitle")}
      >
        {stats.totalDonations > 0 && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 2, sm: 4, md: 5 }}
            sx={{
              position: { xs: "static", md: "absolute" },
              left: { md: "50%" },
              top: { md: "50%" },
              transform: { md: "translateY(-50%)" },
              right: { md: "24px" },
              justifyContent: { md: "space-between" },
              flexWrap: "wrap"
            }}
          >
            <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ReceiptIcon sx={{ color: "#FFF", fontSize: 24 }} />
                <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.totalDonations}</Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Donations</Typography>
            </Stack>
            <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonIcon sx={{ color: "#FFF", fontSize: 24 }} />
                <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.uniqueDonors}</Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Donors</Typography>
            </Stack>
            <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 100 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                {/* <MoneyIcon sx={{ color: "#FFF", fontSize: 24 }} /> */}
                <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{CurrencyHelper.formatCurrencyWithLocale(stats.totalAmount, currency, 0)}</Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Total Amount</Typography>
            </Stack>
          </Stack>
        )}
      </PageHeader>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        {/* Date Filter Card */}
        <Card sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="h6">{Locale.label("donations.fundsPage.donFilt")}</Typography>
          </Box>
          <Box sx={{ p: 3 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
              <TextField
                label={Locale.label("donations.fundsPage.dateStart")}
                name="startDate"
                type="date"
                data-cy="start-date"
                value={DateHelper.formatHtml5Date(startDate)}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={(theme) => {
                  const icon =
                    theme.palette.mode === "dark"
                      ? { filter: "invert(1) brightness(1.05)", opacity: 0.87 as const }
                      : { opacity: 0.87 as const };
                  return {
                    minWidth: 200,
                    "& .MuiOutlinedInput-input[type='date']::-webkit-calendar-picker-indicator": {
                      cursor: "pointer",
                      ...icon
                    },
                    "& .MuiOutlinedInput-input[type='date']::-moz-calendar-picker-indicator": {
                      cursor: "pointer",
                      ...icon
                    }
                  };
                }}
              />
              <TextField
                label={Locale.label("donations.fundsPage.dateEnd")}
                name="endDate"
                type="date"
                data-cy="end-date"
                value={DateHelper.formatHtml5Date(endDate)}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={(theme) => {
                  const icon =
                    theme.palette.mode === "dark"
                      ? { filter: "invert(1) brightness(1.05)", opacity: 0.87 as const }
                      : { opacity: 0.87 as const };
                  return {
                    minWidth: 200,
                    "& .MuiOutlinedInput-input[type='date']::-webkit-calendar-picker-indicator": {
                      cursor: "pointer",
                      ...icon
                    },
                    "& .MuiOutlinedInput-input[type='date']::-moz-calendar-picker-indicator": {
                      cursor: "pointer",
                      ...icon
                    }
                  };
                }}
              />
            </Stack>
          </Box>
        </Card>

        {/* Main donations table */}
        <Card>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">{Locale.label("donations.fundsPage.don")}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {fundDonations && (
                  <Button size="small" variant="outlined" startIcon={<ExportIcon />} component={ExportLink} data={fundDonations} filename="funddonations.csv" sx={{ mr: 1 }}>
                    Export
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>
          <Box>{getTable()}</Box>
        </Card>
      </Box>
    </>
  );
};
