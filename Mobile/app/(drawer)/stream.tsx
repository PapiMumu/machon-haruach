import React from "react";
import { useLocalSearchParams } from "expo-router";

import { LiveStreamViewScreen } from "@/components/stream/LiveStreamViewScreen";

function paramString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

const Stream = () => {
  const params = useLocalSearchParams<{
    url?: string | string[];
    title?: string | string[];
    embedUrl?: string | string[];
    provider?: string | string[];
    providerKey?: string | string[];
  }>();

  return (
    <LiveStreamViewScreen
      streamPageUrl={paramString(params.url)}
      title={paramString(params.title)}
      embedUrl={paramString(params.embedUrl) || null}
      provider={paramString(params.provider)}
      providerKey={paramString(params.providerKey)}
    />
  );
};

export default Stream;
