import { useEffect, useMemo, useState } from "react";
import { Bell, AlertTriangle, Info, CheckCircle, X, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useFacturas } from "@/hooks/useFacturas";
import { useProductosValidated } from "@/hooks/useProductosValidated";

interface Notification {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  date: string;
  read: boolean;
  priority: "high" | "medium" | "low";
  category: "fiscal" | "inventory" | "finance" | "system";
}

const NotificationsIcon = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const { facturas } = useFacturas();
  const { productos } = useProductosValidated();

  const generatedNotifications = useMemo(() => {
    const today = new Date();
    const currentNotifications: Notification[] = [];

    const productosStockBajo = productos.filter(
      (producto) =>
        Number(producto.stock_actual || 0) <= Number(producto.stock_minimo || 0) &&
        Number(producto.stock_actual || 0) > 0
    );

    if (productosStockBajo.length > 0) {
      currentNotifications.push({
        id: "stock-bajo",
        type: "warning",
        title: "Productos con Stock Bajo",
        message: `${productosStockBajo.length} productos necesitan reposicion urgente`,
        date: today.toISOString(),
        read: false,
        priority: "high",
        category: "inventory",
      });
    }

    const facturasPendientes = facturas.filter((factura) => factura.estado === "enviada");
    if (facturasPendientes.length > 0) {
      const totalPendiente = facturasPendientes.reduce((sum, factura) => sum + factura.total, 0);
      currentNotifications.push({
        id: "facturas-pendientes",
        type: "info",
        title: "Facturas Pendientes de Cobro",
        message: `${facturasPendientes.length} facturas por Bs. ${totalPendiente.toFixed(2)}`,
        date: today.toISOString(),
        read: false,
        priority: "medium",
        category: "finance",
      });
    }

    const proximaDeclaracion = new Date();
    proximaDeclaracion.setDate(proximaDeclaracion.getDate() + 5);
    if (proximaDeclaracion.getDate() <= 15) {
      currentNotifications.push({
        id: "declaracion-iva",
        type: "warning",
        title: "Proximo Vencimiento IVA",
        message: "La declaracion mensual de IVA vence en 5 dias",
        date: today.toISOString(),
        read: false,
        priority: "high",
        category: "fiscal",
      });
    }

    const ultimoBackup = localStorage.getItem("ultimo-backup");
    if (!ultimoBackup || Date.now() - new Date(ultimoBackup).getTime() > 7 * 24 * 60 * 60 * 1000) {
      currentNotifications.push({
        id: "backup-requerido",
        type: "info",
        title: "Respaldo Recomendado",
        message: "No se ha realizado un respaldo en los ultimos 7 dias",
        date: today.toISOString(),
        read: false,
        priority: "medium",
        category: "system",
      });
    }

    return currentNotifications;
  }, [facturas, productos]);

  useEffect(() => {
    setNotifications((prev) =>
      generatedNotifications.map((notification) => {
        const existing = prev.find((item) => item.id === notification.id);
        return existing ? { ...notification, read: existing.read } : notification;
      })
    );
  }, [generatedNotifications]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification))
    );
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  const getIcon = (type: Notification["type"]) => {
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

  const getIconColor = (type: Notification["type"]) => {
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

  const getPriorityColor = (priority: Notification["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificaciones</h3>
          <Button variant="ghost" size="sm" onClick={() => setNotifications(generatedNotifications)} className="text-xs">
            Actualizar
          </Button>
        </div>

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
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
                          <div className="flex items-start gap-2 flex-1">
                            <Icon className={`w-4 h-4 mt-0.5 ${getIconColor(notification.type)}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-1">
                                <h4 className="text-sm font-medium">{notification.title}</h4>
                                {!notification.read && <div className="w-2 h-2 bg-primary rounded-full" />}
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">{notification.message}</p>
                              <div className="flex items-center gap-2">
                                <Badge className={`text-xs ${getPriorityColor(notification.priority)}`}>
                                  {notification.priority === "high"
                                    ? "Alta"
                                    : notification.priority === "medium"
                                      ? "Media"
                                      : "Baja"}
                                </Badge>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(notification.date).toLocaleDateString("es-BO")}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            {!notification.read && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markAsRead(notification.id)}
                                className="h-6 px-2 text-xs"
                              >
                                Marcar leido
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dismissNotification(notification.id)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="w-3 h-3" />
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
