import { useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, DollarSign, TrendingUp, Users } from "lucide-react";
import { useClientesSupabase } from "@/hooks/useClientesSupabase";
import { useFacturas } from "@/hooks/useFacturas";
import { useAnticipos } from "@/hooks/useAnticipos";
import type { Factura } from "../billing/BillingData";

interface CustomerReceivableInfo {
  clienteId: string;
  clienteNombre: string;
  clienteNit: string;
  saldoBruto: number;
  totalPorCobrar: number;
  facturasPendientes: Factura[];
  ultimaCompra: {
    fecha: string;
    monto: number;
    numero: string;
  } | null;
  anticiposRecibidos: number;
  diasPromedioPago: number;
  clasificacionRiesgo: "Bajo" | "Medio" | "Alto";
}

const CustomerAccountsReceivable = () => {
  const { clientes, loading: loadingClientes } = useClientesSupabase();
  const { facturas, loading: loadingFacturas } = useFacturas();
  const { anticipos, loading: loadingAnticipos } = useAnticipos();

  const cuentasPorCobrar = useMemo<CustomerReceivableInfo[]>(() => {
    return clientes
      .map((cliente) => {
        const facturasCliente = facturas.filter((factura) => factura.cliente.id === cliente.id);
        const facturasPendientes = facturasCliente.filter((factura) => factura.estado === "enviada");
        const saldoBruto = facturasPendientes.reduce((sum, factura) => sum + factura.total, 0);

        const ultimaCompra = [...facturasCliente]
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];

        const anticiposCliente = anticipos
          .filter((anticipo) => anticipo.tipo === "cliente" && anticipo.entidadId === cliente.id && anticipo.estado === "activo")
          .reduce((sum, anticipo) => sum + anticipo.saldoPendiente, 0);

        const facturasVencidas = facturasPendientes.filter(
          (factura) => factura.fechaVencimiento && new Date(factura.fechaVencimiento) < new Date()
        );

        const diasPromedioPago =
          facturasVencidas.length > 0
            ? facturasVencidas.reduce((sum, factura) => {
                const diasVencido = Math.floor(
                  (Date.now() - new Date(factura.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24)
                );
                return sum + diasVencido;
              }, 0) / facturasVencidas.length
            : 0;

        let clasificacionRiesgo: CustomerReceivableInfo["clasificacionRiesgo"] = "Bajo";
        if (diasPromedioPago > 60 || saldoBruto > 10000) clasificacionRiesgo = "Alto";
        else if (diasPromedioPago > 30 || saldoBruto > 5000) clasificacionRiesgo = "Medio";

        return {
          clienteId: cliente.id,
          clienteNombre: cliente.nombre,
          clienteNit: cliente.nit,
          saldoBruto,
          totalPorCobrar: Math.max(saldoBruto - anticiposCliente, 0),
          facturasPendientes,
          ultimaCompra: ultimaCompra
            ? {
                fecha: ultimaCompra.fecha,
                monto: ultimaCompra.total,
                numero: ultimaCompra.numero,
              }
            : null,
          anticiposRecibidos: anticiposCliente,
          diasPromedioPago,
          clasificacionRiesgo,
        };
      })
      .filter((info) => info.saldoBruto > 0 || info.anticiposRecibidos > 0);
  }, [anticipos, clientes, facturas]);

  const getRiskColor = (riesgo: CustomerReceivableInfo["clasificacionRiesgo"]) => {
    switch (riesgo) {
      case "Alto":
        return "bg-red-100 text-red-800 border-red-200";
      case "Medio":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const totalGeneral = cuentasPorCobrar.reduce((sum, cuenta) => sum + cuenta.totalPorCobrar, 0);
  const totalAnticipos = cuentasPorCobrar.reduce((sum, cuenta) => sum + cuenta.anticiposRecibidos, 0);
  const loading = loadingClientes || loadingFacturas || loadingAnticipos;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total por cobrar</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Bs. {totalGeneral.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Saldo neto despues de anticipos</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anticipos recibidos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Bs. {totalAnticipos.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Credito disponible por cliente</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes con saldo</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cuentasPorCobrar.length}</div>
            <p className="text-xs text-muted-foreground">Seguimiento de cartera</p>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Los anticipos de clientes se descuentan de la cartera pendiente para mostrar el saldo neto real. Esta vista
          ya cruza facturas y anticipos persistidos en Supabase.
        </AlertDescription>
      </Alert>

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Detalle de cuentas por cobrar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Ultima compra</TableHead>
                <TableHead className="text-right">Saldo bruto</TableHead>
                <TableHead className="text-right">Anticipos</TableHead>
                <TableHead className="text-right">Saldo neto</TableHead>
                <TableHead className="text-center">Dias prom.</TableHead>
                <TableHead className="text-center">Riesgo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Cargando cartera...
                  </TableCell>
                </TableRow>
              ) : cuentasPorCobrar.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No hay saldos pendientes ni anticipos registrados.
                  </TableCell>
                </TableRow>
              ) : (
                cuentasPorCobrar.map((cuenta) => (
                  <TableRow key={cuenta.clienteId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cuenta.clienteNombre}</p>
                        <p className="text-sm text-muted-foreground">{cuenta.clienteNit}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cuenta.ultimaCompra ? (
                        <div>
                          <p className="text-sm">{new Date(cuenta.ultimaCompra.fecha).toLocaleDateString("es-BO")}</p>
                          <p className="text-xs text-muted-foreground">
                            {cuenta.ultimaCompra.numero} - Bs. {cuenta.ultimaCompra.monto.toFixed(2)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sin compras</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">Bs. {cuenta.saldoBruto.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {cuenta.anticiposRecibidos > 0 ? (
                        <span className="text-green-600">-Bs. {cuenta.anticiposRecibidos.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground">0.00</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">Bs. {cuenta.totalPorCobrar.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      {cuenta.diasPromedioPago > 0 ? Math.round(cuenta.diasPromedioPago) : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={getRiskColor(cuenta.clasificacionRiesgo)}>{cuenta.clasificacionRiesgo}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerAccountsReceivable;
