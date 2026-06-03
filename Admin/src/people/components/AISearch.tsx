import React from "react";
import { type PersonInterface } from "@machonharuach/helpers";
import { ApiHelper, DisplayBox, ErrorMessages, Locale } from "@machonharuach/apphelper";
import { Box, Button, Collapse, TextField, Typography } from "@mui/material";
import { AdminPersonHelper } from "../../helpers";
import { SearchToolbarToggleButton } from "./SearchToolbarToggleButton";

interface Props {
  updateSearchResults: (people: PersonInterface[]) => void;
  variant?: "boxed" | "inline";
  hideToggle?: boolean;
}

interface ToggleProps {
  expanded: boolean;
  onToggle: () => void;
}

export function AISearchToggle(props: ToggleProps) {
  return (
    <SearchToolbarToggleButton
      label={Locale.label("people.aiSearch.title")}
      expanded={props.expanded}
      onClick={props.onToggle}
    />
  );
}

export const AISearch = (props: Props) => {
  const variant = props.variant ?? "boxed";
  const [text, setText] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [expanded, setExpanded] = React.useState(false);

  const handleSearch = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // First, get the filters from AskApi
      const filters = await ApiHelper.post("/query/people", { query: text }, "AskApi");

      // Then use those filters to search for people
      const response = await ApiHelper.post("/people/advancedSearch", filters, "MembershipApi");

      props.updateSearchResults(response?.map((p: PersonInterface) => AdminPersonHelper.getExpandedPersonObject(p)));
    } catch (error) {
      setErrors([error as string]);
    } finally {
      setIsLoading(false);
      setText("");
    }
  };

  const searchForm = (
    <>
      <ErrorMessages errors={errors} />
      <TextField
        fullWidth
        multiline
        minRows={variant === "inline" ? 2 : 4}
        maxRows={6}
        placeholder={Locale.label("people.aiSearch.placeholder")}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
        }}
        data-testid="people-ai-search-input"
      />
      <Typography sx={{ fontSize: "12px", fontStyle: "italic", my: 1 }}>
        Examples:
        <br />
        - Show me men over 30 with birthdays in July.
        <br />- Show me women who are married.
      </Typography>
      <Button fullWidth variant="contained" onClick={handleSearch} disabled={isLoading || !text || text === ""}>
        {isLoading ? "Searching..." : "Search"}
      </Button>
    </>
  );

  if (variant === "inline" && props.hideToggle) {
    return <Box>{searchForm}</Box>;
  }

  if (variant === "inline") {
    return (
      <Box>
        <AISearchToggle expanded={expanded} onToggle={() => setExpanded(!expanded)} />
        <Collapse in={expanded}>
          <Box sx={{ pt: 1.5 }}>{searchForm}</Box>
        </Collapse>
      </Box>
    );
  }

  return (
    <DisplayBox headerText={Locale.label("people.aiSearch.title")} headerIcon="person_search">
      {searchForm}
    </DisplayBox>
  );
};
