import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X, Zap, ChevronDown, Check, LayoutDashboard, BookOpen, HelpCircle, AlertCircle, Play, Megaphone, ArrowUp } from "lucide-react";
import { useCurrency, CURRENCIES, type CurrencyCode } from "./CurrencyContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDashboardUrl } from "@/lib/permissions";
import { trpc } from "@/lib/trpc";

const DEFAULT_NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Pricing",  href: "/pricing" },
  { label: "Book a Demo", href: "/book-a-demo" },
  { label: "Partners", href: "/become-a-partner" },
  { label: "About",    href: "/about" },
  { label: "Contact",  href: "/contact" },
];

const RESOURCE_ICON_MAP: Record<string, React.ComponentType<any>> = {
  "/documentation": BookOpen,
  "/user-guide": HelpCircle,
  "/troubleshooting": AlertCircle,
};
const RESOURCE_DESC_MAP: Record<string, string> = {
  "/documentation": "Comprehensive platform guides",
  "/user-guide": "Step-by-step how-tos",
  "/troubleshooting": "Solutions to common issues",
};

const DEFAULT_RESOURCE_LINKS = [
  { label: "Documentation", href: "/documentation", icon: BookOpen, desc: "Comprehensive platform guides" },
  { label: "User Guide", href: "/user-guide", icon: HelpCircle, desc: "Step-by-step how-tos" },
  { label: "Troubleshooting", href: "/troubleshooting", icon: AlertCircle, desc: "Solutions to common issues" },
];

function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
      >
        <span className="font-semibold text-xs text-indigo-600">{currency.symbol}</span>
        <span className="text-xs">{currency.code}</span>
        <ChevronDown className={cn("h-3 w-3 text-gray-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Currency</p>
          </div>
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => { setCurrency(c.code as CurrencyCode); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-indigo-600 w-7">{c.symbol}</span>
                <div>
                  <p className="text-xs font-medium text-gray-900">{c.code}</p>
                  <p className="text-[10px] text-gray-400">{c.name}</p>
                </div>
              </div>
              {currency.code === c.code && <Check className="h-3.5 w-3.5 text-indigo-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function WebsiteNav() {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const resourcesRef = useRef<HTMLDivElement>(null);

  const { data: navConfig } = trpc.websiteAdmin.publicNavigation.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: siteSettings } = trpc.websiteAdmin.publicSettings.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const showBanner = siteSettings?.announcementEnabled && siteSettings?.announcementBanner && !bannerDismissed;

  const NAV_LINKS = useMemo(() => {
    if (!navConfig?.mainLinks) return DEFAULT_NAV_LINKS;
    return navConfig.mainLinks
      .filter((l: any) => l.visible !== false)
      .map((l: any) => ({ label: l.label, href: l.href }));
  }, [navConfig]);

  const RESOURCE_LINKS = useMemo(() => {
    if (!navConfig?.resourceLinks) return DEFAULT_RESOURCE_LINKS;
    return navConfig.resourceLinks
      .filter((l: any) => l.visible !== false)
      .map((l: any) => ({
        label: l.label,
        href: l.href,
        icon: RESOURCE_ICON_MAP[l.href] || BookOpen,
        desc: RESOURCE_DESC_MAP[l.href] || l.label,
      }));
  }, [navConfig]);

  const ctaText = navConfig?.ctaText || "Get Started";
  const ctaLink = navConfig?.ctaLink || "/signup";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) setResourcesOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dashboardUrl = user ? getDashboardUrl(user.role || "staff") : "/login";

  return (
    <>
      {/* Announcement Banner */}
      {showBanner && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-center gap-3">
            <Megaphone className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm font-medium text-center">{siteSettings!.announcementBanner}</p>
            <button
              onClick={() => setBannerDismissed(true)}
              className="flex-shrink-0 ml-2 text-white/80 hover:text-white transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <header
        className={cn(
          "fixed left-0 right-0 z-50 transition-all duration-300",
          showBanner ? "top-10" : "top-0",
          scrolled
            ? "bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm"
            : "bg-transparent",
        )}
      >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a
            href="/"
            className="flex items-center gap-2.5 no-underline"
            onClick={(e) => { e.preventDefault(); navigate("/"); }}
          >
            {siteSettings?.logoUrl ? (
              <img
                src={siteSettings.logoUrl}
                alt={siteSettings.companyName || siteSettings.siteTitle || "Logo"}
                className="h-8 w-auto object-contain max-w-[160px]"
              />
            ) : (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 tracking-tight">
                  {siteSettings?.companyName || siteSettings?.siteTitle
                    ? <>{siteSettings.companyName || siteSettings.siteTitle}</>
                    : <>Nexus<span className="text-indigo-600">360</span></>}
                </span>
              </>
            )}
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); navigate(link.href); }}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors no-underline",
                  location === link.href
                    ? "text-gray-900 bg-gray-100"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                )}
              >
                {link.label}
              </a>
            ))}

            {/* Resources dropdown */}
            <div ref={resourcesRef} className="relative">
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className={cn(
                  "flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  RESOURCE_LINKS.some((r) => location === r.href)
                    ? "text-gray-900 bg-gray-100"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                )}
              >
                Resources
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", resourcesOpen && "rotate-180")} />
              </button>

              {resourcesOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden z-50">
                  {RESOURCE_LINKS.map((link) => {
                    const Icon = link.icon;
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={(e) => { e.preventDefault(); navigate(link.href); setResourcesOpen(false); }}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors no-underline",
                          location === link.href && "bg-indigo-50/50",
                        )}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 flex-shrink-0 mt-0.5">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{link.label}</p>
                          <p className="text-xs text-gray-400">{link.desc}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2">
            <CurrencySwitcher />
            <div className="w-px h-5 bg-gray-200 mx-1" />
            {isAuthenticated && user ? (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
                onClick={() => navigate(dashboardUrl)}
              >
                <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
                Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  onClick={() => navigate("/login")}
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
                  onClick={() => navigate(ctaLink)}
                >
                  {ctaText}
                </Button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden flex items-center gap-3">
            <CurrencySwitcher />
            <button
              className="text-gray-600 hover:text-gray-900"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white/97 backdrop-blur-xl border-t border-gray-200 px-4 py-4 space-y-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => { e.preventDefault(); navigate(link.href); setMenuOpen(false); }}
              className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 no-underline"
            >
              {link.label}
            </a>
          ))}

          <div className="pt-2 pb-1">
            <p className="px-4 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Resources</p>
          </div>
          {RESOURCE_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => { e.preventDefault(); navigate(link.href); setMenuOpen(false); }}
              className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 no-underline"
            >
              {link.label}
            </a>
          ))}

          <div className="pt-3 border-t border-gray-200 flex flex-col gap-2">
            {isAuthenticated && user ? (
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => { navigate(dashboardUrl); setMenuOpen(false); }}
              >
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => { navigate("/login"); setMenuOpen(false); }}
                >
                  Sign In
                </Button>
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => { navigate(ctaLink); setMenuOpen(false); }}
                >
                  {ctaText}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
    </>
  );
}

/* ── Scroll-to-top button ────────────────────────────────── */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all duration-300 hover:scale-110"
      aria-label="Back to top"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
