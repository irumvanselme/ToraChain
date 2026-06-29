import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireAuth } from "@tora-chain/fe-common";
import { Layout } from "./components/layout.tsx";
import { ElectionsListPage } from "./elections/list";
import { ElectionCreatePage } from "./elections/create.tsx";
import { ElectionDetailPage } from "./elections/detail.tsx";
import { ElectionEditPage } from "./elections/edit.tsx";
import { NotFoundPage } from "./not-found.tsx";
import { Spinner } from "@tora-chain/ui-components";

const checkingSession = (
  <div className="flex min-h-screen items-center justify-center">
    <Spinner size="lg" label="Checking your session" />
  </div>
);

export const router = createBrowserRouter([
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
