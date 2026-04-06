import { redirect } from "next/navigation";

// Primary redirect is handled in next.config.ts (pre-render, CDN-level).
// This component acts as a fallback and should never be reached.
export default function RootPage() {
  redirect("/dashboard");
}
