import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle, Phone, MapPin, Star, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/_app/tracking/$id")({
  component: Tracking,
});

function Tracking() {
  const { id } = Route.useParams();

  return (
    <div className="relative h-[calc(100dvh-5rem)]">
      {/* Map placeholder */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="w-full h-full" style={{
          background: `
            radial-gradient(circle at 30% 40%, oklch(0.85 0.08 295 / 0.5), transparent 50%),
            radial-gradient(circle at 70% 60%, oklch(0.85 0.12 85 / 0.4), transparent 50%),
            repeating-linear-gradient(0deg, oklch(0.94 0.01 295) 0, oklch(0.94 0.01 295) 39px, oklch(0.88 0.02 295) 40px),
            repeating-linear-gradient(90deg, oklch(0.94 0.01 295) 0, oklch(0.94 0.01 295) 39px, oklch(0.88 0.02 295) 40px)
          `,
        }} />
        {/* Route */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 600" preserveAspectRatio="none">
          <path d="M 60 480 Q 200 380, 180 240 T 320 100" stroke="oklch(0.62 0.18 295)" strokeWidth="4" fill="none" strokeDasharray="0" strokeLinecap="round" />
          <circle cx="60" cy="480" r="8" fill="oklch(0.7 0.16 155)" />
          <circle cx="320" cy="100" r="8" fill="oklch(0.6 0.23 27)" />
          <circle cx="180" cy="240" r="14" fill="oklch(0.62 0.18 295)" stroke="white" strokeWidth="3" />
        </svg>
      </div>

      <Link to="/" className="absolute top-[max(env(safe-area-inset-top),1rem)] left-4 w-10 h-10 grid place-items-center rounded-full bg-card shadow-lg">
        <ArrowLeft className="w-5 h-5" />
      </Link>

      {/* Bottom card */}
      <div className="absolute bottom-0 inset-x-0 bg-card rounded-t-3xl p-5" style={{ boxShadow: "0 -10px 40px -10px rgba(0,0,0,0.15)" }}>
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/15 text-success">On the way</span>
          <span className="text-xs text-muted-foreground">#{id.slice(0, 6).toUpperCase()}</span>
        </div>
        <p className="text-lg font-semibold">Arriving in ~12 min</p>

        <div className="mt-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full grid place-items-center text-primary-foreground text-sm font-semibold" style={{ background: "var(--gradient-hero)" }}>BK</div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <p className="font-semibold text-sm">Brian K.</p>
              <BadgeCheck className="w-4 h-4 text-gold" />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Star className="w-3 h-3 fill-gold text-gold" /> 4.9 · 312 errands
            </p>
          </div>
          <Link to="/chat/$id" params={{ id }} className="w-10 h-10 rounded-full bg-primary-soft text-primary grid place-items-center">
            <MessageCircle className="w-5 h-5" />
          </Link>
          <button className="w-10 h-10 rounded-full bg-primary text-primary-foreground grid place-items-center">
            <Phone className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-muted-foreground flex-1">Pickup</span>
            <span className="font-medium">Naivas Kileleshwa</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-muted-foreground flex-1">Drop-off</span>
            <span className="font-medium">Lavington Heights</span>
          </div>
        </div>
      </div>
    </div>
  );
}