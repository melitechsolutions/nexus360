import { useState, useEffect } from "react";
import { AlertTriangle, Clock, Wrench, RefreshCw, Mail, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function MaintenancePage() {
  const { data } = trpc.settings.getMaintenanceStatus.useQuery(
    undefined,
    { retry: false, refetchInterval: 30000 }
  );

  const title = data?.title || "Under Maintenance";
  const message = data?.message || "The system is currently undergoing scheduled maintenance. Please check back shortly.";
  const estimatedReturn = data?.estimatedReturn || "";
  const contactEmail = data?.contactEmail || "";

  // Live progress animation
  const [dots, setDots] = useState("");
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 600);
    return () => clearInterval(iv);
  }, []);

  // ETA countdown
  const [eta, setEta] = useState("");
  useEffect(() => {
    if (!estimatedReturn) return;
    const tick = () => {
      const diff = new Date(estimatedReturn).getTime() - Date.now();
      if (diff <= 0) { setEta("Returning soon…"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setEta(h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [estimatedReturn]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/40 to-orange-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-200/20 dark:bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-200/20 dark:bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-100/10 dark:bg-yellow-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-4">
        {/* Main card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-amber-500/10 dark:shadow-amber-500/5 border border-amber-200/50 dark:border-amber-700/30 p-8 md:p-10 text-center space-y-6">
          {/* Icon */}
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 w-20 h-20 bg-amber-400/20 dark:bg-amber-500/15 rounded-full animate-ping" style={{ animationDuration: "3s" }} />
            <div className="relative w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Wrench className="h-10 w-10 text-white animate-pulse" style={{ animationDuration: "2s" }} />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {title}
            </h1>
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
              <RefreshCw className="h-4 w-4 animate-spin" style={{ animationDuration: "3s" }} />
              <span className="text-sm font-medium">Work in progress{dots}</span>
            </div>
          </div>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm md:text-base">
            {message}
          </p>

          {/* ETA countdown */}
          {estimatedReturn && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Estimated Return</span>
              </div>
              <p className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
                {eta || new Date(estimatedReturn).toLocaleString()}
              </p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/60">
                {new Date(estimatedReturn).toLocaleString()}
              </p>
            </div>
          )}

          {/* Contact */}
          {contactEmail && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Need help?{" "}
                <a href={`mailto:${contactEmail}`} className="text-primary font-medium underline hover:text-primary/80 transition-colors">
                  {contactEmail}
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-400 dark:text-gray-600">
          <Shield className="h-3.5 w-3.5" />
          <span>Your data is safe. We'll be back shortly.</span>
        </div>
      </div>
    </div>
  );
}
