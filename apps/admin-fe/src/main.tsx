import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "@tora-chain/fe-common";
import { DevBanner, DevLinks } from "@tora-chain/ui-components";

import "./index.css";
import { AUTH_API, loginUrl } from "lib/config";
import { router } from "./router";

const authConfig = { authApi: AUTH_API, loginUrl };

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider config={authConfig}>
      <RouterProvider router={router} />
    </AuthProvider>
    {/* Dev-only floating links to the other ToraChain services. */}
    <DevLinks />
    {/* Dev-only corner ribbon warning users not to submit sensitive data. */}
    <DevBanner />
  </StrictMode>,
);
