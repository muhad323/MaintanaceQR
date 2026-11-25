import { getSession } from "@/lib/session";
import { HeaderBar } from "./HeaderBar";

export async function Header() {
  const session = await getSession();
  return (
    <HeaderBar
      isLoggedIn={Boolean(session)}
      isAdmin={Boolean(session?.isAdmin)}
    />
  );
}
