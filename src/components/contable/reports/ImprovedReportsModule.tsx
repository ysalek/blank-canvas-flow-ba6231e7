
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Users, Package, DollarSign, TrendingUp } from "lucide-react";
import CustomerAccountsReceivable from "../customers/CustomerAccountsReceivable";
import InventoryAnalysis from "../inventory/InventoryAnalysis";
import AdvancesManagement from "../advances/AdvancesManagement";
import BalanceComprobacionModule from "../BalanceComprobacionModule";
import DeclaracionIVA from "../DeclaracionIVA";

const ImprovedReportsModule = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reportes y Análisis Avanzados</h2>
          <p className="text-muted-foreground">Sistema completo de reportes contables y análisis empresarial</p>
        </div>
      </div>

      <Tabs defaultValue="receivables" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="receivables" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Cuentas por Cobrar
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Análisis Inventario
          </TabsTrigger>
          <TabsTrigger value="advances" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Anticipos
          </TabsTrigger>
          <TabsTrigger value="balance" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Balance Comprobación
          </TabsTrigger>
          <TabsTrigger value="tax" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Declaración IVA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receivables">
          <CustomerAccountsReceivable />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryAnalysis />
        </TabsContent>

        <TabsContent value="advances">
          <AdvancesManagement />
        </TabsContent>

        <TabsContent value="balance">
          <BalanceComprobacionModule />
        </TabsContent>

        <TabsContent value="tax">
          <DeclaracionIVA onBack={() => {}} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImprovedReportsModule;
