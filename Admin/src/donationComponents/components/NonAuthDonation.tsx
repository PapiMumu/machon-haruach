"use client";

import React from "react";
import { ApiHelper } from "../../helpers";
import { Alert, Button, Stack } from "@mui/material";
import type { PaperProps } from "@mui/material/Paper";

interface Props {
  churchId: string;
  mainContainerCssProps?: PaperProps;
  showHeader?: boolean;
  recaptchaSiteKey: string;
  churchLogo?: string;
}

export const NonAuthDonation: React.FC<Props> = ({ mainContainerCssProps, showHeader, ...props }) => {
  const [donorboxUrl, setDonorboxUrl] = React.useState("");
  const [error, setError] = React.useState("");

  const init = () => {
    ApiHelper.get("/gateways/churchId/" + props.churchId, "GivingApi").then((data) => {
      if (!data?.length) {
        setError("No giving provider is configured for this church.");
        return;
      }

      const gateway = data[0];
      if ((gateway?.provider || "").toLowerCase() !== "donorbox") {
        setError("Donorbox is not configured for this church.");
        return;
      }

      if (!gateway?.publicKey) {
        setError("Donorbox campaign is missing. Please update giving settings.");
        return;
      }

      const campaignRef = gateway.publicKey.toString().trim();
      const normalizedUrl = campaignRef.startsWith("http")
        ? campaignRef
        : `https://donorbox.org/${campaignRef}`;
      setDonorboxUrl(normalizedUrl);
    });
  };

  React.useEffect(init, []);

  return (
    <Stack spacing={2}>
      {error && <Alert severity="warning">{error}</Alert>}
      {!!donorboxUrl && (
        <>
          <iframe
            title="Donorbox donation form"
            src={donorboxUrl}
            style={{
              width: "100%",
              minHeight: "760px",
              border: "0",
              borderRadius: "8px",
              ...mainContainerCssProps?.style
            }}
          />
          <Button
            variant="outlined"
            href={donorboxUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open secure donation page
          </Button>
        </>
      )}
    </Stack>
  );
};
