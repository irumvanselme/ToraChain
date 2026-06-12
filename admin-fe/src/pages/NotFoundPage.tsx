import { useNavigate } from "react-router-dom";
import { Button, EmptyState } from "@tora-chain/ui-components";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist."
        action={<Button onClick={() => navigate("/elections")}>Go home</Button>}
      />
    </div>
  );
}
