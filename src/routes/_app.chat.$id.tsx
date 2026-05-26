import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Send, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/_app/chat/$id")({
  component: Chat,
});

type Msg = { id: string; from: "me" | "them"; text: string; pending?: boolean };

function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: "1", from: "them", text: "Hey! I'm at Naivas, picking up your items now." },
    { id: "2", from: "me", text: "Awesome, thanks! Could you also grab a 1L milk?" },
    { id: "3", from: "them", text: "Sure thing 👍" },
  ]);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const tempId = `tmp-${Date.now()}`;
    // Optimistic insert
    setMsgs((m) => [...m, { id: tempId, from: "me", text: trimmed, pending: true }]);
    setText("");
    // Simulate server confirm
    setTimeout(() => {
      setMsgs((m) => m.map((x) => x.id === tempId ? { ...x, id: `s-${Date.now()}`, pending: false } : x));
    }, 700);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)]">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Link to="/tracking/$id" params={{ id: "abc123" }} className="w-9 h-9 grid place-items-center rounded-full bg-secondary">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-10 h-10 rounded-full grid place-items-center text-primary-foreground text-xs font-semibold" style={{ background: "var(--gradient-hero)" }}>BK</div>
        <div className="flex-1">
          <p className="font-semibold text-sm flex items-center gap-1">Brian K. <BadgeCheck className="w-4 h-4 text-gold" /></p>
          <p className="text-[11px] text-success">● Online</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm ${
              m.from === "me"
                ? `text-primary-foreground rounded-br-md ${m.pending ? "opacity-60" : ""}`
                : "bg-secondary text-secondary-foreground rounded-bl-md"
            }`} style={m.from === "me" ? { background: "var(--gradient-hero)" } : undefined}>
              {m.text}
              {m.pending && <span className="ml-1 text-[10px] opacity-80">·sending</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-border bg-card flex items-center gap-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <input
          ref={inputRef}
          value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Message Brian…"
          className="flex-1 bg-secondary rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button onClick={send} className="w-11 h-11 rounded-full text-primary-foreground grid place-items-center active:scale-95 transition" style={{ background: "var(--gradient-hero)" }}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}