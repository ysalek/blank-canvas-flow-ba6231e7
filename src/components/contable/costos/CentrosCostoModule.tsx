import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useCentrosCosto } from "@/hooks/useCentrosCosto";
import { useAsientos } from "@/hooks/useAsientos";
import { useFacturas } from "@/hooks/useFacturas";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, BarChart3, Building2, Edit, Factory, Loader2, PieChart, Plus, Store, Target, Trash2, TrendingDown, TrendingUp } from "lucide-react";

type CentroTipo = "administracion" | "operacional" | "ventas" | "financiero" | "limpieza" | "mantenimiento";

interface FormState {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: CentroTipo;
  responsable: string;
  presupuesto: number;
  departamento: string;
  cuentasContables: string;
  estado: "activo" | "inactivo";
}

const formatCurrency = (value: number) => `Bs. ${value.toFixed(2)}`;

const getTipoIcon = (tipo: string) => {
  switch (tipo) {
    case "operacional":
      return <Factory className="h-4 w-4" />;
    case "ventas":
      return <Store className="h-4 w-4" />;
    case "mantenimiento":
      return <Activity className="h-4 w-4" />;
    default:
      return <Building2 className="h-4 w-4" />;
  }
};

const getTipoBadge = (tipo: string) => {
  switch (tipo) {
    case "operacional":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "ventas":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "financiero":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "mantenimiento":
      return "bg-orange-100 text-orange-800 border-orange-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
};

const emptyForm: FormState = {
  codigo: "",
  nombre: "",
  descripcion: "",
  tipo: "administracion",
  responsable: "",
  presupuesto: 0,
  departamento: "",
  cuentasContables: "",
  estado: "activo",
};

const CentrosCostoModule = () => {
  const { centrosCosto, loading, saveCentro, deleteCentro } = useCentrosCosto();
  const { asientos } = useAsientos();
  const { facturas } = useFacturas();
  const [selectedTab, setSelectedTab] = useState("centros");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);

  const centrosConEjecucion = useMemo(() => {
    return centrosCosto.map((centro) => {
      const ejecutado = asientos
        .filter((asiento) => asiento.estado === "registrado")
        .reduce((sum, asiento) => {
          const gastoCentro = asiento.cuentas
            .filter((cuenta) => centro.cuentasContables.includes(cuenta.codigo))
            .reduce((subtotal, cuenta) => subtotal + cuenta.debe - cuenta.haber, 0);
          return sum + Math.max(0, gastoCentro);
        }, 0);

      return {
        ...centro,
        presupuestoEjecutado: Number(ejecutado.toFixed(2)),
        porcentaje: centro.presupuesto > 0 ? (ejecutado / centro.presupuesto) * 100 : 0,
      };
    });
  }, [asientos, centrosCosto]);

  const ingresosTotales = facturas
    .filter((factura) => factura.estado !== "anulada")
    .reduce((sum, factura) => sum + Number(factura.total || 0), 0);

  const gastosTotales = centrosConEjecucion.reduce((sum, centro) => sum + centro.presupuestoEjecutado, 0);
  const utilidadNeta = ingresosTotales - gastosTotales;
  const margenNeto = ingresosTotales > 0 ? (utilidadNeta / ingresosTotales) * 100 : 0;

  const resumenPorTipo = useMemo(() => {
    return centrosConEjecucion.reduce<Record<string, number>>((accumulator, centro) => {
      accumulator[centro.tipo] = (accumulator[centro.tipo] || 0) + centro.presupuestoEjecutado;
      return accumulator;
    }, {});
  }, [centrosConEjecucion]);

  const datosGrafico = Object.entries(resumenPorTipo).map(([tipo, monto]) => ({
    tipo,
    monto,
  }));

  const handleEdit = (id: string) => {
    const centro = centrosCosto.find((item) => item.id === id);
    if (!centro) return;
    setEditingId(id);
    setFormData({
      codigo: centro.codigo,
      nombre: centro.nombre,
      descripcion: centro.descripcion,
      tipo: centro.tipo as CentroTipo,
      responsable: centro.responsable,
      presupuesto: centro.presupuesto,
      departamento: centro.departamento,
      cuentasContables: centro.cuentasContables.join(", "),
      estado: centro.estado,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    await saveCentro({
      id: editingId || undefined,
      codigo: formData.codigo,
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      tipo: formData.tipo,
      responsable: formData.responsable,
      presupuesto: formData.presupuesto,
      departamento: formData.departamento,
      cuentasContables: formData.cuentasContables
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      estado: formData.estado,
    });

    resetForm();
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="grid gap-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-7 text-white lg:grid-cols-[1.6fr_0.9fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-indigo-100">
                <Target className="h-3.5 w-3.5" />
                Gestion gerencial
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight">Centros de costo conectados con asientos y rentabilidad real</h2>
                <p className="max-w-2xl text-sm text-slate-200">
                  La ejecucion ya no se calcula con datos locales. Cada centro lee gasto real desde asientos registrados y
                  permite controlar presupuesto, responsable y cuentas contables asociadas.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Vision ejecutiva</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-white/8 px-4 py-3">
                  <span className="text-sm text-slate-200">Ingresos integrados</span>
                  <span className="text-lg font-semibold">{formatCurrency(ingresosTotales)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/8 px-4 py-3">
                  <span className="text-sm text-slate-200">Gasto imputado</span>
                  <span className="text-lg font-semibold">{formatCurrency(gastosTotales)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/8 px-4 py-3">
                  <span className="text-sm text-slate-200">Margen neto</span>
                  <span className="text-lg font-semibold">{margenNeto.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard title="Centros activos" value={String(centrosConEjecucion.filter((item) => item.estado === "activo").length)} subtitle="Persistidos en Supabase" />
        <MetricCard title="Presupuesto total" value={formatCurrency(centrosConEjecucion.reduce((sum, item) => sum + item.presupuesto, 0))} subtitle="Marco anual acumulado" />
        <MetricCard title="Ejecutado real" value={formatCurrency(gastosTotales)} subtitle="Asientos registrados" />
        <MetricCard title="Margen neto" value={`${margenNeto.toFixed(1)}%`} subtitle={utilidadNeta >= 0 ? "Rentabilidad positiva" : "Rentabilidad presionada"} accent={utilidadNeta >= 0 ? "success" : "danger"} />
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="centros">Centros</TabsTrigger>
          <TabsTrigger value="analisis">Analisis</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="centros" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Catalogo de centros de costo</CardTitle>
              </div>
              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) resetForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo centro
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingId ? "Editar centro de costo" : "Nuevo centro de costo"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Codigo</Label>
                        <Input value={formData.codigo} onChange={(event) => setFormData((prev) => ({ ...prev, codigo: event.target.value }))} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input value={formData.nombre} onChange={(event) => setFormData((prev) => ({ ...prev, nombre: event.target.value }))} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={formData.tipo} onValueChange={(value: CentroTipo) => setFormData((prev) => ({ ...prev, tipo: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="administracion">Administracion</SelectItem>
                            <SelectItem value="operacional">Operacional</SelectItem>
                            <SelectItem value="ventas">Ventas</SelectItem>
                            <SelectItem value="financiero">Financiero</SelectItem>
                            <SelectItem value="limpieza">Limpieza</SelectItem>
                            <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Responsable</Label>
                        <Input value={formData.responsable} onChange={(event) => setFormData((prev) => ({ ...prev, responsable: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Presupuesto</Label>
                        <Input type="number" value={formData.presupuesto} onChange={(event) => setFormData((prev) => ({ ...prev, presupuesto: Number(event.target.value) || 0 }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Departamento</Label>
                        <Input value={formData.departamento} onChange={(event) => setFormData((prev) => ({ ...prev, departamento: event.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Cuentas contables asociadas</Label>
                      <Input value={formData.cuentasContables} onChange={(event) => setFormData((prev) => ({ ...prev, cuentasContables: event.target.value }))} placeholder="5211, 5231, 5191" />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripcion</Label>
                      <Textarea value={formData.descripcion} onChange={(event) => setFormData((prev) => ({ ...prev, descripcion: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select value={formData.estado} onValueChange={(value: "activo" | "inactivo") => setFormData((prev) => ({ ...prev, estado: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="activo">Activo</SelectItem>
                          <SelectItem value="inactivo">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                      <Button type="submit">Guardar centro</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Cargando centros
                </div>
              )}
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Centro</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead className="text-right">Presupuesto</TableHead>
                      <TableHead className="text-right">Ejecutado</TableHead>
                      <TableHead>Ejecucion</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {centrosConEjecucion.map((centro) => (
                      <TableRow key={centro.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{centro.codigo} · {centro.nombre}</div>
                            <div className="text-sm text-muted-foreground">{centro.departamento || centro.descripcion}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTipoBadge(centro.tipo)}>
                            <span className="mr-1">{getTipoIcon(centro.tipo)}</span>
                            {centro.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>{centro.responsable || "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(centro.presupuesto)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(centro.presupuestoEjecutado)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(centro.porcentaje, 100)} className="w-20" />
                            <span className={`text-sm ${centro.porcentaje > 100 ? "text-red-600" : centro.porcentaje > 80 ? "text-amber-600" : "text-emerald-600"}`}>
                              {centro.porcentaje.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={centro.estado === "activo" ? "default" : "secondary"}>{centro.estado}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(centro.id)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => void deleteCentro(centro.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analisis" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <MetricCard title="Ingresos" value={formatCurrency(ingresosTotales)} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} />
            <MetricCard title="Gastos" value={formatCurrency(gastosTotales)} icon={<TrendingDown className="h-4 w-4 text-rose-600" />} />
            <MetricCard title="Utilidad neta" value={formatCurrency(utilidadNeta)} icon={<Target className="h-4 w-4 text-blue-600" />} />
            <MetricCard title="Margen neto" value={`${margenNeto.toFixed(1)}%`} icon={<PieChart className="h-4 w-4 text-indigo-600" />} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Gasto por tipo de centro</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={datosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tipo" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="monto" fill="#4f46e5" name="Gasto ejecutado" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Ejecucion presupuestaria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {centrosConEjecucion.map((centro) => (
                  <div key={centro.id} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{centro.nombre}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(centro.presupuestoEjecutado)} / {formatCurrency(centro.presupuesto)}
                      </span>
                    </div>
                    <Progress value={Math.min(centro.porcentaje, 100)} />
                    <div className="text-right text-sm text-muted-foreground">{centro.porcentaje.toFixed(1)}%</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reportes" className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Resumen gerencial de costos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {centrosConEjecucion.map((centro) => (
                <Card key={centro.id} className="border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{centro.nombre}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Codigo</span><span>{centro.codigo}</span></div>
                    <div className="flex justify-between"><span>Tipo</span><span>{centro.tipo}</span></div>
                    <div className="flex justify-between"><span>Responsable</span><span>{centro.responsable || "-"}</span></div>
                    <div className="flex justify-between"><span>Presupuesto</span><span>{formatCurrency(centro.presupuesto)}</span></div>
                    <div className="flex justify-between"><span>Ejecutado</span><span>{formatCurrency(centro.presupuestoEjecutado)}</span></div>
                    <div className="flex justify-between"><span>Cuentas</span><span>{centro.cuentasContables.join(", ") || "-"}</span></div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, accent = "default", icon }: { title: string; value: string; subtitle?: string; accent?: "default" | "success" | "danger"; icon: React.ReactNode }) => (
  <Card className={accent === "success" ? "border-emerald-200 bg-emerald-50/70" : accent === "danger" ? "border-rose-200 bg-rose-50/70" : "border-slate-200 bg-white"}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-semibold">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </CardContent>
  </Card>
);

export default CentrosCostoModule;
