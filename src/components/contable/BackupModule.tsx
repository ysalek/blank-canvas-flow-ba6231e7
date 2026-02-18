
import { useState, useEffect, useCallback } from "react";
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

interface TableInfo {
  key: string;
  label: string;
  table: string;
  count: number;
}

const BackupModule = () => {
  const { toast } = useToast();
  const { crearBackup, restaurarBackup, isExporting, isImporting } = useBackup();

  const [tables, setTables] = useState<TableInfo[]>([
    { key: "clientes", label: "Clientes", table: "clientes", count: 0 },
    { key: "proveedores", label: "Proveedores", table: "proveedores", count: 0 },
    { key: "productos", label: "Productos", table: "productos", count: 0 },
    { key: "facturas", label: "Facturas", table: "facturas", count: 0 },
    { key: "items_facturas", label: "Ítems Facturas", table: "items_facturas", count: 0 },
    { key: "compras", label: "Compras", table: "compras", count: 0 },
    { key: "items_compras", label: "Ítems Compras", table: "items_compras", count: 0 },
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
  ]);

  const [deleteTarget, setDeleteTarget] = useState<TableInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCounts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const results = await Promise.all(
      tables.map(async (t) => {
        const { count, error } = await supabase
          .from(t.table as any)
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        return { ...t, count: error ? 0 : (count ?? 0) };
      })
    );
    setTables(results);
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Delete child rows referencing parent IDs owned by this user
  const deleteChildByParent = async (
    childTable: string,
    fkColumn: string,
    parentTable: string,
    userId: string
  ): Promise<number> => {
    const { data: parents } = await supabase
      .from(parentTable as any)
      .select("id")
      .eq("user_id", userId);

    if (!parents || parents.length === 0) return 0;

    const parentIds = parents.map((p: any) => p.id);

    const { error, count } = await supabase
      .from(childTable as any)
      .delete({ count: 'exact' })
      .in(fkColumn, parentIds);

    if (error) throw new Error(`Error eliminando ${childTable}: ${error.message}`);

    return count || 0;
  };

  const deleteTableRows = async (table: string, userId: string): Promise<number> => {
    const { data } = await supabase
      .from(table as any)
      .select("id")
      .eq("user_id", userId);
    const count = data?.length ?? 0;
    if (count === 0) return 0;
    const { error } = await supabase
      .from(table as any)
      .delete()
      .eq("user_id", userId);
    if (error) throw new Error(`Error eliminando ${table}: ${error.message}`);
    return count;
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      let totalDeleted = 0;
      const tbl = deleteTarget.table;

      if (tbl === "productos") {
        totalDeleted += await deleteChildByParent("items_facturas", "producto_id", "productos", user.id);
        totalDeleted += await deleteChildByParent("items_compras", "producto_id", "productos", user.id);
        totalDeleted += await deleteChildByParent("movimientos_inventario", "producto_id", "productos", user.id);
      } else if (tbl === "facturas") {
        totalDeleted += await deleteChildByParent("items_facturas", "factura_id", "facturas", user.id);
      } else if (tbl === "compras") {
        totalDeleted += await deleteChildByParent("items_compras", "compra_id", "compras", user.id);
      } else if (tbl === "asientos_contables") {
        totalDeleted += await deleteChildByParent("cuentas_asientos", "asiento_id", "asientos_contables", user.id);
      } else if (tbl === "clientes") {
        totalDeleted += await deleteChildByParent("items_facturas", "factura_id", "facturas", user.id);
        totalDeleted += await deleteTableRows("facturas", user.id);
      } else if (tbl === "proveedores") {
        totalDeleted += await deleteChildByParent("items_compras", "compra_id", "compras", user.id);
        totalDeleted += await deleteTableRows("compras", user.id);
      } else if (tbl === "cuentas_bancarias") {
        totalDeleted += await deleteChildByParent("movimientos_bancarios", "cuenta_bancaria_id", "cuentas_bancarias", user.id);
      }

      // Delete the target table itself
      totalDeleted += await deleteTableRows(tbl, user.id);

      toast({
        title: `${totalDeleted} registros eliminados`,
        description: `${deleteTarget.label} y sus dependencias fueron eliminados correctamente.`,
      });

      setDeleteTarget(null);
      await fetchCounts();
    } catch (err: any) {
      toast({
        title: "Error al eliminar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar todos los registros?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar <strong>TODOS</strong> los registros de <strong>{deleteTarget?.label}</strong> ({deleteTarget?.count} registros)?
              <br /><br />
              <span className="text-destructive font-semibold">Esta acción no se puede deshacer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Eliminar Todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-6 h-6" />
            Backup y Restauración
          </CardTitle>
          <CardDescription>
            Respalde y restaure todos los datos del sistema contable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Es recomendable realizar backups periódicos para proteger su información contable.
              Los contadores muestran únicamente sus datos (filtrados por usuario).
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Estado del Sistema - Supabase */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estado Actual del Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tables.map((t) => (
                  <div key={t.key} className="flex justify-between items-center">
                    <span>{t.label}:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{t.count}</Badge>
                      <button
                        onClick={() => t.count > 0 && setDeleteTarget(t)}
                        disabled={t.count === 0}
                        className="p-1 rounded hover:bg-destructive/10 text-destructive disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={`Eliminar todos los registros de ${t.label}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Panel de Acciones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Acciones de Respaldo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Exportar Backup</Label>
                  <Button
                    onClick={() => crearBackup()}
                    disabled={isExporting}
                    className="w-full"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    {isExporting ? "Exportando..." : "Descargar Backup Completo"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-file">Restaurar Backup</Label>
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

          {/* Instrucciones */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Instrucciones de Uso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Crear Backup:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Haga clic en "Descargar Backup"</li>
                    <li>• Se descargará un archivo JSON</li>
                    <li>• Guarde el archivo en un lugar seguro</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Restaurar Backup:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Seleccione el archivo de backup (.json)</li>
                    <li>• Los datos se restaurarán automáticamente</li>
                    <li>• La página se recargará</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Eliminar Datos:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Use el icono 🗑️ junto a cada tabla</li>
                    <li>• Solo elimina SUS datos (usuario actual)</li>
                    <li>• Requiere confirmación obligatoria</li>
                    <li>• PRECAUCIÓN: No se puede deshacer</li>
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
