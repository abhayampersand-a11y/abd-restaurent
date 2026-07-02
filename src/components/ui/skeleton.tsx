import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        // Subtle shimmer sweep (falls back to nothing if reduced motion).
        "relative overflow-hidden rounded-md bg-muted",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-foreground/10 before:to-transparent",
        "motion-reduce:before:hidden",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
