import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { useFacturas } from "@/hooks/useFacturas";
import { useSupabasePagos } from "@/hooks/useSupabasePagos";
import { useSupabaseProveedores } from "@/hooks/useSupabaseProveedores";
import {
  CreditCard,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Users,
  Building,
  Wallet,
  CalendarClock,
} from "lucide-react";
import {
  EnhancedHeader,
  EnhancedMetricCard,
  MetricGrid,
  Section,
} from "./dashboard/EnhancedLayout";

interface CuentaPorCobrar {
  id: string;
  clienteId: string;
  clienteNombre: string;
  facturaNumero: string;
  fecha: string;
  fechaVencimiento: string;
  montoOriginal: number;
  montoPagado: number;
  montoSaldo: number;
  estado: "pendiente" | "vencida" | "pagada" | "parcial";
  diasVencidos: number;
}

interface CuentaPorPagar {
  id: string;
  proveedorId: string;
  proveedorNombre: string;
  facturaNumero: string;
  fecha: string;
  fechaVencimiento: string;
  montoOriginal: number;
  montoPagado: number;
  montoSaldo: number;
  estado: "pendiente" | "vencida" | "pagada" | "parcial";
  diasVencidos: number;
  estadoCompra: "pendiente" | "recibida" | "pagada" | "anulada";
}

interface PagoRegistro {
  id: string;
  tipo: "cobro" | "pago";
  cuentaId: string;
  fecha: string;
  monto: number;
  metodoPago: "efectivo" | "cheque" | "transferencia" | "tarjeta";
  referencia: string;
  observaciones: string;
}

const addDays = (dateString: string, days: number) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const calcularDiasVencidos = (fechaVencimiento: string, montoSaldo: number) => {
  if (montoSaldo <= 0) return 0;
  const hoy = new Date();
  const fechaVenc = new Date(fechaVencimiento);
  return Math.max(0, Math.floor((hoy.getTime() - fechaVenc.getTime()) / (1000 * 60 * 60 * 24)));
};

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case "pagada":
      return "bg-emerald-100 text-emerald-800";
    case "vencida":
      return "bg-rose-100 text-rose-800";
    case "parcial":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-sky-100 text-sky-800";
  }
};

const CuentasPorCobrarPagar = () => {
  const [showPagoDialog, setShowPagoDialog] = useState<{
    open: boolean;
    tipo: "cobro" | "pago";
    cuenta: CuentaPorCobrar | CuentaPorPagar;
  } | null>(null);
  const [savingPago, setSavingPago] = useState(false);

  const { toast } = useToast();
  const { guardarAsiento } = useContabilidadIntegration();
  const {
    facturas,
    loading: facturasLoading,
    actualizarEstadoFactura,
    refetch: refetchFacturas,
  } = useFacturas();
  const {
    compras,
    proveedores,
    loading: comprasLoading,
    actualizarCompra,
    refetch: refetchCompras,
  } = useSupabaseProveedores();
  const {
    pagos,
    loading: pagosLoading,
    createPago,
    refetch: refetchPagos,
  } = useSupabasePagos();

  const pagosNormalizados = useMemo(() => {
    return (pagos || [])
      .filter((pago) => pago.id)
      .map((pago) => ({
        id: pago.id as string,
        tipo: (pago.tipo as "cobro" | "pago") || "cobro",
        cuentaId: (pago.factura_id || pago.compra_id || "") as string,
        fecha: pago.fecha,
        monto: Number(pago.monto || 0),
        metodoPago: (pago.metodo_pago || "efectivo") as PagoRegistro["metodoPago"],
        referencia: pago.numero_comprobante || "",
        observaciones: pago.observaciones || "",
      }));
  }, [pagos]);

  const cuentasPorCobrar = useMemo<CuentaPorCobrar[]>(() => {
    return facturas
      .filter((factura) => factura.estado !== "anulada")
      .map((factura) => {
        const pagosFactura = pagosNormalizados.filter(
          (pago) => pago.tipo === "cobro" && pago.cuentaId === factura.id,
        );
        const montoPagado = pagosFactura.reduce((sum, pago) => sum + pago.monto, 0);
        const montoSaldo = Math.max(0, factura.total - montoPagado);
        const fechaVencimiento = factura.fechaVencimiento || factura.fecha;
        const diasVencidos = calcularDiasVencidos(fechaVencimiento, montoSaldo);

        let estado: CuentaPorCobrar["estado"] = "pendiente";
        if (montoSaldo <= 0.01 || factura.estado === "pagada") {
          estado = "pagada";
        } else if (montoPagado > 0) {
          estado = "parcial";
        } else if (diasVencidos > 0) {
          estado = "vencida";
        }

        return {
          id: factura.id,
          clienteId: factura.cliente.id,
          clienteNombre: factura.cliente.nombre,
          facturaNumero: factura.numero,
          fecha: factura.fecha,
          fechaVencimiento,
          montoOriginal: factura.total,
          montoPagado,
          montoSaldo,
          estado,
          diasVencidos,
        };
      })
      .filter((cuenta) => cuenta.estado !== "pagada" || cuenta.montoPagado > 0);
  }, [facturas, pagosNormalizados]);

  const cuentasPorPagar = useMemo<CuentaPorPagar[]>(() => {
    return compras
      .filter((compra) => compra.estado !== "anulada" && compra.tipo_pago === "credito")
      .map((compra) => {
        const pagosCompra = pagosNormalizados.filter(
          (pago) => pago.tipo === "pago" && pago.cuentaId === compra.id,
        );
        const pagosRegistrados = pagosCompra.reduce((sum, pago) => sum + pago.monto, 0);
        const montoPagado = Math.max(Number(compra.monto_pagado || 0), pagosRegistrados);
        const montoSaldo = Math.max(0, Number(compra.total || 0) - montoPagado);
        const fechaVencimiento = compra.fecha_vencimiento || addDays(compra.fecha, 30);
        const diasVencidos = calcularDiasVencidos(fechaVencimiento, montoSaldo);
        const proveedor = proveedores.find((item) => item.id === compra.proveedor_id);

        let estado: CuentaPorPagar["estado"] = "pendiente";
        if (montoSaldo <= 0.01 || compra.estado === "pagada") {
          estado = "pagada";
        } else if (montoPagado > 0) {
          estado = "parcial";
        } else if (diasVencidos > 0) {
          estado = "vencida";
        }

        return {
          id: compra.id,
          proveedorId: compra.proveedor_id,
          proveedorNombre: proveedor?.nombre || "Proveedor desconocido",
          facturaNumero: compra.numero,
          fecha: compra.fecha,
          fechaVencimiento,
          montoOriginal: Number(compra.total || 0),
          montoPagado,
          montoSaldo,
          estado,
          diasVencidos,
          estadoCompra: compra.estado,
        };
      });
  }, [compras, pagosNormalizados, proveedores]);

  const registrarPago = async (pago: Omit<PagoRegistro, "id">) => {
    setSavingPago(true);
    const monto = Number(pago.monto || 0);
    const cuenta = showPagoDialog?.cuenta;
    if (!cuenta || monto <= 0) {
      toast({
        title: "Monto invalido",
        description: "Debes ingresar un monto mayor a cero.",
        variant: "destructive",
      });
      setSavingPago(false);
      return;
    }

    if (monto > cuenta.montoSaldo) {
      toast({
        title: "Monto excedido",
        description: "El monto no puede ser mayor al saldo pendiente.",
        variant: "destructive",
      });
      setSavingPago(false);
      return;
    }

    const asiento = {
      id: `TMP-${Date.now()}`,
      numero: `${pago.tipo === "cobro" ? "COB" : "PAG"}-${Date.now().toString().slice(-6)}`,
      fecha: pago.fecha,
      concepto:
        pago.tipo === "cobro"
          ? `Cobro parcial/total de factura ${cuenta.facturaNumero}`
          : `Pago parcial/total de compra ${cuenta.facturaNumero}`,
      referencia: pago.referencia,
      debe: monto,
      haber: monto,
      estado: "registrado" as const,
      cuentas:
        pago.tipo === "cobro"
          ? [
              { codigo: "1111", nombre: "Caja", debe: monto, haber: 0 },
              {
                codigo: "1121",
                nombre: "Cuentas por Cobrar Comerciales",
                debe: 0,
                haber: monto,
              },
            ]
          : [
              { codigo: "2111", nombre: "Cuentas por Pagar", debe: monto, haber: 0 },
              { codigo: "1111", nombre: "Caja", debe: 0, haber: monto },
            ],
    };

    const asientoGuardado = await guardarAsiento(asiento);
    if (!asientoGuardado) {
      setSavingPago(false);
      return;
    }

    try {
      await createPago({
        tipo: pago.tipo,
        factura_id: pago.tipo === "cobro" ? pago.cuentaId : undefined,
        compra_id: pago.tipo === "pago" ? pago.cuentaId : undefined,
        fecha: pago.fecha,
        monto,
        metodo_pago: pago.metodoPago,
        numero_comprobante: pago.referencia,
        observaciones: pago.observaciones,
        estado: "registrado",
      });

      const nuevoSaldo = Math.max(0, cuenta.montoSaldo - monto);
      const nuevoPagado = cuenta.montoPagado + monto;

      if (pago.tipo === "cobro") {
        await actualizarEstadoFactura(pago.cuentaId, nuevoSaldo <= 0.01 ? "pagada" : "enviada");
        await refetchFacturas();
      } else {
        const cuentaPagar = cuenta as CuentaPorPagar;
        await actualizarCompra(pago.cuentaId, {
          monto_pagado: nuevoPagado,
          saldo_pendiente: nuevoSaldo,
          estado: nuevoSaldo <= 0.01 ? "pagada" : cuentaPagar.estadoCompra,
        });
        await refetchCompras();
      }

      await refetchPagos();

      toast({
        title: `${pago.tipo === "cobro" ? "Cobro" : "Pago"} registrado`,
        description: `Movimiento registrado por Bs ${monto.toFixed(2)} con impacto contable y operativo.`,
      });

      setShowPagoDialog(null);
    } catch (error) {
      console.error("Error registrando pago/cobro:", error);
      toast({
        title: "Operacion incompleta",
        description:
          "Se registro el asiento, pero hubo un problema actualizando la cartera. Revisa pagos y estado del documento.",
        variant: "destructive",
      });
    } finally {
      setSavingPago(false);
    }
  };

  const totalPorCobrar = cuentasPorCobrar.reduce((sum, cuenta) => sum + cuenta.montoSaldo, 0);
  const totalPorPagar = cuentasPorPagar.reduce((sum, cuenta) => sum + cuenta.montoSaldo, 0);
  const vencidasCobrar = cuentasPorCobrar.filter((cuenta) => cuenta.estado === "vencida").length;
  const vencidasPagar = cuentasPorPagar.filter((cuenta) => cuenta.estado === "vencida").length;
  const loading = facturasLoading || comprasLoading || pagosLoading;

  return (
    <div className="page-shell space-y-6 pb-12">
      <EnhancedHeader
        title="Cuentas por cobrar y pagar"
        subtitle="Supervisa cartera, vencimientos y movimientos de pago con una lectura financiera mas clara y operativa."
        badge={{
          text: `${cuentasPorCobrar.length + cuentasPorPagar.length} documentos abiertos`,
          variant: "secondary",
        }}
      />

      <div className="hero-panel rounded-[2rem] p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Centro de cartera
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">
                Cobranza y obligaciones bajo control
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                El sistema consolida facturas, compras y pagos persistidos para dar una
                lectura real del flujo por cobrar y por pagar.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                  {pagosNormalizados.length} movimientos registrados
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                  {vencidasCobrar + vencidasPagar} alertas de vencimiento
                </Badge>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Pulso financiero
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold">Liquidez comercial</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {totalPorCobrar >= totalPorPagar
                      ? "La cartera por cobrar supera las obligaciones visibles."
                      : "Las obligaciones abiertas superan la cartera por cobrar visible."}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold">Estado de sincronizacion</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {loading
                      ? "Actualizando cartera y pagos desde la base de datos."
                      : "La lectura de cartera ya usa documentos y pagos persistidos en Supabase."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Prioridades del dia
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Por cobrar</p>
                  <p className="text-xs text-slate-500">Saldo pendiente de clientes</p>
                </div>
                <p className="text-xl font-bold text-emerald-700">Bs {totalPorCobrar.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Por pagar</p>
                  <p className="text-xs text-slate-500">Obligaciones con proveedores</p>
                </div>
                <p className="text-xl font-bold text-rose-700">Bs {totalPorPagar.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Documentos vencidos</p>
                  <p className="text-xs text-slate-500">Casos que requieren accion</p>
                </div>
                <p className="text-2xl font-bold text-amber-700">{vencidasCobrar + vencidasPagar}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MetricGrid columns={4}>
        <EnhancedMetricCard
          title="Total por cobrar"
          value={`Bs ${totalPorCobrar.toFixed(2)}`}
          subtitle={`${cuentasPorCobrar.length} documentos abiertos`}
          icon={DollarSign}
          variant="success"
        />
        <EnhancedMetricCard
          title="Total por pagar"
          value={`Bs ${totalPorPagar.toFixed(2)}`}
          subtitle={`${cuentasPorPagar.length} obligaciones abiertas`}
          icon={Wallet}
          variant="destructive"
        />
        <EnhancedMetricCard
          title="Vencidas por cobrar"
          value={vencidasCobrar}
          subtitle="Seguimiento comercial"
          icon={Users}
          variant="warning"
        />
        <EnhancedMetricCard
          title="Vencidas por pagar"
          value={vencidasPagar}
          subtitle="Pagos que requieren atencion"
          icon={Building}
          variant="warning"
        />
      </MetricGrid>

      <Tabs defaultValue="cobrar" className="space-y-5">
        <TabsList className="grid w-full grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white p-2 md:grid-cols-3">
          <TabsTrigger value="cobrar" className="rounded-xl">
            <Users className="mr-2 h-4 w-4" />
            Cuentas por cobrar ({cuentasPorCobrar.length})
          </TabsTrigger>
          <TabsTrigger value="pagar" className="rounded-xl">
            <Building className="mr-2 h-4 w-4" />
            Cuentas por pagar ({cuentasPorPagar.length})
          </TabsTrigger>
          <TabsTrigger value="pagos" className="rounded-xl">
            <CheckCircle className="mr-2 h-4 w-4" />
            Historial ({pagosNormalizados.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cobrar">
          <Section title="Cobranza" subtitle="Facturas abiertas y seguimiento de clientes">
            <CarteraTable
              rows={cuentasPorCobrar}
              counterpartLabel="Cliente"
              getCounterpart={(cuenta) => cuenta.clienteNombre}
              actionLabel="Registrar cobro"
              onAction={(cuenta) =>
                setShowPagoDialog({
                  open: true,
                  tipo: "cobro",
                  cuenta,
                })
              }
            />
          </Section>
        </TabsContent>

        <TabsContent value="pagar">
          <Section title="Obligaciones" subtitle="Compras a credito y pagos a proveedores">
            <CarteraTable
              rows={cuentasPorPagar}
              counterpartLabel="Proveedor"
              getCounterpart={(cuenta) => cuenta.proveedorNombre}
              actionLabel="Registrar pago"
              onAction={(cuenta) =>
                setShowPagoDialog({
                  open: true,
                  tipo: "pago",
                  cuenta,
                })
              }
            />
          </Section>
        </TabsContent>

        <TabsContent value="pagos">
          <Section title="Historial de pagos" subtitle="Movimientos persistidos en la base de datos">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/10 p-2.5">
                    <CalendarClock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Historial de cobros y pagos</h3>
                    <p className="text-sm text-slate-600">
                      Registro cronologico de movimientos aplicados sobre la cartera.
                    </p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto px-2 py-2">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Metodo</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Observaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagosNormalizados.map((pago) => (
                      <TableRow key={pago.id} className="border-slate-100">
                        <TableCell>{new Date(pago.fecha).toLocaleDateString("es-BO")}</TableCell>
                        <TableCell>
                          <Badge variant={pago.tipo === "cobro" ? "default" : "secondary"}>
                            {pago.tipo === "cobro" ? "Cobro" : "Pago"}
                          </Badge>
                        </TableCell>
                        <TableCell>{pago.referencia || "-"}</TableCell>
                        <TableCell>{pago.metodoPago}</TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            pago.tipo === "cobro" ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {pago.tipo === "cobro" ? "+" : "-"}Bs {pago.monto.toFixed(2)}
                        </TableCell>
                        <TableCell>{pago.observaciones || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {pagosNormalizados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-500">
                          No hay pagos o cobros registrados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Section>
        </TabsContent>
      </Tabs>

      {loading && (
        <Card className="rounded-[1.75rem] border-slate-200 bg-white/90 shadow-sm">
          <CardContent className="py-8 text-center text-sm text-slate-500">
            Cargando cartera y pagos desde la base de datos...
          </CardContent>
        </Card>
      )}

      {showPagoDialog && (
        <Dialog
          open={showPagoDialog.open}
          onOpenChange={(open) => {
            if (savingPago && !open) return;
            if (!open) setShowPagoDialog(null);
          }}
        >
          <DialogContent className="rounded-[1.75rem] border-slate-200 sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>
                Registrar {showPagoDialog.tipo === "cobro" ? "cobro" : "pago"}
              </DialogTitle>
              <DialogDescription>
                {showPagoDialog.tipo === "cobro" ? "Registra el cobro" : "Registra el pago"} del
                documento {showPagoDialog.cuenta.facturaNumero}.
              </DialogDescription>
            </DialogHeader>
            <PagoForm
              tipo={showPagoDialog.tipo}
              cuentaId={showPagoDialog.cuenta.id}
              montoMaximo={showPagoDialog.cuenta.montoSaldo}
              onSave={registrarPago}
              onCancel={() => setShowPagoDialog(null)}
              saving={savingPago}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const CarteraTable = <T extends CuentaPorCobrar | CuentaPorPagar>({
  rows,
  counterpartLabel,
  getCounterpart,
  actionLabel,
  onAction,
}: {
  rows: T[];
  counterpartLabel: string;
  getCounterpart: (cuenta: T) => string;
  actionLabel: string;
  onAction: (cuenta: T) => void;
}) => {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 shadow-sm">
      <div className="overflow-x-auto px-2 py-2">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200">
              <TableHead>Factura</TableHead>
              <TableHead>{counterpartLabel}</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Original</TableHead>
              <TableHead className="text-right">Pagado</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vencido</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((cuenta) => (
              <TableRow key={cuenta.id} className="border-slate-100">
                <TableCell className="font-semibold text-slate-900">{cuenta.facturaNumero}</TableCell>
                <TableCell>{getCounterpart(cuenta)}</TableCell>
                <TableCell>{new Date(cuenta.fecha).toLocaleDateString("es-BO")}</TableCell>
                <TableCell>{new Date(cuenta.fechaVencimiento).toLocaleDateString("es-BO")}</TableCell>
                <TableCell className="text-right">Bs {cuenta.montoOriginal.toFixed(2)}</TableCell>
                <TableCell className="text-right">Bs {cuenta.montoPagado.toFixed(2)}</TableCell>
                <TableCell className="text-right font-semibold text-slate-900">
                  Bs {cuenta.montoSaldo.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge className={getEstadoColor(cuenta.estado)}>{cuenta.estado}</Badge>
                </TableCell>
                <TableCell>
                  {cuenta.diasVencidos > 0 ? (
                    <Badge variant="destructive">{cuenta.diasVencidos} dias</Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {cuenta.montoSaldo > 0.01 && (
                    <Button size="sm" className="rounded-xl" onClick={() => onAction(cuenta)}>
                      {actionLabel}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-sm text-slate-500">
                  No hay documentos para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const PagoForm = ({
  tipo,
  cuentaId,
  montoMaximo,
  onSave,
  onCancel,
  saving,
}: {
  tipo: "cobro" | "pago";
  cuentaId: string;
  montoMaximo: number;
  onSave: (pago: Omit<PagoRegistro, "id">) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) => {
  const [formData, setFormData] = useState({
    tipo,
    cuentaId,
    fecha: new Date().toISOString().slice(0, 10),
    monto: montoMaximo,
    metodoPago: "efectivo" as const,
    referencia: "",
    observaciones: "",
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha</Label>
          <Input
            id="fecha"
            type="date"
            value={formData.fecha}
            onChange={(event) => setFormData((prev) => ({ ...prev, fecha: event.target.value }))}
            disabled={saving}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monto">Monto (max: Bs {montoMaximo.toFixed(2)})</Label>
          <Input
            id="monto"
            type="number"
            step="0.01"
            max={montoMaximo}
            value={formData.monto}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, monto: parseFloat(event.target.value) || 0 }))
            }
            disabled={saving}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="metodoPago">Metodo de pago</Label>
        <select
          id="metodoPago"
          value={formData.metodoPago}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              metodoPago: event.target.value as "efectivo" | "cheque" | "transferencia" | "tarjeta",
            }))
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2"
          disabled={saving}
          required
        >
          <option value="efectivo">Efectivo</option>
          <option value="cheque">Cheque</option>
          <option value="transferencia">Transferencia bancaria</option>
          <option value="tarjeta">Tarjeta</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="referencia">Referencia</Label>
        <Input
          id="referencia"
          value={formData.referencia}
          onChange={(event) => setFormData((prev) => ({ ...prev, referencia: event.target.value }))}
          placeholder="Numero de cheque, transferencia, etc."
          disabled={saving}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <Textarea
          id="observaciones"
          value={formData.observaciones}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, observaciones: event.target.value }))
          }
          placeholder="Observaciones adicionales"
          disabled={saving}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : `Registrar ${tipo === "cobro" ? "cobro" : "pago"}`}
        </Button>
      </div>
    </form>
  );
};

export default CuentasPorCobrarPagar;
