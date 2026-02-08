import { useLocation } from "react-router";
import { useMediaQuery } from "@mui/material";
import { SidebarNav, DRAWER_WIDTH } from "./Nav/SidebarNav";

const Page = (props) => {
  const { pathname } = useLocation();
  const isMobile = useMediaQuery("(max-width: 900px)");

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        margin: 0,
        backgroundColor: "var(--bg-secondary)",
      }}
    >
      {/* Sidebar nav — renders its own drawer(s) */}
      <SidebarNav active={pathname} />

      {/* Main content area */}
      <div
        style={{
          display: "flex",
          flexFlow: "column",
          flexGrow: 1,
          minWidth: 0,
          marginLeft: isMobile ? 0 : DRAWER_WIDTH,
        }}
      >
        <div
          className="page-content"
          style={{
            padding: isMobile ? "4rem 1rem 2rem" : "2.5rem 2rem 2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              flexFlow: "column",
              flexGrow: 1,
            }}
          >
            {props.children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
