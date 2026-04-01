import { useCallback, useState } from "react";
import { Bell, AlertTriangle, Info, CheckCircle, X, Calendar, ArrowUpRight, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useOperationalNotifications } from "@/hooks/useOperationalNotifications";

const NotificationsIcon = () => {
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const {
    notifications,
    unreadCount,
    complianceLoading,
    refreshing,
    refresh,
    markAsRead,
    archiveNotification,
  } = useOperationalNotifications();

  const navigateTo = useCallback((view: string, params?: Record<string, string>) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
    window.history.pushState({}, "", `${url.pathname}${url.search}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const getIcon = (type: (typeof notifications)[number]["type"]) => {
    switch (type) {
      case "warning":
      case "error":
        return AlertTriangle;
      case "success":
        return CheckCircle;
      default:
        return Info;
    }
  };

  const getIconColor = (type: (typeof notifications)[number]["type"]) => {
    switch (type) {
      case "warning":
        return "text-orange-500";
      case "error":
        return "text-red-500";
      case "success":
        return "text-green-500";
      default:
        return "text-blue-500";
    }
  };

  const getPriorityColor = (priority: (typeof notifications)[number]["priority"]) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const handleOpen = async (notification: (typeof notifications)[number]) => {
    if (!notification.navigation) return;
    try {
      setProcessingId(notification.id);
      markAsRead(notification.id);
      navigateTo(notification.navigation.view, notification.navigation.params);
      setOpen(false);
    } finally {
      setProcessingId(null);
    }
  };

  const uiBlocked = refreshing || processingId !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Notificaciones</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refresh()}
            disabled={uiBlocked || complianceLoading}
            className="text-xs"
          >
            <RefreshCw className={`mr-2 h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
              <p className="text-sm">Todo en orden</p>
              <p className="text-xs">No hay notificaciones pendientes</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification, index) => {
                const Icon = getIcon(notification.type);
                return (
                  <div key={notification.id}>
                    <Card className={`mb-2 ${!notification.read ? "ring-1 ring-primary/20" : ""}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 flex-1 items-start gap-2">
                            <Icon className={`mt-0.5 h-4 w-4 ${getIconColor(notification.type)}`} />
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-1">
                                <h4 className="text-sm font-medium">{notification.title}</h4>
                                {!notification.read && <div className="h-2 w-2 rounded-full bg-primary" />}
                              </div>
                              <p className="mb-2 text-xs text-muted-foreground">{notification.message}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={`text-xs ${getPriorityColor(notification.priority)}`}>
                                  {notification.priority}
                                </Badge>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(notification.timestamp).toLocaleDateString("es-BO")}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            {notification.navigation && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void handleOpen(notification)}
                                disabled={uiBlocked}
                                className="h-6 px-2 text-xs"
                              >
                                <ArrowUpRight className="mr-1 h-3 w-3" />
                                {processingId === notification.id ? "Abriendo..." : "Abrir"}
                              </Button>
                            )}
                            {!notification.read && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markAsRead(notification.id)}
                                className="h-6 px-2 text-xs"
                                disabled={uiBlocked}
                              >
                                Marcar leido
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => archiveNotification(notification.id)}
                              className="h-6 w-6 p-0"
                              disabled={uiBlocked}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {index < notifications.length - 1 && <Separator />}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsIcon;
