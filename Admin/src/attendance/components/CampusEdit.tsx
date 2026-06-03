import React from "react";
import { IconButton, InputAdornment, TextField, Tooltip } from "@mui/material";
import { ContentCopy as ContentCopyIcon } from "@mui/icons-material";
import { type CampusInterface } from "@machonharuach/helpers";
import { InputBox, ApiHelper, ErrorMessages, Locale } from "@machonharuach/apphelper";

interface Props {
  campus: CampusInterface;
  updatedFunction: () => void;
}

type CampusExt = CampusInterface & {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
};

/** Ensures every save payload includes address fields so JSON.stringify does not omit keys (omitted keys become NULL in the API UPDATE and wipe DB columns). */
function normalizeCampusForSave(c: CampusExt): CampusExt {
  return {
    ...c,
    id: c.id,
    churchId: c.churchId,
    name: c.name ?? "",
    address1: c.address1 ?? "",
    address2: c.address2 ?? "",
    city: c.city ?? "",
    state: c.state ?? "",
    zip: c.zip ?? "",
    country: c.country ?? "",
    phone: c.phone ?? "",
    importKey: c.importKey
  };
}

export const CampusEdit: React.FC<Props> = (props) => {
  const [campus, setCampus] = React.useState({} as CampusExt);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [campusIdCopied, setCampusIdCopied] = React.useState(false);

  const copyCampusId = () => {
    const id = campus.id?.toString() || "";
    if (!id) return;
    void navigator.clipboard.writeText(id).then(() => {
      setCampusIdCopied(true);
      window.setTimeout(() => setCampusIdCopied(false), 2000);
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErrors([]);
    const c = { ...campus } as CampusExt;
    const value = e.target.value;
    switch (e.target.name) {
      case "name": c.name = value; break;
      case "address1": c.address1 = value; break;
      case "address2": c.address2 = value; break;
      case "city": c.city = value; break;
      case "state": c.state = value; break;
      case "zip": c.zip = value; break;
      case "country": c.country = value; break;
      case "phone": c.phone = value; break;
    }
    setCampus(c);
  };

  const validate = () => {
    const result = [];
    if (!campus.name) result.push(Locale.label("attendance.campusEdit.validate.name"));
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      setIsSubmitting(true);
      ApiHelper.post("/campuses", [normalizeCampusForSave(campus)], "AttendanceApi")
        .then(props.updatedFunction)
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("attendance.campusEdit.confirmDelete"))) ApiHelper.delete("/campuses/" + campus.id, "AttendanceApi").then(props.updatedFunction);
  };

  React.useEffect(() => {
    if (props.campus === null || props.campus === undefined) {
      setCampus({} as CampusExt);
      return;
    }
    setCampus(normalizeCampusForSave(props.campus as CampusExt));
  }, [props.campus]);

  if (campus === null || campus.id === undefined) return null;

  return (
    <InputBox
      id="campusBox"
      data-cy="campus-box"
      cancelFunction={props.updatedFunction}
      saveFunction={handleSave}
      deleteFunction={props.campus?.id ? handleDelete : null}
      headerText={campus.name}
      headerIcon="church"
      isSubmitting={isSubmitting}
      help="docs/b1-admin/attendance/">
      <ErrorMessages errors={errors} />
      <TextField
        fullWidth
        label="Campus ID"
        value={campus.id || ""}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={campusIdCopied ? "Copied" : "Copy for Branches JSON / integrations"}>
                <span>
                  <IconButton edge="end" onClick={copyCampusId} aria-label="Copy campus id" size="small" disabled={!campus.id}>
                    <ContentCopyIcon fontSize="small" color={campusIdCopied ? "success" : "action"} />
                  </IconButton>
                </span>
              </Tooltip>
            </InputAdornment>
          )
        }}
        helperText='Paste into Settings → General → Branches (Mobile) JSON as the "id" field so it matches this campus in Attendance.'
        data-testid="campus-id-readonly"
      />
      <TextField
        fullWidth
        label={Locale.label("attendance.campusEdit.name")}
        id="name"
        name="name"
        type="text"
        value={campus.name}
        onChange={handleChange}
        placeholder={Locale.label("placeholders.campus.name")}
        data-testid="campus-name-input"
        aria-label="Campus name"
      />
      <TextField
        fullWidth
        label="Country"
        id="country"
        name="country"
        type="text"
        value={campus.country || ""}
        onChange={handleChange}
        placeholder="e.g. Zimbabwe"
      />
      <TextField
        fullWidth
        label="Address 1"
        id="address1"
        name="address1"
        type="text"
        value={campus.address1 || ""}
        onChange={handleChange}
        placeholder="Street address"
      />
      <TextField
        fullWidth
        label="Address 2"
        id="address2"
        name="address2"
        type="text"
        value={campus.address2 || ""}
        onChange={handleChange}
        placeholder="Suite, building, etc. (optional)"
      />
      <TextField
        fullWidth
        label="City"
        id="city"
        name="city"
        type="text"
        value={campus.city || ""}
        onChange={handleChange}
      />
      <TextField
        fullWidth
        label="State / Province"
        id="state"
        name="state"
        type="text"
        value={campus.state || ""}
        onChange={handleChange}
      />
      <TextField
        fullWidth
        label="Postal code"
        id="zip"
        name="zip"
        type="text"
        value={campus.zip || ""}
        onChange={handleChange}
      />
      <TextField
        fullWidth
        label="Phone"
        id="phone"
        name="phone"
        type="tel"
        value={campus.phone || ""}
        onChange={handleChange}
        placeholder="e.g. +263 77 617 1500"
      />
    </InputBox>
  );
};
