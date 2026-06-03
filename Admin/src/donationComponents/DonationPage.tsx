"use client";

import React from "react";
import { DisplayBox, ExportLink, Loading } from "@machonharuach/apphelper";
import { ApiHelper, DateHelper, UniqueIdHelper, CurrencyHelper, Locale } from "../helpers";
import type { DonationInterface, ChurchInterface } from "@machonharuach/helpers";
// import { Link } from "react-router-dom"
import { Table, TableBody, TableRow, TableCell, TableHead, Alert, Button, Icon, Link, Menu, MenuItem } from "@mui/material";

interface Props {
  personId: string;
  appName?: string;
  church?: ChurchInterface;
  churchLogo?: string;
}

export const DonationPage: React.FC<Props> = (props) => {
  const [donations, setDonations] = React.useState<DonationInterface[]>(null);
  const [message, setMessage] = React.useState<string>(null);
  const [appName, setAppName] = React.useState<string>("");
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [currency, setCurrency] = React.useState<string>("usd");
  const [donorboxUrl, setDonorboxUrl] = React.useState<string>("");
  const open = Boolean(anchorEl);

  const handleClose = () => {
    setAnchorEl(null);
  };

  const loadData = async () => {
    if (props?.appName) setAppName(props.appName);
    if (UniqueIdHelper.isMissing(props.personId)) return;

    try {
      const gatewayPath = props?.church?.id ? "/gateways/churchId/" + props.church.id : "/gateways";
      const [donationsData, gatewaysData] = await Promise.all([ApiHelper.get("/donations?personId=" + props.personId, "GivingApi"), ApiHelper.get(gatewayPath, "GivingApi")]);

      setDonations(donationsData);
      const selectedGateway = Array.isArray(gatewaysData) && gatewaysData.length > 0 ? gatewaysData[0] : null;
      if (selectedGateway && (selectedGateway.provider || "").toLowerCase() === "donorbox" && selectedGateway.publicKey) {
        const campaignRef = selectedGateway.publicKey.toString().trim();
        const normalizedUrl = campaignRef.startsWith("http")
          ? campaignRef
          : `https://donorbox.org/${campaignRef}`;
        setDonorboxUrl(normalizedUrl);
      } else {
        setDonorboxUrl("");
      }
    } catch (error) {
      console.error("Error loading donation data:", error);
      setDonations([]);
      setDonorboxUrl("");
    }
  };

  const getEditContent = () => {
    const result: React.ReactElement[] = [];
    const date = new Date();
    const currentY = date.getFullYear();
    const lastY = date.getFullYear() - 1;

    const current_year = donations.length > 0 ? donations.filter((d) => new Date((d.donationDate || "2000-01-01").split("T")[0] + "T00:00:00").getFullYear() === currentY) : [];
    const last_year = donations.length > 0 ? donations.filter((d) => new Date((d.donationDate || "2000-01-01").split("T")[0] + "T00:00:00").getFullYear() === lastY) : [];
    const customHeaders = [
      { label: "amount", key: "amount" },
      { label: "donationDate", key: "donationDate" },
      { label: "fundName", key: "fund.name" },
      { label: "method", key: "method" },
      { label: "methodDetails", key: "methodDetails" }
    ];

    if (current_year.length > 0 || last_year.length > 0) {
      result.push(
        <>
          <Button
            id="download-button"
            aria-controls={open ? "download-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              setAnchorEl(e.currentTarget);
            }}>
            <Icon>download</Icon>
          </Button>
          <Menu id="download-menu" anchorEl={anchorEl} open={open} onClose={handleClose} MenuListProps={{ "aria-labelledby": "download-button" }}>
            {current_year.length > 0 && (
              <MenuItem onClick={handleClose} dense>
                <ExportLink data={current_year} filename="current_year_donations" customHeaders={customHeaders} text={Locale.label("donation.page.currentYearCsv")} icon="table_chart" />
              </MenuItem>
            )}
            {current_year.length > 0 && (
              <MenuItem onClick={handleClose} dense>
                <Link href={"/donations/print/" + props.personId + "?year=" + currentY}>
                  <Button>
                    <Icon>print</Icon> &nbsp; {Locale.label("donation.page.currentYearPrint")}
                  </Button>
                </Link>
              </MenuItem>
            )}
            {last_year.length > 0 && (
              <MenuItem onClick={handleClose} dense>
                <ExportLink data={last_year} filename="last_year_donations" customHeaders={customHeaders} text={Locale.label("donation.page.lastYearCsv")} icon="table_chart" />
              </MenuItem>
            )}
            {last_year.length > 0 && (
              <MenuItem onClick={handleClose} dense>
                <Link href={"/donations/print/" + props.personId + "?year=" + lastY}>
                  <Button>
                    <Icon>print</Icon> &nbsp; {Locale.label("donation.page.lastYearPrint")}
                  </Button>
                </Link>
              </MenuItem>
            )}
          </Menu>
        </>
      );
    }

    return result;
  };

  const getRows = () => {
    const rows: React.ReactElement[] = [];

    if (donations.length === 0) {
      rows.push(
        <TableRow key="0">
          <TableCell>{Locale.label("donation.page.willAppear")}</TableCell>
        </TableRow>
      );
      return rows;
    }

    for (let i = 0; i < donations.length; i++) {
      const d = donations[i];
      rows.push(
        <TableRow key={i}>
          {appName !== "App" && (
            <TableCell>
              {d.batchId ? <Link href={"/donations/" + d.batchId}>{d.batchId}</Link> : ""}
            </TableCell>
          )}
          <TableCell>{d.donationDate ? DateHelper.prettyDate(new Date(d.donationDate.split("T")[0] + "T00:00:00")) : ""}</TableCell>
          <TableCell>
            {d.method} - {d.methodDetails}
          </TableCell>
          <TableCell>{d.fund.name}</TableCell>
          <TableCell>{CurrencyHelper.formatCurrencyWithLocale(d.fund.amount, currency)}</TableCell>
        </TableRow>
      );
    }
    return rows;
  };

  const getTableHeader = () => {
    const rows: React.ReactElement[] = [];

    if (donations.length > 0) {
      rows.push(
        <TableRow key="header" sx={{ textAlign: "left" }}>
          {appName !== "App" && <th>{Locale.label("donation.page.batch")}</th>}
          <th>{Locale.label("donation.page.date")}</th>
          <th>{Locale.label("donation.page.method")}</th>
          <th>{Locale.label("donation.page.fund")}</th>
          <th>{Locale.label("donation.page.amount")}</th>
        </TableRow>
      );
    }

    return rows;
  };

  React.useEffect(() => {
    loadData();
  }, [props.personId]);

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      setCurrency(result);
    });
  }, []);

  const getTable = () => {
    if (!donations) return <Loading />;
    else {
      return (
        <Table>
          <TableHead>{getTableHeader()}</TableHead>
          <TableBody>{getRows()}</TableBody>
        </Table>
      );
    }
  };

  return (
    <>
      {message && <Alert severity="success">{message}</Alert>}
      {!!donorboxUrl && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Giving is handled through Donorbox.{" "}
          <Link href={donorboxUrl} target="_blank" rel="noopener noreferrer">
            Open donation page
          </Link>
        </Alert>
      )}
      {!donorboxUrl && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Donorbox is not configured for this church yet.
        </Alert>
      )}
      {!donations ? <Loading /> : (
        <DisplayBox headerIcon="payments" headerText={Locale.label("donation.donationPage.donations")} editContent={getEditContent()}>
          {getTable()}
        </DisplayBox>
      )}
    </>
  );
};
