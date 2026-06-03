import React, { useCallback, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  FormControlLabel,
  Icon,
  Stack,
  Switch,
  Typography
} from "@mui/material";
import {
  ApiHelper,
  DisplayBox,
  type PermissionInterface,
  type RoleInterface,
  type RolePermissionInterface
} from "@machonharuach/apphelper";
import { RoleCheck } from "./RoleCheck";
import {
  ADMIN_ACCESS_AREAS,
  areaAccessState,
  permissionRefKey,
  rolePermissionMatchesRef,
  type AdminAccessArea
} from "../helpers/adminAccessAreas";

interface Props {
  role: RoleInterface;
}

export const AdminAccessPermissions: React.FC<Props> = (props) => {
  const [rolePermissions, setRolePermissions] = useState<RolePermissionInterface[]>([]);
  const [permissions, setPermissions] = useState<PermissionInterface[]>([]);
  const [expanded, setExpanded] = useState<string | false>(false);
  const [busyAreaId, setBusyAreaId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    const roleId = props.role?.id === null ? "null" : props.role?.id;
    if (roleId === undefined) return;
    ApiHelper.get("/rolepermissions/roles/" + roleId, "MembershipApi").then((data) => setRolePermissions(data));
  }, [props.role]);

  const loadPermissions = useCallback(() => {
    ApiHelper.get("/permissions", "MembershipApi").then((data) => setPermissions(data));
  }, []);

  const catalogByKey = React.useMemo(() => {
    const map = new Map<string, PermissionInterface>();
    permissions.forEach((p) => {
      map.set(`${p.apiName}|${p.section}|${p.action}`, p);
    });
    return map;
  }, [permissions]);

  const toggleAreaAccess = async (area: AdminAccessArea, enable: boolean) => {
    if (area.alwaysAvailable || !area.permissions.length) return;
    setBusyAreaId(area.id);
    try {
      if (enable) {
        const toAdd: RolePermissionInterface[] = [];
        area.permissions.forEach((ref) => {
          const exists = rolePermissions.some((rp) => rolePermissionMatchesRef(rp, ref));
          if (!exists) {
            toAdd.push({
              roleId: props.role.id,
              apiName: ref.apiName,
              contentType: ref.contentType,
              action: ref.action
            });
          }
        });
        if (toAdd.length) await ApiHelper.post("/rolepermissions/", toAdd, "MembershipApi");
      } else {
        const toRemove = rolePermissions.filter((rp) =>
          area.permissions.some((ref) => rolePermissionMatchesRef(rp, ref))
        );
        await Promise.all(
          toRemove.map((rp) => ApiHelper.delete("/rolepermissions/" + rp.id, "MembershipApi"))
        );
      }
      loadData();
    } finally {
      setBusyAreaId(null);
    }
  };

  const getAreaChecks = (area: AdminAccessArea) => {
    const checks: React.ReactNode[] = [];
    area.permissions.forEach((ref, index) => {
      const catalog = catalogByKey.get(permissionRefKey(ref));
      const label = catalog?.displayAction || `${ref.contentType} — ${ref.action}`;
      checks.push(
        <RoleCheck
          key={`${area.id}-${index}`}
          roleId={props.role.id}
          rolePermissions={rolePermissions}
          apiName={ref.apiName}
          contentType={ref.contentType}
          action={ref.action}
          label={label}
        />
      );
    });
    return checks;
  };

  const getAccessChip = (area: AdminAccessArea) => {
    if (area.alwaysAvailable) {
      return <Chip size="small" label="All users" sx={{ ml: 1 }} />;
    }
    const state = areaAccessState(area, rolePermissions);
    if (state === "full") return <Chip size="small" color="success" label="Full access" sx={{ ml: 1 }} />;
    if (state === "partial") return <Chip size="small" color="warning" label="Partial" sx={{ ml: 1 }} />;
    return <Chip size="small" variant="outlined" label="No access" sx={{ ml: 1 }} />;
  };

  const sections = ADMIN_ACCESS_AREAS.map((area, index) => {
    const panelId = `admin-access-${area.id}`;
    const access = areaAccessState(area, rolePermissions);
    const switchChecked = area.alwaysAvailable || access === "full";
    const switchIndeterminate = !area.alwaysAvailable && access === "partial";

    return (
      <Accordion
        key={area.id}
        expanded={expanded === panelId}
        onChange={(_, isExpanded) => setExpanded(isExpanded ? panelId : false)}
        disabled={busyAreaId === area.id}
        disableGutters
        sx={{
          "&:before": { display: "none" },
          borderRadius: 1.5,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper"
        }}
      >
        <AccordionSummary expandIcon={<Icon>expand_more</Icon>}>
          <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.5} sx={{ width: "100%", pr: 1 }}>
            <Typography fontWeight={600}>{area.label}</Typography>
            {getAccessChip(area)}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {area.description}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            Routes: {area.routes}
          </Typography>
          {area.alwaysAvailable ? (
            <Typography variant="body2">Anyone signed in to Machon HaRuach Admin can open this section.</Typography>
          ) : (
            <>
              <FormControlLabel
                sx={{ mb: 1, display: "flex", alignItems: "center" }}
                control={
                  <Switch
                    checked={switchChecked}
                    indeterminate={switchIndeterminate}
                    disabled={busyAreaId !== null}
                    onChange={(e) => toggleAreaAccess(area, e.target.checked)}
                  />
                }
                label={switchChecked && !switchIndeterminate ? `Allow ${area.label}` : `Allow ${area.label} (select permissions below)`}
              />
              <Box sx={{ pl: 1 }}>{getAreaChecks(area)}</Box>
            </>
          )}
        </AccordionDetails>
      </Accordion>
    );
  });

  React.useEffect(() => {
    if (props.role?.id !== undefined) loadData();
  }, [props.role, loadData]);

  React.useEffect(() => {
    if (props.role?.id !== undefined) loadPermissions();
  }, [props.role, loadPermissions]);

  return (
    <DisplayBox
      id="adminAccessPermissionsBox"
      headerText="Machon HaRuach Admin access"
      headerIcon="admin_panel_settings"
      help="docs/b1-admin/settings/roles-permissions"
    >
      <Alert severity="info" sx={{ mb: 2 }}>
        Choose which areas of Machon HaRuach Admin users in this role can open. Add people on the left; use the switches
        below to grant access by section (Home, Community, Giving, and so on). Expand a section to fine-tune individual
        permissions.
      </Alert>
      <Stack spacing={1.5}>{sections}</Stack>
    </DisplayBox>
  );
};
