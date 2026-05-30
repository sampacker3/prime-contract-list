import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface Props {
  onClick: () => Promise<void>;
  label?: string;
  loadingLabel?: string;
  doneLabel?: string;
  onDoneClick?: () => void;
  size?: "sm" | "default";
}

export default function ApplyWithAIButton({
  onClick,
  label = "Apply with AI",
  loadingLabel = "Working…",
  doneLabel,
  onDoneClick,
  size = "default",
}: Props) {
  const [hover, setHover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  const pad = size === "sm" ? "px-3 py-1.5 text-xs gap-1.5 h-8" : "px-4 py-2 text-sm gap-2 h-9";

  const handleClick = async () => {
    if (loading || (done && !onDoneClick)) return;
    if (done && onDoneClick) { onDoneClick(); return; }
    setLoading(true);
    setError(false);
    try {
      await onClick();
      setDone(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="relative w-full sm:w-auto shrink-0 rounded-xl p-[1.5px]"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4, #a855f7, #7c3aed)",
          backgroundSize: "300% 300%",
          animation: "ai-border-spin 3s ease infinite",
          boxShadow: hover
            ? "0 0 16px 2px rgba(139,92,246,0.4), 0 0 32px 4px rgba(59,130,246,0.2)"
            : "0 0 10px 1px rgba(139,92,246,0.25)",
          transition: "box-shadow 0.3s ease",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <button
          className={`relative flex w-full items-center justify-center font-semibold rounded-[10px] transition-all duration-300 ${pad}`}
          style={{
            background: hover
              ? "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.1))"
              : "rgba(139,92,246,0.07)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "#ffffff",
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "default" : "pointer",
          }}
          onClick={handleClick}
          disabled={loading}
        >
          {loading ? (
            <Loader2
              className={`animate-spin ${size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"}`}
              style={{ filter: "drop-shadow(0 0 4px rgba(139,92,246,0.6))" }}
            />
          ) : (
            <Sparkles
              className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"}
              style={{ filter: "drop-shadow(0 0 4px rgba(139,92,246,0.6))" }}
            />
          )}
          {done && doneLabel ? doneLabel : loading ? loadingLabel : label}
        </button>
      </div>
      {error && <p className="text-xs text-destructive mt-1">Something went wrong — please try again.</p>}
    </>
  );
}
