import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";

import { AuthProvider, RequireAuth } from "@tora-chain/fe-common";
import { DevLinks, Spinner } from "@tora-chain/ui-components";

import "./index.css";
import { AUTH_API, loginUrl } from "./config.ts";
import { Layout } from "./components/Layout.tsx";
import { ElectionsListPage } from "./pages/ElectionsListPage.tsx";
import { ElectionCreatePage } from "./pages/ElectionCreatePage.tsx";
import { ElectionEditPage } from "./pages/ElectionEditPage.tsx";
import { ElectionDetailPage } from "./pages/ElectionDetailPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";

const authConfig = { authApi: AUTH_API, loginUrl };

const checkingSession = (
  <div className="flex min-h-screen items-center justify-center">
    <Spinner size="lg" label="Checking your session" />
  </div>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RequireAuth fallback={checkingSession}>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/elections" replace /> },
      { path: "elections", element: <ElectionsListPage /> },
      { path: "elections/new", element: <ElectionCreatePage /> },
      { path: "elections/:id", element: <ElectionDetailPage /> },
      { path: "elections/:id/edit", element: <ElectionEditPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider config={authConfig}>
      <RouterProvider router={router} />
    </AuthProvider>
    {/* Dev-only floating links to the other ToraChain services. */}
    <DevLinks />
  </StrictMode>,
);
