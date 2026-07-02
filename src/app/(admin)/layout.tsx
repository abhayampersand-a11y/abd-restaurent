import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireUser } from "@/lib/auth-helpers";
import { getScope } from "@/lib/scope";
import { DemoBanner } from "@/components/demo/demo-banner";

/**
 * Shell for the entire admin console. Enforces authentication (via
 * `requireUser`, backed by the `proxy` guard) and provides the sidebar +
 * inset layout. Individual pages render their own header + content.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();
  const scope = await getScope();

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        user={{
          name: session.user.name ?? "Staff",
          email: session.user.email ?? "",
          avatar: session.user.image ?? undefined,
        }}
      />
      <SidebarInset>
        {scope.demo && scope.expiresAt && (
          <DemoBanner expiresAt={scope.expiresAt.toISOString()} />
        )}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
