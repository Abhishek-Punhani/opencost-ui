import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import ThemeToggle from "./ThemeToggle";

const Header = (props) => {
  const { title, breadcrumbs, headerTitle } = props;

  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexFlow: "row",
        width: "100%",
        marginTop: "10px",
        flexWrap: "wrap",
        gap: "1rem",
      }}
    >
      <Typography variant="h3" style={{ marginBottom: "10px" }}>
        {headerTitle}
      </Typography>
      <div style={{ flex: "1 0 auto" }}>
        {title && <Typography variant="h4">{title}</Typography>}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs aria-label="breadcrumb">
            {breadcrumbs.slice(0, breadcrumbs.length - 1).map((b) => (
              <Link color="inherit" href={b.href} key={b.name}>
                {b.name}
              </Link>
            ))}
            <Typography color="textPrimary">
              {breadcrumbs[breadcrumbs.length - 1].name}
            </Typography>
          </Breadcrumbs>
        )}
      </div>
      <div
        style={{
          flex: "0 0 auto",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <ThemeToggle />
        {props.children}
      </div>
    </div>
  );
};

export default Header;
