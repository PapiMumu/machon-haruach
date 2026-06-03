import React from "react";
import { Box, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import { ApiHelper, type GenericSettingInterface, UniqueIdHelper } from "@machonharuach/apphelper";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
}

export const MobileSubscriptionSettingsEdit: React.FC<Props> = ({ churchId, saveTrigger }) => {
  const [settings, setSettings] = React.useState<Record<string, GenericSettingInterface | null>>({});
  const [enabled, setEnabled] = React.useState(true);
  const [trialDays, setTrialDays] = React.useState("7");
  const [monthlyAmount, setMonthlyAmount] = React.useState("");
  const [graceDays, setGraceDays] = React.useState("0");

  const settingValue = (keyName: string, fallback = ""): string => {
    return settings[keyName]?.value ?? fallback;
  };

  const save = async () => {
    const payload: GenericSettingInterface[] = [];
    const upsert = (keyName: string, value: string) => {
      const existing = settings[keyName];
      const s: GenericSettingInterface = existing || { churchId, public: 1, keyName };
      s.value = value;
      payload.push(s);
    };

    upsert("mobileSubscriptionEnabled", enabled ? "true" : "false");
    upsert("mobileSubscriptionTrialDays", String(Math.max(0, parseInt(trialDays || "0", 10) || 0)));
    upsert("mobileSubscriptionMonthlyAmount", monthlyAmount.trim());
    upsert("mobileSubscriptionGraceDays", String(Math.max(0, parseInt(graceDays || "0", 10) || 0)));
    await ApiHelper.post("/settings", payload, "MembershipApi");
  };

  const loadData = async () => {
    const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
    const keys = ["mobileSubscriptionEnabled", "mobileSubscriptionTrialDays", "mobileSubscriptionMonthlyAmount", "mobileSubscriptionGraceDays"];
    const found: Record<string, GenericSettingInterface | null> = {};
    keys.forEach((k) => {
      found[k] = allSettings.find((s) => s.keyName === k) || null;
    });
    setSettings(found);
    setEnabled((found.mobileSubscriptionEnabled?.value || "true").toLowerCase() !== "false");
    setTrialDays(found.mobileSubscriptionTrialDays?.value || "7");
    setMonthlyAmount(found.mobileSubscriptionMonthlyAmount?.value || "");
    setGraceDays(found.mobileSubscriptionGraceDays?.value || "0");
  };

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(churchId)) loadData();
  }, [churchId]);

  React.useEffect(() => {
    if (saveTrigger) save();
  }, [saveTrigger]);

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Configure how mobile account subscriptions should be enforced for this church.
      </Typography>
      <Stack spacing={2}>
        <FormControlLabel
          control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
          label="Enable mobile subscription enforcement"
        />
        <TextField
          label="Free trial days"
          type="number"
          value={trialDays}
          onChange={(e) => setTrialDays(e.target.value)}
          inputProps={{ min: 0 }}
        />
        <TextField
          label="Monthly amount (display/support)"
          value={monthlyAmount}
          onChange={(e) => setMonthlyAmount(e.target.value)}
          placeholder="e.g. 10.00 USD"
        />
        <TextField
          label="Grace period days after failed renewal"
          type="number"
          value={graceDays}
          onChange={(e) => setGraceDays(e.target.value)}
          inputProps={{ min: 0 }}
        />
      </Stack>
    </Box>
  );
};
