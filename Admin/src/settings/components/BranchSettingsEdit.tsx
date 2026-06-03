import React, { useEffect, useState } from "react";
import { Box, Icon, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { type GenericSettingInterface, UniqueIdHelper, ApiHelper } from "@machonharuach/apphelper";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
}

/**
 * Stores public branch definitions for the mobile "Branch Search" screen.
 * Value is JSON (array). Example:
 * [
 *   { "id": "kinshasa", "name": "Kinshasa (Main)" },
 *   { "id": "london", "name": "London" }
 * ]
 */
export const BranchSettingsEdit: React.FC<Props> = (props) => {
  const [value, setValue] = useState<string>("[]");
  const [setting, setSetting] = useState<GenericSettingInterface>(null);

  const save = () => {
    const s: GenericSettingInterface = setting === null ? { churchId: props.churchId, public: 1, keyName: "branches" } : setting;
    s.value = value || "[]";
    ApiHelper.post("/settings", [s], "MembershipApi");
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  const loadData = async () => {
    const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
    const found = allSettings.filter((s) => s.keyName === "branches");
    if (found.length > 0) {
      setSetting(found[0]);
      setValue(found[0].value || "[]");
    } else {
      setValue("[]");
    }
  };

  useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);
  useEffect(checkSave, [props.saveTrigger]);

  return (
    <Box sx={{ mb: 2.5, pb: 2.5, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: "none", mb: 0, pb: 0 } }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Branches (Mobile)</Typography>
        <Tooltip arrow title="Provide a JSON array of branches. This is public and is used by the Machon HaRuach mobile app for Branch Search.">
          <Icon fontSize="small" sx={{ cursor: "pointer", color: "text.disabled", ml: 0.5 }}>
            help_outline
          </Icon>
        </Tooltip>
      </Stack>

      <TextField
        fullWidth
        multiline
        minRows={6}
        name="branches"
        label="Branches JSON"
        value={value || ""}
        onChange={(e) => {
          e.preventDefault();
          setValue(e.target.value);
        }}
        helperText={'JSON array. Each item should include at least: { "id": "...", "name": "..." }'}
      />
    </Box>
  );
};

