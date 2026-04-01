import { useCallback, useEffect, useMemo, useState } from "react";
import { useProductosValidated } from "@/hooks/useProductosValidated";
import { useFacturas } from "@/hooks/useFacturas";
import { useAsientos } from "@/hooks/useAsientos";
import { useCumplimientoEjecutivo } from "@/hooks/useCumplimientoEjecutivo";

export type OperationalNotificationType = "info" | "warning" | "error" | "success";
export type OperationalNotificationPriority = "low" | "medium" | "high" | "critical";
export type OperationalNotificationCategory = "fiscal" | "inventory" | "finance" | "system";

export interface OperationalNotificationItem {
  id: string;
  type: OperationalNotificationType;
  priority: OperationalNotificationPriority;
  category: OperationalNotificationCategory;
  title: string;
  message: string;
  timestamp: string;
  module: string;
  navigation?: {
    view: string;
    params?: Record<string, string>;
  };
  read: boolean;
}

const READ_STORAGE_KEY = "notification-center-read";
const HIDDEN_STORAGE_KEY = "notification-center-hidden";

export const useOperationalNotifications = () => {
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

  const notifications = useMemo<OperationalNotificationItem[]>(() => {
    const now = new Date().toISOString();
    const items: Omit<OperationalNotificationItem, "read">[] = [];

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
        navigation: { view: "inventario" },
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
        navigation: { view: "facturacion" },
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
        navigation: { view: "balance-comprobacion" },
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
        navigation: { view: "backup" },
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
          navigation: { view: "backup" },
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
        const priorityOrder: Record<OperationalNotificationPriority, number> = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1,
        };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 25)
      .map((item) => ({
        ...item,
        read: readIds.includes(item.id),
      }));
  }, [alerts, facturas, getAsientos, hiddenIds, productos, readIds]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const warningCount = notifications.filter((notification) => notification.type === "warning" || notification.type === "error").length;

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await refetchCompliance();
    } finally {
      setRefreshing(false);
    }
  }, [refetchCompliance]);

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => Array.from(new Set([...prev, ...notifications.map((notification) => notification.id)])));
  }, [notifications]);

  const archiveNotification = useCallback((id: string) => {
    setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  return {
    notifications,
    unreadCount,
    warningCount,
    complianceLoading,
    refreshing,
    refresh,
    markAsRead,
    markAllAsRead,
    archiveNotification,
  };
};
