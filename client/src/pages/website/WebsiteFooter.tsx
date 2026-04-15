import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Zap, Twitter, Linkedin, Github, Mail, Cloud, Cookie } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ScrollToTop } from "./WebsiteNav";

const DEFAULT_FOOTER_COLUMNS = [
  { title: "Product", links: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Book a Demo", href: "/book-a-demo" },
    { label: "Documentation", href: "/documentation" },
  ]},
  { title: "Company", links: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Become a Partner", href: "/become-a-partner" },
    { label: "Blog", href: "/blog" },
  ]},
  { title: "Resources", links: [
    { label: "User Guide", href: "/user-guide" },
    { label: "Troubleshooting", href: "/troubleshooting" },
  ]},
  { title: "Legal", links: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms & Conditions", href: "/terms-and-conditions" },
  ]},
];

export function WebsiteFooter() {
  const [, navigate] = useLocation();
  const { data: settings } = trpc.websiteAdmin.publicSettings.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const { data: footerConfig } = trpc.websiteAdmin.publicFooterConfig.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const siteTitle = settings?.siteTitle || "Nexus360";
  const tagline = settings?.tagline || "One Hub. Total Control.\nThe unified business management platform for modern enterprises.";
  const contactEmail = settings?.contactEmail || "hello@nexus360.app";

  const socialLinks = [
    { icon: <Twitter className="h-4 w-4" />, href: settings?.socialTwitter || "#" },
    { icon: <Linkedin className="h-4 w-4" />, href: settings?.socialLinkedIn || "#" },
    { icon: <Github className="h-4 w-4" />, href: "#" },
    { icon: <Mail className="h-4 w-4" />, href: contactEmail ? `mailto:${contactEmail}` : "mailto:hello@nexus360.app" },
  ];

  return (
    <>
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a
              href="/"
              className="flex items-center gap-2.5 no-underline mb-4"
              onClick={(e) => { e.preventDefault(); navigate("/"); }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                Nexus<span className="text-indigo-600">360</span>
              </span>
            </a>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              {tagline.split('\n').map((line, i) => (
                <React.Fragment key={i}>{line}{i < tagline.split('\n').length - 1 && <br />}</React.Fragment>
              ))}
            </p>
            <div className="flex gap-3">
              {socialLinks.filter(s => s.href && s.href !== "#").length > 0 ? (
                socialLinks.filter(s => s.href && s.href !== "#").map((s, i) => (
                  <a
                    key={i}
                    href={s.href}
                    target={s.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors no-underline"
                  >
                    {s.icon}
                  </a>
                ))
              ) : (
                socialLinks.map((s, i) => (
                  <a
                    key={i}
                    href={s.href}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-200 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors no-underline"
                  >
                    {s.icon}
                  </a>
                ))
              )}
            </div>
          </div>

          {/* Link columns */}
          {(footerConfig?.columns ?? DEFAULT_FOOTER_COLUMNS).map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) => { e.preventDefault(); navigate(link.href); }}
                      className="text-sm text-gray-500 hover:text-indigo-600 transition-colors no-underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Cloud providers + compliance row */}
        {(footerConfig?.showCloudPartners !== false || footerConfig?.showComplianceBadges !== false) && (
          <div className="border-t border-gray-200 pt-8 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              {footerConfig?.showCloudPartners !== false && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3 flex items-center gap-1.5">
                    <Cloud className="h-3 w-3" /> Cloud Infrastructure Partners
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "AWS",              color: "text-orange-600" },
                      { label: "Microsoft Azure",  color: "text-blue-600" },
                      { label: "Google Cloud",     color: "text-sky-600" },
                      { label: "DigitalOcean",     color: "text-blue-500" },
                      { label: "Cloudflare",       color: "text-orange-500" },
                      { label: "Docker",           color: "text-cyan-600" },
                    ].map((p) => (
                      <span key={p.label} className={`inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold ${p.color}`}>
                        {p.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {footerConfig?.showComplianceBadges !== false && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">Security &amp; Compliance</p>
                  <div className="flex flex-wrap gap-2">
                    {["GDPR Ready", "SOC 2 Type II", "End-to-End Encrypted", "MFA Enabled"].map((badge) => (
                      <span key={badge} className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                        ✓ {badge}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <p>{footerConfig?.copyrightText || `© ${new Date().getFullYear()} ${siteTitle}. All rights reserved.`}</p>
          <p>Built for enterprise scale.</p>
        </div>
      </div>
    </footer>
    <ScrollToTop />
    <CookieConsent />
    </>
  );
}

/* ── Cookie Consent Banner ────────────────────────────────── */
function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("nx360_cookie_consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("nx360_cookie_consent", "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("nx360_cookie_consent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pointer-events-none">
      <div className="max-w-lg mx-auto sm:mx-0 sm:ml-6 pointer-events-auto">
        <div className="rounded-xl border border-gray-200 bg-white shadow-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 flex-shrink-0 mt-0.5">
              <Cookie className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 mb-1">We use cookies</p>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                We use essential cookies to keep the platform running and optional analytics cookies to improve your experience.{" "}
                <a href="/privacy-policy" className="text-indigo-600 hover:text-indigo-700 underline">
                  Learn more
                </a>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={accept}
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Accept All
                </button>
                <button
                  onClick={decline}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Essential Only
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
