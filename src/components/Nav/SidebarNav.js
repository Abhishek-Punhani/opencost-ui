import * as React from "react";
import { Drawer, List, useMediaQuery, useTheme } from "@mui/material";

import { NavItem } from "./NavItem";
import {
  BarChart,
  Cloud,
  Storage,
  Menu as MenuIcon,
} from "@mui/icons-material";

const logo = new URL("../../images/logo.png", import.meta.url).href;

const DRAWER_WIDTH = 200;

const SidebarNav = ({ active }) => {
  const [init, setInit] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [currentTheme, setCurrentTheme] = React.useState(
    document.documentElement.getAttribute("data-theme") || "light",
  );
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width: 900px)");

  React.useEffect(() => {
    if (!init) {
      setInit(true);
    }

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const newTheme =
        document.documentElement.getAttribute("data-theme") || "light";
      setCurrentTheme(newTheme);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, [init]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const top = [
    {
      name: "Cost Allocation",
      href: "/allocation",
      icon: <BarChart />,
    },
    { name: "Assets", href: "/assets", icon: <Storage /> },
    { name: "Cloud Costs", href: "/cloud", icon: <Cloud /> },
    { name: "External Costs", href: "/external-costs", icon: <Cloud /> },
  ];

  const drawerContent = (
    <>
      <img
        src={logo}
        alt="OpenCost"
        style={{
          flexShrink: 1,
          padding: "1rem",
          maxWidth: "100%",
          height: "auto",
        }}
      />
      <List style={{ flexGrow: 1 }}>
        {top.map((l) => (
          <NavItem
            active={active === `${l.href}`}
            key={l.name}
            {...l}
            onClick={isMobile ? handleDrawerToggle : undefined}
          />
        ))}
      </List>
    </>
  );

  return (
    <>
      {isMobile && (
        <button
          onClick={handleDrawerToggle}
          style={{
            position: "fixed",
            top: "1rem",
            left: "1rem",
            zIndex: 1300,
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-primary)",
            transition: "all 0.2s ease",
          }}
        >
          <MenuIcon />
        </button>
      )}
      <Drawer
        anchor={"left"}
        open={isMobile ? mobileOpen : true}
        onClose={isMobile ? handleDrawerToggle : undefined}
        variant={isMobile ? "temporary" : "permanent"}
        sx={{
          flexShrink: 0,
          width: DRAWER_WIDTH,
          "& .MuiDrawer-paper": {
            backgroundColor: "var(--sidebar-bg)",
            borderRight: "1px solid var(--sidebar-border)",
            width: DRAWER_WIDTH,
            paddingTop: "2.5rem",
            transition: "background-color 0.3s ease, border-color 0.3s ease",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export { SidebarNav };
