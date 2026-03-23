import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Package, DollarSign, TrendingUp, LayoutPanelLeft } from "lucide-react";
import CustomerAccountsReceivable from "../customers/CustomerAccountsReceivable";
import InventoryAnalysis from "../inventory/InventoryAnalysis";
import AdvancesManagement from "../advances/AdvancesManagement";
import BalanceComprobacionModule from "../BalanceComprobacionModule";
import DeclaracionIVA from "../DeclaracionIVA";
import { EnhancedHeader, EnhancedMetricCard, MetricGrid, Section } from "../dashboard/EnhancedLayout";

const ImprovedReportsModule = () => {
  return (
    <div className="page-shell space-y-6 pb-12">
      <EnhancedHeader
        title="Reportes y analisis"
        subtitle="Centraliza lectura financiera, inventario, cartera y analitica tributaria dentro de una misma superficie ejecutiva."
        badge={{
          text: "Centro analitico",
          variant: "secondary",
        }}
      />

      <MetricGrid columns={4}>
        <EnhancedMetricCard
          title="Frentes de analisis"
          value="5"
          subtitle="Cartera, inventario, anticipos, balance e IVA"
          icon={LayoutPanelLeft}
        />
        <EnhancedMetricCard
          title="Cobranza"
          value="Clientes"
          subtitle="Lectura de cartera y cuentas por cobrar"
          icon={Users}
          variant="success"
        />
        <EnhancedMetricCard
          title="Operacion"
          value="Inventario"
          subtitle="Control de stock, rotacion y capital inmovilizado"
          icon={Package}
        />
        <EnhancedMetricCard
          title="Control fiscal"
          value="IVA"
          subtitle="Base rapida para revision tributaria"
          icon={TrendingUp}
          variant="warning"
        />
      </MetricGrid>

      <div className="hero-panel rounded-[2rem] p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Torre de control
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">
              Reportes comerciales, contables y tributarios
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Este frente reune los modulos de consulta mas relevantes para gerencia,
              contabilidad y administracion.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                Cartera
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                Inventario
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                Tributario
              </Badge>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Enfoque sugerido
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold">Revision diaria</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Cartera, inventario y anticipos ayudan a detectar riesgos operativos antes del cierre.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold">Revision contable</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">
                  Balance de comprobacion e IVA sirven como capa rapida de control y soporte a auditoria.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="receivables" className="space-y-5">
        <TabsList className="grid w-full grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white p-2 md:grid-cols-5">
          <TabsTrigger value="receivables" className="rounded-xl">
            <Users className="mr-2 h-4 w-4" />
            CxC
          </TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-xl">
            <Package className="mr-2 h-4 w-4" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="advances" className="rounded-xl">
            <DollarSign className="mr-2 h-4 w-4" />
            Anticipos
          </TabsTrigger>
          <TabsTrigger value="balance" className="rounded-xl">
            <FileText className="mr-2 h-4 w-4" />
            Balance
          </TabsTrigger>
          <TabsTrigger value="tax" className="rounded-xl">
            <TrendingUp className="mr-2 h-4 w-4" />
            IVA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receivables">
          <Section title="Cartera" subtitle="Lectura de cuentas por cobrar y salud comercial">
            <CustomerAccountsReceivable />
          </Section>
        </TabsContent>

        <TabsContent value="inventory">
          <Section title="Inventario" subtitle="Analisis de existencias, rotacion y capital inmovilizado">
            <InventoryAnalysis />
          </Section>
        </TabsContent>

        <TabsContent value="advances">
          <Section title="Anticipos" subtitle="Seguimiento de anticipos de clientes y proveedores">
            <AdvancesManagement />
          </Section>
        </TabsContent>

        <TabsContent value="balance">
          <Section title="Balance de comprobacion" subtitle="Control de saldos y validacion contable">
            <BalanceComprobacionModule />
          </Section>
        </TabsContent>

        <TabsContent value="tax">
          <Section title="Declaracion IVA" subtitle="Base operativa para control del impuesto">
            <DeclaracionIVA onBack={() => {}} />
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImprovedReportsModule;
