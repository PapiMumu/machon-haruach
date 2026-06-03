import React from "react";
import { ArrayHelper, ApiHelper, DateHelper, CurrencyHelper, ExportLink, UniqueIdHelper, Loading, Locale } from "@machonharuach/apphelper";
import { type DonationInterface, type DonationBatchInterface, type FundInterface } from "@machonharuach/helpers";
import { Table, TableBody, TableCell, TableRow, TableHead, Typography, Stack, Icon, Button, Box, Chip, type Theme } from "@mui/material";
import { Person as PersonIcon, CalendarMonth as DateIcon, FileDownload as ExportIcon, VolunteerActivism as DonationIcon, HourglassEmpty as PendingIcon } from "@mui/icons-material";
import { IconText, EmptyState } from "../../components";
import { formatBatchListName } from "../helpers/batchDisplayName";

const tableChromeSx = (theme: Theme) => ({
  backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : theme.palette.grey[50],
  "& .MuiTableCell-root": {
    borderBottom: "2px solid",
    borderBottomColor: "divider",
    color: theme.palette.text.primary
  }
});

interface Props {
  batch: DonationBatchInterface;
  funds: FundInterface[];
  /** Kept for callers (e.g. batch page); inline edit is not shown in this table. */
  editFunction?: (id: string) => void;
  currency?: string
}

export const Donations: React.FC<Props> = ({ currency = "usd", ...props }) => {
  const { batch } = props;
  const [donations, setDonations] = React.useState<DonationInterface[]>(null);

  const populatePeople = React.useCallback(async (data: DonationInterface[]) => {
    const peopleIds = ArrayHelper.getIds(data, "personId");
    if (peopleIds.length > 0) {
      const people = await ApiHelper.get("/people/ids?ids=" + escape(peopleIds.join(",")), "MembershipApi");
      data.forEach((d) => {
        if (!UniqueIdHelper.isMissing(d.personId)) d.person = ArrayHelper.getOne(people, "id", d.personId);
      });
    }
    setDonations(data);
  }, []);

  const loadData = React.useCallback(() => {
    ApiHelper.get("/donations?batchId=" + batch?.id, "GivingApi").then((data: any) => populatePeople(data));
  }, [batch, populatePeople]);

  const getHeaderActions = React.useCallback(() => {
    if (!donations || donations.length === 0) return null;
    return (
      <Button size="small" variant="outlined" startIcon={<ExportIcon />} component={ExportLink} data={donations} filename="donations.csv">
        Export
      </Button>
    );
  }, [donations]);

  // Memoize the total calculation to avoid recalculating on every render
  const donationsTotal = React.useMemo(() => {
    if (!donations || donations.length === 0) return 0;
    return donations.reduce((sum, donation) => sum + donation.amount, 0);
  }, [donations]);

  const getTableHeader = React.useCallback(() => {
    if (!donations || donations.length === 0) {
      return null;
    }

    return (
      <TableHead sx={tableChromeSx}>
        <TableRow>
          <TableCell sx={{ fontWeight: 600 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
              {Locale.label("donations.donations.tableIdent")}
            </Typography>
          </TableCell>
          <TableCell sx={{ fontWeight: 600 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
              {Locale.label("common.name")}
            </Typography>
          </TableCell>
          <TableCell sx={{ fontWeight: 600 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
              {Locale.label("donations.donations.date")}
            </Typography>
          </TableCell>
          <TableCell sx={{ fontWeight: 600 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
              {Locale.label("donations.donations.amt")}
            </Typography>
          </TableCell>
        </TableRow>
      </TableHead>
    );
  }, [donations]);

  const getRows = React.useCallback(() => {
    const rows: React.ReactNode[] = [];
    const emptyColSpan = 4;

    if (!donations || donations.length === 0) {
      rows.push(
        <TableRow key="0">
          <EmptyState variant="table" colSpan={emptyColSpan} icon={<DonationIcon />} title={Locale.label("donations.donations.noDonMsg")} />
        </TableRow>
      );
      return rows;
    }

    // Add donation rows
    for (let i = 0; i < donations.length; i++) {
      const d = donations[i];

      const isPending = (d as any).status === "pending";
      rows.push(
        <TableRow
          key={i}
          sx={{
            "&:hover": { backgroundColor: "action.hover" },
            transition: "background-color 0.2s ease",
            opacity: isPending ? 0.8 : 1
          }}>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconText icon={<Icon>receipt</Icon>} iconSize={20} iconColor="var(--c1l2)" variant="body2">
                <span style={{ fontWeight: 500, color: "text.primary" }}>{d.id}</span>
              </IconText>
              {isPending && <Chip icon={<PendingIcon />} label="Pending" size="small" color="warning" variant="outlined" />}
            </Stack>
          </TableCell>
          <TableCell>
            <IconText icon={<PersonIcon />} iconSize={18} iconColor="text.secondary" variant="body2">
              {d.person?.name.display || Locale.label("donations.donations.anon")}
            </IconText>
          </TableCell>
          <TableCell>
            <IconText icon={<DateIcon />} iconSize={18} iconColor="text.secondary" variant="body2">
              {d.donationDate ? DateHelper.prettyDate(new Date(d.donationDate.split("T")[0] + "T00:00:00")) : ""}
            </IconText>
          </TableCell>
          <TableCell>
            <IconText icon={<></>} iconSize={18} iconColor={isPending ? "warning.main" : "success.main"} variant="body2" color={isPending ? "warning.main" : "success.main"}>
              <span style={{ fontWeight: 600 }}>{CurrencyHelper.formatCurrencyWithLocale(d.amount, currency)}</span>
            </IconText>
          </TableCell>
        </TableRow>
      );
    }

    // Add total row
    rows.push(
      <TableRow key="total" sx={(theme) => ({ borderTop: 2, borderColor: "divider", ...tableChromeSx(theme) })}>
        <TableCell sx={{ fontWeight: "bold", fontSize: 15 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
            {Locale.label("donations.donations.total")}
          </Typography>
        </TableCell>
        <TableCell></TableCell>
        <TableCell></TableCell>
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            {/* <MoneyIcon sx={{ color: "success.main", fontSize: 20 }} /> */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "success.main" }}>
              {CurrencyHelper.formatCurrencyWithLocale(donationsTotal, currency)}
            </Typography>
          </Stack>
        </TableCell>
      </TableRow>
    );

    return rows;
  }, [donations, donationsTotal, currency]);

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.batch?.id)) loadData();
  }, [props.batch, loadData]);

  // Memoize the table content to avoid recreating when dependencies haven't changed
  const tableContent = React.useMemo(() => {
    if (!donations) return <Loading />;

    const donationsLabel = Locale.label("donations.donations.don");
    const batchChannel = formatBatchListName(batch?.name).trim();
    const cardTitle = batchChannel ? `${donationsLabel} by ${batchChannel}` : donationsLabel;

    return (
      <>
        {/* Header with actions */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{cardTitle}</Typography>
            {getHeaderActions()}
          </Stack>
        </Box>

        {/* Table */}
        <Table sx={{ minWidth: 650 }}>
          {getTableHeader()}
          <TableBody>{getRows()}</TableBody>
        </Table>
      </>
    );
  }, [donations, getRows, getTableHeader, getHeaderActions, batch?.name]);

  return tableContent;
};
