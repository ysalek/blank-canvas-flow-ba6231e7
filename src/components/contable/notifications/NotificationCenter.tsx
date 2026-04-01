import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, CheckCircle, Info, X, Archive, RefreshCw, ArrowUpRight } from "lucide-react";
import { useProductosValidated } from "@/hooks/useProductosValidated";
import { useFacturas } from "@/hooks/useFacturas";
import { useAsientos } from "@/hooks/useAsientos";
import { useCumplimientoEjecutivo } from "@/hooks/useCumplimientoEjecutivo";

type NotificationType = "info" | "warning" | "error" | "success";
type NotificationPriority = "low" | "medium" | "high" | "critical";
type NotificationCategory = "fiscal" | "inventory" | "finance" | "system";

interface NotificationItem {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: string;
  module: string;
  navigation?: {
    view: string;
    params?: Record<string, string>;
  };
}

const READ_STORAGE_KEY = "notification-center-read";
const HIDDEN_STORAGE_KEY = "notification-center-hidden";

const NotificationCenter = () => {
  const [filter, setFilter] = useState<"all" | "unread" | "warnings">("all");
  const [readIds, setReadIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(READ_STORAGE_KEY) || "[]") as string[];
    } catch {
      return [];
    }
  });
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(HIDDEN_STORAGE_KEY) || "[]") as string[];
    } catch {
      return [];
    }
  });
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { productos } = useProductosValidated();
  const { facturas } = useFacturas();
  const { getAsientos } = useAsientos();
  const { alerts, loading: complianceLoading, refetch: refetchCompliance } = useCumplimientoEjecutivo();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(readIds));
  }, [readIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(hiddenIds));
  }, [hiddenIds]);

  const navigateTo = useCallback((view: string, params?: Record<string, string>) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
    window.history.pushState({}, "", `${url.pathname}${url.search}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const generatedNotifications = useMemo<NotificationItem[]>(() => {
    const now = new Date().toISOString();
    const items: NotificationItem[] = [];

    const productosStockBajo = productos.filter(
      (producto) =>
        Number(producto.stock_actual || 0) <= Number(producto.stock_minimo || 0) &&
        producto.activo,
    );
    if (productosStockBajo.length > 0) {
      items.push({
        id: "stock-bajo",
        type: "warning",
        priority: "high",
        category: "inventory",
        title: "Productos con stock bajo",
        message: `${productosStockBajo.length} producto(s) requieren reposicion o ajuste de compra.`,
        timestamp: now,
        module: "inventario",
        navigation: {
          view: "inventario",
        },
      });
    }

    const facturasPendientes = facturas.filter((factura) => factura.estado === "enviada");
    if (facturasPendientes.length > 0) {
      const totalPendiente = facturasPendientes.reduce((sum, factura) => sum + Number(factura.total || 0), 0);
      items.push({
        id: "facturas-pendientes-cobro",
        type: "info",
        priority: "medium",
        category: "finance",
        title: "Facturas pendientes de cobro",
        message: `${facturasPendientes.length} factura(s) pendientes por ${totalPendiente.toFixed(2)} Bs.`,
        timestamp: now,
        module: "facturacion",
        navigation: {
          view: "facturacion",
        },
      });
    }

    const asientosRegistrados = getAsientos().filter((asiento) => asiento.estado === "registrado");
    if (asientosRegistrados.length > 0) {
      const balance = asientosRegistrados.reduce(
        (acc, asiento) => {
          asiento.cuentas.forEach((cuenta) => {
            acc.debe += Number(cuenta.debe || 0);
            acc.haber += Number(cuenta.haber || 0);
          });
          return acc;
        },
        { debe: 0, haber: 0 },
      );

      const diferencia = Math.abs(balance.debe - balance.haber);
      items.push({
        id: diferencia > 0.01 ? "balance-descuadrado" : "balance-cuadrado",
        type: diferencia > 0.01 ? "error" : "success",
        priority: diferencia > 0.01 ? "critical" : "low",
        category: "finance",
        title: diferencia > 0.01 ? "Balance contable descuadrado" : "Balance contable consistente",
        message:
          diferencia > 0.01
            ? `Se detecto una diferencia de ${diferencia.toFixed(2)} Bs. entre debe y haber.`
            : "Los asientos registrados mantienen equilibrio contable.",
        timestamp: now,
        module: "contabilidad",
        navigation: {
          view: "balance-comprobacion",
        },
      });
    }

    const ultimoBackup = typeof window !== "undefined" ? window.localStorage.getItem("ultimo-backup") : null;
    if (!ultimoBackup) {
      items.push({
        id: "backup-pendiente",
        type: "warning",
        priority: "medium",
        category: "system",
        title: "Respaldo inicial pendiente",
        message: "Todavia no se registro ningun backup del sistema en este entorno.",
        timestamp: now,
        module: "backup",
        navigation: {
          view: "backup",
        },
      });
    } else {
      const diasSinBackup = Math.floor((Date.now() - new Date(ultimoBackup).getTime()) / (1000 * 60 * 60 * 24));
      if (diasSinBackup > 7) {
        items.push({
          id: "backup-desactualizado",
          type: "warning",
          priority: "medium",
          category: "system",
          title: "Backup desactualizado",
          message: `El ultimo respaldo fue hace ${diasSinBackup} dia(s). Conviene actualizarlo.`,
          timestamp: now,
          module: "backup",
          navigation: {
            view: "backup",
          },
        });
      }
    }

    alerts.forEach((alert) => {
      if (alert.id === "sin-alertas") return;
      items.push({
        id: `compliance-${alert.id}`,
        type:
          alert.priority === "critical"
            ? "error"
            : alert.priority === "high"
              ? "warning"
              : "info",
        priority: alert.priority,
        category: "fiscal",
        title: alert.title,
        message: alert.description,
        timestamp: alert.deadline || now,
        module: alert.source,
        navigation: alert.navigation,
      });
    });

    return items
      .filter((item) => !hiddenIds.includes(item.id))
      .sort((a, b) => {
        const priorityOrder: Record<NotificationPriority, number> = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1,
        };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 25);
  }, [alerts, facturas, getAsientos, hiddenIds, productos]);

  const notifications = useMemo(
    () =>
      generatedNotifications.map((notification) => ({
        ...notification,
        read: readIds.includes(notification.id),
      })),
    [generatedNotifications, readIds],
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (filter === "unread") return !notification.read;
      if (filter === "warnings") return notification.type === "warning" || notification.type === "error";
      return true;
    });
  }, [filter, notifications]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const warningCount = notifications.filter((notification) => notification.type === "warning" || notification.type === "error").length;
  const uiBlocked = refreshing || processingId !== null;

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refetchCompliance();
    } finally {
      setRefreshing(false);
    }
  };

  const markAsRead = (id: string) => {
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const markAllAsRead = () => {
    setReadIds((prev) => Array.from(new Set([...prev, ...notifications.map((notification) => notification.id)])));
  };

  const archiveNotification = (id: string) => {
    setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

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

  const getIcon = (type: NotificationType) => {
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

  const getCardTone = (type: NotificationType) => {
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
          <Button onClick={() => void handleRefresh()} disabled={uiBlocked || complianceLoading}>
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
