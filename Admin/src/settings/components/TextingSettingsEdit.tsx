import React from "react";
import { FormControl, InputLabel, MenuItem, Select, TextField, Grid, Typography, type SelectChangeEvent } from "@mui/material";
import { ApiHelper, ErrorMessages, UniqueIdHelper } from "@machonharuach/apphelper";
import { type TextingProviderInterface } from "@machonharuach/helpers";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
  onError?: (errors: string[]) => void;
}

export const TextingSettingsEdit: React.FC<Props> = (props) => {
  const [textingProvider, setTextingProvider] = React.useState<TextingProviderInterface>(null);
  const [provider, setProvider] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [apiSecret, setApiSecret] = React.useState("");
  const [fromNumber, setFromNumber] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    e.preventDefault();
    switch (e.target.name) {
      case "provider": setProvider(e.target.value); break;
      case "apiKey": setApiKey(e.target.value); break;
      case "apiSecret": setApiSecret(e.target.value); break;
      case "fromNumber": setFromNumber(e.target.value); break;
    }
  };

  const getCredentialFields = () => {
    if (provider === "") return null;

    if (provider === "Twilio") {
      return (
        <>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              name="apiKey"
              label="Account SID"
              value={apiKey}
              onChange={handleChange}
              autoComplete="off"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth name="apiSecret" label="Auth Token" value={apiSecret} onChange={handleChange} type="password" autoComplete="off" />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              name="fromNumber"
              label="From (phone or sender ID)"
              value={fromNumber}
              onChange={handleChange}
              placeholder="+14155551234 or ChurchName"
              helperText="E.164 phone number or approved alphanumeric sender ID (e.g. +263… for Zimbabwe)"
            />
          </Grid>
        </>
      );
    }

    if (provider === "TextInChurch" || provider === "Clearstream") {
      return (
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth name="apiKey" label="API Key" value={apiKey} onChange={handleChange} type="password" />
        </Grid>
      );
    }

    return (
      <>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth name="apiKey" label="API Key" value={apiKey} onChange={handleChange} type="password" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth name="apiSecret" label="API Secret" value={apiSecret} onChange={handleChange} type="password" />
        </Grid>
      </>
    );
  };

  const save = async () => {
    try {
      if (provider === "") {
        if (!UniqueIdHelper.isMissing(textingProvider?.id)) await ApiHelper.delete("/texting/providers/" + textingProvider.id, "MessagingApi");
      } else {
        const tp: TextingProviderInterface = textingProvider === null ? { churchId: props.churchId } : { ...textingProvider };
        tp.provider = provider;
        if (apiKey !== "" && apiKey !== "********") tp.apiKey = apiKey;
        if (apiSecret !== "" && apiSecret !== "********") tp.apiSecret = apiSecret;
        if (fromNumber.trim() !== "") tp.fromNumber = fromNumber.trim();
        tp.enabled = true;
        await ApiHelper.post("/texting/providers", [tp], "MessagingApi");
      }
    } catch (error: any) {
      let message = "Error saving texting settings.";
      if (error?.message) {
        try {
          const parsed = JSON.parse(error.message);
          message = parsed.message || error.message;
        } catch {
          message = error.message;
        }
      }
      setErrors([message]);
      if (props.onError) props.onError([message]);
    }
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  const loadData = async () => {
    const providers = await ApiHelper.get("/texting/providers", "MessagingApi");
    if (providers.length === 0) {
      setTextingProvider(null);
      setProvider("");
      setApiKey("");
      setApiSecret("");
      setFromNumber("");
    } else {
      setTextingProvider(providers[0]);
      setProvider(providers[0].provider || "");
      setApiKey(providers[0].apiKey || "");
      setApiSecret(providers[0].apiSecret || "");
      setFromNumber(providers[0].fromNumber || "");
    }
  };

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);
  React.useEffect(checkSave, [props.saveTrigger]);

  return (
    <>
      <ErrorMessages errors={errors} />
      <Grid container spacing={3} marginBottom={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl fullWidth>
            <InputLabel>Provider</InputLabel>
            <Select name="provider" label="Provider" value={provider || ""} onChange={handleChange}>
              <MenuItem value="">None</MenuItem>
              <MenuItem value="Twilio">Twilio (worldwide)</MenuItem>
              <MenuItem value="Clearstream">Clearstream (U.S. churches)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {provider === "Twilio" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              Create a free account at{" "}
              <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer">
                twilio.com
              </a>
              . In the{" "}
              <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer">
                Twilio Console
              </a>
              , copy your <strong>Account SID</strong> and <strong>Auth Token</strong>, buy or verify a phone number (or register an
              alphanumeric sender ID for your country), and enter it as <strong>From</strong>. Store member mobiles in E.164 format (e.g.{" "}
              <code>+263771234567</code>).
            </Typography>
          </Grid>
        )}
        {provider === "Clearstream" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              Create an API Key in your{" "}
              <a href="https://app.clearstream.io/settings/api/keys" target="_blank" rel="noopener noreferrer">
                Clearstream Account Settings
              </a>{" "}
              under API Keys.
            </Typography>
          </Grid>
        )}
        {provider === "TextInChurch" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              Visit{" "}
              <a href="https://textinchurch.com/support" target="_blank" rel="noopener noreferrer">
                Text In Church Support
              </a>{" "}
              to request developer API access. Once approved, create an API Key in your Account Settings &gt; Developer API section.
            </Typography>
          </Grid>
        )}
        {getCredentialFields()}
      </Grid>
    </>
  );
};
