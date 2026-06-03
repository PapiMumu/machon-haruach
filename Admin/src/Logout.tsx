import React from "react";
import UserContext from "./UserContext";
import { LogoutPage } from "@machonharuach/apphelper-login";

export const Logout = () => {
  const context = React.useContext(UserContext);
  return <LogoutPage context={context} />;
};
