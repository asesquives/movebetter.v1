import { Calendar, Users, Package, DollarSign, Clock, UserCog, LayoutDashboard, LogOut, Tag } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { MictioBrandIcon } from "@/components/MictioBrandIcon";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Paquetes", url: "/paquetes", icon: Package },
  { title: "Catálogo", url: "/catalogo", icon: Tag },
  { title: "Ingresos", url: "/ingresos", icon: DollarSign },
  { title: "Disponibilidad", url: "/disponibilidad", icon: Clock },
  { title: "Equipo", url: "/equipo", icon: UserCog },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <div className={collapsed ? "flex justify-center" : "flex items-center gap-2.5"}>
          <MictioBrandIcon size={28} />
          {!collapsed && (
            <div>
              <h2 className="text-[15px] font-bold tracking-tight text-sidebar-foreground leading-none">
                Move Better
              </h2>
              <p className="text-[11px] text-sidebar-muted mt-1">Fisioterapia</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink
                        to={item.url}
                        end
                        className="text-[13px] font-medium text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent border-l-2 border-transparent rounded-none"
                        activeClassName="bg-sidebar-accent text-sidebar-foreground border-l-2 border-[hsl(var(--primary))]"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border gap-2">
        <div className="px-2 pt-2">
          <ThemeToggle collapsed={collapsed} />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="hover:bg-sidebar-accent text-sidebar-muted text-[13px] font-medium"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Cerrar sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
