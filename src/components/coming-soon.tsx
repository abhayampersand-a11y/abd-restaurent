import { Construction } from "lucide-react";

/** Placeholder for admin sections delivered in later build phases. */
export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Construction className="size-6" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        This section ships in <span className="font-medium">{phase}</span>. The
        data model and routing are already wired up.
      </p>
    </div>
  );
}
