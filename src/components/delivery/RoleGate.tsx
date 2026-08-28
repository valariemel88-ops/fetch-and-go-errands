import { Link } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { ROLE_HOME, ROLE_LABEL, useAccount } from "@/hooks/useAccount";
import type { AppRole } from "@/lib/deliveries.functions";

export function RoleGate({ role, children }: { role: AppRole; children: React.ReactNode }) {
  const { session, sessionLoading, account, accountLoading } = useAccount();

  if (sessionLoading || (session && accountLoading)) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <Notice
        title="Sign in required"
        body="You need to sign in to view this dashboard."
        action={<Link to="/auth" className="inline-block mt-4 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold">Go to sign in</Link>}
      />
    );
  }

  if (account?.role !== role) {
    return (
      <Notice
        title="Not available for your role"
        body={`This area is for ${ROLE_LABEL[role]} accounts. You are signed in as ${account?.role ? ROLE_LABEL[account.role] : "an unassigned user"}.`}
        action={
          account?.role ? (
            <Link to={ROLE_HOME[account.role]} className="inline-block mt-4 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold">
              Go to my dashboard
            </Link>
          ) : null
        }
      />
    );
  }

  return <>{children}</>;
}

function Notice({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-20 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl grid place-items-center bg-secondary text-muted-foreground">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}
