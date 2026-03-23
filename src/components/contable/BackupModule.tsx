import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, Database, Shield, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBackup } from "@/hooks/useBackup";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EnhancedHeader, EnhancedMetricCard, MetricGrid } from "./dashboard/EnhancedLayout";

interface TableInfo {
  key: string;
  label: string;
  table: keyof Database["public"]["Tables"];
  count: number;
}

const INITIAL_TABLES: TableInfo[] = [
  { key: "clientes", label: "Clientes", table: "clientes", count: 0 },
  { key: "proveedores", label: "Proveedores", table: "proveedores", count: 0 },
  { key: "productos", label: "Productos", table: "productos", count: 0 },
  { key: "facturas", label: "Facturas", table: "facturas", count: 0 },
  { key: "items_facturas", label: "Items Facturas", table: "items_facturas", count: 0 },
  { key: "compras", label: "Compras", table: "compras", count: 0 },
  { key: "items_compras", label: "Items Compras", table: "items_compras", count: 0 },
  { key: "asientos", label: "Asientos Contables", table: "asientos_contables", count: 0 },
  { key: "cuentas_asientos", label: "Cuentas Asientos", table: "cuentas_asientos", count: 0 },
  { key: "comprobantes", label: "Comprobantes", table: "comprobantes_integrados", count: 0 },
  { key: "movimientos", label: "Mov. Inventario", table: "movimientos_inventario", count: 0 },
  { key: "empleados", label: "Empleados", table: "empleados", count: 0 },
  { key: "plan_cuentas", label: "Plan de Cuentas", table: "plan_cuentas", count: 0 },
  { key: "cuentas_bancarias", label: "Cuentas Bancarias", table: "cuentas_bancarias", count: 0 },
  { key: "mov_bancarios", label: "Mov. Bancarios", table: "movimientos_bancarios", count: 0 },
  { key: "activos_fijos", label: "Activos Fijos", table: "activos_fijos", count: 0 },
  { key: "pagos", label: "Pagos", table: "pagos", count: 0 },
];

const BackupModule = () => {
  const { toast } = useToast();
  const { crearBackup, restaurarBackup, isExporting, isImporting } = useBackup();
  const [tables, setTables] = useState<TableInfo[]>(INITIAL_TABLES);
  const [deleteTarget, setDeleteTarget] = useState<TableInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalRegistros = tables.reduce((sum, table) => sum + table.count, 0);
  const tablasConDatos = tables.filter((table) => table.count > 0).length;

  const fetchCounts = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const results = await Promise.all(
      INITIAL_TABLES.map(async (tableInfo) => {
        const { count, error } = await supabase
          .from(tableInfo.table)
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        return {
          ...tableInfo,
          count: error ? 0 : (count ?? 0),
        };
      })
    );

    setTables(results);
  }, []);

  useEffect(() => {
    void fetchCounts();
  }, [fetchCounts]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { data } = await supabase
        .from(deleteTarget.table)
        .select("id")
        .eq("user_id", user.id);
      const totalDeleted = data?.length ?? 0;

      if (totalDeleted > 0) {
        const { error } = await supabase
          .from(deleteTarget.table)
          .delete()
          .eq("user_id", user.id);

        if (error) {
          throw new Error(`Error eliminando ${deleteTarget.table}: ${error.message}`);
        }
      }

      toast({
        title: `${totalDeleted} registros eliminados`,
        description: `${deleteTarget.label} y sus dependencias fueron eliminados correctamente.`,
      });

      setDeleteTarget(null);
      await fetchCounts();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo completar la eliminacion.";
      toast({
        title: "Error al eliminar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-shell space-y-6 pb-12">
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar todos los registros</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminaran todos los registros de <strong>{deleteTarget?.label}</strong> ({deleteTarget?.count} registros).
              <br />
              <br />
              <span className="font-semibold text-destructive">Esta accion no se puede deshacer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Eliminar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EnhancedHeader
        title="Backups y restauracion"
        subtitle="Protege la operacion contable con respaldos completos, restauracion guiada y control por tabla."
        badge={{
          text: totalRegistros > 0 ? "Datos listos para respaldo" : "Sin datos cargados",
          variant: totalRegistros > 0 ? "secondary" : "warning",
        }}
      />

      <MetricGrid columns={4}>
        <EnhancedMetricCard title="Registros monitoreados" value={totalRegistros} subtitle="Datos detectados para respaldo" icon={Database} />
        <EnhancedMetricCard title="Tablas con datos" value={tablasConDatos} subtitle="Fuentes activas en la cuenta" icon={Shield} variant="success" />
        <EnhancedMetricCard title="Exportacion" value={isExporting ? "En curso" : "Disponible"} subtitle="Descarga de backup completo" icon={Download} variant={isExporting ? "warning" : "success"} />
        <EnhancedMetricCard title="Restauracion" value={isImporting ? "Procesando" : "Lista"} subtitle="Importacion desde archivo JSON" icon={Upload} variant={isImporting ? "warning" : "secondary"} />
      </MetricGrid>

      <div className="hero-panel rounded-[2rem] p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Continuidad operativa
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">
              Resguarda la informacion critica antes de cierres, migraciones y cambios estructurales
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Los contadores muestran solo la informacion del usuario actual y ayudan a verificar
              el alcance real del respaldo antes de exportar o depurar datos.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Buenas practicas
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold">Antes de cerrar mes</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Exporta un respaldo completo previo a ajustes, restauraciones o depuraciones masivas.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold">Antes de eliminar</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Usa el conteo por tabla para confirmar impacto y evitar limpieza irreversible sin respaldo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Backup y restauracion
          </CardTitle>
          <CardDescription>Respalda y restaura todos los datos disponibles del entorno contable.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Es recomendable realizar backups periodicos para proteger la informacion contable. Los contadores muestran unicamente sus datos filtrados por usuario.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estado actual del sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tables.map((table) => (
                  <div key={table.key} className="flex items-center justify-between">
                    <span>{table.label}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{table.count}</Badge>
                      <button
                        onClick={() => table.count > 0 && setDeleteTarget(table)}
                        disabled={table.count === 0}
                        className="rounded p-1 text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-30"
                        title={`Eliminar todos los registros de ${table.label}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Acciones de respaldo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Exportar backup</Label>
                  <Button onClick={() => crearBackup()} disabled={isExporting} className="w-full">
                    {isExporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {isExporting ? "Exportando..." : "Descargar backup completo"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-file">Restaurar backup</Label>
                  <Input
                    id="backup-file"
                    type="file"
                    accept=".json"
                    onChange={restaurarBackup}
                    disabled={isImporting}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5" />
                Instrucciones de uso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <h4 className="mb-2 font-semibold">Crear backup</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Haz clic en "Descargar backup completo".</li>
                    <li>Se generara un archivo JSON descargable.</li>
                    <li>Guarda el archivo en un lugar seguro.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 font-semibold">Restaurar backup</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Selecciona el archivo JSON de respaldo.</li>
                    <li>La restauracion se ejecutara automaticamente.</li>
                    <li>Revisa luego los modulos criticos del sistema.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 font-semibold">Eliminar datos</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Usa el icono de papelera junto a cada tabla.</li>
                    <li>Solo se eliminan los datos del usuario actual.</li>
                    <li>La accion exige confirmacion y no se puede revertir.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupModule;
