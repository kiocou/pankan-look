import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Home,
  FolderOpen,
  Film,
  Settings,
  AlertTriangle,
  Cloud,
  Menu,
} from "lucide-react";
import { useAppStore } from "@/stores";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const navItems = [
  { to: "/", icon: Home, label: "首页" },
  { to: "/browser", icon: FolderOpen, label: "文件浏览器" },
  { to: "/library", icon: Film, label: "媒体库" },
  { to: "/nsfw", icon: AlertTriangle, label: "NSFW" },
  { to: "/settings", icon: Settings, label: "设置" },
];

export function AppShell() {
  const navigate = useNavigate();
  const {
    providers,
    activeProviderId,
    loadProviders,
    setActiveProvider,
    sidebarOpen,
    toggleSidebar,
  } = useAppStore();

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // 没有 provider 时引导去设置
  useEffect(() => {
    if (providers.length === 0) {
      // 第一次不强制跳转，等用户主动进设置
    }
  }, [providers]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r bg-card/30 backdrop-blur-md transition-all duration-300",
          sidebarOpen ? "w-60" : "w-16"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          {sidebarOpen && (
            <div className="flex items-center gap-2 font-semibold">
              <div className="h-6 w-6 rounded bg-gradient-to-br from-purple-500 to-pink-500" />
              <span>盘盘看</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Provider 切换 */}
        <div className="border-t p-3">
          {sidebarOpen ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Cloud className="h-3 w-3" />
                <span>云盘</span>
              </div>
              {providers.length === 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate("/settings")}
                >
                  添加云盘
                </Button>
              ) : (
                <div className="space-y-1">
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setActiveProvider(p.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs",
                        activeProviderId === p.id
                          ? "bg-primary/15 text-primary"
                          : "hover:bg-accent"
                      )}
                    >
                      <span className="truncate">{p.name}</span>
                      {p.active && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Cloud className="mx-auto h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
