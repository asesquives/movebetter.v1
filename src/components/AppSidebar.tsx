import { Calendar, Users, Package, DollarSign, Clock, UserCog, LayoutDashboard, LogOut, Tag, Sun, Moon } from "lucide-react";
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
import { useTheme } from "@/hooks/useTheme";
import { useLocation } from "react-router-dom";
import { MictioLogo } from "@/components/MictioLogo";

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
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <MictioLogo size={28} />
            <div>
              <h2 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">Move Better</h2>
              <p className="text-[11px] text-sidebar-muted">Fisioterapia</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <MictioLogo size={24} />
          </div>
        )}
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
                        className="hover:bg-sidebar-accent text-[13px] font-medium text-sidebar-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-[#7B61FF] !rounded-l-none"
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

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {/* Theme toggle */}
          <SidebarMenuItem>
            {!collapsed ? (
              <div className="mx-2 my-1 inline-flex items-center rounded-md border border-sidebar-border bg-sidebar-accent p-0.5 w-full">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded text-[12px] font-medium transition-colors ${
                    theme === "light"
                      ? "bg-background text-foreground"
                      : "text-sidebar-muted hover:text-sidebar-accent-foreground"
                  }`}
                  aria-label="Tema claro"
                >
                  <Sun className="h-3.5 w-3.5" /> Light
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded text-[12px] font-medium transition-colors ${
                    theme === "dark"
                      ? "bg-background text-foreground"
                      : "text-sidebar-muted hover:text-sidebar-accent-foreground"
                  }`}
                  aria-label="Tema oscuro"
                >
                  <Moon className="h-3.5 w-3.5" /> Dark
                </button>
              </div>
            ) : (
              <SidebarMenuButton
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hover:bg-sidebar-accent text-sidebar-muted"
                aria-label="Cambiar tema"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="hover:bg-sidebar-accent text-sidebar-muted">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Cerrar sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
