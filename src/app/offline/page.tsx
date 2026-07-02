import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <WifiOff className="size-6" />
      </div>
      <h1 className="text-lg font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        ABD Restaurant needs a connection for live orders. Reconnect and this
        page will refresh automatically.
      </p>
    </main>
  );
}
