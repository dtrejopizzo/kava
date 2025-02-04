"use client"

import type * as React from "react"
import { Command, SquareTerminal, Package, DollarSign } from "lucide-react"
import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import { ThemeToggle } from "./theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"

const data = {
  user: {
    name: "Admin",
    email: "admin@biblioteca.com",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: SquareTerminal,
    },
    {
      title: "Stock",
      url: "/stock",
      icon: Package,
    },
    {
      title: "Ventas",
      url: "/ventas",
      icon: DollarSign,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user] = useAuthState(auth)
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">KAVA</span>
                  <span className="truncate text-xs">Sistema de Gestión</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            id: user?.uid || "",
            name: user?.displayName || "Usuario",
            email: user?.email || "usuario@ejemplo.com",
            avatar: user?.photoURL || "/placeholder.svg?height=32&width=32",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}

