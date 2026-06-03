import React, { useState, useEffect, useCallback, useMemo, memo, type JSX } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminPersonHelper } from ".";
import { getPersonRegistrationSource, type RegistrationSource } from "../helpers/registrationSource";
import { type PersonSubscriptionInfo } from "../helpers/usePeopleRegistrationGroups";
import { type PersonInterface } from "@machonharuach/helpers";
import { PersonHelper, Loading, ApiHelper, ArrayHelper, Locale, PersonAvatar } from "@machonharuach/apphelper";
import { Table, TableBody, TableRow, TableCell, TableHead, Tooltip, Icon, IconButton, Typography, Stack, Box, Chip, TablePagination, Avatar } from "@mui/material";
import { Email as EmailIcon, Phone as PhoneIcon } from "@mui/icons-material";

interface Props {
  people: PersonInterface[];
  columns: { key: string; label: string; shortName: string }[];
  selectedColumns: string[];
  registrationTab: RegistrationSource;
  subscriptionByPersonId: Record<string, PersonSubscriptionInfo>;
  updateSearchResults?: (people: PersonInterface[]) => void;
  updatedFunction?: () => void;
}

const PeopleSearchResults = memo(function PeopleSearchResults(props: Props) {
  const { people, columns, selectedColumns, registrationTab, subscriptionByPersonId } = props;
  const navigate = useNavigate();

  const [sortDirection, setSortDirection] = useState<boolean | null>(null);
  const [currentSortedCol, setCurrentSortedCol] = useState<string>("");
  const [optionalColumns, setOptionalColumns] = React.useState<any[]>([]);
  const [formSubmissions, setFormSubmissions] = React.useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const getNormalizedMembershipStatus = useCallback((person: PersonInterface) => {
    const rawStatus = (person?.membershipStatus || "").trim();
    if (!rawStatus) return "Unknown";
    // Mobile signups are treated as members in this listing.
    return rawStatus.toLowerCase() === "guest" ? "Member" : rawStatus;
  }, []);

  const getPersonInitials = useCallback((person: PersonInterface) => {
    const displayName = person?.name?.display?.trim() || "";
    if (!displayName) return "?";
    const parts = displayName.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
    return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
  }, []);

  const getPhotoJSX = useCallback((p: PersonInterface) => {
    const photoUrl = PersonHelper.getPhotoUrl(p);
    const hasCustomPhoto = !!photoUrl && !photoUrl.includes("sample-profile.png");
    const avatarSx = {
      width: 40,
      height: 40,
      fontSize: "0.82rem",
      fontWeight: 500,
      border: "1px solid rgba(255,255,255,0.22)",
      boxShadow: "0 6px 14px rgba(0,0,0,0.2)"
    };

    if (hasCustomPhoto) {
      return (
        <a href={photoUrl} target="_blank" rel="noopener noreferrer">
          <PersonAvatar person={p} size="small" sx={avatarSx} />
        </a>
      );
    }

    return <Avatar sx={avatarSx}>{getPersonInitials(p)}</Avatar>;
  }, [getPersonInitials]);

  const getAnswerValue = useCallback(
    (personId: string, questionId: string): string => {
      for (const fs of formSubmissions) {
        if (fs.submittedBy === personId) {
          const answer = ArrayHelper.getOne(fs.answers, "questionId", questionId);
          if (answer) return answer.value || "";
        }
      }
      return "";
    },
    [formSubmissions]
  );

  const getAnswer = useCallback(
    (p: PersonInterface, key: string) => {
      const value = getAnswerValue(p.id, key);
      return value ? <>{value}</> : <></>;
    },
    [getAnswerValue]
  );

  const handleDelete = useCallback(
    (personId: string) => {
      const peopleArray = [...people];
      ApiHelper.delete("/people/" + personId, "MembershipApi").then(() => {
        const idx = ArrayHelper.getIndex(peopleArray, "id", personId);
        if (idx > -1) {
          peopleArray.splice(idx, 1);
          props?.updateSearchResults(peopleArray);
          if (props.updatedFunction) props.updatedFunction();
        }
      });
    },
    [people, props]
  );

  const getColumn = useCallback(
    (p: PersonInterface, key: string) => {
      let result = <></>;
      switch (key) {
        case "photo": result = getPhotoJSX(p); break;
        case "displayName":
          result = (
            <Link to={"/people/" + (p.id || "")} style={{ textDecoration: "none" }}>
              <Typography
                variant="body1"
                sx={{
                  color: "text.primary",
                  fontSize: "1.02rem",
                  fontWeight: 600,
                  lineHeight: 1.25,
                  "&:hover": { textDecoration: "underline" }
                }}>
                {p?.name?.display}
              </Typography>
            </Link>
          );
          break;
        case "lastName": result = <>{p?.name?.last}</>; break;
        case "firstName": result = <>{p?.name?.first}</>; break;
        case "middleName": result = <>{p?.name?.middle}</>; break;
        case "address": result = <>{p?.contactInfo?.address1}</>; break;
        case "city": result = <>{p?.contactInfo?.city}</>; break;
        case "state": result = <>{p?.contactInfo?.state}</>; break;
        case "zip": result = <>{p?.contactInfo?.zip}</>; break;
        case "country": result = <>{p?.contactInfo?.country}</>; break;
        case "email":
          result = (
            <Stack direction="row" spacing={1} alignItems="center">
              {p?.contactInfo?.email && (
                <>
                  <EmailIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                  <Typography variant="body2">{p?.contactInfo?.email}</Typography>
                </>
              )}
            </Stack>
          );
          break;
        case "phone":
          result = (
            <Stack direction="row" spacing={1} alignItems="center">
              {(p?.contactInfo?.mobilePhone || p?.contactInfo?.homePhone || p?.contactInfo?.workPhone) && (
                <>
                  <PhoneIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                  <Typography variant="body2">{p?.contactInfo?.mobilePhone || p?.contactInfo?.homePhone || p?.contactInfo?.workPhone}</Typography>
                </>
              )}
            </Stack>
          );
          break;
        case "birthDate": result = <>{p.birthDate === null ? "" : AdminPersonHelper.getDateStringFromDate(p.birthDate)}</>; break;
        case "birthDay": result = <>{AdminPersonHelper.getBirthDay(p)}</>; break;
        case "age":
          result = (
            <Typography variant="body2" color="text.secondary">
              {p.birthDate === null ? "" : PersonHelper.getAge(p.birthDate)}
            </Typography>
          );
          break;
        case "gender": result = <>{p.gender}</>; break;
        case "membershipStatus":
          const normalizedStatus = getNormalizedMembershipStatus(p);
          result = (
            <Chip
              label={normalizedStatus}
              size="small"
              variant="outlined"
              sx={{
                fontSize: "0.75rem",
                backgroundColor: normalizedStatus === "Member" ? "rgba(46, 125, 50, 0.15)" : normalizedStatus === "Visitor" ? "rgba(237, 108, 2, 0.15)" : "var(--bg-sub)",
                color: normalizedStatus === "Member" ? "#4caf50" : normalizedStatus === "Visitor" ? "#ff9800" : "var(--text-muted)",
                borderColor: "transparent"
              }}
            />
          );
          break;
        case "subscriptionStatus":
          const sub = subscriptionByPersonId[p.id || ""];
          const subscriptionStatus = (sub?.subscriptionStatus || "none").toLowerCase();
          result = (
            <Chip
              label={subscriptionStatus === "none" ? "No Login" : subscriptionStatus}
              size="small"
              variant="outlined"
              sx={{
                fontSize: "0.75rem",
                backgroundColor:
                  subscriptionStatus === "active"
                    ? "rgba(46, 125, 50, 0.15)"
                    : subscriptionStatus === "trialing"
                      ? "rgba(2, 136, 209, 0.15)"
                      : subscriptionStatus === "inactive"
                        ? "rgba(211, 47, 47, 0.15)"
                        : "var(--bg-sub)",
                color:
                  subscriptionStatus === "active"
                    ? "#4caf50"
                    : subscriptionStatus === "trialing"
                      ? "#29b6f6"
                      : subscriptionStatus === "inactive"
                        ? "#ef5350"
                        : "var(--text-muted)",
                borderColor: "transparent"
              }}
              title={sub?.subscriptionEndsAt || undefined}
            />
          );
          break;
        case "maritalStatus": result = <>{p.maritalStatus}</>; break;
        case "anniversary": result = <>{p.anniversary === null ? "" : AdminPersonHelper.getDateStringFromDate(p.anniversary)}</>; break;
        case "nametagNotes": result = <>{p.nametagNotes}</>; break;
        case "deleteOption":
          result = (
            <Tooltip title={`Delete ${p?.name?.display}`} arrow placement="left-start">
              <IconButton
                sx={{ color: "#c84545" }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (p.id) handleDelete(p.id.toString());
                }}
                data-testid={`delete-person-button-${p.id}`}
                aria-label={`Delete ${p?.name?.display}`}>
                <Icon>delete</Icon>
              </IconButton>
            </Tooltip>
          );
          break;
        case key: result = getAnswer(p, key); break;
      }

      return result;
    },
    [getPhotoJSX, handleDelete, getAnswer, getNormalizedMembershipStatus, subscriptionByPersonId]
  );

  const getColumns = useCallback(
    (p: PersonInterface) => {
      const result: JSX.Element[] = [];
      columns.forEach((c) => {
        if (selectedColumns.indexOf(c.key) > -1) {
          result.push(<TableCell key={c.key}>{getColumn(p, c.key)}</TableCell>);
        }
      });
      if (optionalColumns.length > 0) {
        optionalColumns.forEach((c) => {
          if (selectedColumns.indexOf(c.id) > -1) {
            result.push(<TableCell key={c.id}>{getColumn(p, c.id)}</TableCell>);
          }
        });
      }
      return result;
    },
    [columns, selectedColumns, optionalColumns, getColumn]
  );

  useEffect(() => {
    ApiHelper.get("/forms?contentType=person", "MembershipApi").then((data) => {
      if (data.length > 0) {
        const personForms = data.filter((f: any) => f.contentType === "person");
        if (personForms.length > 0) {
          personForms.forEach((f: any) => {
            ApiHelper.get("/questions?formId=" + f.id, "MembershipApi").then((q) => setOptionalColumns((prevState) => [...prevState, ...q]));
            ApiHelper.get(`/formsubmissions/formId/${f.id}/?include=questions,answers`, "MembershipApi").then((fs) => setFormSubmissions((prevState) => [...prevState, ...fs]));
          });
        }
      } else setOptionalColumns([]);
    });
  }, []);

  const sortTableByKey = useCallback(
    (key: string) => {
      // Toggle direction if same column, otherwise start descending
      const asc = currentSortedCol === key ? !sortDirection : false;
      setCurrentSortedCol(key);
      setSortDirection(asc);

      // Check if this is a custom field
      const isCustomField = optionalColumns.some((c) => c.id === key);

      const sortedPeople = [...people].sort(function (a: any, b: any) {
        // Handle custom field sorting
        if (isCustomField) {
          const valA = getAnswerValue(a.id, key);
          const valB = getAnswerValue(b.id, key);
          if (!valA && !valB) return 0;
          if (!valA) return 1;
          if (!valB) return -1;
          const upperA = valA.toUpperCase();
          const upperB = valB.toUpperCase();
          if (upperA < upperB) return asc ? 1 : -1;
          if (upperA > upperB) return asc ? -1 : 1;
          return 0;
        }

        if (a[key] === null) return Infinity; // if value is null push to the end of array
        if (key === "birthDay") {
          //there's no 'birthDay' property in the people object; instead use birthDate to sort
          if (a["birthDate"] === null && b["birthDate"] === null) return 0;
          if (a["birthDate"] === null) return 1;
          if (b["birthDate"] === null) return -1;
        }

        if (typeof a[key]?.getMonth === "function") return asc ? a[key] - b[key] : b[key] - a[key];

        if (key === "birthDay") {
          //to sort dates as per the month
          if (asc) {
            if (a["birthDate"]?.getMonth() !== b["birthDate"]?.getMonth()) return a["birthDate"]?.getMonth() - b["birthDate"]?.getMonth();
            else {
              return a["birthDate"]?.getDate() - b["birthDate"]?.getDate();
            }
          } else {
            if (b["birthDate"]?.getMonth() !== a["birthDate"]?.getMonth()) return b["birthDate"]?.getMonth() - a["birthDate"]?.getMonth();
            else {
              return b["birthDate"]?.getDate() - a["birthDate"]?.getDate();
            }
          }
        }

        const parsedNum = parseInt(a[key]);
        if (!isNaN(parsedNum)) {
          return asc ? a[key] - b[key] : b[key] - a[key];
        }

        const valA = a[key]?.toUpperCase();
        const valB = b[key]?.toUpperCase();
        if (valA < valB) return asc ? 1 : -1;
        if (valA > valB) return asc ? -1 : 1;
        // equal
        return 0;
      });

      if (props.updateSearchResults) {
        props.updateSearchResults(sortedPeople);
      }
    },
    [people, props, optionalColumns, getAnswerValue, currentSortedCol, sortDirection]
  );

  const getRegistrationSource = useCallback(
    (person: PersonInterface): RegistrationSource => {
      const account = person.id ? subscriptionByPersonId[person.id] : undefined;
      return getPersonRegistrationSource(person, !!account, account?.firstAccessApp);
    },
    [subscriptionByPersonId]
  );

  const filteredPeople = useMemo(
    () => (people || []).filter((p) => getRegistrationSource(p) === registrationTab),
    [people, registrationTab, getRegistrationSource]
  );

  const renderPersonRow = useCallback(
    (p: PersonInterface) => (
      <TableRow
        key={p.id}
        sx={{
          "&:hover": { backgroundColor: "rgba(128,128,128,0.1)" },
          cursor: "pointer"
        }}
        onClick={() => navigate(`/people/${p.id}`)}>
        {getColumns(p)}
      </TableRow>
    ),
    [getColumns, navigate]
  );

  const rows = useMemo(() => {
    return filteredPeople.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((p) => renderPersonRow(p));
  }, [filteredPeople, page, rowsPerPage, renderPersonRow]);

  const headers = useMemo(() => {
    const result: JSX.Element[] = [];
    const getSortIcon = (key: string) => {
      if (currentSortedCol !== key) return "unfold_more";
      return sortDirection ? "north" : "south";
    };

    columns.forEach((c) => {
      if (selectedColumns.indexOf(c.key) > -1) {
        const sortable = c.key !== "photo" && c.key !== "deleteOption";
        result.push(
          <TableCell
            key={c.key}
            onClick={sortable ? () => sortTableByKey(c.key) : undefined}
            sx={{
              fontWeight: 500,
              textTransform: "none",
              cursor: sortable ? "pointer" : "default",
              whiteSpace: "nowrap"
            }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <span>{c.shortName}</span>
              {sortable && <Icon sx={{ fontSize: 16, color: "text.secondary" }}>{getSortIcon(c.key)}</Icon>}
            </Stack>
          </TableCell>
        );
      }
    });

    if (optionalColumns.length > 0) {
      optionalColumns.forEach((c) => {
        const key = c.id;
        if (selectedColumns.indexOf(key) > -1) {
          result.push(
            <TableCell
              key={key}
              onClick={() => sortTableByKey(key)}
              sx={{ fontWeight: 500, textTransform: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <span>{c.title}</span>
                <Icon sx={{ fontSize: 16, color: "text.secondary" }}>{getSortIcon(key)}</Icon>
              </Stack>
            </TableCell>
          );
        }
      });
    }

    return (
      <TableHead>
        <TableRow>{result}</TableRow>
      </TableHead>
    );
  }, [columns, selectedColumns, optionalColumns, sortDirection, currentSortedCol, sortTableByKey]);

  const getResults = () => {
    if (people.length === 0) {
      return (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            {Locale.label("people.peopleSearchResults.noResMsg")}
          </Typography>
        </Box>
      );
    }

    if (filteredPeople.length === 0) {
      return (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No people in {registrationTab === "mobile" ? "Mobile" : "Admin"}.
          </Typography>
        </Box>
      );
    }

    return (
      <>
        <Table
          id="peopleTable"
          sx={{
            "& .MuiTableCell-root": {
              borderBottom: "1px solid var(--border-light)",
              py: 1.6
            },
            "& .MuiTableHead-root .MuiTableCell-root": { backgroundColor: "var(--bg-sub)" }
          }}>
          {headers}
          <TableBody>{rows}</TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredPeople.length}
          page={page}
          onPageChange={(_event, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
        />
      </>
    );
  };

  React.useEffect(() => {
    setPage(0);
  }, [people?.length, rowsPerPage, registrationTab]);

  if (!people) return <Loading />;

  return <Box>{getResults()}</Box>;
});

export { PeopleSearchResults };
