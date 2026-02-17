import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const BACKUP_TABLES = [
  // Parent tables first (order matters for restore)
  { key: "clientes", table: "clientes" },
  { key: "proveedores", table: "proveedores" },
  { key: "productos", table: "productos" },
  { key: "plan_cuentas", table: "plan_cuentas" },
  { key: "empleados", table: "empleados" },
  { key: "cuentas_bancarias", table: "cuentas_bancarias" },
  { key: "activos_fijos", table: "activos_fijos" },
  // Parent records
  { key: "facturas", table: "facturas" },
  { key: "compras", table: "compras" },
  { key: "asientos_contables", table: "asientos_contables" },
  { key: "comprobantes_integrados", table: "comprobantes_integrados" },
  // Child tables (depend on parents)
  { key: "items_facturas", table: "items_facturas" },
  { key: "items_compras", table: "items_compras" },
  { key: "cuentas_asientos", table: "cuentas_asientos" },
  // Operational
  { key: "movimientos_inventario", table: "movimientos_inventario" },
  { key: "movimientos_bancarios", table: "movimientos_bancarios" },
  { key: "pagos", table: "pagos" },
] as const;

export const useBackup = () => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const crearBackup = async () => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const backupData: Record<string, any[]> = {};
      let totalRecords = 0;

      await Promise.all(
        BACKUP_TABLES.map(async ({ key, table }) => {
          const { data, error } = await supabase
            .from(table as any)
            .select("*")
            .eq("user_id", user.id);

          if (!error && data && data.length > 0) {
            backupData[key] = data;
            totalRecords += data.length;
          }
        })
      );

      if (totalRecords === 0) {
        toast({
          title: "No hay datos para respaldar",
          description: "No se encontraron registros en la base de datos.",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      const backup = {
        version: "2.0",
        created_at: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        total_records: totalRecords,
        tables: backupData,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_contable_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup completo descargado",
        description: `${totalRecords} registros exportados de ${Object.keys(backupData).length} tablas.`,
      });
    } catch (error: any) {
      console.error("Error al crear backup:", error);
      toast({
        title: "Error al crear backup",
        description: error.message || "Error inesperado",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const restaurarBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== "string") throw new Error("Archivo inválido");

        const backup = JSON.parse(content);

        // Support v2 format
        const tablesData: Record<string, any[]> = backup.tables || backup;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No autenticado");

        let restored = 0;

        // Restore in order (parents first)
        for (const { key, table } of BACKUP_TABLES) {
          const records = tablesData[key];
          if (!records || records.length === 0) continue;

          // Strip ids and set current user_id
          const cleaned = records.map((r: any) => {
            const { id, created_at, updated_at, ...rest } = r;
            return { ...rest, user_id: user.id };
          });

          const { error } = await supabase
            .from(table as any)
            .insert(cleaned as any);

          if (error) {
            console.warn(`⚠️ Error restaurando ${table}:`, error.message);
          } else {
            restored += records.length;
            console.log(`✅ Restaurado ${table}: ${records.length} registros`);
          }
        }

        toast({
          title: "Restauración completada",
          description: `${restored} registros restaurados. La página se recargará.`,
        });

        setTimeout(() => window.location.reload(), 2000);
      } catch (error: any) {
        console.error("Error al restaurar:", error);
        toast({
          title: "Error al restaurar",
          description: error.message || "Archivo inválido o corrupto",
          variant: "destructive",
        });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return { crearBackup, restaurarBackup, isExporting, isImporting };
};
