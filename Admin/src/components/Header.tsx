import { ApiHelper, Permissions, UserHelper } from "@machonharuach/apphelper";
import React, { useEffect, useMemo } from "react";
import { Box, Icon } from "@mui/material";

import { SecondaryMenuHelper } from "../helpers/SecondaryMenuHelper";
import { SiteHeader } from "@machonharuach/apphelper";
import UserContext from "../UserContext";
import { useNavigate } from "react-router-dom";

export const Header: React.FC = () => {
  const context = React.useContext(UserContext);
  const navigate = useNavigate();
  const formPermission = UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit);
  const [donationError, setDonationError] = React.useState<boolean>(false);
  const [isFormMember, setIsFormMember] = React.useState<boolean>(false);
  const PRIMARY_LABELS = {
    home: "Home",
    dashboard: "Dashboard",
    community: "Community",
    giving: "Giving",
    ministry: "Ministry",
    media: "Media",
    communications: "Communications",
    apps: "Apps",
    administration: "Administration"
  };

  useEffect(() => {
    if (UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) {
      ApiHelper.get("/eventLog/type/failed/", "GivingApi").then((data) => {
        if (data?.length > 0 && data.find((error: any) => !error.resolved)) setDonationError(true);
      });
    }

    if (!formPermission && context?.person?.id) {
      ApiHelper.get("/memberpermissions/member/" + context.person?.id, "MembershipApi").then((data) => setIsFormMember(data?.length > 0));
    }
  }, [formPermission, context?.person?.id]);

  const primaryMenu = useMemo(() => {
    const donationIcon = donationError ? "error" : "volunteer_activism";
    const menuItems: { url: string; icon: string; label: string }[] = [];
    // Home (Quick Actions) and Dashboard are separate routes
    menuItems.push({ url: "/", icon: "cottage", label: PRIMARY_LABELS.home });
    menuItems.push({ url: "/dashboard", icon: "grid_view", label: PRIMARY_LABELS.dashboard });
    if (UserHelper.checkAccess(Permissions.membershipApi.people.view)) menuItems.push({ url: "/people", icon: "groups_2", label: PRIMARY_LABELS.community });
    if (UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) menuItems.push({ url: "/donations", label: PRIMARY_LABELS.giving, icon: donationIcon });

    if (UserHelper.checkAccess(Permissions.membershipApi.plans.edit)) menuItems.push({ url: "/serving", label: PRIMARY_LABELS.ministry, icon: "event_note" });
    else menuItems.push({ url: "/serving/tasks", label: PRIMARY_LABELS.ministry, icon: "event_note" });

    // Temporarily hidden
    if (
      UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit) ||
      UserHelper.checkAccess(Permissions.contentApi.content.edit) ||
      UserHelper.checkAccess(Permissions.membershipApi.plans.edit)
    ) {
      menuItems.push({ url: "/sermons", label: PRIMARY_LABELS.media, icon: "smart_display" });
    }
    if (
      UserHelper.checkAccess(Permissions.messagingApi.texting.send) ||
      UserHelper.checkAccess(Permissions.contentApi.content.edit)
    ) {
      menuItems.push({ url: "/communications", label: PRIMARY_LABELS.communications, icon: "campaign" });
    }
    if (UserHelper.checkAccess(Permissions.contentApi.content.edit)) menuItems.push({ url: "/mobile", label: PRIMARY_LABELS.apps, icon: "apps" });

    if (UserHelper.checkAccess(Permissions.membershipApi.roles.view)) {
      menuItems.push({ url: "/settings#roles", label: PRIMARY_LABELS.administration, icon: "tune" });
    }
    else if (formPermission || isFormMember) menuItems.push({ url: "/forms", label: PRIMARY_LABELS.administration, icon: "tune" });
    // if (UserHelper.checkAccess(Permissions.membershipApi.server.admin)) tabs.push(<NavItem key="/admin" url="/admin" label={Locale.label("components.wrapper.servAdmin")} icon="admin_panel_settings" selected={selectedTab === "admin"} />);
    return menuItems;
  }, [donationError, formPermission, isFormMember]);
  /*
  const getSecondaryMenu = () => {
    const menuItems:{ url: string, label: string }[] = []
    menuItems.push({url: "/groups", label: Locale.label("components.wrapper.groups")});
    menuItems.push({url: "/people", label: Locale.label("components.wrapper.ppl")});
    if (UserHelper.checkAccess(Permissions.attendanceApi.attendance.viewSummary)) menuItems.push({url:"/attendance", label: Locale.label("components.wrapper.att")});
    return menuItems;
  }*/

  const getPrimaryLabel = () => {
    const path = window.location.pathname;
    let result = PRIMARY_LABELS.home;
    if (path.startsWith("/people")) result = PRIMARY_LABELS.community;
    else if (path.startsWith("/attendance")) result = PRIMARY_LABELS.community;
    else if (path.startsWith("/groups")) result = PRIMARY_LABELS.community;
    else if (path.startsWith("/donations")) result = PRIMARY_LABELS.giving;
    else if (path.startsWith("/serving")) result = PRIMARY_LABELS.ministry;
    else if (path.startsWith("/sermons")) result = PRIMARY_LABELS.media;
    else if (path.startsWith("/communications")) result = PRIMARY_LABELS.communications;
    else if (path.startsWith("/mobile")) result = PRIMARY_LABELS.apps;
    else if (path.startsWith("/settings") || path.startsWith("/admin") || path.startsWith("/forms")) result = PRIMARY_LABELS.administration;
    else if (path.startsWith("/dashboard")) result = PRIMARY_LABELS.dashboard;
    return result;
  };

  const secondaryMenu = SecondaryMenuHelper.getSecondaryMenu(window.location.pathname, {
    formPermission,
    search: window.location.search,
    hash: window.location.hash
  });
  const secondaryMenuItems = (secondaryMenu.menuItems || []).filter((item) => {
    // On Home (`/`), keep only the Home pill (hide Dashboard).
    if (window.location.pathname === "/") return item.url === "/";
    // On all other pages, hide the Home pill.
    return item.url !== "/";
  });
  const secondaryMenuLabel = secondaryMenu.label === "Quick Actions" ? "Home" : secondaryMenu.label;
  const secondaryActiveUrl = secondaryMenu.activeUrl;

  const handleNavigate = (url: string) => {
    const [pathname, hashPart] = url.split("#");
    if (hashPart) {
      navigate({ pathname: pathname || "/", hash: hashPart });
    } else {
      navigate(url);
    }
  };

  const isPrimaryActive = (url: string) => {
    const path = window.location.pathname;
    if (url === "/") return path === "/";
    if (url === "/people") return path.startsWith("/people") || path.startsWith("/groups") || path.startsWith("/attendance");
    if (url === "/settings") return path.startsWith("/settings") || path.startsWith("/forms") || path.startsWith("/admin");
    if (url === "/communications") return path.startsWith("/communications");
    return path.startsWith(url);
  };

  // Hide the support help (?) button in the app bar — Machon HaRuach Admin does not use it.
  useEffect(() => {
    const hideSupportHelpButton = () => {
      document.querySelectorAll('[data-testid="support-help-button"]').forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.setProperty("display", "none", "important");
        }
      });
    };

    hideSupportHelpButton();
    const observer = new MutationObserver(hideSupportHelpButton);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const appBarLogoSrc = "/images/machon-haruach-admin-bar.png";

  // Machon HaRuach Admin app bar logo (separate from hidden menu button image).
  useEffect(() => {
    const toolbar = document.getElementById("site-toolbar");
    const primaryButton = document.getElementById("primaryNavButton");
    if (!toolbar || !primaryButton) return;

    const buttonLogo = primaryButton.querySelector("img") as HTMLImageElement | null;
    if (buttonLogo) {
      buttonLogo.src = appBarLogoSrc;
      buttonLogo.alt = "Machon HaRuach Admin";
    }

    let appbarLogo = document.getElementById("appbar-logo") as HTMLImageElement | null;
    if (!appbarLogo) {
      appbarLogo = document.createElement("img");
      appbarLogo.id = "appbar-logo";
      appbarLogo.setAttribute("alt", "Machon HaRuach Admin");
      appbarLogo.setAttribute("aria-hidden", "true");
      toolbar.insertBefore(appbarLogo, primaryButton);
    }
    appbarLogo.src = appBarLogoSrc;
  }, [primaryMenu.length, appBarLogoSrc]);

  // Add data-testid attributes to navigation elements after render
  useEffect(() => {
    const addTestIds = () => {
      // Map URLs to test IDs
      const urlToTestId: Record<string, string> = {
        "/": "nav-item-quick-actions",
        "/dashboard": "nav-item-dashboard",
        "/people": "nav-item-people",
        "/groups": "nav-item-groups",
        "/donations": "nav-item-donations",
        "/serving": "nav-item-serving",
        "/serving/tasks": "nav-item-tasks",
        "/site": "nav-item-site",
        "/settings": "nav-item-settings",
        "/attendance": "nav-item-attendance",
        "/forms": "nav-item-forms",
        "/admin": "nav-item-admin",
        "/donations/batches": "nav-item-batches",
        "/donations/funds": "nav-item-funds",
        "/serving/songs": "nav-item-songs-legacy",
        "/sermons/songs": "nav-item-songs",
        "/profile": "nav-item-profile",
        "/profile/devices": "nav-item-devices"
        // Temporarily hidden
        // "/sermons": "nav-item-sermons",
        // "/calendars": "nav-item-calendars",
      };

      // Find all navigation links
      const navLinks = document.querySelectorAll('a[href^="/"], button[role="menuitem"]');
      navLinks.forEach((link) => {
        const href = link.getAttribute("href");
        if (href && urlToTestId[href]) {
          link.setAttribute("data-testid", urlToTestId[href]);
        }

        // Also check for button text content for menu items
        const text = link.textContent?.toLowerCase();
        if (text) {
          const textToTestId: Record<string, string> = {
            dashboard: "nav-item-dashboard",
            people: "nav-item-people",
            groups: "nav-item-groups",
            donations: "nav-item-donations",
            plans: "nav-item-plans",
            tasks: "nav-item-tasks",
            settings: "nav-item-settings",
            attendance: "nav-item-attendance",
            forms: "nav-item-forms",
            "server admin": "nav-item-admin",
            batches: "nav-item-batches",
            funds: "nav-item-funds",
            songs: "nav-item-songs",
            profile: "nav-item-profile",
            devices: "nav-item-devices"
            // Temporarily hidden
            // sermons: "nav-item-sermons",
            // calendars: "nav-item-calendars",
          };

          for (const [key, testId] of Object.entries(textToTestId)) {
            if (text.includes(key)) {
              link.setAttribute("data-testid", testId);
              break;
            }
          }
        }
      });
    };

    // Add test IDs after a short delay to ensure DOM is ready
    const timer = setTimeout(addTestIds, 100);

    // Also add test IDs when menu items change
    const observer = new MutationObserver(addTestIds);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [primaryMenu, secondaryMenu]);

  /*<Typography variant="h6" noWrap>{UserHelper.currentUserChurch?.church?.name || ""}</Typography>*/
  return (
    <>
      <SiteHeader
        primaryMenuItems={primaryMenu}
        primaryMenuLabel={getPrimaryLabel()}
        secondaryMenuItems={secondaryMenuItems}
        secondaryMenuLabel={secondaryMenuLabel}
        secondaryActiveUrl={secondaryActiveUrl}
        context={context}
        appName={"Machon HaRuach Admin"}
        onNavigate={handleNavigate}
      />
      <Box id="app-side-menu" aria-label="Primary navigation">
        {primaryMenu.map((item) => (
          <button
            key={item.url}
            type="button"
            className={`side-menu-item ${isPrimaryActive(item.url) ? "active" : ""}`}
            onClick={() => handleNavigate(item.url)}
          >
            <Icon>{item.icon}</Icon>
            <span>{item.label}</span>
          </button>
        ))}
      </Box>
    </>
  );
};
