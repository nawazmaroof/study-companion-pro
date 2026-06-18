import { createFileRoute, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      const { data: anon, error } = await supabase.auth.signInAnonymously();
      if (error || !anon.user) throw new Error("Could not start study session");
      return { user: anon.user };
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
