import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import ThemeToggle from "./ThemeToggle";

const Header = (props) => {
  const { title, breadcrumbs, headerTitle } = props;

  return (
    <div className="page-header">
      <div className="page-header__left">
        <h1 className="page-header__title">{headerTitle}</h1>
        {title && <span className="page-header__subtitle">{title}</span>}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs
            aria-label="breadcrumb"
            className="page-header__breadcrumbs"
          >
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
      <div className="page-header__right">
        <ThemeToggle />
        {props.children}
      </div>
    </div>
  );
};

export default Header;
