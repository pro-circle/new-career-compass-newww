import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackButton({
  to = "/",
  className = "",
  label,
  variant = "default",
}: {
  to?: string;
  className?: string;
  label?: string;
  variant?: "default" | "ghost" | "subtle";
}) {
  const router = useRouter();

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to });
    }
  }

  const variants = {
    default: "border border-border bg-card text-foreground hover:bg-surface",
    ghost: "text-foreground/70 hover:bg-surface hover:text-foreground",
    subtle: "bg-background/80 text-foreground/70 hover:text-foreground backdrop-blur",
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Go back"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md p-2 text-sm font-medium transition-colors",
        variants[variant],
        className
      )}
    >
      <ArrowLeft className="size-4" />
      {label && <span>{label}</span>}
    </button>
  );
}
