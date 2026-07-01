"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  ClipboardListIcon,
  ChefHatIcon,
  LayoutGridIcon,
  BookOpenIcon,
  CalendarCheckIcon,
  BoxesIcon,
  UsersIcon,
  BarChart3Icon,
  Settings2Icon,
  CircleHelpIcon,
  UtensilsCrossedIcon,
} from "lucide-react";

import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = { title: string; url: string; icon: React.ReactNode };

const navMain: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
  { title: "Live Orders", url: "/orders", icon: <ClipboardListIcon /> },
  { title: "Kitchen (KDS)", url: "/kitchen", icon: <ChefHatIcon /> },
  { title: "Rooms & Tables", url: "/rooms", icon: <LayoutGridIcon /> },
  { title: "Menu", url: "/menu", icon: <BookOpenIcon /> },
  { title: "Reservations", url: "/reservations", icon: <CalendarCheckIcon /> },
  { title: "Inventory", url: "/inventory", icon: <BoxesIcon /> },
  { title: "Staff", url: "/staff", icon: <UsersIcon /> },
  { title: "Reports", url: "/reports", icon: <BarChart3Icon /> },
];

const navSecondary: NavItem[] = [
  { title: "Settings", url: "/settings", icon: <Settings2Icon /> },
  { title: "Get Help", url: "#", icon: <CircleHelpIcon /> },
];

type SidebarUser = { name: string; email: string; avatar?: string };

function NavList({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <SidebarMenu>
      {items.map((item) => {
        const active =
          item.url !== "#" &&
          (pathname === item.url || pathname.startsWith(`${item.url}/`));
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              tooltip={item.title}
              isActive={active}
              render={<Link href={item.url} />}
            >
              {item.icon}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user?: SidebarUser }) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/dashboard" />}
            >
              <UtensilsCrossedIcon className="size-5!" />
              <span className="text-base font-semibold">ABD Restaurant</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <NavList items={navMain} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <NavList items={navSecondary} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user?.name ?? "Staff",
            email: user?.email ?? "",
            avatar: user?.avatar ?? "/avatars/shadcn.jpg",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
