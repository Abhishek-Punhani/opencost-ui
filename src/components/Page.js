import { useLocation } from "react-router";
import { SidebarNav, DRAWER_WIDTH } from "./Nav/SidebarNav";

const Page = (props) => {
  const { pathname } = useLocation();

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        margin: 0,
        backgroundColor: "var(--bg-secondary)",
      }}
    >
      {/* Sidebar — the SidebarNav handles its own responsive behaviour.
          This spacer pushes content right on desktop; CSS collapses it on mobile. */}
      <div className="sidebar-spacer">
        <SidebarNav active={pathname} />
      </div>

      <div
        style={{
          display: "flex",
          flexFlow: "column",
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        <div className="page-content">
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
