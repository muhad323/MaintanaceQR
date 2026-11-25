"use client";

import { usePathname } from "next/navigation";

export function PageTitle() {
  const pathname = usePathname();

  let title = "Project QR";
  if (pathname === "/" || pathname === "/scan") {
    title = "Scan Model QR";
  } else if (pathname.startsWith("/project/")) {
    title = "Project Identification";
  } else if (pathname.startsWith("/admin")) {
    title = "Admin Dashboard";
  }

  return (
    <span className="text-sm font-semibold text-text tracking-tight truncate">
      {title}
    </span>
  );
}
