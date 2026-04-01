import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, CheckCircle, Info, X, Archive, RefreshCw, ArrowUpRight } from "lucide-react";
import { useOperationalNotifications } from "@/hooks/useOperationalNotifications";

const NotificationCenter = () => {
  const [filter, setFilter] = useState<"all" | "unread" | "warnings">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const {
    notifications,
    unreadCount,
    warningCount,
    complianceLoading,
    refreshing,
    refresh,
    markAsRead,
    markAllAsRead,
    archiveNotification,
  } = useOperationalNotifications();

  const navigateTo = useCallback((view: string, params?: Record<string, string>) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
    window.history.pushState({}, "", `${url.pathname}${url.search}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (filter === "unread") return !notification.read;
      if (filter === "warnings") return notification.type === "warning" || notification.type === "error";
      return true;
    });
  }, [filter, notifications]);

  const uiBlocked = refreshing || processingId !== null;

  const handleOpenNotification = async (notification: (typeof notifications)[number]) => {
    if (!notification.navigation) return;
    try {
      setProcessingId(notification.id);
      markAsRead(notification.id);
      navigateTo(notification.navigation.view, notification.navigation.params);
    } finally {
      setProcessingId(null);
    }
  };

  const getIcon = (type: (typeof notifications)[number]["type"]) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "error":
        return <AlertTriangle className="h-5 w-5 text-rose-500" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      default:
        return <Info className="h-5 w-5 text-sky-500" />;
    }
  };

  const getCardTone = (type: (typeof notifications)[number]["type"]) => {
    switch (type) {
      case "warning":
        return "border-l-amber-500 bg-amber-50/80";
      case "error":
        return "border-l-rose-500 bg-rose-50/80";
      case "success":
        return "border-l-emerald-500 bg-emerald-50/80";
      default:
        return "border-l-sky-500 bg-sky-50/80";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Centro de notificaciones</h2>
            <p className="text-muted-foreground">
              Prioriza incidencias operativas, fiscales y de control con acceso directo al modulo origen.
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={markAllAsRead} disabled={uiBlocked || unreadCount === 0}>
            Marcar todas como leidas
          </Button>
          <Button onClick={() => void refresh()} disabled={uiBlocked || complianceLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Total visibles</div>
            <div className="mt-2 text-2xl font-semibold">{notifications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Sin leer</div>
            <div className="mt-2 text-2xl font-semibold">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">Alertas criticas o warning</div>
            <div className="mt-2 text-2xl font-semibold">{warningCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} size="sm" disabled={uiBlocked}>
          Todas ({notifications.length})
        </Button>
        <Button variant={filter === "unread" ? "default" : "outline"} onClick={() => setFilter("unread")} size="sm" disabled={uiBlocked}>
          No leidas ({unreadCount})
        </Button>
        <Button variant={filter === "warnings" ? "default" : "outline"} onClick={() => setFilter("warnings")} size="sm" disabled={uiBlocked}>
          Alertas ({warningCount})
        </Button>
      </div>

      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="font-semibold">No hay notificaciones activas</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Cuando el sistema detecte alertas operativas o de cumplimiento apareceran aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`border-l-4 transition-all ${getCardTone(notification.type)} ${notification.read ? "opacity-80" : "shadow-sm"}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {getIcon(notification.type)}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{notification.title}</CardTitle>
                        {!notification.read && <Badge variant="secondary">Nuevo</Badge>}
                        <Badge variant="outline" className="text-xs">
                          {notification.module}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                  </div>
                  <Badge variant={notification.priority === "critical" ? "destructive" : "outline"}>
                    {notification.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(notification.timestamp).toLocaleString("es-BO")}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {notification.navigation && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleOpenNotification(notification)}
                        disabled={uiBlocked}
                      >
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                        {processingId === notification.id ? "Abriendo..." : "Abrir origen"}
                      </Button>
                    )}
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        disabled={uiBlocked}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Marcar leida
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => archiveNotification(notification.id)}
                      disabled={uiBlocked}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archivar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => archiveNotification(notification.id)}
                      disabled={uiBlocked}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
