import React from "react";
import { GroupBanner, GroupDetailsEdit, GroupNavigation } from "./components";
import { type GroupInterface } from "@machonharuach/helpers";
import { useParams } from "react-router-dom";
import { GroupMembersTab } from "./components/GroupMembersTab";
import { GroupSessionsTab } from "./components/GroupSessionsTab";
import { Box } from "@mui/material";
import { useQuery } from "@tanstack/react-query";

export const GroupPage = () => {
  const params = useParams();

  const [selectedTab, setSelectedTab] = React.useState("");
  const [editMode, setEditMode] = React.useState(false);

  const group = useQuery<GroupInterface>({
    queryKey: [`/groups/${params.id}`, "MembershipApi"],
    placeholderData: {} as GroupInterface
  });

  React.useEffect(() => {
    if (selectedTab === "") {
      setSelectedTab("members");
    }
  }, [selectedTab]);

  const getCurrentTab = () => {
    let currentTab = null;
    switch (selectedTab) {
      case "members": currentTab = <GroupMembersTab key="members" group={group.data} />; break;
      case "sessions": currentTab = <GroupSessionsTab key="sessions" group={group.data} />; break;
      default: currentTab = <GroupMembersTab key="members" group={group.data} />; break;
    }
    return currentTab;
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleUpdated = () => {
    setEditMode(false);
    group.refetch();
  };

  return (
    <>
      <GroupBanner group={group.data} onEdit={handleEdit} editMode={editMode} />
      <Box sx={{ p: 3, pt: 2 }}>
        {editMode
          ? <div id="mainContent"><GroupDetailsEdit id="groupDetailsBox" group={group.data} updatedFunction={handleUpdated} /></div>
          : (
            <>
              <GroupNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} group={group.data} />
              <div id="mainContent">{getCurrentTab()}</div>
            </>
          )}
      </Box>
    </>
  );
};
