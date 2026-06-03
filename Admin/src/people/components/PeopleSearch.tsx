import React, { useEffect, useCallback, useRef } from "react";
import { AdminPersonHelper } from ".";
import { type SearchCondition, type PersonInterface } from "@machonharuach/helpers";
import { InputBox, ApiHelper, Locale, HelpIcon } from "@machonharuach/apphelper";
import { TextField, Box, Typography, Stack } from "@mui/material";
import { AdvancedPeopleSearch } from "./AdvancedPeopleSearch";
import { SearchToolbarToggleButton } from "./SearchToolbarToggleButton";
import { Search as SearchIcon } from "@mui/icons-material";

interface Props {
  updateSearchResults: (people: PersonInterface[]) => void;
  updatedFunction?: () => void;
  onSearchCleared?: () => void;
  variant?: "boxed" | "inline";
  toolbarEnd?: React.ReactNode;
}

export function PeopleSearch(props: Props) {
  const variant = props.variant ?? "boxed";
  const [searchText, setSearchText] = React.useState("");
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const performSearch = useCallback((term: string, advancedConditions?: SearchCondition[]) => {
    if (advancedConditions && advancedConditions.length > 0) {
      // Advanced search with conditions
      ApiHelper.post("/people/advancedSearch", advancedConditions, "MembershipApi").then((data) => {
        props.updateSearchResults(data.map((d: PersonInterface) => AdminPersonHelper.getExpandedPersonObject(d)));
      });
    } else if (term.trim()) {
      // Simple search by name
      const condition: SearchCondition = { field: "displayName", operator: "contains", value: term.trim() };
      ApiHelper.post("/people/advancedSearch", [condition], "MembershipApi").then((data) => {
        props.updateSearchResults(data.map((d: PersonInterface) => AdminPersonHelper.getExpandedPersonObject(d)));
      });
    } else if (props.onSearchCleared) {
      props.onSearchCleared();
    }
  }, [props]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setSearchText(value);

    // Debounce the search
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 500); // 500ms debounce
  };

  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const advancedToggle = (
    <SearchToolbarToggleButton
      label={Locale.label("people.peopleSearch.adv")}
      expanded={showAdvanced}
      onClick={toggleAdvanced}
    />
  );

  const searchField = (
    <TextField
      fullWidth
      id="searchText"
      name="searchText"
      type="text"
      placeholder={Locale.label("people.peopleSearch.placeholder")}
      value={searchText}
      onChange={handleChange}
      data-testid="people-search-input"
      variant="outlined"
      size="small"
      InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} /> }}
    />
  );

  const searchContent = (
    <Stack spacing={2}>
      {variant === "inline" ? (
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ flex: 1, minWidth: 0 }}>{searchField}</Box>
            <HelpIcon article="docs/b1-admin/people/searching-people" />
            {advancedToggle}
            {props.toolbarEnd}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            Type to search instantly
          </Typography>
        </Box>
      ) : (
        <Box>
          {searchField}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            Type to search instantly
          </Typography>
        </Box>
      )}

      {variant !== "inline" && <Box>{advancedToggle}</Box>}

      {showAdvanced && (
        <AdvancedPeopleSearch
          updateSearchResults={props.updateSearchResults}
          toggleFunction={toggleAdvanced}
          updatedFunction={props.updatedFunction}
          embedded={true}
        />
      )}
    </Stack>
  );

  if (variant === "inline") {
    return (
      <Box id="peopleSearch">
        {searchContent}
      </Box>
    );
  }

  return (
    <InputBox
      id="peopleSearch"
      headerIcon="person"
      headerText={Locale.label("people.peopleSearch.simpSearch")}
      help="docs/b1-admin/people/searching-people"
    >
      {searchContent}
    </InputBox>
  );
}
