import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box, Container, Card, CardContent, Typography, Button, FormControl,
  InputLabel, Select, MenuItem, Alert, CircularProgress, Stack, Divider, TextField
} from "@mui/material";
import {
  DownloadOutlined as DownloadIcon,
  PrintOutlined as PrintIcon
} from "@mui/icons-material";
import { PageHeader, Locale, UserHelper, Permissions, ArrayHelper, ApiHelper } from "@machonharuach/apphelper";
import { type DonationInterface, type FundDonationInterface, type FundInterface } from "@machonharuach/helpers";
import JSZip from "jszip";
import { toPreferredGivingLabel } from "./helpers/fundLabel";
import { loadGivingFundsCatalog } from "./helpers/loadGivingFunds";

const GIVING_CAMPUS_NOTE_PREFIX = "givingCampus|";
const GNW_LOGO_FILE_URI = "file:///C:/Users/Red/Pictures/The%20Goodnews%20World/gnw_logo-gold_512.png";
type CampusInfo = {
  id?: string;
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
};

function parseBranchFromNotes(notes?: string): string {
  const n = String(notes || "");
  const idx = n.indexOf(GIVING_CAMPUS_NOTE_PREFIX);
  if (idx === -1) return "";
  const tail = n.slice(idx + GIVING_CAMPUS_NOTE_PREFIX.length);
  const line = tail.split(/\r\n|\n|\r/)[0] ?? "";
  return line.trim();
}

function normalizeLogoUrl(raw: string): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || /^data:/i.test(value) || /^file:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${window.location.origin}${value}`;
  // Convert Windows absolute path (e.g. C:\path\to\logo.png) to browser-friendly file URI.
  if (/^[a-zA-Z]:[\\/]/.test(value)) {
    return `file:///${value.replace(/\\/g, "/").split("/").map(encodeURIComponent).join("/")}`;
  }
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)) {
    return `${window.location.origin}/${value.replace(/^\/+/, "")}`;
  }
  return value;
}

export const BatchGivingStatementsPage = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [startDate, setStartDate] = useState<string>(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState<string>(`${currentYear}-12-31`);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedFundId, setSelectedFundId] = useState<string>("all");

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) return <></>;

  // Fetch all donations
  const allDonations = useQuery<DonationInterface[]>({
    queryKey: ["/donations", "GivingApi"],
    placeholderData: []
  });

  // Fetch all fund donations
  const allFundDonations = useQuery<FundDonationInterface[]>({
    queryKey: ["/fundDonations", "GivingApi"],
    placeholderData: []
  });

  // Fetch all funds
  const funds = useQuery<FundInterface[]>({
    queryKey: ["/funds", "GivingApi"],
    queryFn: loadGivingFundsCatalog,
    placeholderData: []
  });
  const campuses = useQuery<CampusInfo[]>({
    queryKey: ["/campuses", "AttendanceApi", "batch-giving-statements"],
    queryFn: async () => (await ApiHelper.get("/campuses", "AttendanceApi")) as CampusInfo[],
    placeholderData: []
  });

  // Filter donations by selected year first
  const yearDonations = useMemo(() => {
    return (
      allDonations.data?.filter((don) => {
        if (!don.donationDate) return false;
        const donationDate = new Date(don.donationDate.toString().split("T")[0] + "T00:00:00");
        return donationDate.getFullYear() === selectedYear;
      }) || []
    );
  }, [allDonations.data, selectedYear]);

  const filteredDonations = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;
    return yearDonations.filter((don) => {
      if (!don.donationDate) return false;
      const donationDate = new Date(don.donationDate.toString().split("T")[0] + "T12:00:00");
      if (start && donationDate < start) return false;
      if (end && donationDate > end) return false;
      if (selectedBranch !== "all" && parseBranchFromNotes((don as any)?.notes) !== selectedBranch) return false;
      return true;
    });
  }, [yearDonations, startDate, endDate, selectedBranch]);

  // Filter fund donations for selected year/date/branch
  const yearFundDonations = useMemo(() => {
    return allFundDonations.data?.filter((fundDonation) =>
      filteredDonations.some((donation) => donation.id === fundDonation.donationId)) || [];
  }, [allFundDonations.data, filteredDonations]);

  const filteredFundDonations = useMemo(() => {
    if (selectedFundId === "all") return yearFundDonations;
    return yearFundDonations.filter((fd) => String(fd.fundId || "") === selectedFundId);
  }, [yearFundDonations, selectedFundId]);

  const finalDonations = useMemo(() => {
    if (selectedFundId === "all") return filteredDonations;
    const ids = new Set(filteredFundDonations.map((fd) => fd.donationId));
    return filteredDonations.filter((d) => ids.has(d.id));
  }, [filteredDonations, filteredFundDonations, selectedFundId]);

  // Get unique person IDs from the final filtered donation set
  const personIds = useMemo(() => {
    const ids = new Set<string>();
    finalDonations.forEach((donation) => {
      if (donation.personId) {
        ids.add(donation.personId);
      }
    });
    return Array.from(ids);
  }, [finalDonations]);

  const branchOptions = useMemo(() => {
    const branches = new Set<string>();
    yearDonations.forEach((d) => {
      const b = parseBranchFromNotes((d as any)?.notes);
      if (b) branches.add(b);
    });
    return Array.from(branches).sort((a, b) => a.localeCompare(b));
  }, [yearDonations]);

  const fundOptions = useMemo(() => {
    return (funds.data || [])
      .map((f) => ({ id: String(f.id || ""), name: toPreferredGivingLabel(String(f.name || f.id || "")) }))
      .filter((f) => f.id.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [funds.data]);

  const branchGroups = useMemo(() => {
    const map = new Map<string, { donations: DonationInterface[]; fundDonations: FundDonationInterface[] }>();
    finalDonations.forEach((donation) => {
      const branch = parseBranchFromNotes((donation as any)?.notes) || "Unassigned";
      const group = map.get(branch) || { donations: [], fundDonations: [] };
      group.donations.push(donation);
      map.set(branch, group);
    });
    filteredFundDonations.forEach((fd) => {
      const donation = finalDonations.find((d) => d.id === fd.donationId);
      if (!donation) return;
      const branch = parseBranchFromNotes((donation as any)?.notes) || "Unassigned";
      const group = map.get(branch) || { donations: [], fundDonations: [] };
      group.fundDonations.push(fd);
      map.set(branch, group);
    });
    return Array.from(map.entries())
      .map(([branch, group]) => ({ branch, ...group }))
      .sort((a, b) => a.branch.localeCompare(b.branch));
  }, [finalDonations, filteredFundDonations]);
  const campusByBranchName = useMemo(() => {
    const map = new Map<string, CampusInfo>();
    (campuses.data || []).forEach((campus) => {
      const key = String(campus?.name || "").trim().toLowerCase();
      if (key) map.set(key, campus);
    });
    return map;
  }, [campuses.data]);

  const handleDownloadPdf = async () => {
    const church: any = UserHelper.currentUserChurch?.church || {};
    const churchName = String(church?.name || "Church");
    const churchAddress = [church?.address1, church?.address2].filter(Boolean).join(", ");
    const churchLocation = [church?.city, church?.country, church?.zip].filter(Boolean).join(", ");
    const appbarLogoSrc = (document.getElementById("appbar-logo") as HTMLImageElement | null)?.src || "";
    const logoCandidate = String(appbarLogoSrc || church?.logo || church?.logoUrl || church?.photo || GNW_LOGO_FILE_URI).trim();
    const logoUrl = normalizeLogoUrl(logoCandidate);
    const issuedDate = new Date().toLocaleString();
    const formatAmount = (amount: number) => Number(amount || 0).toFixed(2);

    const branchSections = branchGroups.map((group) => {
      const campus = campusByBranchName.get(String(group.branch || "").trim().toLowerCase());
      const branchDisplayName = String(campus?.name || group.branch || "Unassigned");
      const branchAddress = [campus?.address1, campus?.address2].filter(Boolean).join(", ");
      const branchLocation = [campus?.city, campus?.state, campus?.country, campus?.zip].filter(Boolean).join(", ");
      const branchPhone = String(campus?.phone || "").trim();
      const fundTotals = new Map<string, number>();
      const rows = group.fundDonations
        .slice()
        .sort((a, b) => {
          const da = group.donations.find((d) => d.id === a.donationId)?.donationDate || "";
          const db = group.donations.find((d) => d.id === b.donationId)?.donationDate || "";
          return String(da).localeCompare(String(db));
        })
        .map((fd) => {
        const donation = group.donations.find((d) => d.id === fd.donationId);
        const fund = ArrayHelper.getOne(funds.data || [], "id", fd.fundId);
        const fundName = toPreferredGivingLabel(fund?.name || fd.fundId || "");
        const amount = Number(fd.amount || 0);
        const date = donation?.donationDate ? String(donation.donationDate).slice(0, 10) : "";
        fundTotals.set(fundName, Number(fundTotals.get(fundName) || 0) + amount);
        return `<tr><td>${date}</td><td>${fundName}</td><td class="align-right">${formatAmount(amount)}</td></tr>`;
      }).join("");
      const total = group.fundDonations.reduce((sum, fd) => sum + Number(fd.amount || 0), 0);
      const fundTotalRows = Array.from(fundTotals.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([fundName, amount]) => `<tr><td>${fundName}</td><td class="align-right">${formatAmount(amount)}</td></tr>`)
        .join("");
      return `
        <section class="statement-page">
          <div class="header-bar"></div>
          <div class="title-section">
            ${logoUrl ? `<img src="${logoUrl}" alt="${churchName}" class="church-logo" />` : ""}
            <h1 class="page-title">${selectedYear} Giving Statement</h1>
            <p class="subtitle">Branch: ${branchDisplayName}</p>
            <p class="meta">Period: ${startDate} to ${endDate}</p>
            <p class="meta">Issued: ${issuedDate}</p>
          </div>

          <div class="profile-row single">
            <div class="org-card">
              <h3>${branchDisplayName}</h3>
              ${branchAddress ? `<p>${branchAddress}</p>` : ""}
              ${branchLocation ? `<p>${branchLocation}</p>` : ""}
              ${!branchAddress && !branchLocation ? `<p>${churchAddress || churchLocation || "Address not set"}</p>` : ""}
            </div>
          </div>

          <div class="summary-row">
            <div class="total-box">
              <h3>Total Contributions</h3>
              <div class="total-value">${formatAmount(total)}</div>
            </div>
            <div class="fund-summary">
              <h3>Fund Totals</h3>
              <table class="data-table compact">
                <thead><tr><th>Fund</th><th class="align-right">Amount</th></tr></thead>
                <tbody>${fundTotalRows || "<tr><td colspan='2' class='empty'>No fund totals</td></tr>"}</tbody>
              </table>
            </div>
          </div>

          <h3 class="section-title">Contribution Details</h3>
          <table class="data-table">
            <thead><tr><th>Date</th><th>Fund</th><th class="align-right">Amount</th></tr></thead>
            <tbody>${rows || "<tr><td colspan='3' class='empty'>No donations</td></tr>"}</tbody>
            <tfoot><tr><th colspan="2" class="align-right">Total Contributions</th><th class="align-right">${formatAmount(total)}</th></tr></tfoot>
          </table>

          <div class="footer-note">
            <p><strong>Note:</strong> This statement summarizes branch contributions made to ${churchName} during the selected date range.</p>
          </div>
        </section>
      `;
    }).join("");

    const html2pdf = (await import("html2pdf.js")).default as any;
    const host = document.createElement("div");
    host.innerHTML = `
      <style>
        body { margin: 0; padding: 20px; background: #f6f7fb; font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #1f2937; }
        .statement-page { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; margin-bottom: 28px; page-break-after: always; }
        .statement-page:last-child { page-break-after: auto; }
        .header-bar { height: 16px; background: #1976D2; border-radius: 6px; margin-bottom: 14px; }
        .title-section { text-align: center; margin-bottom: 14px; }
        .church-logo { width: 86px; height: 86px; object-fit: contain; margin-bottom: 8px; }
        .page-title { margin: 0; font-size: 24px; color: #111827; letter-spacing: .2px; }
        .subtitle { margin: 6px 0 0; font-size: 16px; color: #374151; font-weight: 600; }
        .meta { margin: 4px 0 0; color: #6b7280; font-size: 13px; }
        .profile-row, .summary-row { display: table; width: 100%; table-layout: fixed; border-spacing: 12px 0; margin: 12px -12px 0; }
        .profile-row.single { border-spacing: 0; margin-left: 0; margin-right: 0; }
        .profile-row > div, .summary-row > div { display: table-cell; vertical-align: top; }
        .org-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #ffffff; }
        .org-card h3 { margin: 0 0 6px; font-size: 16px; color: #111827; }
        .org-card p { margin: 2px 0; font-size: 13px; color: #374151; }
        .total-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fff; }
        .total-box h3 { margin: 0 0 8px; font-size: 16px; color: #111827; }
        .total-value { border: 3px solid #1976D2; border-radius: 8px; padding: 10px 12px; text-align: center; font-size: 28px; font-weight: 800; color: #111827; }
        .fund-summary { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fff; }
        .fund-summary h3 { margin: 0 0 8px; font-size: 16px; color: #111827; }
        .section-title { margin: 18px 0 8px; font-size: 20px; color: #111827; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .data-table th { border-bottom: 2px solid #1976D2; color: #111827; font-size: 13px; text-align: left; padding: 8px; }
        .data-table td { font-size: 13px; padding: 8px; border-bottom: 1px solid #eef2f7; }
        .data-table.compact { margin-top: 0; }
        .data-table.compact th, .data-table.compact td { padding: 6px; }
        .data-table tfoot th { border-top: 2px solid #1976D2; color: #111827; background: #fff; }
        .align-right { text-align: right !important; }
        .empty { text-align: center; color: #6b7280; }
        .footer-note { margin-top: 16px; font-size: 12px; color: #6b7280; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }
      </style>
      ${branchSections || "<p>No branch statements found for the selected filters.</p>"}
    `;
    document.body.appendChild(host);
    try {
      await html2pdf()
        .set({
          margin: 8,
          filename: `branch_statements_${selectedYear}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] }
        })
        .from(host)
        .save();
    } finally {
      host.remove();
    }
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();

    // Generate one CSV per branch
    branchGroups.forEach((group) => {
      const csvRows: string[] = [];
      csvRows.push("branch,amount,donationDate,fundName,method,methodDetails");

      group.fundDonations.forEach((fd) => {
        const donation = group.donations.find((d) => d.id === fd.donationId);
        const fund = ArrayHelper.getOne(funds.data || [], "id", fd.fundId);
        const amount = fd.amount || 0;
        const donationDate = donation?.donationDate || "";
        const fundName = toPreferredGivingLabel(fund?.name || fd.fundId || "");
        const method = donation?.method || "";
        const methodDetails = donation?.methodDetails || "";

        const escapeCsv = (value: any) => {
          const str = String(value);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        csvRows.push(
          `${escapeCsv(group.branch)},${escapeCsv(amount)},${escapeCsv(donationDate)},${escapeCsv(fundName)},${escapeCsv(method)},${escapeCsv(methodDetails)}`
        );
      });

      const csvContent = csvRows.join("\n");
      const filename = `${group.branch}_${selectedYear}_donations.csv`.replace(/[^a-zA-Z0-9_.-]/g, "_");

      zip.file(filename, csvContent);
    });

    // Generate and download the zip file
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `giving_statements_${selectedYear}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalDonors = personIds.length;
  const totalBranches = useMemo(() => {
    const branches = new Set<string>();
    finalDonations.forEach((d) => {
      const b = parseBranchFromNotes((d as any)?.notes);
      if (b) branches.add(b);
    });
    return branches.size;
  }, [finalDonations]);

  const totalDonations = finalDonations.length;

  const isLoading = allDonations.isLoading || allFundDonations.isLoading;

  // Generate year options (current year and previous 5 years)
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  React.useEffect(() => {
    setStartDate(`${selectedYear}-01-01`);
    setEndDate(`${selectedYear}-12-31`);
  }, [selectedYear]);

  return (
    <>
      <PageHeader
        title={Locale.label("donations.batchStatements.title") || "Batch Giving Statements"}
        subtitle={Locale.label("donations.batchStatements.subtitle") || "Download giving statements for all donors"}
      />

      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          {/* Year Selection */}
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {Locale.label("donations.batchStatements.selectYear") || "Select Year"}
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>{Locale.label("donations.batchStatements.year") || "Year"}</InputLabel>
                  <Select
                    value={selectedYear}
                    label={Locale.label("donations.batchStatements.year") || "Year"}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {yearOptions.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Start Date"
                    InputLabelProps={{ shrink: true }}
                    value={startDate}
                    onChange={(e) => setStartDate(String(e.target.value))}
                    sx={(theme) => {
                      const icon =
                        theme.palette.mode === "dark"
                          ? { filter: "invert(1) brightness(1.05)", opacity: 0.87 as const }
                          : { opacity: 0.87 as const };
                      return {
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
                    fullWidth
                    type="date"
                    label="End Date"
                    InputLabelProps={{ shrink: true }}
                    value={endDate}
                    onChange={(e) => setEndDate(String(e.target.value))}
                    sx={(theme) => {
                      const icon =
                        theme.palette.mode === "dark"
                          ? { filter: "invert(1) brightness(1.05)", opacity: 0.87 as const }
                          : { opacity: 0.87 as const };
                      return {
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
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Branch</InputLabel>
                    <Select
                      value={selectedBranch}
                      label="Branch"
                      onChange={(e) => setSelectedBranch(String(e.target.value))}
                    >
                      <MenuItem value="all">All branches</MenuItem>
                      {branchOptions.map((branch) => (
                        <MenuItem key={branch} value={branch}>
                          {branch}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>Fund</InputLabel>
                    <Select
                      value={selectedFundId}
                      label="Fund"
                      onChange={(e) => setSelectedFundId(String(e.target.value))}
                    >
                      <MenuItem value="all">All funds</MenuItem>
                      {fundOptions.map((fund) => (
                        <MenuItem key={fund.id} value={fund.id}>
                          {fund.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {Locale.label("donations.batchStatements.summary") || "Summary"}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={2}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body1" color="text.secondary">
                        Total Branches:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {totalBranches}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body1" color="text.secondary">
                        {Locale.label("donations.batchStatements.totalDonors") || "Total Donors:"}
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {totalDonors}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body1" color="text.secondary">
                        {Locale.label("donations.batchStatements.totalDonations") || "Total Donations:"}
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {totalDonations}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {/* Download Options */}
              {branchGroups.length > 0 ? (
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {Locale.label("donations.batchStatements.downloadOptions") || "Download Options"}
                    </Typography>
                    <Divider sx={{ my: 2 }} />

                    <Stack spacing={2}>
                      {/* CSV Download */}
                      <Box>
                        <Typography variant="subtitle1" gutterBottom>
                          Branch CSV Files
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Download a ZIP file containing one CSV per branch, based on Start/End Date, Branch, and Fund filters.
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<DownloadIcon />}
                          onClick={handleDownloadZip}
                          fullWidth
                        >
                          {`Download ZIP (${branchGroups.length} files)`}
                        </Button>
                        <Alert severity="info" sx={{ mt: 2 }}>
                          {`This will download a ZIP file containing ${branchGroups.length} branch CSV files for the selected filters.`}
                        </Alert>
                      </Box>

                      <Divider />

                      {/* Download PDF */}
                      <Box>
                        <Typography variant="subtitle1" gutterBottom>
                          Branch Printable Statements
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Download a PDF statement pack grouped by branch, respecting Start/End Date, Branch, and Fund filters.
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<PrintIcon />}
                          onClick={handleDownloadPdf}
                          fullWidth
                        >
                          {`Download PDF (${branchGroups.length} Branch Statements)`}
                        </Button>
                        <Alert severity="info" sx={{ mt: 2 }}>
                          {`This will download a single PDF with ${branchGroups.length} branch statements. Each branch starts on a new page.`}
                        </Alert>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ) : (
                <Alert severity="info">
                  {Locale.label("donations.batchStatements.noDonations").replace("{year}", selectedYear.toString()) ||
                    `No donations found for ${selectedYear}. Please select a different year.`}
                </Alert>
              )}
            </>
          )}
        </Box>
      </Container>
    </>
  );
};
