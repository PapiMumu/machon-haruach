import React, { memo, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Permissions, UserHelper, type PersonInterface } from "@machonharuach/helpers";
import { Locale } from "@machonharuach/apphelper";
import { PeopleSearchResults, PeopleColumns } from "./components";
import { ExportLink } from "@machonharuach/apphelper";
import { Box, Typography, Card, Stack, Button, Collapse } from "@mui/material";
import { AdminPersonHelper } from "../helpers";
import { PeopleSearch } from "./components/PeopleSearch";
import { CreatePerson } from "../components/CreatePerson";
import { Search as SearchIcon, People as PeopleIcon, PersonAdd as PersonAddIcon, FileDownload as ExportIcon } from "@mui/icons-material";
import { PageHeader } from "@machonharuach/apphelper";
import { useQuery } from "@tanstack/react-query";
import { AISearch, AISearchToggle } from "./components/AISearch";
import { PeopleRegistrationTabs } from "./components/PeopleRegistrationTabs";
import { PeopleMobileSummaryCards } from "./components/PeopleMobileSummaryCards";
import { usePeopleRegistrationGroups } from "./helpers/usePeopleRegistrationGroups";

const DEFAULT_RECENT_LIMIT = 200;
const SEARCH_RESULT_LIMIT = 1000;
const PREVIOUS_DEFAULT_COLUMNS = ["displayName", "membershipStatus", "subscriptionStatus", "email", "phone"];
const DEFAULT_COLUMNS = [...PREVIOUS_DEFAULT_COLUMNS, "gender", "birthDate"];

export const PeoplePage = memo(() => {
  const [searchResults, setSearchResults] = React.useState<PersonInterface[]>([]);
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>(DEFAULT_COLUMNS);
  const [isSearchPerformed, setIsSearchPerformed] = React.useState(false);
  const [totalMatches, setTotalMatches] = React.useState(0);
  const [isTruncated, setIsTruncated] = React.useState(false);
  const [aiSearchExpanded, setAiSearchExpanded] = React.useState(false);
  const [addPersonOpen, setAddPersonOpen] = React.useState(false);
  const navigate = useNavigate();
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.people.edit);

  const recentPeople = useQuery<PersonInterface[]>({
    queryKey: ["/people/recent", "MembershipApi"],
    placeholderData: []
  });

  const refetch = useCallback(() => {
    recentPeople.refetch();
  }, [recentPeople]);

  const applySearchResults = useCallback((people: PersonInterface[], markSearch = true) => {
    const total = people?.length || 0;
    const limited = (people || []).slice(0, SEARCH_RESULT_LIMIT);
    setSearchResults(limited);
    setTotalMatches(total);
    setIsTruncated(total > SEARCH_RESULT_LIMIT);
    if (markSearch) setIsSearchPerformed(true);
  }, []);

  const columns = [
    { key: "displayName", label: Locale.label("person.displayName"), shortName: Locale.label("common.name") },
    { key: "lastName", label: Locale.label("person.lastName"), shortName: Locale.label("people.peoplePage.last") },
    { key: "firstName", label: Locale.label("person.firstName"), shortName: Locale.label("people.peoplePage.first") },
    { key: "middleName", label: Locale.label("person.middleName"), shortName: Locale.label("people.peoplePage.middle") },
    { key: "address", label: Locale.label("person.address"), shortName: Locale.label("person.address") },
    { key: "city", label: Locale.label("person.city"), shortName: Locale.label("person.city") },
    { key: "state", label: Locale.label("person.state"), shortName: Locale.label("person.state") },
    { key: "zip", label: Locale.label("person.zip"), shortName: Locale.label("person.zip") },
    { key: "country", label: Locale.label("person.country"), shortName: Locale.label("person.country") },
    { key: "email", label: Locale.label("people.peoplePage.primEmail"), shortName: Locale.label("person.email") },
    { key: "phone", label: Locale.label("people.peoplePage.primPhone"), shortName: Locale.label("person.phone") },
    { key: "birthDate", label: Locale.label("person.birthDate"), shortName: "Date of Birth" },
    { key: "birthDay", label: Locale.label("people.peoplePage.bDayNo"), shortName: Locale.label("people.peoplePage.bDay") },
    { key: "age", label: Locale.label("person.age"), shortName: Locale.label("person.age") },
    { key: "gender", label: Locale.label("person.gender"), shortName: Locale.label("person.gender") },
    { key: "membershipStatus", label: Locale.label("person.membershipStatus"), shortName: "Status" },
    { key: "subscriptionStatus", label: "Subscription", shortName: "Subscription" },
    { key: "maritalStatus", label: Locale.label("person.maritalStatus"), shortName: Locale.label("person.married") },
    { key: "anniversary", label: Locale.label("person.anniversary"), shortName: Locale.label("person.anniversary") },
    { key: "nametagNotes", label: Locale.label("people.peoplePage.nameNote"), shortName: Locale.label("common.notes") },
    { key: "deleteOption", label: Locale.label("people.peoplePage.deleteOp"), shortName: Locale.label("common.delete") }
  ];

  const handleToggleColumn = (key: string) => {
    const sc = [...selectedColumns];
    const index = sc.indexOf(key);
    if (index === -1) sc.push(key);
    else sc.splice(index, 1);
    sessionStorage.setItem("selectedColumns", JSON.stringify(sc));
    setSelectedColumns(sc);
  };

  // Removed getEditContent - functionality moved to header

  React.useEffect(() => {
    const storedColumns = sessionStorage.getItem("selectedColumns");
    if (storedColumns) {
      const parsedColumns = (JSON.parse(storedColumns) as string[]).filter((c) => c !== "photo");
      // Upgrade old minimal layout to a richer default member table.
      const matchesPreviousDefault =
        parsedColumns.length === PREVIOUS_DEFAULT_COLUMNS.length &&
        PREVIOUS_DEFAULT_COLUMNS.every((col, i) => parsedColumns[i] === col);
      if (parsedColumns.length <= 1 && parsedColumns.includes("displayName")) {
        sessionStorage.setItem("selectedColumns", JSON.stringify(DEFAULT_COLUMNS));
        setSelectedColumns(DEFAULT_COLUMNS);
      } else if (matchesPreviousDefault) {
        sessionStorage.setItem("selectedColumns", JSON.stringify(DEFAULT_COLUMNS));
        setSelectedColumns(DEFAULT_COLUMNS);
      } else {
        const columnsToUse = parsedColumns.length > 0 ? parsedColumns : DEFAULT_COLUMNS;
        sessionStorage.setItem("selectedColumns", JSON.stringify(columnsToUse));
        setSelectedColumns(columnsToUse);
      }
    } else {
      sessionStorage.setItem("selectedColumns", JSON.stringify(DEFAULT_COLUMNS));
    }
  }, []);

  const expandedRecentPeople = useMemo(() => {
    if (!recentPeople.data) return [];
    return recentPeople.data.map((d: PersonInterface) => AdminPersonHelper.getExpandedPersonObject(d));
  }, [recentPeople.data]);

  const { registrationTab, setRegistrationTab, registrationCounts, mobileSubscriptionSummary, subscriptionByPersonId } =
    usePeopleRegistrationGroups(searchResults);

  const clearSearch = useCallback(() => {
    setIsSearchPerformed(false);
    const limitedRecent = expandedRecentPeople.slice(0, DEFAULT_RECENT_LIMIT);
    setSearchResults(limitedRecent);
    setTotalMatches(expandedRecentPeople.length);
    setIsTruncated(expandedRecentPeople.length > DEFAULT_RECENT_LIMIT);
  }, [expandedRecentPeople]);

  React.useEffect(() => {
    if (recentPeople.data && !isSearchPerformed) {
      const limitedRecent = expandedRecentPeople.slice(0, DEFAULT_RECENT_LIMIT);
      setSearchResults(limitedRecent);
      setTotalMatches(expandedRecentPeople.length);
      setIsTruncated(expandedRecentPeople.length > DEFAULT_RECENT_LIMIT);
    }
  }, [expandedRecentPeople, isSearchPerformed]);

  return (
    <>
      <PageHeader
        title={Locale.label("people.peoplePage.searchPpl")}
        subtitle={
          searchResults
            ? isSearchPerformed
              ? Locale.label("people.peoplePage.showingMatching", "Showing {count} of {total} matching people")
                  .replace("{count}", String(searchResults.length))
                  .replace("{total}", String(totalMatches))
              : Locale.label("people.peoplePage.showingRegistered", "Showing {count} registered people").replace(
                  "{count}",
                  String(searchResults.length)
                )
            : recentPeople.isLoading
              ? Locale.label("people.peoplePage.loadingPeople", "Loading registered people...")
              : Locale.label("people.peoplePage.noPeopleFound", "No registered people found")
        }>
        <SearchIcon
          sx={{
            fontSize: 32,
            color: "rgba(255,255,255,0.8)",
            cursor: "pointer",
            "&:hover": {
              color: "#FFF",
              transform: "scale(1.1)"
            },
            transition: "all 0.2s ease",
            mr: 2
          }}
          onClick={() => {
            const searchPanel = document.getElementById("peopleSearch");
            if (searchPanel) {
              searchPanel.scrollIntoView({ behavior: "smooth", block: "start" });
              // Focus on the search input after scrolling
              setTimeout(() => {
                const searchInput = document.getElementById("searchText") || document.querySelector('[data-testid="people-search-input"]');
                if (searchInput) {
                  (searchInput as HTMLElement).focus();
                }
              }, 500);
            }
          }}
        />
        {canEdit && (
          <Button
            variant="outlined"
            sx={{
              color: "#FFF",
              borderColor: "rgba(255,255,255,0.5)",
              "&:hover": {
                borderColor: "#FFF",
                backgroundColor: "rgba(255,255,255,0.1)"
              }
            }}
            startIcon={<PersonAddIcon />}
            onClick={() => setAddPersonOpen(true)}>
            {Locale.label("people.peoplePage.addPerson")}
          </Button>
        )}
      </PageHeader>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        {searchResults.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <PeopleRegistrationTabs
              value={registrationTab}
              onChange={setRegistrationTab}
              mobileCount={registrationCounts.mobile}
              adminCount={registrationCounts.admin}
            />
          </Box>
        )}
        {registrationTab === "mobile" && searchResults.length > 0 && (
          <PeopleMobileSummaryCards
            registered={mobileSubscriptionSummary.registered}
            active={mobileSubscriptionSummary.active}
            inactive={mobileSubscriptionSummary.inactive}
          />
        )}
        <Card>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <PeopleIcon />
                <Typography variant="h6">
                  {isSearchPerformed
                    ? Locale.label("people.peoplePage.searchResults", "Search Results")
                    : Locale.label("people.peoplePage.recentPpl", "Registered People")}
                </Typography>
                {registrationTab !== "mobile" && (
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1,
                      py: 0.3,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.14)",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      color: "text.secondary",
                      fontWeight: 500
                    }}>
                    Registered: {totalMatches}
                  </Typography>
                )}
                {isTruncated && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    Display limited to {isSearchPerformed ? SEARCH_RESULT_LIMIT : DEFAULT_RECENT_LIMIT} rows. Refine filters for precision.
                  </Typography>
                )}
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                {searchResults && (
                  <Button size="small" variant="outlined" startIcon={<ExportIcon />} component={ExportLink} data={searchResults} filename="people.csv" sx={{ mr: 1 }}>
                    Export
                  </Button>
                )}
                <PeopleColumns selectedColumns={selectedColumns} toggleColumn={handleToggleColumn} columns={columns} />
              </Stack>
            </Stack>
          </Box>
          <Box sx={{ px: 2, py: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1.5}>
              <PeopleSearch
                variant="inline"
                updateSearchResults={(people) => applySearchResults(people, true)}
                updatedFunction={refetch}
                onSearchCleared={clearSearch}
                toolbarEnd={<AISearchToggle expanded={aiSearchExpanded} onToggle={() => setAiSearchExpanded((prev) => !prev)} />}
              />
              <Collapse in={aiSearchExpanded}>
                <AISearch variant="inline" hideToggle updateSearchResults={(people) => applySearchResults(people, true)} />
              </Collapse>
            </Stack>
          </Box>
          <Box>
            <PeopleSearchResults
              people={searchResults}
              columns={columns}
              selectedColumns={selectedColumns}
              registrationTab={registrationTab}
              subscriptionByPersonId={subscriptionByPersonId}
              updateSearchResults={(people) => applySearchResults(people, isSearchPerformed)}
              updatedFunction={refetch}
            />
          </Box>
        </Card>
      </Box>
      {addPersonOpen && (
        <CreatePerson
          showInModal
          onClose={() => setAddPersonOpen(false)}
          onCreate={(person) => {
            refetch();
            navigate("/people/" + person.id);
          }}
        />
      )}
    </>
  );
});
