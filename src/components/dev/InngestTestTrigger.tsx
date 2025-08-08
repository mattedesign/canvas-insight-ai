import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Fires a one-off Inngest test event via the inngest-dispatch Edge Function.
 * Auto-runs once on mount; guarded by localStorage flag to avoid duplicates.
 */
export default function InngestTestTrigger() {
  const fired = useRef(false);

  useEffect(() => {
    const force = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("forceInngest") === "1";
    const already = localStorage.getItem("inngestTestFired");
    if (fired.current || (already === "1" && !force)) return;

    fired.current = true;

    (async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes?.user?.id;

        const payload = {
          name: "analysis/test.ping",
          data: {
            source: "app",
            path: typeof window !== "undefined" ? window.location.pathname : "/",
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
            timestamp: new Date().toISOString(),
          },
          user: userId,
          id: crypto.randomUUID?.() ?? undefined,
        } as const;

        const { data, error } = await supabase.functions.invoke("inngest-dispatch", {
          body: payload,
        });

        if (error) {
          console.error("[InngestTest] Dispatch error:", error);
          toast.error("Inngest test dispatch failed", {
            description: typeof error === "string" ? error : JSON.stringify(error),
          });
          return;
        }

        console.log("[InngestTest] Dispatch OK:", data);
        toast.success("Inngest test event sent", {
          description: "Check the inngest-dispatch logs in Supabase.",
        });
        localStorage.setItem("inngestTestFired", "1");
      } catch (err) {
        console.error("[InngestTest] Unexpected error:", err);
        toast.error("Inngest test encountered an error", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    })();
  }, []);

  return null;
}
