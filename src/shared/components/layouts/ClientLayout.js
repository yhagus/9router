"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PropTypes from "prop-types";
import { APP_CONFIG } from "@/shared/constants/config";
import ThemeToggle from "@/shared/components/ThemeToggle";
import { cn } from "@/shared/utils/cn";

const NAV = [
  { href: "/client", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/client/free-tracker", label: "Free Tracker", icon: "loyalty" },
];

function pageMeta(pathname) {
  if (pathname?.startsWith("/client/free-tracker")) {
    return {
      title: "Free Tracker",
      icon: "loyalty",
      description: "Public free model pool status",
    };
  }
  return {
    title: "Dashboard",
    icon: "dashboard",
    description: null,
  };
}

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const [keyName, setKeyName] = useState("");
  const meta = pageMeta(pathname);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/client/auth/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setKeyName(data?.key?.name || "");
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/client/auth/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/login/guest");
  };

  const description =
    meta.description ||
    (keyName ? `Usage for ${keyName}` : "Your API key usage");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <aside className="hidden w-72 flex-col border-r border-border-subtle bg-vibrancy backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-2 px-6 pt-5 pb-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
        </div>

        <div className="px-6 py-4 flex flex-col gap-2">
          <Link href="/client" className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-[10px] bg-gradient-to-br from-brand-500 to-brand-700 shadow-[var(--shadow-warm)]">
              <span className="material-symbols-outlined text-white text-[20px]">hub</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold tracking-tight text-text-main">{APP_CONFIG.name}</h1>
              <span className="text-xs text-text-muted">Client Portal</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-0.5">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all group",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-main",
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined text-[18px]",
                    active && "fill-1",
                  )}
                >
                  {item.icon}
                </span>
                <span className="text-[13px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex flex-col flex-1 h-full min-w-0 relative transition-colors duration-300 isolate">
        <div className="landing-grid absolute inset-0 pointer-events-none -z-10" aria-hidden="true" />
        <header className="shrink-0 flex items-center justify-between gap-3 px-4 lg:px-8 pt-3 pb-2 border-b border-border-subtle bg-surface/60 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none z-20">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl lg:text-2xl">
                {meta.icon}
              </span>
              <h1 className="text-base lg:text-2xl font-semibold tracking-tight truncate">
                {meta.title}
              </h1>
            </div>
            <p className="hidden lg:block text-sm text-text-muted truncate">
              {description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="h-8 px-3 rounded-lg border border-border text-sm text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}

ClientLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
