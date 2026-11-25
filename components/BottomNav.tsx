"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { QrCode, Shield } from "lucide-react";

interface BottomNavProps {
  isAdmin?: boolean;
}

export function BottomNav({ isAdmin }: BottomNavProps) {
  const pathname = usePathname();

  if (!isAdmin || pathname === "/login" || pathname.startsWith("/m/")) {
    return null;
  }

  const navItems = [
    {
      label: "Admin Dashboard",
      href: "/admin",
      icon: Shield,
      active: pathname.startsWith("/admin"),
    },
    {
      label: "Scan",
      href: "/scan",
      icon: QrCode,
      active: pathname === "/scan" || pathname.startsWith("/project/"),
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] no-print">
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                item.active
                  ? "text-primary font-semibold"
                  : "text-secondary hover:text-text"
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-1 ${
                  item.active ? "text-primary stroke-[2.5]" : "text-secondary"
                }`}
              />
              <span className="text-[11px] leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
