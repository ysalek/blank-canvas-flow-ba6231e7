import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseBancos, type CuentaBancaria, type MovimientoBancarioInput, type NaturalezaMovimientoBancario, type TipoMovimientoBancario } from "@/hooks/useSupabaseBancos";
import { useFacturas } from "@/hooks/useFacturas";
import { useSupabasePagos } from "@/hooks/useSupabasePagos";
import { useSupabaseProveedores } from "@/hooks/useSupabaseProveedores";
import { useSupabasePlanCuentas } from "@/hooks/useSupabasePlanCuentas";
import { useAsientos } from "@/hooks/useAsientos";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowUpDown, Banknote, Building, CreditCard, Landmark, Loader2, Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";

type TipoFlujo = "ingreso" | "egreso";
type MetodoPago = "efectivo" | "transferencia" | "cheque" | "tarjeta";

interface MovimientoCajaView {
  id: string;
  fecha: string;
  tipo: TipoFlujo;
  categoria: string;
  concepto: string;
  monto: number;
  metodoPago: MetodoPago;
  referencia: string;
  responsable: string;
  estado: "confirmado" | "pendiente" | "anulado";
  cuentaNombre: string;
}

interface ProyeccionCaja {
  fecha: string;
  ingresosProyectados: number;
  egresosProyectados: number;
  flujoNeto: number;
  saldoAcumulado: number;
}

interface FormMovimiento {
  cuentaId: string;
  fecha: string;
  tipo: TipoFlujo;
  categoria: string;
  concepto: string;
  monto: number;
  metodoPago: MetodoPago;
  referencia: string;
  contracuentaCodigo: string;
  observaciones: string;
}

const CATEGORY_OPTIONS = [
  { value: "Ventas", label: "Ventas" },
  { value: "Cobranza", label: "Cobranza" },
  { value: "Servicios", label: "Servicios" },
  { value: "Gastos Operativos", label: "Gastos operativos" },
  { value: "Impuestos", label: "Impuestos" },
  { value: "Sueldos", label: "Sueldos" },
  { value: "Proveedores", label: "Pago a proveedores" },
  { value: "Otros", label: "Otros" },
];

const PAYMENT_METHOD_LABELS: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  cheque: "Cheque",
  tarjeta: "Tarjeta",
};

const formatCurrency = (value: number) => `Bs. ${value.toFixed(2)}`;

const formatDate = (value: string) => {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-BO");
};

const getMonthStart = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
};

const addDays = (baseDate: Date, days: number) => {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + days);
  return result;
};

const inferMetodoPago = (tipo: TipoMovimientoBancario): MetodoPago => {
  if (tipo === "cheque") return "cheque";
  if (tipo === "transferencia" || tipo === "nota_credito" || tipo === "nota_debito") return "transferencia";
  return "efectivo";
};

const inferTipoMovimiento = (tipo: TipoFlujo, metodoPago: MetodoPago): TipoMovimientoBancario => {
  if (metodoPago === "cheque") return "cheque";
  if (metodoPago === "transferencia") return "transferencia";
  if (tipo === "ingreso") return "deposito";
  return "otro";
};

const getResponsable = (metodoPago: MetodoPago) => {
  if (metodoPago === "transferencia") return "Tesoreria";
  if (metodoPago === "cheque") return "Gerencia";
  return "Caja";
};

const getBankAccountLedger = (cuenta: CuentaBancaria | undefined) => {
  return {
    codigo: (cuenta as CuentaBancaria & { codigo_cuenta_contable?: string | null })?.codigo_cuenta_contable || "1112",
    nombre: (cuenta as CuentaBancaria & { nombre_cuenta_contable?: string | null })?.nombre_cuenta_contable || cuenta?.nombre || "Bancos",
  };
};

const AdvancedCashFlowModule = () => {
  const { toast } = useToast();
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [periodoGrafico, setPeriodoGrafico] = useState("30");
  const [isSavingMovement, setIsSavingMovement] = useState(false);
  const [nuevoMovimiento, setNuevoMovimiento] = useState<FormMovimiento>({
    cuentaId: "",
    fecha: new Date().toISOString().slice(0, 10),
    tipo: "ingreso",
    categoria: "Ventas",
    concepto: "",
    monto: 0,
    metodoPago: "transferencia",
    referencia: "",
    contracuentaCodigo: "",
    observaciones: "",
  });

  const { cuentasBancarias, movimientosBancarios, loading: bancosLoading, createMovimientoBancario, refetch: refetchBancos } = useSupabaseBancos();
  const { facturas, loading: facturasLoading } = useFacturas();
  const { pagos, loading: pagosLoading } = useSupabasePagos();
  const { compras, loading: comprasLoading } = useSupabaseProveedores();
  const { planCuentas, loading: planLoading } = useSupabasePlanCuentas();
  const { asientos, guardarAsiento, loading: asientosLoading, refetch: refetchAsientos } = useAsientos();

  const movimientos = useMemo<MovimientoCajaView[]>(() => {
    const cuentasMap = new Map(cuentasBancarias.map((cuenta) => [cuenta.id, cuenta]));
    return movimientosBancarios
      .map((movimiento) => {
        const cuenta = cuentasMap.get(movimiento.cuenta_bancaria_id);
        const naturaleza = (movimiento as { naturaleza_movimiento?: NaturalezaMovimientoBancario }).naturaleza_movimiento || "debito";
        return {
          id: movimiento.id,
          fecha: movimiento.fecha,
          tipo: naturaleza === "credito" ? "ingreso" : "egreso",
          categoria: movimiento.tipo,
          concepto: movimiento.descripcion,
          monto: Number(movimiento.monto || 0),
          metodoPago: inferMetodoPago(movimiento.tipo as TipoMovimientoBancario),
          referencia: movimiento.numero_comprobante || "",
          responsable: movimiento.beneficiario || getResponsable(inferMetodoPago(movimiento.tipo as TipoMovimientoBancario)),
          estado: "confirmado",
          cuentaNombre: cuenta?.nombre || "Cuenta no identificada",
        };
      })
      .sort((left, right) => right.fecha.localeCompare(left.fecha));
  }, [cuentasBancarias, movimientosBancarios]);

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((movimiento) => {
      if (filtroTipo !== "todos" && movimiento.tipo !== filtroTipo) return false;
      if (fechaInicio && movimiento.fecha < fechaInicio) return false;
      if (fechaFin && movimiento.fecha > fechaFin) return false;
      return true;
    });
  }, [fechaFin, fechaInicio, filtroTipo, movimientos]);

  const saldoCaja = useMemo(() => {
    return asientos.reduce((total, asiento) => {
      if (asiento.estado !== "registrado") return total;
      return (
        total +
        asiento.cuentas
          .filter((cuenta) => cuenta.codigo === "1111")
          .reduce((subtotal, cuenta) => subtotal + cuenta.debe - cuenta.haber, 0)
      );
    }, 0);
  }, [asientos]);

  const saldoBancos = cuentasBancarias.reduce((sum, cuenta) => sum + Number(cuenta.saldo || 0), 0);
  const saldoActual = saldoCaja + saldoBancos;

  const ingresosMes = movimientos
    .filter((movimiento) => movimiento.tipo === "ingreso" && movimiento.fecha >= getMonthStart())
    .reduce((sum, movimiento) => sum + movimiento.monto, 0);

  const egresosMes = movimientos
    .filter((movimiento) => movimiento.tipo === "egreso" && movimiento.fecha >= getMonthStart())
    .reduce((sum, movimiento) => sum + movimiento.monto, 0);

  const carteraProyectada = useMemo(() => {
    return facturas
      .filter((factura) => factura.estado !== "anulada" && factura.fechaVencimiento)
      .map((factura) => {
        const pagosFactura = pagos.filter((pago) => pago.tipo === "cobro" && pago.factura_id === factura.id);
        const cobrado = pagosFactura.reduce((sum, pago) => sum + Number(pago.monto || 0), 0);
        const saldo = Math.max(0, Number(factura.total || 0) - cobrado);
        return {
          fecha: factura.fechaVencimiento,
          monto: saldo,
          descripcion: `Cobro esperado factura ${factura.numero}`,
          tipo: "ingreso" as const,
        };
      })
      .filter((item) => item.monto > 0.01);
  }, [facturas, pagos]);

  const pagosProyectados = useMemo(() => {
    return compras
      .filter((compra) => compra.estado !== "anulada" && compra.tipo_pago === "credito" && compra.fecha_vencimiento)
      .map((compra) => ({
        fecha: compra.fecha_vencimiento || compra.fecha,
        monto: Math.max(0, Number(compra.saldo_pendiente || 0)),
        descripcion: `Pago esperado compra ${compra.numero}`,
        tipo: "egreso" as const,
      }))
      .filter((item) => item.monto > 0.01);
  }, [compras]);

  const proyecciones = useMemo<ProyeccionCaja[]>(() => {
    const hoy = new Date();
    const eventos = [...carteraProyectada, ...pagosProyectados];
    let saldoAcumulado = saldoActual;

    return Array.from({ length: 30 }, (_, index) => {
      const fecha = addDays(hoy, index + 1).toISOString().slice(0, 10);
      const ingresosProyectados = eventos
        .filter((evento) => evento.tipo === "ingreso" && evento.fecha === fecha)
        .reduce((sum, evento) => sum + evento.monto, 0);
      const egresosProyectados = eventos
        .filter((evento) => evento.tipo === "egreso" && evento.fecha === fecha)
        .reduce((sum, evento) => sum + evento.monto, 0);
      const flujoNeto = ingresosProyectados - egresosProyectados;
      saldoAcumulado += flujoNeto;

      return {
        fecha,
        ingresosProyectados,
        egresosProyectados,
        flujoNeto,
        saldoAcumulado,
      };
    });
  }, [carteraProyectada, pagosProyectados, saldoActual]);

  const diasGrafico = Number(periodoGrafico);
  const datosGrafico = useMemo(() => {
    return movimientos
      .reduce<Array<{ fecha: string; ingresos: number; egresos: number }>>((accumulator, movimiento) => {
        const existing = accumulator.find((item) => item.fecha === movimiento.fecha);
        if (existing) {
          if (movimiento.tipo === "ingreso") {
            existing.ingresos += movimiento.monto;
          } else {
            existing.egresos += movimiento.monto;
          }
          return accumulator;
        }

        accumulator.push({
          fecha: movimiento.fecha,
          ingresos: movimiento.tipo === "ingreso" ? movimiento.monto : 0,
          egresos: movimiento.tipo === "egreso" ? movimiento.monto : 0,
        });
        return accumulator;
      }, [])
      .sort((left, right) => left.fecha.localeCompare(right.fecha))
      .slice(-diasGrafico);
  }, [diasGrafico, movimientos]);

  const cuentasOperativas = planCuentas.filter((cuenta) => cuenta.activa !== false);
  const loading = bancosLoading || facturasLoading || pagosLoading || comprasLoading || planLoading || asientosLoading;

  const registrarMovimiento = async () => {
    if (!nuevoMovimiento.cuentaId || !nuevoMovimiento.concepto || !nuevoMovimiento.monto || !nuevoMovimiento.contracuentaCodigo) {
      toast({
        title: "Datos incompletos",
        description: "Completa cuenta bancaria, concepto, monto y contracuenta antes de registrar.",
        variant: "destructive",
      });
      return;
    }

    const cuenta = cuentasBancarias.find((item) => item.id === nuevoMovimiento.cuentaId);
    const contracuenta = cuentasOperativas.find((item) => item.codigo === nuevoMovimiento.contracuentaCodigo);
    if (!cuenta || !contracuenta) {
      toast({
        title: "Configuracion contable incompleta",
        description: "No se encontro la cuenta bancaria o la contracuenta seleccionada.",
        variant: "destructive",
      });
      return;
    }

    const naturaleza: NaturalezaMovimientoBancario = nuevoMovimiento.tipo === "ingreso" ? "credito" : "debito";
    const tipoMovimiento = inferTipoMovimiento(nuevoMovimiento.tipo, nuevoMovimiento.metodoPago);
    const payload: MovimientoBancarioInput = {
      cuenta_bancaria_id: nuevoMovimiento.cuentaId,
      fecha: nuevoMovimiento.fecha,
      tipo: tipoMovimiento,
      naturaleza_movimiento: naturaleza,
      monto: Number(nuevoMovimiento.monto),
      descripcion: nuevoMovimiento.concepto,
      numero_comprobante: nuevoMovimiento.referencia || null,
      beneficiario: nuevoMovimiento.observaciones || getResponsable(nuevoMovimiento.metodoPago),
      origen_registro: "manual",
    };

    const cuentaBanco = getBankAccountLedger(cuenta);
    const monto = Number(nuevoMovimiento.monto);
    const asiento = {
      id: `TES-${Date.now()}`,
      numero: `TES-${Date.now().toString().slice(-6)}`,
      fecha: nuevoMovimiento.fecha,
      concepto: `Movimiento de tesoreria - ${nuevoMovimiento.concepto}`,
      referencia: nuevoMovimiento.referencia || nuevoMovimiento.categoria,
      debe: monto,
      haber: monto,
      estado: "registrado" as const,
      cuentas:
        nuevoMovimiento.tipo === "ingreso"
          ? [
              { codigo: cuentaBanco.codigo, nombre: cuentaBanco.nombre, debe: monto, haber: 0 },
              { codigo: contracuenta.codigo, nombre: contracuenta.nombre, debe: 0, haber: monto },
            ]
          : [
              { codigo: contracuenta.codigo, nombre: contracuenta.nombre, debe: monto, haber: 0 },
              { codigo: cuentaBanco.codigo, nombre: cuentaBanco.nombre, debe: 0, haber: monto },
            ],
    };

    setIsSavingMovement(true);
    try {
      await createMovimientoBancario(payload);

      const asientoGuardado = await guardarAsiento(asiento);
      if (!asientoGuardado) {
        toast({
          title: "Movimiento bancario registrado con observacion",
          description: "El banco se actualizo, pero el asiento no pudo persistirse. Revisa libro diario y tesoreria.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Movimiento de tesoreria registrado",
          description: "Se persistio el movimiento bancario y su asiento contable asociado.",
        });
      }

      await Promise.all([refetchBancos(), refetchAsientos()]);
      setNuevoMovimiento({
        cuentaId: nuevoMovimiento.cuentaId,
        fecha: new Date().toISOString().slice(0, 10),
        tipo: "ingreso",
        categoria: "Ventas",
        concepto: "",
        monto: 0,
        metodoPago: "transferencia",
        referencia: "",
        contracuentaCodigo: "",
        observaciones: "",
      });
    } catch (error) {
      console.error("Error registrando movimiento de tesoreria:", error);
      toast({
        title: "No se pudo registrar el movimiento",
        description: "Hubo un problema persistiendo la operacion en tesoreria.",
        variant: "destructive",
      });
    } finally {
      setIsSavingMovement(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="grid gap-6 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 px-6 py-7 text-white lg:grid-cols-[1.6fr_0.9fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-cyan-100">
                <Landmark className="h-3.5 w-3.5" />
                Mesa de liquidez
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight">Flujo de caja conectado con bancos, cartera y contabilidad</h2>
                <p className="max-w-2xl text-sm text-slate-200">
                  El tablero ya no inventa movimientos. Ahora cruza tesoreria real desde bancos con cobros y pagos
                  proyectados para anticipar tension de caja y sostener cierre auditable.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Pulso financiero</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-white/8 px-4 py-3">
                  <span className="text-sm text-slate-200">Liquidez disponible</span>
                  <span className="text-lg font-semibold">{formatCurrency(saldoActual)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/8 px-4 py-3">
                  <span className="text-sm text-slate-200">Cobros por recibir</span>
                  <span className="text-lg font-semibold">{formatCurrency(carteraProyectada.reduce((sum, item) => sum + item.monto, 0))}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/8 px-4 py-3">
                  <span className="text-sm text-slate-200">Pagos comprometidos</span>
                  <span className="text-lg font-semibold">{formatCurrency(pagosProyectados.reduce((sum, item) => sum + item.monto, 0))}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-cyan-200 bg-cyan-50/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-900">Liquidez actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-cyan-950">{formatCurrency(saldoActual)}</p>
                <p className="text-xs text-cyan-800">Caja y bancos con respaldo contable</p>
              </div>
              <Wallet className="h-8 w-8 text-cyan-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900">Ingresos del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-emerald-950">{formatCurrency(ingresosMes)}</p>
                <p className="text-xs text-emerald-800">Entradas confirmadas por bancos</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-900">Egresos del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-rose-950">{formatCurrency(egresosMes)}</p>
                <p className="text-xs text-rose-800">Salidas bancarias confirmadas</p>
              </div>
              <TrendingDown className="h-8 w-8 text-rose-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Flujo neto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-2xl font-semibold ${(ingresosMes - egresosMes) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {formatCurrency(ingresosMes - egresosMes)}
                </p>
                <p className="text-xs text-slate-500">Resultado operacional del mes</p>
              </div>
              <ArrowUpDown className="h-8 w-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="movimientos" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="graficos">Analisis</TabsTrigger>
          <TabsTrigger value="proyecciones">Proyecciones</TabsTrigger>
          <TabsTrigger value="nuevo">Registrar movimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="movimientos">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Movimientos reales de tesoreria</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Fuente: `movimientos_bancarios`. Cada fila representa una operacion persistida y lista para conciliacion.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-4">
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ingreso">Ingresos</SelectItem>
                    <SelectItem value="egreso">Egresos</SelectItem>
                  </SelectContent>
                </Select>

                <Input type="date" value={fechaInicio} onChange={(event) => setFechaInicio(event.target.value)} />
                <Input type="date" value={fechaFin} onChange={(event) => setFechaFin(event.target.value)} />

                <Select value={periodoGrafico} onValueChange={setPeriodoGrafico}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sincronizando tesoreria
                </div>
              )}

              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Metodo</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientosFiltrados.slice(0, 30).map((movimiento) => (
                      <TableRow key={movimiento.id}>
                        <TableCell>{formatDate(movimiento.fecha)}</TableCell>
                        <TableCell className="font-medium">{movimiento.cuentaNombre}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={movimiento.tipo === "ingreso" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}>
                            {movimiento.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>{movimiento.concepto}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {movimiento.metodoPago === "efectivo" && <Banknote className="h-4 w-4 text-slate-500" />}
                            {movimiento.metodoPago === "transferencia" && <Building className="h-4 w-4 text-slate-500" />}
                            {(movimiento.metodoPago === "cheque" || movimiento.metodoPago === "tarjeta") && <CreditCard className="h-4 w-4 text-slate-500" />}
                            <span>{PAYMENT_METHOD_LABELS[movimiento.metodoPago]}</span>
                          </div>
                        </TableCell>
                        <TableCell>{movimiento.referencia || "-"}</TableCell>
                        <TableCell className={`text-right font-semibold ${movimiento.tipo === "ingreso" ? "text-emerald-700" : "text-rose-700"}`}>
                          {movimiento.tipo === "ingreso" ? "+" : "-"}{formatCurrency(movimiento.monto)}
                        </TableCell>
                      </TableRow>
                    ))}

                    {movimientosFiltrados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          No hay movimientos de tesoreria para los filtros elegidos.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graficos">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Entradas y salidas bancarias</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={datosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Line type="monotone" dataKey="ingresos" stroke="#059669" strokeWidth={2} name="Ingresos" />
                    <Line type="monotone" dataKey="egresos" stroke="#e11d48" strokeWidth={2} name="Egresos" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Comparativo diario</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={datosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="ingresos" fill="#059669" name="Ingresos" />
                    <Bar dataKey="egresos" fill="#e11d48" name="Egresos" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="proyecciones">
          <div className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Proyeccion de liquidez a 30 dias</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={proyecciones}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Line type="monotone" dataKey="saldoAcumulado" stroke="#2563eb" strokeWidth={2} name="Saldo proyectado" />
                    <Line type="monotone" dataKey="flujoNeto" stroke="#7c3aed" name="Flujo neto diario" />
                  </LineChart>
                </ResponsiveContainer>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Saldo proyectado</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">{formatCurrency(proyecciones[proyecciones.length - 1]?.saldoAcumulado || 0)}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Cobros esperados</p>
                    <p className="mt-2 text-xl font-semibold text-emerald-950">{formatCurrency(carteraProyectada.reduce((sum, item) => sum + item.monto, 0))}</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-rose-700">Pagos esperados</p>
                    <p className="mt-2 text-xl font-semibold text-rose-950">{formatCurrency(pagosProyectados.reduce((sum, item) => sum + item.monto, 0))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Agenda de cobranzas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {carteraProyectada.slice(0, 6).map((item, index) => (
                    <div key={`${item.descripcion}-${index}`} className="flex items-start justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                      <div>
                        <p className="font-medium text-emerald-950">{item.descripcion}</p>
                        <p className="text-sm text-emerald-800">{formatDate(item.fecha)}</p>
                      </div>
                      <span className="font-semibold text-emerald-950">{formatCurrency(item.monto)}</span>
                    </div>
                  ))}
                  {carteraProyectada.length === 0 && <p className="text-sm text-muted-foreground">No hay cobranzas proyectadas en cartera.</p>}
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Agenda de pagos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pagosProyectados.slice(0, 6).map((item, index) => (
                    <div key={`${item.descripcion}-${index}`} className="flex items-start justify-between rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3">
                      <div>
                        <p className="font-medium text-rose-950">{item.descripcion}</p>
                        <p className="text-sm text-rose-800">{formatDate(item.fecha)}</p>
                      </div>
                      <span className="font-semibold text-rose-950">{formatCurrency(item.monto)}</span>
                    </div>
                  ))}
                  {pagosProyectados.length === 0 && <p className="text-sm text-muted-foreground">No hay pagos comprometidos en el horizonte de caja.</p>}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="nuevo">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Registrar movimiento de tesoreria</CardTitle>
              <p className="text-sm text-muted-foreground">
                Este formulario persiste el movimiento en bancos y luego intenta registrar el asiento correspondiente con la contracuenta elegida.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label>Cuenta bancaria</Label>
                  <Select value={nuevoMovimiento.cuentaId} onValueChange={(value) => setNuevoMovimiento((prev) => ({ ...prev, cuentaId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {cuentasBancarias.map((cuenta) => (
                        <SelectItem key={cuenta.id} value={cuenta.id}>
                          {cuenta.nombre} · {cuenta.banco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={nuevoMovimiento.tipo} onValueChange={(value: TipoFlujo) => setNuevoMovimiento((prev) => ({ ...prev, tipo: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ingreso">Ingreso</SelectItem>
                      <SelectItem value="egreso">Egreso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={nuevoMovimiento.fecha} onChange={(event) => setNuevoMovimiento((prev) => ({ ...prev, fecha: event.target.value }))} />
                </div>

                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input type="number" min={0} value={nuevoMovimiento.monto} onChange={(event) => setNuevoMovimiento((prev) => ({ ...prev, monto: Number(event.target.value) }))} />
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={nuevoMovimiento.categoria} onValueChange={(value) => setNuevoMovimiento((prev) => ({ ...prev, categoria: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Metodo</Label>
                  <Select value={nuevoMovimiento.metodoPago} onValueChange={(value: MetodoPago) => setNuevoMovimiento((prev) => ({ ...prev, metodoPago: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Contracuenta</Label>
                  <Select value={nuevoMovimiento.contracuentaCodigo} onValueChange={(value) => setNuevoMovimiento((prev) => ({ ...prev, contracuentaCodigo: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar contracuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {cuentasOperativas.map((cuenta) => (
                        <SelectItem key={cuenta.codigo} value={cuenta.codigo}>
                          {cuenta.codigo} · {cuenta.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Referencia</Label>
                  <Input value={nuevoMovimiento.referencia} onChange={(event) => setNuevoMovimiento((prev) => ({ ...prev, referencia: event.target.value }))} placeholder="Transferencia, cheque, glosa" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Concepto</Label>
                <Input value={nuevoMovimiento.concepto} onChange={(event) => setNuevoMovimiento((prev) => ({ ...prev, concepto: event.target.value }))} placeholder="Descripcion ejecutiva del movimiento" />
              </div>

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea value={nuevoMovimiento.observaciones} onChange={(event) => setNuevoMovimiento((prev) => ({ ...prev, observaciones: event.target.value }))} placeholder="Beneficiario, banco destino o detalle de soporte" />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <p>
                    El movimiento actualiza bancos y luego registra el asiento. Si el asiento falla, el sistema te avisara para revisar libro diario y evitar huecos de trazabilidad.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => void registrarMovimiento()} disabled={isSavingMovement}>
                  {isSavingMovement ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Registrar movimiento
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedCashFlowModule;
