import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAsientos } from "@/hooks/useAsientos";
import { useRetencionesFiscales, type RetencionFiscal, type TipoRetencionFiscal } from "@/hooks/useRetencionesFiscales";
import { Calculator, Download, FileText, Loader2, Plus, Receipt, ShieldCheck } from "lucide-react";
import * as XLSX from "@e965/xlsx";

interface ConfiguracionRetencion {
  tipo: TipoRetencionFiscal;
  descripcion: string;
  porcentaje: number;
  montoMinimo: number;
  codigo: string;
  activo: boolean;
  cuentaPasivo: string;
  nombreCuentaPasivo: string;
  cuentaGasto: string;
  nombreCuentaGasto: string;
}

const configuracionesRetencion: ConfiguracionRetencion[] = [
  {
    tipo: "rc_iva",
    descripcion: "Retencion Complementaria al IVA",
    porcentaje: 13,
    montoMinimo: 1000,
    codigo: "RC-IVA",
    activo: true,
    cuentaPasivo: "2113",
    nombreCuentaPasivo: "IVA por Pagar",
    cuentaGasto: "5261",
    nombreCuentaGasto: "Impuesto a las Transacciones",
  },
  {
    tipo: "it",
    descripcion: "Impuesto a las Transacciones",
    porcentaje: 3,
    montoMinimo: 500,
    codigo: "IT",
    activo: true,
    cuentaPasivo: "2114",
    nombreCuentaPasivo: "IT por Pagar",
    cuentaGasto: "5261",
    nombreCuentaGasto: "Impuesto a las Transacciones",
  },
  {
    tipo: "rc_iva_it",
    descripcion: "Retencion combinada RC-IVA + IT",
    porcentaje: 16,
    montoMinimo: 1000,
    codigo: "RC-IVA-IT",
    activo: true,
    cuentaPasivo: "2114",
    nombreCuentaPasivo: "IT por Pagar",
    cuentaGasto: "5261",
    nombreCuentaGasto: "Impuesto a las Transacciones",
  },
  {
    tipo: "rc_iva_servicios",
    descripcion: "RC-IVA para Servicios",
    porcentaje: 15,
    montoMinimo: 1000,
    codigo: "RC-IVA-SERV",
    activo: true,
    cuentaPasivo: "2113",
    nombreCuentaPasivo: "IVA por Pagar",
    cuentaGasto: "5191",
    nombreCuentaGasto: "Gastos Varios",
  },
  {
    tipo: "it_alquileres",
    descripcion: "IT para Alquileres",
    porcentaje: 2,
    montoMinimo: 10000,
    codigo: "IT-ALQ",
    activo: true,
    cuentaPasivo: "2114",
    nombreCuentaPasivo: "IT por Pagar",
    cuentaGasto: "5241",
    nombreCuentaGasto: "Alquileres",
  },
  {
    tipo: "profesionales",
    descripcion: "Retencion a Profesionales",
    porcentaje: 12.5,
    montoMinimo: 500,
    codigo: "PROF",
    activo: true,
    cuentaPasivo: "2111",
    nombreCuentaPasivo: "Cuentas por Pagar Comerciales",
    cuentaGasto: "5191",
    nombreCuentaGasto: "Gastos Varios",
  },
];

const formatCurrency = (value: number) => `Bs. ${value.toFixed(2)}`;
const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("es-BO");

const calcularRetencion = (montoFactura: number, tipoRetencion: TipoRetencionFiscal) => {
  const config = configuracionesRetencion.find((item) => item.tipo === tipoRetencion);
  if (!config) {
    return { porcentaje: 0, monto: 0, aplica: false };
  }

  const aplica = montoFactura >= config.montoMinimo;
  const monto = aplica ? Number(((montoFactura * config.porcentaje) / 100).toFixed(2)) : 0;
  return {
    porcentaje: config.porcentaje,
    monto,
    aplica,
  };
};

const RetencionesModule = () => {
  const { toast } = useToast();
  const { retenciones, loading, createRetencion, updateRetencionEstado } = useRetencionesFiscales();
  const { guardarAsiento } = useAsientos();
  const [showCalculadora, setShowCalculadora] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const retencionesDelMes = useMemo(() => {
    const hoy = new Date();
    return retenciones.filter((item) => {
      const fecha = new Date(`${item.fechaRetencion}T00:00:00`);
      return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
    });
  }, [retenciones]);

  const totalRetencionesDelMes = retencionesDelMes.reduce((sum, item) => sum + item.montoRetencion, 0);

  const generarReporteRetenciones = () => {
    const rows = retenciones.map((retencion) => ({
      Numero: retencion.numeroRetencion,
      Fecha: retencion.fechaRetencion,
      "Razon Social": retencion.razonSocialRetenido,
      NIT: retencion.nitRetenido,
      Factura: retencion.numeroFactura,
      "Monto Factura": retencion.montoFactura,
      "Tipo Retencion": retencion.tipoRetencion,
      Porcentaje: retencion.porcentajeRetencion,
      "Monto Retenido": retencion.montoRetencion,
      Estado: retencion.estado,
      Codigo: retencion.codigoRetencion,
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Retenciones");
    XLSX.writeFile(workbook, `retenciones-${new Date().toISOString().slice(0, 10)}.xlsx`);

    toast({
      title: "Reporte exportado",
      description: "El archivo XLSX de retenciones fue generado correctamente.",
    });
  };

  const handleCrearRetencion = async (payload: {
    nitRetenido: string;
    razonSocialRetenido: string;
    numeroFactura: string;
    fechaFactura: string;
    montoFactura: number;
    tipoRetencion: TipoRetencionFiscal;
    observaciones: string;
  }) => {
    const calculada = calcularRetencion(payload.montoFactura, payload.tipoRetencion);
    const config = configuracionesRetencion.find((item) => item.tipo === payload.tipoRetencion);

    if (!config || !calculada.aplica) {
      toast({
        title: "Retencion no aplicable",
        description: "El monto no alcanza el minimo requerido o la configuracion no esta activa.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const numeroRetencion = `RET-${String(retenciones.length + 1).padStart(6, "0")}`;
      const codigoRetencion = `${config.codigo}-${Date.now().toString().slice(-6)}`;
      const fechaRetencion = new Date().toISOString().slice(0, 10);

      const asiento = {
        id: `RET-${Date.now()}`,
        numero: `RET-${Date.now().toString().slice(-6)}`,
        fecha: fechaRetencion,
        concepto: `Retencion fiscal ${config.codigo} sobre factura ${payload.numeroFactura}`,
        referencia: numeroRetencion,
        debe: calculada.monto,
        haber: calculada.monto,
        estado: "registrado" as const,
        cuentas: [
          {
            codigo: config.cuentaGasto,
            nombre: config.nombreCuentaGasto,
            debe: calculada.monto,
            haber: 0,
          },
          {
            codigo: config.cuentaPasivo,
            nombre: config.nombreCuentaPasivo,
            debe: 0,
            haber: calculada.monto,
          },
        ],
      };

      const asientoGuardado = await guardarAsiento(asiento);
      if (!asientoGuardado) {
        toast({
          title: "No se pudo emitir la retencion",
          description: "Fallo el registro del asiento contable asociado.",
          variant: "destructive",
        });
        return;
      }

      await createRetencion({
        numeroRetencion,
        fechaRetencion,
        nitRetenido: payload.nitRetenido,
        razonSocialRetenido: payload.razonSocialRetenido,
        numeroFactura: payload.numeroFactura,
        fechaFactura: payload.fechaFactura,
        montoFactura: payload.montoFactura,
        tipoRetencion: payload.tipoRetencion,
        porcentajeRetencion: calculada.porcentaje,
        montoRetencion: calculada.monto,
        codigoRetencion,
        estado: "emitida",
        observaciones: payload.observaciones,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="grid gap-6 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 px-6 py-7 text-white lg:grid-cols-[1.6fr_0.9fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-amber-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                Cumplimiento tributario
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight">Retenciones conectadas con contabilidad y trazabilidad fiscal</h2>
                <p className="max-w-2xl text-sm text-slate-200">
                  El modulo ya no depende del navegador. Cada retencion queda persistida en Supabase, con su asiento contable y seguimiento de estado.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Acciones</p>
                  <p className="mt-2 text-lg font-semibold">Calcula, emite y exporta</p>
                  <p className="mt-1 text-sm text-slate-200">Retenciones con criterio boliviano y soporte auditable.</p>
                </div>
                <Receipt className="h-10 w-10 rounded-xl bg-white/10 p-2 text-amber-200" />
              </div>
              <div className="mt-5 flex gap-2">
                <Button variant="secondary" onClick={() => setShowCalculadora((prev) => !prev)} className="flex-1">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculadora
                </Button>
                <Button onClick={generarReporteRetenciones} className="flex-1 bg-white text-slate-950 hover:bg-slate-100">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard title="Total emitidas" value={String(retenciones.length)} subtitle="Historico persistido" />
        <MetricCard title="Del mes" value={String(retencionesDelMes.length)} subtitle="Gestion vigente" />
        <MetricCard title="Monto retenido" value={formatCurrency(totalRetencionesDelMes)} subtitle="Acumulado mensual" />
        <MetricCard title="Pendientes" value={String(retenciones.filter((item) => item.estado === "emitida").length)} subtitle="Listas para presentar" accent="amber" />
      </div>

      {showCalculadora && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Calculadora de retenciones</CardTitle>
            <CardDescription>Evalua si corresponde retener y estima el monto conforme a la parametrizacion activa.</CardDescription>
          </CardHeader>
          <CardContent>
            <CalculadoraRetenciones />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="retenciones" className="space-y-4">
        <TabsList>
          <TabsTrigger value="retenciones">Retenciones</TabsTrigger>
          <TabsTrigger value="nueva">Nueva retencion</TabsTrigger>
          <TabsTrigger value="configuracion">Configuracion</TabsTrigger>
        </TabsList>

        <TabsContent value="retenciones">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Registro de retenciones</CardTitle>
                <CardDescription>Fuente unica persistida en Supabase, lista para auditoria y exportacion.</CardDescription>
              </div>
              {loading && (
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Cargando retenciones
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Retenido</TableHead>
                      <TableHead>Factura</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Monto Factura</TableHead>
                      <TableHead className="text-right">Retencion</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retenciones.map((retencion) => {
                      const config = configuracionesRetencion.find((item) => item.tipo === retencion.tipoRetencion);
                      return (
                        <TableRow key={retencion.id}>
                          <TableCell className="font-medium">{retencion.numeroRetencion}</TableCell>
                          <TableCell>{formatDate(retencion.fechaRetencion)}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{retencion.razonSocialRetenido}</div>
                              <div className="text-sm text-muted-foreground">NIT: {retencion.nitRetenido}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{retencion.numeroFactura}</div>
                              <div className="text-sm text-muted-foreground">{formatDate(retencion.fechaFactura)}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {config?.codigo || retencion.tipoRetencion} ({retencion.porcentajeRetencion}%)
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(retencion.montoFactura)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(retencion.montoRetencion)}</TableCell>
                          <TableCell>
                            <Badge variant={retencion.estado === "presentada" ? "default" : retencion.estado === "anulada" ? "destructive" : "secondary"}>
                              {retencion.estado}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => void updateRetencionEstado(retencion.id, "presentada")} disabled={retencion.estado !== "emitida"}>
                                Presentar
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => void updateRetencionEstado(retencion.id, "anulada")} disabled={retencion.estado === "anulada"}>
                                Anular
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {retenciones.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                          No hay retenciones persistidas todavia. Emite la primera para activar trazabilidad fiscal.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nueva">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Nueva retencion</CardTitle>
              <CardDescription>Crea la retencion, calcula el importe y registra el asiento contable correspondiente.</CardDescription>
            </CardHeader>
            <CardContent>
              <NuevaRetencionForm onCrear={handleCrearRetencion} isSubmitting={isCreating} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuracion">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Configuracion de retenciones</CardTitle>
              <CardDescription>Parametros tributarios y cuentas sugeridas para registro contable.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {configuracionesRetencion.map((config) => (
                  <Card key={config.tipo} className="border-slate-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{config.descripcion}</CardTitle>
                      <CardDescription>Codigo {config.codigo}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Porcentaje</span><Badge>{config.porcentaje}%</Badge></div>
                      <div className="flex justify-between"><span>Monto minimo</span><span>{formatCurrency(config.montoMinimo)}</span></div>
                      <div className="flex justify-between"><span>Cuenta pasivo</span><span>{config.cuentaPasivo}</span></div>
                      <div className="flex justify-between"><span>Cuenta gasto</span><span>{config.cuentaGasto}</span></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, accent = "slate" }: { title: string; value: string; subtitle: string; accent?: "slate" | "amber" }) => (
  <Card className={accent === "amber" ? "border-amber-200 bg-amber-50/70" : "border-slate-200 bg-white"}>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-semibold ${accent === "amber" ? "text-amber-900" : "text-slate-950"}`}>{value}</div>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </CardContent>
  </Card>
);

const CalculadoraRetenciones = () => {
  const [montoFactura, setMontoFactura] = useState(0);
  const [tipoRetencion, setTipoRetencion] = useState<TipoRetencionFiscal>("rc_iva");

  const resultado = useMemo(() => calcularRetencion(montoFactura, tipoRetencion), [montoFactura, tipoRetencion]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Monto de factura</Label>
          <Input type="number" step="0.01" value={montoFactura} onChange={(event) => setMontoFactura(Number(event.target.value) || 0)} />
        </div>
        <div className="space-y-2">
          <Label>Tipo de retencion</Label>
          <Select value={tipoRetencion} onValueChange={(value: TipoRetencionFiscal) => setTipoRetencion(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {configuracionesRetencion.filter((item) => item.activo).map((config) => (
                <SelectItem key={config.tipo} value={config.tipo}>
                  {config.descripcion} ({config.porcentaje}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className={resultado.aplica ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}>
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-muted-foreground">Aplica</div>
              <Badge variant={resultado.aplica ? "default" : "secondary"}>{resultado.aplica ? "SI" : "NO"}</Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Porcentaje</div>
              <div className="font-semibold">{resultado.porcentaje}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Monto a retener</div>
              <div className="font-semibold">{formatCurrency(resultado.monto)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const NuevaRetencionForm = ({
  onCrear,
  isSubmitting,
}: {
  onCrear: (payload: {
    nitRetenido: string;
    razonSocialRetenido: string;
    numeroFactura: string;
    fechaFactura: string;
    montoFactura: number;
    tipoRetencion: TipoRetencionFiscal;
    observaciones: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}) => {
  const [formData, setFormData] = useState({
    nitRetenido: "",
    razonSocialRetenido: "",
    numeroFactura: "",
    fechaFactura: "",
    montoFactura: 0,
    tipoRetencion: "rc_iva" as TipoRetencionFiscal,
    observaciones: "",
  });

  const calculada = useMemo(() => calcularRetencion(formData.montoFactura, formData.tipoRetencion), [formData.montoFactura, formData.tipoRetencion]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onCrear(formData);
    setFormData({
      nitRetenido: "",
      razonSocialRetenido: "",
      numeroFactura: "",
      fechaFactura: "",
      montoFactura: 0,
      tipoRetencion: "rc_iva",
      observaciones: "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>NIT retenido</Label>
          <Input value={formData.nitRetenido} onChange={(event) => setFormData((prev) => ({ ...prev, nitRetenido: event.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label>Razon social</Label>
          <Input value={formData.razonSocialRetenido} onChange={(event) => setFormData((prev) => ({ ...prev, razonSocialRetenido: event.target.value }))} required />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Numero de factura</Label>
          <Input value={formData.numeroFactura} onChange={(event) => setFormData((prev) => ({ ...prev, numeroFactura: event.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label>Fecha de factura</Label>
          <Input type="date" value={formData.fechaFactura} onChange={(event) => setFormData((prev) => ({ ...prev, fechaFactura: event.target.value }))} required />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Monto factura</Label>
          <Input type="number" step="0.01" value={formData.montoFactura} onChange={(event) => setFormData((prev) => ({ ...prev, montoFactura: Number(event.target.value) || 0 }))} required />
        </div>
        <div className="space-y-2">
          <Label>Tipo de retencion</Label>
          <Select value={formData.tipoRetencion} onValueChange={(value: TipoRetencionFiscal) => setFormData((prev) => ({ ...prev, tipoRetencion: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {configuracionesRetencion.filter((item) => item.activo).map((config) => (
                <SelectItem key={config.tipo} value={config.tipo}>
                  {config.descripcion} ({config.porcentaje}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observaciones</Label>
        <Textarea value={formData.observaciones} onChange={(event) => setFormData((prev) => ({ ...prev, observaciones: event.target.value }))} />
      </div>

      <Card className={calculada.aplica ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}>
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-muted-foreground">Porcentaje</div>
              <div className="font-semibold">{calculada.porcentaje}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Monto retenido</div>
              <div className="font-semibold">{formatCurrency(calculada.monto)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Aplica</div>
              <Badge variant={calculada.aplica ? "default" : "secondary"}>{calculada.aplica ? "SI" : "NO"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={!calculada.aplica || isSubmitting}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
        Emitir retencion
      </Button>
    </form>
  );
};

export default RetencionesModule;
