import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Factura } from "./BillingData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle, Eye, MoreHorizontal, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvoiceListProps {
  facturas: Factura[];
  onShowDetails: (factura: Factura) => void;
  onUpdateStatus: (invoiceId: string, newStatus: 'pagada' | 'anulada') => void;
  processingInvoiceId?: string | null;
}

const getStatusClasses = (estado: Factura['estado']) => {
  switch (estado) {
    case 'pagada':
      return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100';
    case 'enviada':
      return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100';
    case 'anulada':
      return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100';
    case 'borrador':
      return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100';
    default:
      return '';
  }
};

const InvoiceList = ({
  facturas,
  onShowDetails,
  onUpdateStatus,
  processingInvoiceId = null,
}: InvoiceListProps) => {
  return (
    <Card className="card-gradient rounded-[1.9rem]">
      <CardHeader>
        <CardTitle>Facturas emitidas</CardTitle>
        <CardDescription>
          Historial completo con acciones operativas y contexto comercial-contable.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="data-surface">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/35 hover:bg-muted/35">
                <TableHead className="w-[110px]">Numero</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right w-[110px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facturas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No hay facturas emitidas todavia.
                  </TableCell>
                </TableRow>
              ) : facturas.map((factura) => (
                <TableRow key={factura.id} className="table-row-interactive">
                  <TableCell className="font-medium">{factura.numero}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{factura.cliente.nombre}</p>
                      <p className="text-xs text-muted-foreground">{factura.cliente.nit || 'Sin NIT'}</p>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(factura.fecha).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right font-semibold">Bs. {factura.total.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn("capitalize border rounded-full", getStatusClasses(factura.estado))}>
                      {factura.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl"
                          disabled={processingInvoiceId === factura.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl">
                        <DropdownMenuItem onClick={() => onShowDetails(factura)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onUpdateStatus(factura.id, 'pagada')}
                          disabled={factura.estado !== 'enviada' || processingInvoiceId === factura.id}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Marcar como pagada
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onUpdateStatus(factura.id, 'anulada')}
                          disabled={
                            factura.estado === 'anulada' ||
                            factura.estado === 'pagada' ||
                            processingInvoiceId === factura.id
                          }
                          className="focus:bg-red-100 focus:text-red-600"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Anular factura
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceList;
