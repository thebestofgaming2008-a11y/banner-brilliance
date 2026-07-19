import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin_/login")({
  head: () => ({
    meta: [{ title: "Account sign in | Fawzaan" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminLoginRedirect,
});

function AdminLoginRedirect() {
  return <Navigate to="/account" replace />;
}
