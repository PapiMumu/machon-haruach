import React, { useState, useCallback } from "react";
import { Alert } from "@mui/material";
import { Roles, RoleEdit } from "./";
import { type ChurchInterface } from "@machonharuach/apphelper";

interface Props {
  church: ChurchInterface | null;
}

export const RolesTab = (props: Props) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("notset");

  const handleRoleUpdated = useCallback(() => {
    setSelectedRoleId("notset");
  }, []);

  const getSidebar = () => {
    const modules: JSX.Element[] = [];
    if (selectedRoleId !== "notset") {
      modules.push(<RoleEdit key="roleEdit" roleId={selectedRoleId} updatedFunction={handleRoleUpdated} />);
    }
    return modules;
  };

  return (
    <>
      <Alert severity="info" sx={{ mb: 2 }}>
        Assign admin access by role: open a role to add users, then choose which Machon HaRuach Admin pages and data they
        can use (Community, Giving, Ministry, Media, and more).
      </Alert>
      {getSidebar()}
      {props.church && <Roles selectRoleId={setSelectedRoleId} selectedRoleId={selectedRoleId} church={props.church} />}
    </>
  );
};
