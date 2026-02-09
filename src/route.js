import { BrowserRouter, Routes, Route } from "react-router";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { Theme } from "@carbon/react";

import Allocations from "./pages/Allocations.js";
import Assets from "./pages/Assets.js";
import AssetDetail from "./components/assets/AssetDetail.js";
import CloudCosts from "./pages/CloudCosts.js";
import ExternalCosts from "./pages/ExternalCosts.js";

const basename = (process.env.UI_PATH || "").replace(/\/+$/, "");

const RouteSet = () => {
  // Detect dark mode from HTML attribute
  const theme =
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "g100"
      : "white";

  return (
    <Theme theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <BrowserRouter basename={basename}>
          <Routes>
            <Route exact path="/" element={<Allocations />} />
            <Route exact path="/allocation" element={<Allocations />} />
            <Route exact path="/assets" element={<Assets />} />
            <Route exact path="/assets/:id" element={<AssetDetail />} />
            <Route exact path="/cloud" element={<CloudCosts />} />
            <Route exact path="/external-costs" element={<ExternalCosts />} />
          </Routes>
        </BrowserRouter>
      </LocalizationProvider>
    </Theme>
  );
};

export default RouteSet;
