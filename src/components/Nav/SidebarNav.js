import * as React from "react";
import { SideNav, SideNavItems, SideNavLink } from "@carbon/react";
import {
  ChartBar,
  CloudApp,
  VirtualMachine,
  Currency,
} from "@carbon/icons-react";
import { useNavigate } from "react-router";

const logo = new URL("../../images/logo.png", import.meta.url).href;

const DRAWER_WIDTH = 256;

const SidebarNav = ({ active }) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 900);
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) setIsExpanded(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navLinks = [
    { name: "Cost Allocation", href: "/allocation", icon: ChartBar },
    { name: "Assets", href: "/assets", icon: VirtualMachine },
    { name: "Cloud Costs", href: "/cloud", icon: CloudApp },
    { name: "External Costs", href: "/external-costs", icon: Currency },
  ];

  return (
    <>
      {isMobile && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? "Close navigation" : "Open navigation"}
          className="sidebar-hamburger"
          style={{
            position: "fixed",
            top: "1rem",
            left: "1rem",
            zIndex: 8001,
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-primary)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 4h16v2H2V4zm0 5h16v2H2V9zm0 5h16v2H2v-2z" />
          </svg>
        </button>
      )}

      <SideNav
        isFixedNav
        expanded={!isMobile || isExpanded}
        isChildOfHeader={false}
        aria-label="Side navigation"
        onOverlayClick={() => isMobile && setIsExpanded(false)}
        style={{
          position: "fixed",
          height: "100vh",
          zIndex: 8000,
        }}
      >
        <div
          style={{
            padding: "1.5rem 1rem 1rem",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <img
            src={logo}
            alt="OpenCost"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>
        <SideNavItems>
          {navLinks.map((link) => {
            const IconComponent = link.icon;
            return (
              <SideNavLink
                key={link.href}
                renderIcon={IconComponent}
                href={link.href}
                isActive={active === link.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(link.href);
                  if (isMobile) setIsExpanded(false);
                }}
              >
                {link.name}
              </SideNavLink>
            );
          })}
        </SideNavItems>
      </SideNav>
    </>
  );
};

export { SidebarNav, DRAWER_WIDTH };
