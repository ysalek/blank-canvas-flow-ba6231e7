import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { useFacturas } from "@/hooks/useFacturas";
import { useSupabasePagos } from "@/hooks/useSupabasePagos";
import { useSupabaseProveedores } from "@/hooks/useSupabaseProveedores";
import { CreditCard, AlertTriangle, CheckCircle, DollarSign, Users, Building } from "lucide-react";

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

const CuentasPorCobrarPagar = () => {
  const [showPagoDialog, setShowPagoDialog] = useState<{
    open: boolean;
    tipo: "cobro" | "pago";
    cuenta: CuentaPorCobrar | CuentaPorPagar;
  } | null>(null);

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
  const { pagos, loading: pagosLoading, createPago, refetch: refetchPagos } = useSupabasePagos();

  const pagosNormalizados = useMemo(() => {
    return (pagos || [])
      .filter((pago) => pago.id)
      .map((pago) => ({
        id: pago.id as string,
        tipo: (pago.tipo as "cobro" | "pago") || "cobro",
        cuentaId: (pago.factura_id || pago.compra_id || "") as string,
        fecha: pago.fecha,
        monto: Number(pago.monto || 0),
        metodoPago: ((pago.metodo_pago || "efectivo") as PagoRegistro["metodoPago"]),
        referencia: pago.numero_comprobante || "",
        observaciones: pago.observaciones || "",
      }));
  }, [pagos]);

  const cuentasPorCobrar = useMemo<CuentaPorCobrar[]>(() => {
    return facturas
      .filter((factura) => factura.estado !== "anulada")
      .map((factura) => {
        const pagosFactura = pagosNormalizados.filter(
          (pago) => pago.tipo === "cobro" && pago.cuentaId === factura.id
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
          (pago) => pago.tipo === "pago" && pago.cuentaId === compra.id
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
    const monto = Number(pago.monto || 0);
    const cuenta = showPagoDialog?.cuenta;
    if (!cuenta || monto <= 0) {
      toast({
        title: "Monto invalido",
        description: "Debes ingresar un monto mayor a cero.",
        variant: "destructive",
      });
      return;
    }

    if (monto > cuenta.montoSaldo) {
      toast({
        title: "Monto excedido",
        description: "El monto no puede ser mayor al saldo pendiente.",
        variant: "destructive",
      });
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
              { codigo: "1121", nombre: "Cuentas por Cobrar Comerciales", debe: 0, haber: monto },
            ]
          : [
              { codigo: "2111", nombre: "Cuentas por Pagar", debe: monto, haber: 0 },
              { codigo: "1111", nombre: "Caja", debe: 0, haber: monto },
            ],
    };

    const asientoGuardado = await guardarAsiento(asiento);
    if (!asientoGuardado) return;

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
        description: `Movimiento registrado por Bs. ${monto.toFixed(2)} con impacto contable y operativo.`,
      });

      setShowPagoDialog(null);
    } catch (error) {
      console.error("Error registrando pago/cobro:", error);
      toast({
        title: "Operacion incompleta",
        description: "Se registro el asiento, pero hubo un problema actualizando la cartera. Revisa pagos y estado del documento.",
        variant: "destructive",
      });
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "pagada":
        return "bg-green-100 text-green-800";
      case "vencida":
        return "bg-red-100 text-red-800";
      case "parcial":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const totalPorCobrar = cuentasPorCobrar.reduce((sum, cuenta) => sum + cuenta.montoSaldo, 0);
  const totalPorPagar = cuentasPorPagar.reduce((sum, cuenta) => sum + cuenta.montoSaldo, 0);
  const vencidasCobrar = cuentasPorCobrar.filter((cuenta) => cuenta.estado === "vencida").length;
  const vencidasPagar = cuentasPorPagar.filter((cuenta) => cuenta.estado === "vencida").length;
  const loading = facturasLoading || comprasLoading || pagosLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Cuentas por Cobrar y Pagar</h2>
            <p className="text-muted-foreground">
              Gesti&oacute;n de cartera y obligaciones financieras desde datos consolidados en Supabase
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total por Cobrar</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Bs. {totalPorCobrar.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{cuentasPorCobrar.length} documentos abiertos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total por Pagar</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Bs. {totalPorPagar.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{cuentasPorPagar.length} obligaciones abiertas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas Cobrar</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{vencidasCobrar}</div>
            <p className="text-xs text-muted-foreground">Requieren seguimiento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas Pagar</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{vencidasPagar}</div>
            <p className="text-xs text-muted-foreground">Requieren pago urgente</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cobrar" className="w-full">
        <TabsList>
          <TabsTrigger value="cobrar">
            <Users className="w-4 h-4 mr-2" />
            Cuentas por Cobrar ({cuentasPorCobrar.length})
          </TabsTrigger>
          <TabsTrigger value="pagar">
            <Building className="w-4 h-4 mr-2" />
            Cuentas por Pagar ({cuentasPorPagar.length})
          </TabsTrigger>
          <TabsTrigger value="pagos">
            <CheckCircle className="w-4 h-4 mr-2" />
            Historial de Pagos ({pagosNormalizados.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cobrar">
          <Card>
            <CardHeader>
              <CardTitle>Facturas por Cobrar</CardTitle>
              <CardDescription>Seguimiento de cuentas por cobrar de clientes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Monto Original</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Dias Vencido</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuentasPorCobrar.map((cuenta) => (
                    <TableRow key={cuenta.id}>
                      <TableCell className="font-medium">{cuenta.facturaNumero}</TableCell>
                      <TableCell>{cuenta.clienteNombre}</TableCell>
                      <TableCell>{new Date(cuenta.fecha).toLocaleDateString("es-BO")}</TableCell>
                      <TableCell>{new Date(cuenta.fechaVencimiento).toLocaleDateString("es-BO")}</TableCell>
                      <TableCell className="text-right">Bs. {cuenta.montoOriginal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">Bs. {cuenta.montoPagado.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">Bs. {cuenta.montoSaldo.toFixed(2)}</TableCell>
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
                          <Button
                            size="sm"
                            onClick={() =>
                              setShowPagoDialog({
                                open: true,
                                tipo: "cobro",
                                cuenta,
                              })
                            }
                          >
                            Registrar Cobro
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagar">
          <Card>
            <CardHeader>
              <CardTitle>Compras por Pagar</CardTitle>
              <CardDescription>Seguimiento de obligaciones con proveedores</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Monto Original</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Dias Vencido</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuentasPorPagar.map((cuenta) => (
                    <TableRow key={cuenta.id}>
                      <TableCell className="font-medium">{cuenta.facturaNumero}</TableCell>
                      <TableCell>{cuenta.proveedorNombre}</TableCell>
                      <TableCell>{new Date(cuenta.fecha).toLocaleDateString("es-BO")}</TableCell>
                      <TableCell>{new Date(cuenta.fechaVencimiento).toLocaleDateString("es-BO")}</TableCell>
                      <TableCell className="text-right">Bs. {cuenta.montoOriginal.toFixed(2)}</TableCell>
                      <TableCell className="text-right">Bs. {cuenta.montoPagado.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">Bs. {cuenta.montoSaldo.toFixed(2)}</TableCell>
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
                          <Button
                            size="sm"
                            onClick={() =>
                              setShowPagoDialog({
                                open: true,
                                tipo: "pago",
                                cuenta,
                              })
                            }
                          >
                            Registrar Pago
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagos">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos y Cobros</CardTitle>
              <CardDescription>Registro de movimientos de cartera persistidos en la base de datos</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>M&eacute;todo</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Observaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagosNormalizados.map((pago) => (
                    <TableRow key={pago.id}>
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
                          pago.tipo === "cobro" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {pago.tipo === "cobro" ? "+" : "-"}Bs. {pago.monto.toFixed(2)}
                      </TableCell>
                      <TableCell>{pago.observaciones || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {loading && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Cargando cartera y pagos desde la base de datos...
          </CardContent>
        </Card>
      )}

      {showPagoDialog && (
        <Dialog open={showPagoDialog.open} onOpenChange={(open) => !open && setShowPagoDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Registrar {showPagoDialog.tipo === "cobro" ? "Cobro" : "Pago"}
              </DialogTitle>
              <DialogDescription>
                {showPagoDialog.tipo === "cobro" ? "Registre el cobro" : "Registre el pago"} del documento{" "}
                {showPagoDialog.cuenta.facturaNumero}
              </DialogDescription>
            </DialogHeader>
            <PagoForm
              tipo={showPagoDialog.tipo}
              cuentaId={showPagoDialog.cuenta.id}
              montoMaximo={showPagoDialog.cuenta.montoSaldo}
              onSave={registrarPago}
              onCancel={() => setShowPagoDialog(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const PagoForm = ({
  tipo,
  cuentaId,
  montoMaximo,
  onSave,
  onCancel,
}: {
  tipo: "cobro" | "pago";
  cuentaId: string;
  montoMaximo: number;
  onSave: (pago: Omit<PagoRegistro, "id">) => Promise<void>;
  onCancel: () => void;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            onChange={(e) => setFormData((prev) => ({ ...prev, fecha: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monto">Monto (max: Bs. {montoMaximo.toFixed(2)})</Label>
          <Input
            id="monto"
            type="number"
            step="0.01"
            max={montoMaximo}
            value={formData.monto}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, monto: parseFloat(e.target.value) || 0 }))
            }
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="metodoPago">Metodo de Pago</Label>
        <select
          id="metodoPago"
          value={formData.metodoPago}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              metodoPago: e.target.value as "efectivo" | "cheque" | "transferencia" | "tarjeta",
            }))
          }
          className="w-full px-3 py-2 border rounded-md"
          required
        >
          <option value="efectivo">Efectivo</option>
          <option value="cheque">Cheque</option>
          <option value="transferencia">Transferencia Bancaria</option>
          <option value="tarjeta">Tarjeta</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="referencia">Referencia</Label>
        <Input
          id="referencia"
          value={formData.referencia}
          onChange={(e) => setFormData((prev) => ({ ...prev, referencia: e.target.value }))}
          placeholder="Numero de cheque, transferencia, etc."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observaciones">Observaciones</Label>
        <Textarea
          id="observaciones"
          value={formData.observaciones}
          onChange={(e) => setFormData((prev) => ({ ...prev, observaciones: e.target.value }))}
          placeholder="Observaciones adicionales"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Registrar {tipo === "cobro" ? "Cobro" : "Pago"}</Button>
      </div>
    </form>
  );
};

export default CuentasPorCobrarPagar;
