import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";

import "./index.css";
import { AuthProvider } from "./auth/AuthProvider.tsx";
import { RequireAuth } from "./auth/RequireAuth.tsx";
import { Layout } from "./components/Layout.tsx";
import { ElectionsListPage } from "./pages/ElectionsListPage.tsx";
import { ElectionCreatePage } from "./pages/ElectionCreatePage.tsx";
import { ElectionEditPage } from "./pages/ElectionEditPage.tsx";
import { ElectionDetailPage } from "./pages/ElectionDetailPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RequireAuth>
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
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
