import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClearDemoCookie } from "@/components/demo/clear-demo-cookie";

export const dynamic = "force-dynamic";

export default function DemoExpiredPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      {/* Ensures any leftover demo cookie is removed. */}
      <ClearDemoCookie />
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-6" />
          </div>
          <CardTitle>Your demo has ended</CardTitle>
          <CardDescription>
            The sandbox and all its sample data have been cleared. Hope you liked
            ABD Restaurant! Sign up or sign in to keep going with real data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button size="lg" render={<Link href="/login" />}>
            Sign in to continue
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
