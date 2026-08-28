import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount, type AppRole } from "@/lib/deliveries.functions";

export type Account = {
  userId: string;
  role: AppRole | null;
  fullName: string;
  phone: string;
};

export const ROLE_LABEL: Record<AppRole, string> = {
  retailer_staff: "Retailer Staff",
  dispatcher: "Dispatcher",
  rider: "Rider",
};

export const ROLE_HOME: Record<AppRole, string> = {
  retailer_staff: "/staff",
  dispatcher: "/dispatch",
  rider: "/deliveries",
};

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export function useAccount() {
  const { session, loading } = useSession();
  const query = useQuery({
    queryKey: ["account", session?.user.id ?? null],
    queryFn: () => getMyAccount(),
    enabled: !!session,
    staleTime: 60_000,
  });

  return {
    session,
    sessionLoading: loading,
    account: (query.data ?? null) as Account | null,
    accountLoading: query.isLoading,
  };
}
