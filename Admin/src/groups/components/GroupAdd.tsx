import { Box, MenuItem, TextField } from "@mui/material";
import React from "react";
import { type GroupInterface, type GroupMemberInterface } from "@machonharuach/helpers";
import { ApiHelper, InputBox, ErrorMessages, Locale } from "@machonharuach/apphelper";
import { CategorySelect } from "./CategorySelect";
import UserContext from "../../UserContext";
import { MuiTelInput } from "mui-tel-input";

interface Props {
  updatedFunction: () => void;
  tags: string;
  categoryName?: string;
}

type CellGroupFields = {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  leaderName?: string;
  leaderPhone?: string;
};

const CATEGORY_SUGGESTIONS = [
  "Ministry", "Cell Groups", "Young Adults", "Men", "Women", "Youth", "Family", "Prayer"
];
const ADDRESS_OPTIONAL_CATEGORIES = new Set(["young adults", "men", "women", "youth", "family"]);
const COUNTRY_CODES = [
  "ZW",
  "ZM",
  "ZA",
  "BW",
  "NA",
  "MZ",
  "MW",
  "TZ",
  "KE",
  "UG",
  "RW",
  "BI",
  "NG",
  "GH",
  "ET",
  "EG",
  "SD",
  "AO",
  "CD",
  "CM",
  "SN",
  "CI",
  "DZ",
  "US",
  "CA",
  "MX",
  "BR",
  "AR",
  "CL",
  "CO",
  "PE",
  "UY",
  "VE",
  "GB",
  "IE",
  "FR",
  "DE",
  "NL",
  "BE",
  "ES",
  "PT",
  "IT",
  "CH",
  "AT",
  "SE",
  "NO",
  "DK",
  "FI",
  "PL",
  "CZ",
  "HU",
  "RO",
  "GR",
  "UA",
  "RU",
  "AE",
  "SA",
  "QA",
  "KW",
  "OM",
  "BH",
  "IL",
  "TR",
  "IN",
  "PK",
  "BD",
  "LK",
  "NP",
  "CN",
  "JP",
  "KR",
  "SG",
  "MY",
  "TH",
  "VN",
  "PH",
  "ID",
  "AU",
  "NZ"
];
const PHONE_MENU_PROPS = {
  PaperProps: {
    sx: {
      overflowY: "auto",
      scrollbarWidth: "none",
      msOverflowStyle: "none",
      "&::-webkit-scrollbar": {
        width: 0,
        height: 0,
        display: "none"
      },
      "& .MuiMenu-list": {
        overflowY: "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        "&::-webkit-scrollbar": {
          width: 0,
          height: 0,
          display: "none"
        }
      }
    }
  },
  MenuListProps: {
    sx: {
      scrollbarWidth: "none",
      msOverflowStyle: "none",
      "&::-webkit-scrollbar": {
        width: 0,
        height: 0,
        display: "none"
      }
    }
  }
};

export const GroupAdd: React.FC<Props> = (props) => {
  const [group, setGroup] = React.useState<GroupInterface & CellGroupFields>({ categoryName: props.categoryName || "", name: "", tags: props.tags });
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const context = React.useContext(UserContext);
  const countryOptions = React.useMemo(() => {
    const displayNames = typeof Intl !== "undefined" && "DisplayNames" in Intl
      ? new Intl.DisplayNames(["en"], { type: "region" })
      : null;
    return COUNTRY_CODES
      .map((code) => ({ code, name: displayNames?.of(code) || code }))
      .filter((item) => !!item.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);
  const categorySuggestions = React.useMemo(() => {
    if (props.tags === "standard") return CATEGORY_SUGGESTIONS.filter((c) => c !== "Ministry");
    return CATEGORY_SUGGESTIONS;
  }, [props.tags]);
  const handleCancel = () => {
    props.updatedFunction();
  };

  const handleAdd = async () => {
    if (validate()) {
      setIsSubmitting(true);
      try {
        const result = await ApiHelper.post("/groups", [group], "MembershipApi");
        // Auto-add creator as member for ministries
        if (props.tags === "ministry" && result?.[0]?.id && context?.person?.id) {
          const groupMember: GroupMemberInterface = {
            groupId: result[0].id,
            personId: context.person.id
          };
          await ApiHelper.post("/groupMembers", [groupMember], "MembershipApi");
        }
      } finally {
        setIsSubmitting(false);
        props.updatedFunction();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErrors([]);
    const g = { ...group } as GroupInterface & CellGroupFields;
    const value = e.target.value;
    switch (e.target.name) {
      case "name": g.name = value; break;
      case "address1": g.address1 = value; break;
      case "address2": g.address2 = value; break;
      case "city": g.city = value; break;
      case "state": g.state = value; break;
      case "country": g.country = value; break;
      case "zip": g.zip = value; break;
      case "leaderName": g.leaderName = value; break;
      case "leaderPhone": g.leaderPhone = value; break;
    }
    setGroup(g);
  };

  const handleCategoryChange = (value: string) => {
    setErrors([]);
    setGroup({ ...group, categoryName: value });
  };

  const handleLeaderPhoneChange = (value: string) => {
    setErrors([]);
    setGroup({ ...group, leaderPhone: value });
  };

  const requiresAddressFields = () => {
    const category = (group.categoryName || "").trim().toLowerCase();
    if (props.tags === "ministry") return !ADDRESS_OPTIONAL_CATEGORIES.has(category);
    if (props.tags === "standard") return category === "cell groups" || category === "cell group";
    return false;
  };

  const validate = () => {
    const result = [];
    if (props.tags !== "team" && !group.categoryName) result.push(Locale.label("groups.groupAdd.catReq"));
    if (!group.name) result.push(Locale.label("groups.groupAdd.groupReq"));
    if (requiresAddressFields()) {
      if (!group.address1) result.push("Address 1 is required.");
      if (!group.city) result.push("City is required.");
      if (!group.country) result.push("Country is required.");
    }
    if (props.tags === "ministry") {
      if (!group.leaderName) result.push("Group Leader Name is required.");
      if (!group.leaderPhone) result.push("Group Leader Number is required.");
    }
    setErrors(result);
    return result.length === 0;
  };

  let label = Locale.label("groups.groupAdd.group");
  if (props.tags === "team") label = Locale.label("groups.groupAdd.team");
  else if (props.tags === "ministry") label = Locale.label("groups.groupAdd.ministry");
  return (
    <InputBox headerText={Locale.label("groups.groupAdd.new") + label} headerIcon="group" cancelFunction={handleCancel} saveFunction={handleAdd} saveText={Locale.label("common.save")} isSubmitting={isSubmitting}>
      <ErrorMessages errors={errors} />
      {(props.tags === "standard" || props.tags === "ministry") && (
        <CategorySelect
          value={group.categoryName}
          onChange={handleCategoryChange}
          label={Locale.label("groups.groupAdd.catName")}
          tags={props.tags}
          testId="add-category-name"
          includeOptions={categorySuggestions}
          placeholder="Select a category"
        />
      )}
      <TextField
        fullWidth={true}
        label={Locale.label("common.name")}
        type="text"
        id="groupName"
        name="name"
        value={group.name}
        onChange={handleChange}
        placeholder={Locale.label("placeholders.group.name")}
        data-testid="add-group-name-input"
        aria-label="Group name"
      />
      {props.tags === "ministry" ? (
        <>
          <TextField
            fullWidth={true}
            label="Group Leader Name"
            type="text"
            name="leaderName"
            value={group.leaderName || ""}
            onChange={handleChange}
            placeholder="Leader full name"
            sx={{ mt: 2 }}
          />
          <MuiTelInput
            fullWidth={true}
            label="Group Leader Number"
            name="leaderPhone"
            value={group.leaderPhone || ""}
            onChange={handleLeaderPhoneChange}
            defaultCountry="ZW"
            forceCallingCode
            focusOnSelectCountry
            MenuProps={PHONE_MENU_PROPS}
            sx={{ mt: 2 }}
          />
          {requiresAddressFields() && (
            <>
              <TextField
                fullWidth={true}
                label="Address 1"
                type="text"
                name="address1"
                value={group.address1 || ""}
                onChange={handleChange}
                placeholder="Street address"
                sx={{ mt: 2 }}
              />
              <TextField
                fullWidth={true}
                label="Address 2"
                type="text"
                name="address2"
                value={group.address2 || ""}
                onChange={handleChange}
                placeholder="Apartment, suite, unit, etc. (optional)"
                sx={{ mt: 2 }}
              />
              <TextField
                fullWidth={true}
                label="Postal Code"
                type="text"
                name="zip"
                value={group.zip || ""}
                onChange={handleChange}
                placeholder="Postal or ZIP code"
                sx={{ mt: 2 }}
              />
              <TextField
                fullWidth={true}
                label="City"
                type="text"
                name="city"
                value={group.city || ""}
                onChange={handleChange}
                placeholder="City"
                sx={{ mt: 2 }}
              />
              <TextField
                fullWidth={true}
                label="State / Province"
                type="text"
                name="state"
                value={group.state || ""}
                onChange={handleChange}
                placeholder="State or province"
                sx={{ mt: 2 }}
              />
              <TextField
                fullWidth={true}
                label="Country"
                name="country"
                select
                value={group.country || ""}
                onChange={handleChange}
                sx={{ mt: 2 }}>
                <MenuItem value="">Select country</MenuItem>
                {countryOptions.map((option) => (
                  <MenuItem key={option.code} value={option.name}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <img
                        src={`https://flagcdn.com/w20/${option.code.toLowerCase()}.png`}
                        alt={`${option.name} flag`}
                        width={20}
                        height={14}
                        style={{ objectFit: "cover", borderRadius: 2 }}
                        loading="lazy"
                      />
                      <span>{option.name}</span>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
        </>
      ) : (
        <>
          <MuiTelInput
            fullWidth={true}
            label="Group Leader Number"
            name="leaderPhone"
            value={group.leaderPhone || ""}
            onChange={handleLeaderPhoneChange}
            defaultCountry="ZW"
            forceCallingCode
            focusOnSelectCountry
            MenuProps={PHONE_MENU_PROPS}
            sx={{ mt: 2 }}
          />
          {requiresAddressFields() && (
            <>
              <TextField
                fullWidth={true}
                label="Address 1"
                type="text"
                name="address1"
                value={group.address1 || ""}
                onChange={handleChange}
                placeholder="Street address"
                sx={{ mt: 2 }}
              />
              <TextField
                fullWidth={true}
                label="Address 2"
                type="text"
                name="address2"
                value={group.address2 || ""}
                onChange={handleChange}
                placeholder="Apartment, suite, unit, etc. (optional)"
                sx={{ mt: 2 }}
              />
              <TextField
                fullWidth={true}
                label="Postal Code"
                type="text"
                name="zip"
                value={group.zip || ""}
                onChange={handleChange}
                placeholder="Postal or ZIP code"
                sx={{ mt: 2 }}
              />
              <TextField
                fullWidth={true}
                label="City"
                type="text"
                name="city"
                value={group.city || ""}
                onChange={handleChange}
                placeholder="City"
                sx={{ mt: 2 }}
              />
              <TextField
                fullWidth={true}
                label="State / Province"
                type="text"
                name="state"
                value={group.state || ""}
                onChange={handleChange}
                placeholder="State or province"
                sx={{ mt: 2 }}
              />
              <TextField
                fullWidth={true}
                label="Country"
                name="country"
                select
                value={group.country || ""}
                onChange={handleChange}
                sx={{ mt: 2 }}>
                <MenuItem value="">Select country</MenuItem>
                {countryOptions.map((option) => (
                  <MenuItem key={option.code} value={option.name}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <img
                        src={`https://flagcdn.com/w20/${option.code.toLowerCase()}.png`}
                        alt={`${option.name} flag`}
                        width={20}
                        height={14}
                        style={{ objectFit: "cover", borderRadius: 2 }}
                        loading="lazy"
                      />
                      <span>{option.name}</span>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
        </>
      )}
    </InputBox>
  );
};
