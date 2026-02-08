import { ListItem, ListItemIcon, ListItemText } from "@mui/material";
import { Link } from "react-router";
import * as React from "react";

const NavItem = ({ active, href, name, onClick, secondary, title, icon }) => {
  const [theme, setTheme] = React.useState(
    document.documentElement.getAttribute("data-theme") || "light",
  );

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      const newTheme =
        document.documentElement.getAttribute("data-theme") || "light";
      setTheme(newTheme);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  const isDark = theme === "dark";

  const renderListItemCore = () => (
    <ListItem
      className={active ? "active" : ""}
      sx={{
        "&.MuiListItem-root": {
          borderRadius: "8px",
          margin: "2px 8px",
          transition: "all 0.2s ease",
        },
        "&.MuiListItem-root:hover": {
          backgroundColor: isDark ? "var(--sidebar-hover)" : "#f0f0f0",
        },
        "&.MuiListItem-root.active": {
          backgroundColor: isDark ? "var(--sidebar-active)" : "#e8f0ff",
        },
      }}
      onClick={(e) => {
        if (onClick) {
          onClick();
          e.stopPropagation();
        }
      }}
      title={title}
    >
      <ListItemIcon
        sx={{
          "&.MuiListItemIcon-root": {
            color: active
              ? isDark
                ? "var(--accent-primary)"
                : "#0f62fe"
              : isDark
                ? "var(--text-secondary)"
                : "#5a5a5a",
            minWidth: 36,
            transition: "color 0.2s ease",
          },
        }}
      >
        {icon}
      </ListItemIcon>
      <ListItemText
        sx={{
          "& .MuiListItemText-primary": {
            color: active
              ? isDark
                ? "var(--accent-primary)"
                : "#0f62fe"
              : isDark
                ? "var(--text-primary)"
                : "inherit",
            fontWeight: active ? 600 : 400,
            fontSize: "0.9375rem",
            transition: "color 0.2s ease",
          },
        }}
        primary={name}
        secondary={secondary}
      />
    </ListItem>
  );

  return href && !active ? (
    <Link style={{ textDecoration: "none", color: "inherit" }} to={`${href}`}>
      {renderListItemCore()}
    </Link>
  ) : (
    renderListItemCore()
  );
};

export { NavItem };
