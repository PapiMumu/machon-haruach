import React from "react";
import { WebsiteScreen } from "@/components/WebsiteScreen";

import { useLocalSearchParams } from "expo-router";

const WebsiteUrl = () => {
  const { url, title, minimalHeader } = useLocalSearchParams<{ url: any; title: any; minimalHeader?: string }>();
  const isMinimalHeader = String(minimalHeader || "0") === "1";

  return <WebsiteScreen url={url} title={title} minimalHeader={isMinimalHeader} />;
};

export default WebsiteUrl;
