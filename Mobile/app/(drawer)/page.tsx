import React from "react";
import { WebsiteScreen } from "@/components/WebsiteScreen";

import { Redirect, useLocalSearchParams } from "expo-router";

const Page = () => {
  const { url, title, minimalHeader } = useLocalSearchParams<{ url: any; title: any; minimalHeader?: string }>();
  const isMinimalHeader = String(minimalHeader || "0") === "1";

  if (!url) {
    return <Redirect href="/dashboard" />;
  }

  return <WebsiteScreen url={url} title={title} minimalHeader={isMinimalHeader} />;
};

export default Page;
