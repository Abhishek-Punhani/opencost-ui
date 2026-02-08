import * as React from "react";
import { Drawer, List } from "@mui/material";

import { NavItem } from "./NavItem";
import {
  BarChart,
  Cloud,
  Storage,
  Menu as MenuIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

const logo = new URL("../../images/logo.png", import.meta.url).href;

const DRAWER_WIDTH = 200;

const SidebarNav = ({ active }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isMobile = useMatchMedia("(max-width: 900px)");

  React.useEffect(() => {
    const observer = new MutationObserver(() => {});
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);

  const navLinks = [
    { name: "Cost Allocation", href: "/allocation", icon: <BarChart /> },
    { name: "Assets", href: "/assets", icon: <Storage /> },
    { name: "Cloud Costs", href: "/cloud", icon: <Cloud /> },
    { name: "External Costs", href: "/external-costs", icon: <Cloud /> },
  ];

  const drawerContent = (showClose = false) => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem 0",
        }}
      >
        <img
          src={logo}
          alt="OpenCost"
          style={{ maxWidth: showClose ? "120px" : "100%", height: "auto" }}
        />
        {showClose && (
          <button
            onClick={handleDrawerToggle}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: "4px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <CloseIcon fontSize="small" />
          </button>
        )}
      </div>
      <List style={{ flexGrow: 1, paddingTop: "0.5rem" }}>
        {navLinks.map((l) => (
          <NavItem
            active={active === l.href}
            key={l.name}
            {...l}
            onClick={showClose ? handleDrawerToggle : undefined}
          />
        ))}
      </List>
    </div>
  );

  const paperSx = {
    backgroundColor: "var(--sidebar-bg)",
    borderRight: "1px solid var(--sidebar-border)",
    width: DRAWER_WIDTH,
    boxSizing: "border-box",
    overflowX: "hidden",
  };

  return (
    <>
      {/* Hamburger — CSS-driven visibility, no React flicker */}
      <button
        onClick={handleDrawerToggle}
        aria-label="Open navigation"
        className="sidebar-hamburger"
        style={{
          position: "fixed",
          top: "0.875rem",
          left: "0.875rem",
          zIndex: 1300,
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "10px",
          padding: "8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-primary)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <MenuIcon fontSize="small" />
      </button>

      {/* Desktop: permanent drawer (CSS hides it on ≤900px) */}
      <Drawer
        variant="permanent"
        open
        className="sidebar-desktop"
        sx={{
          flexShrink: 0,
          width: DRAWER_WIDTH,
          "& .MuiDrawer-paper": paperSx,
        }}
      >
        {drawerContent(false)}
      </Drawer>

      {/* Mobile: temporary overlay drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        className="sidebar-mobile"
        sx={{
          "& .MuiDrawer-paper": paperSx,
        }}
      >
        {drawerContent(true)}
      </Drawer>
    </>
  );
};

export { SidebarNav, DRAWER_WIDTH };
