import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "@tora-chain/fe-common";
import { DevBanner, DevLinks } from "@tora-chain/ui-components";

import "./index.css";
import { AUTH_API, USER_TYPE, loginUrl } from "lib/config";
import { router } from "./router";

const authConfig = { authApi: AUTH_API, loginUrl, tokenKey: USER_TYPE };

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider config={authConfig}>
      <RouterProvider router={router} />
    </AuthProvider>
    <DevLinks />
    <DevBanner />
  </StrictMode>,
);
