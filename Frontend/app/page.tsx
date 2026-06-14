import { redirect } from "next/navigation";

// The root route is just an entry point — send analysts straight to the live
// Security Operations dashboard (which reads real incidents from /api/incidents).
// Previously this rendered a bare, unstyled page bound to the STATIC
// public/frontend_output.json, so opening localhost:3000 directly showed
// "No data found" instead of the real dashboard.
export default function Home() {
  redirect("/dashboard");
}
