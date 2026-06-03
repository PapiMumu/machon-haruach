import React, { memo } from "react";
import { UserHelper, Permissions } from "@machonharuach/apphelper";
import { Sermons } from "./components/Sermons";

export const SermonsPage = memo(() => {
  if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) return <></>;

  return (
    <Sermons />
  );
});
