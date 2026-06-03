"use client";

import React from "react";
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
  TextField,
  Popover,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  InputAdornment
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { ApiHelper, CurrencyHelper, Locale, Loading, UserHelper } from "@machonharuach/apphelper";
import { useQuery } from "@tanstack/react-query";
import { PREFERRED_GIVING_LABELS, toPreferredGivingLabel } from "./helpers/fundLabel";
import { loadGivingFundsCatalog } from "./helpers/loadGivingFunds";

interface DonationFundTotalRow {
  fundName?: string;
  /** Set when mobile (or other clients) records `givingCampus|{name}` in donation notes */
  givingCampusFromNotes?: string;
  totalAmount?: number;
  entries?: number;
}

/** Same token Mobile writes in `donation.notes` (EnhancedDonationForm). */
const GIVING_CAMPUS_NOTE_PREFIX = "givingCampus|";

function parseCampusFromGivingNotes(notes?: string): string {
  const n = String(notes || "");
  const idx = n.indexOf(GIVING_CAMPUS_NOTE_PREFIX);
  if (idx === -1) return "";
  const tail = n.slice(idx + GIVING_CAMPUS_NOTE_PREFIX.length);
  const line = tail.split(/\r\n|\n|\r/)[0] ?? "";
  return line.trim();
}

/** MySQL drivers often lowercase aliases; normalize so branch + fund columns map correctly. */
function normalizeFundTotalApiRows(rawRows: any[]): DonationFundTotalRow[] {
  return asArray<any>(rawRows)
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const campus =
        raw.givingCampusFromNotes ?? raw.givingcampusfromnotes ?? raw.GivingCampusFromNotes ?? "";
      const fundName = raw.fundName ?? raw.fundname ?? raw.FundName ?? "";
      const row: DonationFundTotalRow = {
        fundName: String(fundName || "").trim(),
        givingCampusFromNotes: String(campus || "").trim(),
        totalAmount: Number(raw.totalAmount ?? raw.totalamount ?? 0),
        entries: Number(raw.entries ?? 0)
      };
      return row.fundName ? row : null;
    })
    .filter((r): r is DonationFundTotalRow => r != null);
}

interface DonationSummaryFundRow {
  fund?: { name?: string };
  totalAmount?: number;
}
interface DonationSummaryWeekRow {
  week?: string;
  donations?: DonationSummaryFundRow[];
}
interface FundRow {
  id?: string;
  name?: string;
}
interface CampusRow {
  id?: string;
  name?: string;
}

function asArray<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (!input) return [];
  if (typeof input === "string") {
    try {
      return asArray<T>(JSON.parse(input));
    } catch {
      return [];
    }
  }
  if (typeof input === "object") {
    const candidate = input?.data ?? input?.items ?? input?.results ?? input?.rows;
    if (Array.isArray(candidate)) return candidate as T[];
    if (candidate && typeof candidate === "object") return Object.values(candidate) as T[];
    return Object.values(input) as T[];
  }
  return [];
}

function normalizeToken(value?: string): string {
  return String(value || "").trim().toLowerCase();
}

function resolveBranchFromFundName(rawFundName: string, campusNames: string[]): string {
  const normalizedFund = normalizeToken(rawFundName);
  if (!normalizedFund) return "";
  const match = campusNames.find((campus) => {
    const normalizedCampus = normalizeToken(campus);
    return normalizedCampus && normalizedFund.includes(normalizedCampus);
  });
  return match || "";
}

/** Match Mobile `givingCampus|{name}` tag to an official campus name from AttendanceApi. */
function resolveCampusFromNotesTag(tag: string, campusNames: string[]): string {
  const t = normalizeToken(tag);
  if (!t) return "";
  const exact = campusNames.find((c) => normalizeToken(c) === t);
  if (exact) return exact;
  const partial = campusNames.find((c) => {
    const nc = normalizeToken(c);
    return nc && (t.includes(nc) || nc.includes(t));
  });
  return partial || String(tag || "").trim();
}

function resolveBranchKeyForFundRow(row: DonationFundTotalRow, rawFundName: string, campusNames: string[]): string {
  const fromNotes = String(row.givingCampusFromNotes || "").trim();
  if (fromNotes) {
    const resolved = resolveCampusFromNotesTag(fromNotes, campusNames);
    if (campusNames.length === 0) return resolved;
    const match = campusNames.find((c) => normalizeToken(c) === normalizeToken(resolved));
    if (match) return match;
    return resolved.trim();
  }
  return resolveBranchFromFundName(rawFundName, campusNames);
}

function resolveTypeFromFundName(rawFundName: string, campusNames: string[]): string {
  const raw = String(rawFundName || "").trim();
  let candidate = raw;
  campusNames.forEach((campus) => {
    if (!campus) return;
    const re = new RegExp(campus.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
    candidate = candidate.replace(re, " ");
  });
  candidate = candidate.replace(/[-:@|]/g, " ").replace(/\s+/g, " ").trim();
  const forLabel = (candidate || raw).trim();
  if (!forLabel) return raw || "Unknown fund";
  const preferred = toPreferredGivingLabel(forLabel);
  if (preferred === "General" && normalizeToken(forLabel) !== "general") {
    return forLabel;
  }
  return preferred;
}

/** Fund totals from the API use fund names only; campus may be absent. Never split one fund across every campus. */
const UNASSIGNED_BRANCH = "Unassigned";

function resolveTargetBranchesForFundRow(parsedBranch: string, campusNames: string[]): string[] {
  if (parsedBranch) return [parsedBranch];
  if (campusNames.length === 1) return [campusNames[0]];
  return [UNASSIGNED_BRANCH];
}

/** Branch key used in filters (fund rows may not include notes-derived campus). */
function branchKeyForFundRow(rawFundName: string, campusNames: string[]): string {
  const parsed = resolveBranchFromFundName(rawFundName, campusNames);
  return resolveTargetBranchesForFundRow(parsed, campusNames)[0];
}

function distributeAcrossBranches(totalAmount: number, entries: number, branches: string[]) {
  const safeBranches = branches.length > 0 ? branches : ["Unassigned"];
  const amountShare = totalAmount / safeBranches.length;
  const entryShare = entries / safeBranches.length;
  return safeBranches.map((branch) => ({ branch, amountShare, entryShare }));
}

const FILTER_POPOVER_WIDTH = 560;
const FILTER_POPOVER_MAX_HEIGHT = 480;

function getFilterPopoverPosition(triggerEl: HTMLElement | null): { top: number; left: number } {
  const margin = 16;
  const gap = 12;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const panelW = Math.min(FILTER_POPOVER_WIDTH, vw - margin * 2);
  const panelH = Math.min(FILTER_POPOVER_MAX_HEIGHT, vh - margin * 2);
  const left = Math.max(margin, Math.round((vw - panelW) / 2));

  const rect = triggerEl?.getBoundingClientRect();
  let top: number;
  if (rect) {
    top = rect.bottom + gap;
    if (top + panelH > vh - margin) {
      top = Math.max(margin, vh - margin - panelH);
    }
    if (top < rect.bottom + gap) {
      top = rect.bottom + gap;
    }
  } else {
    top = Math.max(margin, Math.round((vh - panelH) / 2) + 72);
  }

  return { top, left };
}

export const GivingDashboard = () => {
  const [period, setPeriod] = React.useState("Weekly");
  const [selectedBranch, setSelectedBranch] = React.useState<string>("all");
  const [selectedType, setSelectedType] = React.useState<string>("all");
  const [branchMenuPosition, setBranchMenuPosition] = React.useState<{ top: number; left: number } | null>(null);
  const [branchSearch, setBranchSearch] = React.useState("");
  const branchPopoverOpen = branchMenuPosition !== null;
  const branchTriggerRef = React.useRef<HTMLDivElement | null>(null);

  const [typeMenuPosition, setTypeMenuPosition] = React.useState<{ top: number; left: number } | null>(null);
  const [typeSearch, setTypeSearch] = React.useState("");
  const typePopoverOpen = typeMenuPosition !== null;
  const typeTriggerRef = React.useRef<HTMLDivElement | null>(null);

  const handlePeriodChange = (_event: React.MouseEvent<HTMLElement>, newPeriod: string | null) => {
    if (newPeriod) setPeriod(newPeriod);
  };

  const defaultRangeStartDate = React.useMemo(() => {
    const now = new Date();
    if (period === "Weekly") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (period === "Monthly") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (period === "Quarterly") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // Yearly
  }, [period]);
  const defaultRangeEndDate = React.useMemo(() => new Date(), [period]);

  const formatDateParam = (d: Date) => d.toISOString().slice(0, 10);
  const [startDate, setStartDate] = React.useState<string>(formatDateParam(defaultRangeStartDate));
  const [endDate, setEndDate] = React.useState<string>(formatDateParam(defaultRangeEndDate));

  React.useEffect(() => {
    setStartDate(formatDateParam(defaultRangeStartDate));
    setEndDate(formatDateParam(defaultRangeEndDate));
  }, [defaultRangeStartDate, defaultRangeEndDate]);
  const labelOrFallback = (key: string, fallback: string) => {
    const text = Locale.label(key);
    if (!text || text === key) return fallback;
    return text;
  };

  const { data: fundTotals = [], isLoading } = useQuery<DonationFundTotalRow[]>({
    queryKey: ["/donations/fundTotals", period, startDate, endDate],
    queryFn: async () => {
      const start = startDate;
      const end = endDate;

      const loadMergedFunds = async (): Promise<FundRow[]> => {
        const churchId = UserHelper.currentUserChurch?.church?.id || "";
        const byId = new Map<string, FundRow>();
        try {
          asArray<FundRow>(await ApiHelper.get("/funds", "GivingApi")).forEach((f) => {
            const id = String(f.id || "").trim();
            if (id) byId.set(id, f);
          });
        } catch {
          /* ignore */
        }
        if (churchId) {
          try {
            asArray<FundRow>(await ApiHelper.get(`/funds/churchId/${churchId}`, "GivingApi")).forEach((f) => {
              const id = String(f.id || "").trim();
              if (id) byId.set(id, f);
            });
          } catch {
            /* ignore */
          }
        }
        return Array.from(byId.values());
      };

      const buildFromLedger = async (): Promise<DonationFundTotalRow[]> => {
        const fundRows = await loadMergedFunds();
        const [donations, fundDonations] = await Promise.all([
          ApiHelper.get("/donations", "GivingApi"),
          ApiHelper.get("/funddonations", "GivingApi")
        ]);
        const donationRows = asArray<{ id?: string; donationDate?: string; date?: string; notes?: string; status?: string }>(donations);
        const fundDonationRows = asArray<{ donationId?: string; fundId?: string; amount?: number }>(fundDonations);
        const rangeStart = new Date(`${start}T00:00:00`);
        const rangeEnd = new Date(`${end}T23:59:59`);
        const isCompleteDonationRow = (d: { status?: string }) => {
          const st = String(d?.status ?? "").trim().toLowerCase();
          return !st || st === "complete";
        };
        const eligibleDonationIds = new Set<string>(
          (donationRows || [])
            .filter((d) => {
              if (!isCompleteDonationRow(d)) return false;
              const rawDate = d?.donationDate || d?.date;
              const dt = rawDate ? new Date(`${String(rawDate).slice(0, 10)}T12:00:00`) : null;
              return !!dt && !Number.isNaN(dt.getTime()) && dt >= rangeStart && dt <= rangeEnd;
            })
            .map((d) => String(d.id || ""))
            .filter((id) => id.length > 0)
        );
        const donationNotesById = new Map<string, string>();
        (donationRows || []).forEach((d) => {
          const id = String(d.id || "");
          if (!id || !eligibleDonationIds.has(id)) return;
          donationNotesById.set(id, String(d.notes ?? ""));
        });
        const fundNameById = new Map<string, string>(
          fundRows
            .map((f) => [String(f.id || "").trim(), String(f.name || "").trim()] as [string, string])
            .filter(([id]) => id.length > 0)
        );
        const ledgerFundLabel = (fundId: string): string => {
          const id = String(fundId || "").trim();
          if (!id) return "Unknown fund";
          const fromCatalog = (fundNameById.get(id) || "").trim();
          if (fromCatalog) return fromCatalog;
          const fromSlug = toPreferredGivingLabel(id);
          if (fromSlug && fromSlug !== "General") return fromSlug;
          return id;
        };
        const byComposite = new Map<string, { fundName: string; campus: string; total: number; entries: number }>();
        (fundDonationRows || []).forEach((fd) => {
          const donationId = String(fd.donationId || "");
          if (!eligibleDonationIds.has(donationId)) return;
          const fundId = String(fd.fundId || "").trim();
          const fundName = ledgerFundLabel(fundId);
          const campus = parseCampusFromGivingNotes(donationNotesById.get(donationId));
          const key = `${fundName}\x1e${campus}`;
          const prev = byComposite.get(key) || { fundName, campus, total: 0, entries: 0 };
          byComposite.set(key, {
            fundName,
            campus,
            total: prev.total + Number(fd.amount || 0),
            entries: prev.entries + 1
          });
        });
        return Array.from(byComposite.values()).map((v) => ({
          fundName: v.fundName,
          givingCampusFromNotes: v.campus,
          totalAmount: v.total,
          entries: v.entries
        }));
      };

      try {
        const rows = await ApiHelper.get(`/donations/fundTotals?startDate=${start}&endDate=${end}`, "GivingApi");
        const normalizedRows = normalizeFundTotalApiRows(asArray(rows));
        if (normalizedRows.length > 0) return normalizedRows;
      } catch {
        // Fallback below for older API deploys.
      }

      try {
        const fromLedger = await buildFromLedger();
        if (fromLedger.length > 0) return fromLedger;
      } catch {
        /* try summary */
      }

      try {
        const summaryResp = await ApiHelper.get(`/donations/summary?startDate=${start}&endDate=${end}`, "GivingApi");
        const summaryRows = asArray<DonationSummaryWeekRow>(summaryResp);
        const byFund = new Map<string, { total: number; entries: number }>();
        (summaryRows || []).forEach((w) => {
          (w.donations || []).forEach((d) => {
            const key = String(d.fund?.name || "").trim();
            if (!key) return;
            const prev = byFund.get(key) || { total: 0, entries: 0 };
            byFund.set(key, { total: prev.total + Number(d.totalAmount || 0), entries: prev.entries + 1 });
          });
        });
        if (byFund.size > 0) {
          return Array.from(byFund.entries()).map(([fundName, v]) => ({
            fundName,
            givingCampusFromNotes: "",
            totalAmount: v.total,
            entries: v.entries
          }));
        }
      } catch {
        /* empty */
      }

      try {
        return await buildFromLedger();
      } catch {
        return [];
      }
    },
    placeholderData: []
  });
  const { data: fundsCatalog = [] } = useQuery<FundRow[]>({
    queryKey: ["/funds", "GivingApi", "dashboard-catalog"],
    queryFn: async () => (await loadGivingFundsCatalog()) as FundRow[],
    placeholderData: []
  });
  const { data: campuses = [] } = useQuery<CampusRow[]>({
    queryKey: ["/campuses", "AttendanceApi", "giving-dashboard-branches"],
    queryFn: async () => asArray<CampusRow>(await ApiHelper.get("/campuses", "AttendanceApi")),
    placeholderData: []
  });

  const campusNames = React.useMemo(
    () => (campuses || []).map((c) => String(c?.name || "").trim()).filter((name) => name.length > 0),
    [campuses]
  );

  const fundRowsForOptions = React.useMemo(
    () => (fundTotals.length > 0 ? fundTotals.map((r) => ({ fundName: r.fundName })) : fundsCatalog.map((f) => ({ fundName: f.name }))),
    [fundTotals, fundsCatalog]
  );

  const givingByBranchAndType = React.useMemo(() => {
    const map = new Map<string, Map<string, { total: number; entries: number }>>();
    fundTotals.forEach((row) => {
      const rawFundName = String(row.fundName || "").trim();
      if (!rawFundName) return;
      const parsedBranch = resolveBranchKeyForFundRow(row, rawFundName, campusNames);
      const typeLabel = resolveTypeFromFundName(rawFundName, campusNames);
      const rowTotal = Number(row.totalAmount || 0);
      const rowEntries = Number(row.entries || 0);
      const targetBranches = resolveTargetBranchesForFundRow(parsedBranch, campusNames);
      distributeAcrossBranches(rowTotal, rowEntries, targetBranches).forEach((target) => {
        const branchMap = map.get(target.branch) || new Map<string, { total: number; entries: number }>();
        const prev = branchMap.get(typeLabel) || { total: 0, entries: 0 };
        branchMap.set(typeLabel, {
          total: prev.total + target.amountShare,
          entries: prev.entries + target.entryShare
        });
        map.set(target.branch, branchMap);
      });
    });
    return Array.from(map.entries())
      .map(([branch, typeMap]) => {
        const types = Array.from(typeMap.entries())
          .map(([name, value]) => ({ name, ...value }))
          .filter((t) => t.total > 0)
          .sort((a, b) => b.total - a.total);
        const total = types.reduce((sum, t) => sum + t.total, 0);
        return { branch, total, types };
      })
      .sort((a, b) => b.total - a.total);
  }, [fundTotals, campusNames]);

  const branchOptions = React.useMemo(() => {
    const fromGiving = new Set(givingByBranchAndType.map((b) => b.branch));
    if (campusNames.length > 0) {
      return Array.from(new Set([...campusNames, ...fromGiving])).sort((a, b) => a.localeCompare(b));
    }
    const set = new Set<string>();
    fundRowsForOptions.forEach((row) => {
      const key = branchKeyForFundRow(String(row.fundName || ""), campusNames);
      if (key) set.add(key);
    });
    fromGiving.forEach((b) => set.add(b));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [campusNames, fundRowsForOptions, givingByBranchAndType]);

  const filteredBranchOptions = React.useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    if (!q) return branchOptions;
    return branchOptions.filter((b) => b.toLowerCase().includes(q));
  }, [branchOptions, branchSearch]);

  const openBranchPopover = () => {
    setTypeMenuPosition(null);
    setTypeSearch("");
    setBranchSearch("");
    setBranchMenuPosition(getFilterPopoverPosition(branchTriggerRef.current));
  };

  const closeBranchPopover = () => {
    setBranchMenuPosition(null);
    setBranchSearch("");
  };

  const pickBranch = (value: string) => {
    setSelectedBranch(value);
    closeBranchPopover();
  };

  const typeOptions = React.useMemo(() => {
    // Always include preferred giving labels (Tithe, Seed, Offering, …) so the filter
    // matches how funds are presented, even when period data collapses to a single "General" row.
    const preferred = PREFERRED_GIVING_LABELS.map((x) => x.label);
    const merged = new Set<string>(preferred);

    if (selectedBranch !== "all") {
      fundRowsForOptions.forEach((row) => {
        const rawFundName = String(row.fundName || "");
        if (branchKeyForFundRow(rawFundName, campusNames) === selectedBranch) {
          merged.add(resolveTypeFromFundName(rawFundName, campusNames));
        }
      });
    } else {
      fundRowsForOptions.forEach((row) => merged.add(resolveTypeFromFundName(String(row.fundName || ""), campusNames)));
    }

    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }, [fundRowsForOptions, selectedBranch, campusNames]);

  const filteredTypeOptions = React.useMemo(() => {
    const q = typeSearch.trim().toLowerCase();
    if (!q) return typeOptions;
    return typeOptions.filter((t) => t.toLowerCase().includes(q));
  }, [typeOptions, typeSearch]);

  const openTypePopover = () => {
    setBranchMenuPosition(null);
    setBranchSearch("");
    setTypeSearch("");
    setTypeMenuPosition(getFilterPopoverPosition(typeTriggerRef.current));
  };

  const closeTypePopover = () => {
    setTypeMenuPosition(null);
    setTypeSearch("");
  };

  const pickType = (value: string) => {
    setSelectedType(value);
    closeTypePopover();
  };

  React.useEffect(() => {
    if (selectedBranch !== "all" && !branchOptions.includes(selectedBranch)) setSelectedBranch("all");
  }, [branchOptions, selectedBranch]);

  React.useEffect(() => {
    if (selectedType !== "all" && !typeOptions.includes(selectedType)) setSelectedType("all");
  }, [typeOptions, selectedType]);

  const filteredGivingByBranchAndType = React.useMemo(() => {
    let branchRows = givingByBranchAndType;
    if (selectedBranch !== "all") {
      branchRows = branchRows.filter((b) => b.branch === selectedBranch);
    }
    if (selectedType !== "all") {
      branchRows = branchRows
        .map((b) => {
          const types = b.types.filter((t) => t.name === selectedType);
          const total = types.reduce((sum, t) => sum + t.total, 0);
          return { ...b, types, total };
        })
        .filter((b) => b.types.length > 0);
    }
    return branchRows;
  }, [givingByBranchAndType, selectedBranch, selectedType]);

  const branchBlocksForCards = React.useMemo(() => {
    if (selectedBranch !== "all" || selectedType !== "all") return filteredGivingByBranchAndType;
    if (campusNames.length === 0) return filteredGivingByBranchAndType;

    const dataByBranch = new Map(filteredGivingByBranchAndType.map((b) => [b.branch, b]));
    const seen = new Set<string>();
    const ordered: string[] = [];
    campusNames.forEach((n) => {
      if (!seen.has(n)) {
        seen.add(n);
        ordered.push(n);
      }
    });
    filteredGivingByBranchAndType.forEach((b) => {
      if (!seen.has(b.branch)) {
        seen.add(b.branch);
        ordered.push(b.branch);
      }
    });

    return ordered.map((branch) => {
      const found = dataByBranch.get(branch);
      return found ?? { branch, total: 0, types: [] };
    });
  }, [filteredGivingByBranchAndType, campusNames, selectedBranch, selectedType]);

  const totalForPeriod = React.useMemo(() => filteredGivingByBranchAndType.reduce((sum, x) => sum + x.total, 0), [filteredGivingByBranchAndType]);

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2, gap: 1.5, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", gap: 1.5, minWidth: 320, flexWrap: "wrap" }}>
          <Box ref={branchTriggerRef} sx={{ minWidth: 170 }}>
            <TextField
              size="small"
              label="Branch"
              value={selectedBranch === "all" ? "All branches" : selectedBranch}
              onClick={openBranchPopover}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openBranchPopover();
                }
              }}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <ExpandMoreIcon sx={{ color: "text.secondary", pointerEvents: "none" }} fontSize="small" />
                  </InputAdornment>
                )
              }}
              sx={{
                minWidth: 170,
                cursor: "pointer",
                "& .MuiOutlinedInput-root": { cursor: "pointer" },
                "& .MuiOutlinedInput-input": { cursor: "pointer" }
              }}
              inputProps={{ "aria-haspopup": "dialog", "aria-expanded": branchPopoverOpen }}
            />
            <Popover
              open={branchPopoverOpen}
              onClose={closeBranchPopover}
              anchorReference="anchorPosition"
              anchorPosition={branchMenuPosition ?? { top: 0, left: 0 }}
              anchorOrigin={{ vertical: "top", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
              slotProps={{
                paper: {
                  sx: {
                    width: { xs: "calc(100vw - 32px)", sm: FILTER_POPOVER_WIDTH },
                    maxWidth: "calc(100vw - 32px)",
                    maxHeight: `min(${FILTER_POPOVER_MAX_HEIGHT}px, calc(100vh - 32px))`,
                    borderRadius: 2,
                    border: 1,
                    borderColor: "divider",
                    boxShadow: (theme) => theme.shadows[12],
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden"
                  }
                }
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  bgcolor: "background.paper",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  flex: 1,
                  maxHeight: `min(${FILTER_POPOVER_MAX_HEIGHT}px, calc(100vh - 32px))`
                }}
              >
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search branches…"
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  autoFocus
                  sx={{ mb: 1, flexShrink: 0 }}
                  onKeyDown={(e) => e.stopPropagation()}
                />
                <List
                  dense
                  disablePadding
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    "&::-webkit-scrollbar": { display: "none" }
                  }}
                >
                  <ListItemButton selected={selectedBranch === "all"} onClick={() => pickBranch("all")}>
                    <ListItemText primary="All branches" />
                  </ListItemButton>
                  {filteredBranchOptions.length === 0 ? (
                    <ListItemButton disabled>
                      <ListItemText primary="No matching branches" secondary={branchSearch ? "Try another search" : ""} />
                    </ListItemButton>
                  ) : (
                    filteredBranchOptions.map((branch) => (
                      <ListItemButton key={branch} selected={selectedBranch === branch} onClick={() => pickBranch(branch)}>
                        <ListItemText primary={branch} />
                      </ListItemButton>
                    ))
                  )}
                </List>
              </Paper>
            </Popover>
          </Box>
          <Box ref={typeTriggerRef} sx={{ minWidth: 170 }}>
            <TextField
              size="small"
              label="Giving Type"
              value={selectedType === "all" ? "All giving types" : selectedType}
              onClick={openTypePopover}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openTypePopover();
                }
              }}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <ExpandMoreIcon sx={{ color: "text.secondary", pointerEvents: "none" }} fontSize="small" />
                  </InputAdornment>
                )
              }}
              sx={{
                minWidth: 170,
                cursor: "pointer",
                "& .MuiOutlinedInput-root": { cursor: "pointer" },
                "& .MuiOutlinedInput-input": { cursor: "pointer" }
              }}
              inputProps={{ "aria-haspopup": "dialog", "aria-expanded": typePopoverOpen }}
            />
            <Popover
              open={typePopoverOpen}
              onClose={closeTypePopover}
              anchorReference="anchorPosition"
              anchorPosition={typeMenuPosition ?? { top: 0, left: 0 }}
              anchorOrigin={{ vertical: "top", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
              slotProps={{
                paper: {
                  sx: {
                    width: { xs: "calc(100vw - 32px)", sm: FILTER_POPOVER_WIDTH },
                    maxWidth: "calc(100vw - 32px)",
                    maxHeight: `min(${FILTER_POPOVER_MAX_HEIGHT}px, calc(100vh - 32px))`,
                    borderRadius: 2,
                    border: 1,
                    borderColor: "divider",
                    boxShadow: (theme) => theme.shadows[12],
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden"
                  }
                }
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  bgcolor: "background.paper",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  flex: 1,
                  maxHeight: `min(${FILTER_POPOVER_MAX_HEIGHT}px, calc(100vh - 32px))`
                }}
              >
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search giving types…"
                  value={typeSearch}
                  onChange={(e) => setTypeSearch(e.target.value)}
                  autoFocus
                  sx={{ mb: 1, flexShrink: 0 }}
                  onKeyDown={(e) => e.stopPropagation()}
                />
                <List
                  dense
                  disablePadding
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    "&::-webkit-scrollbar": { display: "none" }
                  }}
                >
                  <ListItemButton selected={selectedType === "all"} onClick={() => pickType("all")}>
                    <ListItemText primary="All giving types" />
                  </ListItemButton>
                  {filteredTypeOptions.length === 0 ? (
                    <ListItemButton disabled>
                      <ListItemText primary="No matching giving types" secondary={typeSearch ? "Try another search" : ""} />
                    </ListItemButton>
                  ) : (
                    filteredTypeOptions.map((type) => (
                      <ListItemButton key={type} selected={selectedType === type} onClick={() => pickType(type)}>
                        <ListItemText primary={type} />
                      </ListItemButton>
                    ))
                  )}
                </List>
              </Paper>
            </Popover>
          </Box>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1.5 }}>
        <ToggleButtonGroup value={period} exclusive onChange={handlePeriodChange} size="small">
            <ToggleButton value="Weekly">{labelOrFallback("donations.period.weekly", "Weekly")}</ToggleButton>
            <ToggleButton value="Monthly">{labelOrFallback("donations.period.monthly", "Monthly")}</ToggleButton>
            <ToggleButton value="Quarterly">{labelOrFallback("donations.period.quarterly", "Quarterly")}</ToggleButton>
            <ToggleButton value="Yearly">{labelOrFallback("donations.period.yearly", "Yearly")}</ToggleButton>
        </ToggleButtonGroup>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <TextField
              size="small"
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(String(e.target.value))}
              InputLabelProps={{ shrink: true }}
              sx={(theme) => {
                const icon =
                  theme.palette.mode === "dark"
                    ? { filter: "invert(1) brightness(1.05)", opacity: 0.87 as const }
                    : { opacity: 0.87 as const };
                return {
                  minWidth: 170,
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
              size="small"
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(String(e.target.value))}
              InputLabelProps={{ shrink: true }}
              sx={(theme) => {
                const icon =
                  theme.palette.mode === "dark"
                    ? { filter: "invert(1) brightness(1.05)", opacity: 0.87 as const }
                    : { opacity: 0.87 as const };
                return {
                  minWidth: 170,
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
          </Box>
        </Box>
      </Box>

      {isLoading ? (
        <Loading />
      ) : (
        <Stack spacing={4} sx={{ width: "100%" }}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                {Locale.label("donations.donations.summary") || "Summary"}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {CurrencyHelper.formatCurrency(totalForPeriod)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {period} total across {branchBlocksForCards.length} branch{branchBlocksForCards.length === 1 ? "" : "es"}
              </Typography>
            </CardContent>
          </Card>

          {branchBlocksForCards.length > 0 ? (
            <Box
              sx={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                gap: 3,
                alignItems: "stretch"
              }}
            >
              {branchBlocksForCards.map((branchBlock) => (
                <Box key={branchBlock.branch} sx={{ display: "flex", minWidth: 0 }}>
                  <Card sx={{ borderRadius: 2, height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
                    <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 2,
                          mb: 2,
                          minWidth: 0
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 800, minWidth: 0, pr: 1 }}>
                          {branchBlock.branch}
                        </Typography>
                        <Box
                          sx={{
                            flexShrink: 0,
                            textAlign: "right",
                            display: "inline-flex",
                            alignItems: "baseline",
                            gap: 0.5,
                            flexWrap: "wrap",
                            justifyContent: "flex-end"
                          }}
                        >
                          <Typography component="span" sx={{ typography: "h6", fontWeight: 700 }}>
                            {CurrencyHelper.formatCurrency(branchBlock.total)}
                          </Typography>
                          <Typography component="span" variant="body2" color="text.secondary">
                            {` in ${period.toLowerCase()}`}
                          </Typography>
                        </Box>
                      </Box>
                      {branchBlock.types.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No giving was recorded for this branch in the selected period.
                        </Typography>
                      ) : (
                        <Grid container spacing={2} sx={{ flex: 1, alignContent: "start" }}>
                          {branchBlock.types.map((item) => (
                            <Grid key={`${branchBlock.branch}-${item.name}`} size={{ xs: 12 }}>
                              <Card variant="outlined" sx={{ borderRadius: 2, height: "100%", width: "100%" }}>
                                <CardContent>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      flexDirection: "row",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      gap: 2,
                                      minWidth: 0
                                    }}
                                  >
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, minWidth: 0, pr: 1 }}>
                                      {item.name}
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 700, flexShrink: 0, textAlign: "right" }}>
                                      {CurrencyHelper.formatCurrency(item.total)}
                                    </Typography>
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
          ) : (
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  No giving records found for this period.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}
    </>
  );
};
