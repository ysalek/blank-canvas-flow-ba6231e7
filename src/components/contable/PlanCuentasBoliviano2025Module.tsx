import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  TreePine,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Eye,
  RefreshCw
} from "lucide-react";
import {
  planCuentasBoliviano2025,
  CuentaContable as CuentaNormativa,
  estructuraJerarquica
} from "@/utils/planCuentasBoliviano2025";
import { useSupabasePlanCuentas } from "@/hooks/useSupabasePlanCuentas";

type CuentaVista = CuentaNormativa & {
  id?: string;
  saldo?: number;
};

const mapNormativaToSyncPayload = (cuenta: CuentaNormativa) => ({
  codigo: cuenta.codigo,
  nombre: cuenta.nombre,
  tipo: cuenta.tipo,
  naturaleza: cuenta.naturaleza,
  nivel: cuenta.nivel,
  cuenta_padre: cuenta.padre,
  saldo: 0,
  activa: cuenta.activa,
});

const PlanCuentasBoliviano2025Module = () => {
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroBusqueda, setFiltroBusqueda] = useState<string>("");
  const [modoVista, setModoVista] = useState<"tabla" | "arbol">("tabla");
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<CuentaVista | null>(null);
  const { toast } = useToast();
  const { planCuentas, loading, syncPlanCuentas } = useSupabasePlanCuentas();

  const cuentas = useMemo<CuentaVista[]>(() => {
    const cuentasPersistidas = new Map(planCuentas.map((cuenta) => [cuenta.codigo, cuenta]));

    return planCuentasBoliviano2025.map((normativa) => {
      const persistida = cuentasPersistidas.get(normativa.codigo);
      return {
        ...normativa,
        id: persistida?.id,
        nombre: persistida?.nombre || normativa.nombre,
        tipo: (persistida?.tipo as CuentaNormativa["tipo"]) || normativa.tipo,
        naturaleza: (persistida?.naturaleza as CuentaNormativa["naturaleza"]) || normativa.naturaleza,
        nivel: persistida?.nivel || normativa.nivel,
        padre: persistida?.cuenta_padre || normativa.padre,
        activa: typeof persistida?.activa === "boolean" ? persistida.activa : normativa.activa,
        saldo: persistida?.saldo || 0,
      };
    });
  }, [planCuentas]);

  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter((cuenta) => {
      const pasaTipo = !filtroTipo || cuenta.tipo === filtroTipo;
      const pasaBusqueda = !filtroBusqueda ||
        cuenta.codigo.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
        cuenta.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase());
      return pasaTipo && pasaBusqueda;
    });
  }, [cuentas, filtroBusqueda, filtroTipo]);

  const arbolFiltrado = useMemo(() => {
    if (!filtroBusqueda && !filtroTipo) {
      return estructuraJerarquica();
    }

    const permitidas = new Set(cuentasFiltradas.map((cuenta) => cuenta.codigo));
    const construirArbol = (nodos: CuentaNormativa[]): CuentaVista[] =>
      nodos
        .map((nodo) => ({
          ...cuentas.find((cuenta) => cuenta.codigo === nodo.codigo),
          hijas: construirArbol((nodo as CuentaNormativa & { hijas?: CuentaNormativa[] }).hijas || [])
        }))
        .filter((nodo) => {
          const hijas = (nodo as CuentaVista & { hijas?: CuentaVista[] }).hijas || [];
          return permitidas.has(nodo.codigo) || hijas.length > 0;
        }) as CuentaVista[];

    return construirArbol(estructuraJerarquica());
  }, [cuentas, cuentasFiltradas, filtroBusqueda, filtroTipo]);

  const exportarPlanCuentas = () => {
    const dataExport = {
      fecha: new Date().toISOString(),
      version: "2025.1",
      normativa: "CAMC 2025 - SIN Bolivia",
      plan: cuentas,
    };

    const blob = new Blob([JSON.stringify(dataExport, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `plan_cuentas_bolivia_2025_${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();

    toast({
      title: "Plan de cuentas exportado",
      description: "El plan de cuentas vigente se exporto correctamente."
    });
  };

  const importarPlanCuentas = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      try {
        const raw = JSON.parse(loadEvent.target?.result as string);
        if (!raw.plan || !Array.isArray(raw.plan)) {
          throw new Error("Formato invalido");
        }

        const payload = raw.plan.map((cuenta: Partial<CuentaVista>) => ({
          codigo: String(cuenta.codigo || ""),
          nombre: String(cuenta.nombre || ""),
          tipo: String(cuenta.tipo || "activo"),
          naturaleza: String(cuenta.naturaleza || "deudora"),
          nivel: Number(cuenta.nivel || 1),
          cuenta_padre: cuenta.padre || undefined,
          saldo: Number(cuenta.saldo || 0),
          activa: Boolean(cuenta.activa),
        }));

        await syncPlanCuentas(payload);
      } catch (error) {
        console.error("Error importando plan de cuentas:", error);
        toast({
          title: "Error al importar",
          description: "El archivo no tiene el formato correcto para sincronizar el plan.",
          variant: "destructive"
        });
      } finally {
        event.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  const restaurarPlanOriginal = async () => {
    await syncPlanCuentas(planCuentasBoliviano2025.map(mapNormativaToSyncPayload));
  };

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case "activo":
        return "default";
      case "pasivo":
        return "destructive";
      case "patrimonio":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getNivelIndentacion = (nivel: number) => `${(nivel - 1) * 20}px`;

  const renderArbolCuentas = (nodos: (CuentaVista & { hijas?: CuentaVista[] })[], nivel = 1): React.ReactNode =>
    nodos.map((cuenta) => (
      <div key={cuenta.codigo} className="space-y-1">
        <div
          className={`flex cursor-pointer items-center justify-between rounded-md p-2 hover:bg-muted ${
            cuentaSeleccionada?.codigo === cuenta.codigo ? "bg-primary/10" : ""
          }`}
          style={{ paddingLeft: getNivelIndentacion(nivel) }}
          onClick={() => setCuentaSeleccionada(cuenta)}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">{cuenta.codigo}</span>
            <span className={cuenta.activa ? "font-medium" : "text-muted-foreground"}>
              {cuenta.nombre}
            </span>
            {cuenta.requiereDetalle && (
              <Badge variant="outline" className="text-xs">Detalle</Badge>
            )}
            {cuenta.validacionesSIN && (
              <Badge variant="secondary" className="text-xs">SIN</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getBadgeVariant(cuenta.tipo)}>
              {cuenta.tipo}
            </Badge>
            {cuenta.activa ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
          </div>
        </div>
        {cuenta.hijas && cuenta.hijas.length > 0 && renderArbolCuentas(cuenta.hijas, nivel + 1)}
      </div>
    ));

  const metricas = {
    total: cuentas.length,
    activos: cuentas.filter((cuenta) => cuenta.tipo === "activo").length,
    pasivos: cuentas.filter((cuenta) => cuenta.tipo === "pasivo").length,
    ingresos: cuentas.filter((cuenta) => cuenta.tipo === "ingreso").length,
    gastos: cuentas.filter((cuenta) => cuenta.tipo === "gasto").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Plan de Cuentas Bolivia 2025</h1>
            <p className="text-muted-foreground">
              Plan contable boliviano conectado a Supabase y enriquecido con metadata normativa CAMC/SIN.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportarPlanCuentas} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importarPlanCuentas}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </Button>
            </div>
            <Button onClick={() => void restaurarPlanOriginal()} variant="outline" disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Catalogo Oficial
            </Button>
          </div>
        </div>

        {loading && (
          <div className="rounded-xl border border-border/60 bg-card/70 px-4 py-3 text-sm text-muted-foreground">
            Cargando plan de cuentas desde la base principal...
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total Cuentas</div><div className="text-2xl font-bold">{metricas.total}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Activos</div><div className="text-2xl font-bold text-blue-600">{metricas.activos}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Pasivos</div><div className="text-2xl font-bold text-red-600">{metricas.pasivos}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Ingresos</div><div className="text-2xl font-bold text-green-600">{metricas.ingresos}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Gastos</div><div className="text-2xl font-bold text-orange-600">{metricas.gastos}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros y Vista</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por codigo o nombre..."
                  value={filtroBusqueda}
                  onChange={(event) => setFiltroBusqueda(event.target.value)}
                />
              </div>
              <div className="min-w-[170px]">
                <select
                  value={filtroTipo}
                  onChange={(event) => setFiltroTipo(event.target.value)}
                  className="w-full rounded-md border bg-background p-2"
                >
                  <option value="">Todos los tipos</option>
                  <option value="activo">Activos</option>
                  <option value="pasivo">Pasivos</option>
                  <option value="patrimonio">Patrimonio</option>
                  <option value="ingreso">Ingresos</option>
                  <option value="gasto">Gastos</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant={modoVista === "tabla" ? "default" : "outline"} onClick={() => setModoVista("tabla")} size="sm">
                  Tabla
                </Button>
                <Button variant={modoVista === "arbol" ? "default" : "outline"} onClick={() => setModoVista("arbol")} size="sm">
                  <TreePine className="mr-2 h-4 w-4" />
                  Arbol
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{modoVista === "tabla" ? "Plan de Cuentas" : "Estructura Jerarquica"}</CardTitle>
                <CardDescription>{cuentasFiltradas.length} cuenta(s) mostrada(s)</CardDescription>
              </CardHeader>
              <CardContent>
                {modoVista === "tabla" ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Codigo</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Nivel</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Validaciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cuentasFiltradas.map((cuenta) => (
                        <TableRow
                          key={cuenta.codigo}
                          className={`cursor-pointer ${cuentaSeleccionada?.codigo === cuenta.codigo ? "bg-primary/10" : ""}`}
                          onClick={() => setCuentaSeleccionada(cuenta)}
                        >
                          <TableCell className="font-mono">{cuenta.codigo}</TableCell>
                          <TableCell className={cuenta.activa ? "font-medium" : "text-muted-foreground"}>
                            {cuenta.nombre}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getBadgeVariant(cuenta.tipo)}>{cuenta.tipo}</Badge>
                          </TableCell>
                          <TableCell>{cuenta.nivel}</TableCell>
                          <TableCell>
                            {cuenta.activa ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {cuenta.requiereDetalle && <Badge variant="outline" className="text-xs">Detalle</Badge>}
                              {cuenta.validacionesSIN && <Badge variant="secondary" className="text-xs">SIN</Badge>}
                              {cuenta.categoriaTributaria && <Badge variant="outline" className="text-xs">{cuenta.categoriaTributaria}</Badge>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="max-h-96 space-y-1 overflow-y-auto">
                    {renderArbolCuentas(arbolFiltrado as (CuentaVista & { hijas?: CuentaVista[] })[])}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Detalles de Cuenta</CardTitle>
                <CardDescription>
                  {cuentaSeleccionada ? `Informacion de ${cuentaSeleccionada.codigo}` : "Selecciona una cuenta para ver sus detalles"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cuentaSeleccionada ? (
                  <div className="space-y-4">
                    <div><label className="text-sm font-medium">Codigo</label><p className="font-mono">{cuentaSeleccionada.codigo}</p></div>
                    <div><label className="text-sm font-medium">Nombre</label><p>{cuentaSeleccionada.nombre}</p></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-sm font-medium">Tipo</label><p><Badge variant={getBadgeVariant(cuentaSeleccionada.tipo)}>{cuentaSeleccionada.tipo}</Badge></p></div>
                      <div><label className="text-sm font-medium">Naturaleza</label><p>{cuentaSeleccionada.naturaleza}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-sm font-medium">Nivel</label><p>{cuentaSeleccionada.nivel}</p></div>
                      <div><label className="text-sm font-medium">Estado</label><p><Badge variant={cuentaSeleccionada.activa ? "default" : "secondary"}>{cuentaSeleccionada.activa ? "Activa" : "Inactiva"}</Badge></p></div>
                    </div>
                    {cuentaSeleccionada.padre && (
                      <div><label className="text-sm font-medium">Cuenta Padre</label><p className="font-mono">{cuentaSeleccionada.padre}</p></div>
                    )}
                    <div><label className="text-sm font-medium">Saldo referencial</label><p>Bs. {(cuentaSeleccionada.saldo || 0).toLocaleString()}</p></div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Caracteristicas</label>
                      <div className="flex flex-wrap gap-2">
                        {cuentaSeleccionada.requiereDetalle && <Badge variant="outline">Requiere detalle</Badge>}
                        {cuentaSeleccionada.centrosCosto && <Badge variant="outline">Centros de costo</Badge>}
                      </div>
                    </div>
                    {cuentaSeleccionada.validacionesSIN && cuentaSeleccionada.validacionesSIN.length > 0 && (
                      <div>
                        <label className="text-sm font-medium">Validaciones SIN</label>
                        <div className="space-y-1">
                          {cuentaSeleccionada.validacionesSIN.map((validacion, index) => (
                            <Badge key={index} variant="secondary" className="mr-1">{validacion}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {cuentaSeleccionada.categoriaTributaria && (
                      <div>
                        <label className="text-sm font-medium">Categoria tributaria</label>
                        <p><Badge variant="outline">{cuentaSeleccionada.categoriaTributaria}</Badge></p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Eye className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>Selecciona una cuenta de la lista para ver sus detalles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanCuentasBoliviano2025Module;
