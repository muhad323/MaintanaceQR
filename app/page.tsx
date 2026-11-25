import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ScanPage from "./scan/page";

export default async function HomePage() {
  const session = await getSession();
  if (session?.isAdmin) {
    redirect("/admin");
  }
  return <ScanPage />;
}
