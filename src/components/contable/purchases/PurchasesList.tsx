import { Compra } from "./PurchasesData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Package, ArrowUpRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PurchasesListProps {
  compras: Compra[];
  onProcessPurchase: (compra: Compra) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "recibida":
      return "bg-emerald-100 text-emerald-800";
    case "pendiente":
      return "bg-amber-100 text-amber-800";
    case "pagada":
      return "bg-sky-100 text-sky-800";
    case "anulada":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

const PurchasesList = ({ compras, onProcessPurchase }: PurchasesListProps) => {
  const { toast } = useToast();

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Seguimiento
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">Ordenes de compra</h3>
            <p className="mt-1 text-sm text-slate-600">
              Historial de compras con lectura operativa, financiera y contable.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium">
              {compras.length} registros
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium">
              Flujo conectado a inventario
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto px-2 py-2">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200">
              <TableHead>Numero</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compras.length > 0 ? (
              compras.map((compra) => (
                <TableRow key={compra.id} className="border-slate-100">
                  <TableCell className="font-mono text-sm font-semibold text-slate-900">
                    {compra.numero}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">{compra.proveedor.nombre}</p>
                      <p className="text-xs text-slate-500">NIT {compra.proveedor.nit}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{compra.fecha}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(compra.estado)}>{compra.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-900">
                    Bs {compra.total.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 w-9 rounded-xl p-0"
                        title="Ver detalles de la compra"
                        onClick={() =>
                          toast({
                            title: "Detalle de compra",
                            description: `${compra.numero} - ${compra.proveedor.nombre}. ${compra.items.length} items. Subtotal Bs ${compra.subtotal.toFixed(2)}.`,
                          })
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 w-9 rounded-xl p-0"
                        title="Ver asiento contable"
                        onClick={() => {
                          const totalContable = compra.subtotal + compra.iva;
                          toast({
                            title: "Asiento contable de compra",
                            description: `${compra.numero}. Debito inventario Bs ${compra.subtotal.toFixed(2)}. Debito IVA credito fiscal Bs ${compra.iva.toFixed(2)}. Credito cuentas por pagar Bs ${totalContable.toFixed(2)}.`,
                          });
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={compra.estado === "pagada" ? "outline" : "default"}
                        onClick={() => onProcessPurchase(compra)}
                        className="h-9 rounded-xl px-3"
                        title="Procesar pago"
                        disabled={compra.estado === "pagada"}
                      >
                        {compra.estado === "pagada" ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <Package className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-500">
                  No se encontraron compras.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PurchasesList;
