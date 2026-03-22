import { CheckCircle, Clock3, DollarSign, FileText } from "lucide-react";
import { Factura } from "./BillingData";
import { EnhancedMetricCard, MetricGrid } from "../dashboard/EnhancedLayout";

interface InvoiceSummaryProps {
  facturas: Factura[];
}

const InvoiceSummary = ({ facturas }: InvoiceSummaryProps) => {
  const aceptadas = facturas.filter((item) => item.estadoSIN === 'aceptado').length;
  const pendientes = facturas.filter((item) => item.estadoSIN === 'pendiente').length;
  const totalFacturado = facturas.reduce((sum, item) => sum + item.total, 0);
  const totalFacturas = facturas.length;

  return (
    <MetricGrid columns={4}>
      <EnhancedMetricCard
        title="Aceptadas (sim.)"
        value={aceptadas}
        subtitle="Validadas por el flujo demo SIN"
        icon={CheckCircle}
        variant="success"
        trend="up"
        trendValue="Continuidad"
      />
      <EnhancedMetricCard
        title="Pendientes (sim.)"
        value={pendientes}
        subtitle="Esperando revision del flujo"
        icon={Clock3}
        variant={pendientes > 0 ? "warning" : "default"}
        trend={pendientes > 0 ? "neutral" : "up"}
        trendValue={pendientes > 0 ? "Seguimiento" : "Sin cola"}
      />
      <EnhancedMetricCard
        title="Total facturado"
        value={`Bs. ${totalFacturado.toFixed(2)}`}
        subtitle="Volumen bruto emitido"
        icon={DollarSign}
        variant="success"
        trend="up"
        trendValue="Ventas"
      />
      <EnhancedMetricCard
        title="Total facturas"
        value={totalFacturas}
        subtitle="Documentos emitidos"
        icon={FileText}
        variant="default"
        trend="up"
        trendValue="Operacion"
      />
    </MetricGrid>
  );
};

export default InvoiceSummary;
