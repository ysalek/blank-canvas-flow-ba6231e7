
import { Card, CardContent } from "@/components/ui/card";
import { Factura } from "./BillingData";

interface InvoiceSummaryProps {
  facturas: Factura[];
}

const InvoiceSummary = ({ facturas }: InvoiceSummaryProps) => {
  const aceptadas = facturas.filter(f => f.estadoSIN === 'aceptado').length;
  const pendientes = facturas.filter(f => f.estadoSIN === 'pendiente').length;
  const totalFacturado = facturas.reduce((sum, f) => sum + f.total, 0);
  const totalFacturas = facturas.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{aceptadas}</div>
            <div className="text-sm text-gray-600">Aceptadas (sim.)</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendientes}</div>
            <div className="text-sm text-gray-600">Pendientes (sim.)</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              Bs. {totalFacturado.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Facturado</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{totalFacturas}</div>
            <div className="text-sm text-gray-600">Total Facturas</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceSummary;
