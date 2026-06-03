import React from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Collapse,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { ApiHelper, DisplayBox, Locale } from "@machonharuach/apphelper";

interface SentTextRow {
  id?: string;
  message?: string;
  recipientCount?: number;
  successCount?: number;
  failCount?: number;
  groupId?: string;
  recipientPersonId?: string;
  sentAt?: string;
  createdAt?: string;
}

interface DeliveryLogRow {
  personId?: string;
  deliveryAddress?: string;
  success?: boolean;
  errorMessage?: string;
}

export const SmsHistoryPanel: React.FC = () => {
  const [rows, setRows] = React.useState<SentTextRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [details, setDetails] = React.useState<Record<string, DeliveryLogRow[]>>({});
  const [loadingDetails, setLoadingDetails] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    ApiHelper.get("/texting/sent", "MessagingApi")
      .then((data: SentTextRow[]) => {
        const sorted = (data || []).sort((a, b) => {
          const da = new Date(a.sentAt || a.createdAt || 0).getTime();
          const db = new Date(b.sentAt || b.createdAt || 0).getTime();
          return db - da;
        });
        setRows(sorted);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (row: SentTextRow) => {
    const raw = row.sentAt || row.createdAt;
    if (!raw) return "—";
    return new Date(raw).toLocaleString();
  };

  const toggleDetails = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (details[id]) return;
    setLoadingDetails(id);
    try {
      const resp = await ApiHelper.get("/texting/sent/" + id + "/details", "MessagingApi");
      setDetails((prev) => ({ ...prev, [id]: resp?.deliveryLogs || [] }));
    } catch {
      setDetails((prev) => ({ ...prev, [id]: [] }));
    } finally {
      setLoadingDetails(null);
    }
  };

  return (
    <DisplayBox headerIcon="history" headerText={Locale.label("communications.history.title")} editContent={false} id="smsHistoryBox">
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : rows.length === 0 ? (
        <Alert severity="info">{Locale.label("communications.history.empty")}</Alert>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              <TableCell>{Locale.label("communications.history.sentAt")}</TableCell>
              <TableCell>{Locale.label("communications.history.message")}</TableCell>
              <TableCell align="right">{Locale.label("communications.history.delivered")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const id = row.id || "";
              const isOpen = expandedId === id;
              return (
                <React.Fragment key={id || row.message}>
                  <TableRow hover>
                    <TableCell>
                      {id ? (
                        <IconButton size="small" onClick={() => toggleDetails(id)} aria-label="Toggle details">
                          {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                        </IconButton>
                      ) : null}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(row)}</TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Typography variant="body2" noWrap title={row.message}>
                        {row.message}
                      </Typography>
                      {row.recipientPersonId ? (
                        <Typography variant="caption" color="text.secondary">
                          {Locale.label("communications.history.individual")}
                        </Typography>
                      ) : row.groupId ? (
                        <Typography variant="caption" color="text.secondary">
                          {Locale.label("communications.history.group")}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell align="right">
                      {row.successCount ?? 0}/{row.recipientCount ?? 0}
                      {(row.failCount ?? 0) > 0 ? (
                        <Typography component="span" variant="caption" color="error.main" sx={{ ml: 0.5 }}>
                          ({row.failCount} failed)
                        </Typography>
                      ) : null}
                    </TableCell>
                  </TableRow>
                  {id ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ py: 0, borderBottom: isOpen ? undefined : "none" }}>
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 1.5, pl: 5 }}>
                            {loadingDetails === id ? (
                              <CircularProgress size={20} />
                            ) : (details[id] || []).length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                {Locale.label("communications.history.noDetails")}
                              </Typography>
                            ) : (
                              <Stack spacing={0.5}>
                                {(details[id] || []).map((log, i) => (
                                  <Typography key={i} variant="body2" color={log.success ? "text.primary" : "error.main"}>
                                    {log.deliveryAddress || log.personId}
                                    {log.errorMessage ? ` — ${log.errorMessage}` : ""}
                                  </Typography>
                                ))}
                              </Stack>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      )}
    </DisplayBox>
  );
};
