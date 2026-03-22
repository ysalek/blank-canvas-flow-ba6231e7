import React from 'react';
import {
  Calculator, Shield, Lock, Crown,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { adminMenuItems, menuItems } from '@/components/app-sidebar-menu';
import { usePlan } from '@/hooks/usePlan';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLocation } from 'react-router-dom';

const AppSidebar = () => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const location = useLocation();
  const { currentPlan, isAdmin } = usePlan();
  const { user } = useAuth();

  const urlParams = new URLSearchParams(location.search);
  const currentView = urlParams.get('view') || 'dashboard';

  const isActive = (url: string) => {
    const viewParam = new URLSearchParams(url.split('?')[1] || '').get('view');
    return viewParam === currentView;
  };

  const handleNavigation = (url: string) => {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const getNavClasses = (active: boolean) =>
    active
      ? "bg-gradient-to-r from-primary to-primary-light text-primary-foreground font-medium shadow-lg shadow-primary/20"
      : "text-muted-foreground hover:bg-white/80 hover:text-foreground";

  return (
    <Sidebar className="sidebar-glow border-r-0">
      <SidebarContent className="overflow-y-auto p-4 scrollbar-thin">
        <div className={`mb-4 rounded-[1.75rem] border border-border/70 bg-white/80 px-4 py-5 shadow-sm ${isCollapsed ? 'text-center' : ''}`}>
          {isCollapsed ? (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-md">
              <Calculator className="h-5 w-5 text-white" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary shadow-md transition-transform duration-300 hover:scale-105">
                  <Calculator className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-foreground">ContaBolivia</h1>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? 'Administrador' : currentPlan === 'enterprise' ? 'Enterprise' : currentPlan === 'pro' ? 'Plan Profesional' : 'Plan Gratuito'}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-gradient-to-r from-primary/6 via-white to-success/5 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Centro operativo</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Navegacion clara y comercial</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Accesos priorizados para contabilidad, ventas, finanzas y cumplimiento.
                </p>
              </div>
            </div>
          )}
        </div>

        {isAdmin && adminMenuItems.map((group) => (
          <div key={group.group} className="mb-5">
            {!isCollapsed && (
              <div className="mb-2 px-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                  <Shield className="h-3 w-3" />
                  {group.group}
                </span>
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.title}
                  onClick={() => handleNavigation(item.url)}
                  className={`nav-item-animated flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm ${getNavClasses(isActive(item.url))}`}
                  title={isCollapsed ? item.title : undefined}
                >
                  <item.icon className={`h-[18px] w-[18px] flex-shrink-0 transition-transform duration-200 ${isActive(item.url) ? 'scale-110' : ''}`} />
                  {!isCollapsed && <span className="flex-1 truncate">{item.title}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}

        {menuItems.map((group, groupIndex) => (
          <div key={group.group} className="mb-5 animate-fade-in" style={{ animationDelay: `${groupIndex * 0.04}s` }}>
            {!isCollapsed && (
              <div className="mb-2 px-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                  {group.group}
                </span>
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const planHierarchy = { basic: 0, pro: 1, enterprise: 2 };
                const locked = !isAdmin && planHierarchy[item.plan] > planHierarchy[currentPlan];
                const isEnterprise = item.plan === 'enterprise';
                return (
                  <button
                    key={item.title}
                    onClick={() => handleNavigation(item.url)}
                    className={`nav-item-animated flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm ${locked ? 'opacity-50' : ''} ${getNavClasses(isActive(item.url))}`}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <item.icon className={`h-[18px] w-[18px] flex-shrink-0 transition-transform duration-200 ${isActive(item.url) ? 'scale-110' : ''}`} />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 truncate">{item.title}</span>
                        {locked && (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                        )}
                        {isEnterprise && !locked && !isAdmin && (
                          <Badge className="bg-amber-600 px-1.5 py-0 text-[10px] font-medium text-white">
                            <Crown className="mr-0.5 h-2.5 w-2.5" />
                          </Badge>
                        )}
                        {item.plan === 'pro' && !isEnterprise && !locked && !isAdmin && (
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-medium">
                            Pro
                          </Badge>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {!isCollapsed && !isAdmin && (currentPlan === 'basic' || currentPlan === 'pro') && (
          <div className="mt-auto px-1 pt-4">
            <button
              onClick={() => window.dispatchEvent(new Event('open-upgrade-modal'))}
              className="animate-pulse-glow w-full rounded-[1.75rem] border border-primary/15 bg-gradient-to-br from-primary/10 via-white to-primary/5 p-4 text-center transition-all duration-300 hover:from-primary/15 hover:to-primary/10"
            >
              <p className="text-sm font-semibold text-primary">
                {currentPlan === 'basic' ? 'Actualizar a Pro' : 'Actualizar a Enterprise'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {currentPlan === 'basic' ? 'Bs 199/mes | funciones avanzadas' : 'Bs 699/mes | todo ilimitado'}
              </p>
            </button>
          </div>
        )}

        {!isCollapsed && (
          <div className="mt-4 rounded-[1.5rem] border border-border/70 bg-white/70 px-3 py-4 shadow-sm">
            {user ? (
              <>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-sm font-bold text-primary">
                      {user.nombre?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{user.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.empresa}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span>Operacion activa v3.0</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span>Operacion activa v3.0</span>
              </div>
            )}
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
