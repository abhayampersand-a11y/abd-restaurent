"use client";

import { useActionState } from "react";
import { UtensilsCrossed, Loader2, Sparkles } from "lucide-react";

import { authenticate, type LoginState } from "./actions";
import { startDemo } from "@/app/demo-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    authenticate,
    undefined,
  );

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-6" />
          </div>
          <CardTitle className="text-xl">ABD Restaurant</CardTitle>
          <CardDescription>Staff sign-in — Admin console</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@abd.test"
                autoComplete="email"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {state?.error ? (
              <p className="text-sm text-destructive">{state.error}</p>
            ) : null}

            <Button type="submit" size="lg" disabled={pending} className="w-full">
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Demo login: admin@abd.test / password123
            </p>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Live Demo: spins up a 5-minute isolated sandbox — no signup. */}
          <form action={startDemo} className="mt-4">
            <Button type="submit" variant="outline" size="lg" className="w-full">
              <Sparkles /> Try Live Demo (5 min)
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
