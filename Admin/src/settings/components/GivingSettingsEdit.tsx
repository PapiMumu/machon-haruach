import React from "react";
import { FormControl, InputLabel, MenuItem, Select, TextField, Grid, Stack, Switch, Typography, Tooltip, IconButton, Button, type SelectChangeEvent } from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
import { ApiHelper, ErrorMessages, Locale, UniqueIdHelper } from "@machonharuach/apphelper";
import { type PaymentGatewaysInterface } from "../../helpers";
import { FeeOptionsSettingsEdit } from "./FeeOptionsSettingsEdit";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
  onError?: (errors: string[]) => void;
}

export const GivingSettingsEdit: React.FC<Props> = (props) => {
  const [gateways, setGateways] = React.useState<PaymentGatewaysInterface[]>([]);
  const [gateway, setGateway] = React.useState<PaymentGatewaysInterface>(null);
  const [provider, setProvider] = React.useState("");
  const [publicKey, setPublicKey] = React.useState("");
  const [privateKey, setPrivateKey] = React.useState("");
  const [environment, setEnvironment] = React.useState<string>("");
  const [payFees, setPayFees] = React.useState<boolean>(false);
  const [currency, setCurrency] = React.useState("usd");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);

  const normalizeProvider = (value: string | null | undefined): string => {
    const normalized = (value || "").trim().toLowerCase();
    if (normalized === "ecocash") return "Ecocash";
    if (normalized === "paynow") return "Paynow";
    if (normalized === "paypal") return "Paypal";
    if (normalized === "stripe") return "Stripe";
    return value || "";
  };

  //these are just temporary until we get the list as per the languages we support
  const stripeSupportedCurrencies = [
    "usd", "eur", "gbp", "cad", "aud", "inr", "jpy", "sgd", "hkd", "sek", "nok", "dkk", "chf", "mxn", "brl"
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    e.preventDefault();
    switch (e.target.name) {
      case "provider": {
        const nextProvider = normalizeProvider(e.target.value);
        setProvider(nextProvider);
        setErrors([]);
        const selectedGateway = gateways.find((g) => normalizeProvider(g.provider) === nextProvider) || null;
        setGateway(selectedGateway);
        setPublicKey(selectedGateway?.publicKey || "");
        setPrivateKey("");
        setPayFees(selectedGateway?.payFees ?? false);
        setCurrency(selectedGateway?.currency || "usd");
        setEnvironment(selectedGateway?.environment || "");
        break;
      }
      case "publicKey": setPublicKey(e.target.value); break;
      case "privateKey": setPrivateKey(e.target.value); break;
      case "environment": setEnvironment(e.target.value); break;
      case "currency": setCurrency(e.target.value); break;
    }
  };

  const getKeys = () => {
    if (provider === "") return null;
    else {
      const publicLabel = provider === "Paypal"
        ? Locale.label("settings.givingSettingsEdit.clientId") || "Client ID"
        : provider === "Ecocash"
          ? "Merchant Code"
          : provider === "Paynow"
            ? "Integration ID"
              : Locale.label("settings.givingSettingsEdit.pubKey");
      const privateLabel = provider === "Paypal"
        ? Locale.label("settings.givingSettingsEdit.clientSecret") || "Client Secret"
        : provider === "Ecocash"
          ? "API Key"
          : provider === "Paynow"
            ? "Integration Key"
              : Locale.label("settings.givingSettingsEdit.secKey");

      return (
        <>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth name="publicKey" label={publicLabel} value={publicKey} onChange={handleChange} placeholder={Locale.label("placeholders.giving.publicKey")} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth name="privateKey" label={privateLabel} value={privateKey} placeholder={Locale.label("settings.giving.secretPlaceholder")} type="password" onChange={handleChange} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" alignItems="center">
              <Typography>{Locale.label("settings.givingSettingsEdit.transFee")}</Typography>
              <Tooltip title={Locale.label("settings.givingSettingsEdit.forceMsg")} arrow>
                <IconButton data-testid="force-ssl-help-button" aria-label="Force SSL help">
                  <HelpIcon />
                </IconButton>
              </Tooltip>
              <Switch
                checked={payFees === true}
                onChange={(e) => {
                  setPayFees(e.target.checked);
                }}
              />
            </Stack>
          </Grid>
        </>
      );
    }
  };

  // Currency selection hidden for now - defaulting to USD
  const getCurrency = () => {
    if (provider !== "Stripe") return null;
    return (
      <div style={{ display: "none" }}>
        <Typography variant="body2" color="textSecondary" component="div">Make sure this currency is also enabled in your Stripe Dashboard. Enable currency here: <a href="https://dashboard.stripe.com/settings/currencies" target="_blank" rel="noopener noreferrer">{Locale.label("settings.givingSettingsEdit.stripeDashboard")}</a></Typography>
        <FormControl fullWidth>
          <InputLabel>Currency</InputLabel>
          <Select name="currency" label="Currency" value={currency} onChange={handleChange}>
            {stripeSupportedCurrencies.map((c) => <MenuItem key={c} value={c}>{c.toUpperCase()}</MenuItem>)}
          </Select>
        </FormControl>
      </div>
    );
  };

  const getEnvironment = () => {
    if (provider !== "Ecocash" && provider !== "Paynow") return null;
    return (
      <Grid size={{ xs: 12, md: 4 }}>
        <FormControl fullWidth>
          <InputLabel>Environment</InputLabel>
          <Select name="environment" label="Environment" value={environment || ""} onChange={handleChange}>
            <MenuItem value="">Live</MenuItem>
            <MenuItem value="sandbox">Sandbox</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    );
  };

  const save = async () => {
    try {
      setErrors([]);
      setIsSaving(true);
      if (provider === "") {
        if (!UniqueIdHelper.isMissing(gateway?.id)) await ApiHelper.delete("/gateways/" + gateway.id, "GivingApi");
        await loadData();
      } else {
        const existingGateway = gateways.find((g) => normalizeProvider(g.provider) === normalizeProvider(provider)) || null;
        if (privateKey === "" && UniqueIdHelper.isMissing(existingGateway?.id)) {
          setErrors(["Secret/API Key is required to save a new gateway. (For security, we do not display saved secret keys after reload.)"]);
          setIsSaving(false);
          return;
        }
        const gw: PaymentGatewaysInterface = existingGateway === null ? { churchId: props.churchId } : { ...existingGateway };
        gw.provider = normalizeProvider(provider);
        gw.publicKey = publicKey;
        gw.payFees = payFees;
        gw.currency = currency;
        gw.environment = environment || null;
        if (provider === "Paynow") {
          gw.settings = {
            integrationId: publicKey,
            sandboxMode: environment === "sandbox"
          };
        } else if (provider === "Ecocash") {
          gw.settings = { sandboxMode: environment === "sandbox" };
        } else {
          gw.settings = null;
        }
        if (privateKey !== "") gw.privateKey = privateKey;
        await ApiHelper.post("/gateways", [gw], "GivingApi");
        // POST returns only the row(s) just saved; reload from GET so `gateways` lists every provider (Stripe + EcoCash + …).
        await loadData();
        setPrivateKey("");
      }
    } catch (error: any) {
      let message = Locale.label("settings.givingSettingsEdit.saveError");
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
    } finally {
      setIsSaving(false);
    }
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  const loadData = async () => {
    // Load for the specific church being edited (avoids showing blank if the user context differs).
    const allGateways = await ApiHelper.get("/gateways/churchId/" + props.churchId, "GivingApi");
    setGateways(allGateways);
    if (allGateways.length === 0) {
      setGateway(null);
      setProvider("");
      setPublicKey("");
      setPayFees(false);
      setCurrency("usd");
      setEnvironment("");
    } else {
      // Keep current provider selection if it exists; otherwise default to first configured provider.
      const preferredProvider =
        provider && allGateways.some((g: PaymentGatewaysInterface) => normalizeProvider(g.provider) === normalizeProvider(provider))
          ? normalizeProvider(provider)
          : normalizeProvider(allGateways[0].provider || "");
      const selectedGateway = allGateways.find((g: PaymentGatewaysInterface) => normalizeProvider(g.provider) === preferredProvider) || allGateways[0];
      setGateway(selectedGateway);
      setProvider(normalizeProvider(selectedGateway.provider || ""));
      setPublicKey(selectedGateway.publicKey || "");
      setPayFees(selectedGateway.payFees ?? false);
      setCurrency(selectedGateway.currency || "usd");
      setEnvironment(selectedGateway.environment || "");
    }
    setPrivateKey("");
  };

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);
  React.useEffect(checkSave, [props.saveTrigger]);

  return (
    <>
      <ErrorMessages errors={errors} />
      {/* <div className="subHead">{Locale.label("settings.givingSettingsEdit.giving")}</div> */}
      <Grid container spacing={3} marginBottom={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl fullWidth>
            <InputLabel>{Locale.label("settings.givingSettingsEdit.prov")}</InputLabel>
            <Select name="provider" label={Locale.label("settings.givingSettingsEdit.prov")} value={provider || ""} onChange={handleChange}>
              <MenuItem value="">{Locale.label("settings.givingSettingsEdit.none")}</MenuItem>
              <MenuItem value="Stripe">Stripe</MenuItem>
              <MenuItem value="Paypal">PayPal</MenuItem>
              <MenuItem value="Ecocash">EcoCash</MenuItem>
              <MenuItem value="Paynow">Paynow</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {gateways.length > 0 ? (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary" component="div">
              {gateways.length === 1
                ? Locale.label("settings.givingSettingsEdit.multiGatewaySummarySingle")
                : Locale.label("settings.givingSettingsEdit.multiGatewaySummaryPlural", { count: gateways.length })}{" "}
              <strong>
                {gateways
                  .map((g) => normalizeProvider(g.provider || "").trim())
                  .filter(Boolean)
                  .join(", ")}
              </strong>
            </Typography>
          </Grid>
        ) : null}
        {provider === "Stripe" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              {Locale.label("settings.givingSettingsEdit.stripeVisit")} <a href="https://dashboard.stripe.com/" target="_blank" rel="noopener noreferrer">{Locale.label("settings.givingSettingsEdit.stripeDashboard")}</a> {Locale.label("settings.givingSettingsEdit.stripeGoTo")} <strong>{Locale.label("settings.givingSettingsEdit.developersApiKeys")}</strong> {Locale.label("settings.givingSettingsEdit.stripeCopyKeys")}
            </Typography>
          </Grid>
        )}
        {provider === "Paypal" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              {Locale.label("settings.givingSettingsEdit.paypalGoTo")} <a href="https://developer.paypal.com/" target="_blank" rel="noopener noreferrer">{Locale.label("settings.givingSettingsEdit.paypalDeveloper")}</a>, {Locale.label("settings.givingSettingsEdit.paypalLogin")} <strong>{Locale.label("settings.givingSettingsEdit.apiCredentials")}</strong> {Locale.label("settings.givingSettingsEdit.paypalCreateApp")}
            </Typography>
          </Grid>
        )}
        {provider === "Ecocash" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              Create an app in the EcoCash developer portal, then paste your <strong>Merchant Code</strong> and <strong>API Key</strong> above. Polling is used for status confirmation (webhooks not enabled yet).
            </Typography>
          </Grid>
        )}
        {provider === "Paynow" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              Enter your Paynow <strong>Integration ID</strong> as the Public Key and your <strong>Integration Key</strong> as the Secret Key. Redirect + polling is used to confirm payment status.
            </Typography>
          </Grid>
        )}
        {getKeys()}
        {getEnvironment()}
        {getCurrency()}
      </Grid>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" color="primary" onClick={save} disabled={isSaving || UniqueIdHelper.isMissing(props.churchId)}>
          {isSaving ? "Saving…" : "Save Giving"}
        </Button>
      </Stack>
      <FeeOptionsSettingsEdit churchId={props.churchId} saveTrigger={props.saveTrigger} provider={provider} currency={currency} />
    </>
  );
};
