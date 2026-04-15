import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { SystemSettingsProvider } from "./contexts/SystemSettingsContext";
import { getLoginUrl } from "./const";
import "./index.css";

// ensure the Download icon is available globally in case a bundle chunk
// accidentally references it as a global variable (observed in production)
import { Download } from "lucide-react";
;(window as any).Download = Download;

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// Log initialization status
console.log("[App Init] Starting React app initialization...");
console.log("[App Init] VITE_API_URL env var:", import.meta.env.VITE_API_URL);
console.log("[App Init] Root element:", document.getElementById("root"));

let csrfToken: string | null = null;

async function retrieveCsrf() {
  try {
    // Use relative path so it works regardless of hostname/IP
    const res = await fetch("/api/trpc/auth.getCsrfToken", {
      credentials: "include"
    });
    const data = await res.json();
    // data.result.data.csrfToken
    csrfToken = data?.result?.data?.csrfToken || null;
  } catch (e) {
    console.warn("Failed to fetch CSRF token", e);
  }
}

retrieveCsrf();

// Use relative path for tRPC endpoint
const trpcEndpoint = "/api/trpc";

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: trpcEndpoint,
      transformer: superjson,
      fetch(input, init) {
        const headers = {
          ...(init?.headers ?? {}),
          'X-CSRF-Token': csrfToken || '',
        } as Record<string,string>;
        // Send token from localStorage as Authorization header (Docker/HTTP fallback)
        const localToken = localStorage.getItem("auth-token");
        if (localToken) {
          headers['Authorization'] = `Bearer ${localToken}`;
        }
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          headers,
        });
      },
    }),
  ],
});

console.log("[App Init] tRPC client created");

try {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found in DOM");
  }

  console.log("[App Init] Creating React root...");
  
  createRoot(root).render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SystemSettingsProvider>
          <App />
        </SystemSettingsProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
  
  console.log("[App Init] React app rendered successfully");
} catch (error) {
  console.error("[App Init] FATAL ERROR", error);
  document.body.innerHTML = `
    <div style="color: red; font-family: monospace; padding: 20px;">
      <h2>Application initialization failed</h2>
      <pre>${String(error)}</pre>
    </div>
  `;
}
