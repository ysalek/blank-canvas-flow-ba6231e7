import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Producto } from "../products/ProductsData";
import { MovimientoInventario } from "./InventoryData";
import { useAsientos } from "@/hooks/useAsientos";
import { useReportesContables } from "@/hooks/useReportesContables";
import InventoryAdjustmentDialog from "./InventoryAdjustmentDialog";

interface ValidationIssue {
  type: "critical" | "warning" | "info";
  message: string;
  productId?: string;
  suggestion?: string;
}

interface InventoryFlowValidatorProps {
  productos: Producto[];
  movimientos: MovimientoInventario[];
  onAddMovement: (movement: MovimientoInventario) => void;
}

const InventoryFlowValidator = ({
  productos,
  movimientos,
  onAddMovement,
}: InventoryFlowValidatorProps) => {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);
  const { getAsientos } = useAsientos();
  const { getBalanceSheetData } = useReportesContables();
  const { toast } = useToast();

  useEffect(() => {
    const nextIssues: ValidationIssue[] = [];
    const asientos = getAsientos();
    const balanceData = getBalanceSheetData();

    productos.forEach((producto) => {
      if (producto.stockActual < 0) {
        nextIssues.push({
          type: "critical",
          message: `${producto.nombre} tiene stock negativo: ${producto.stockActual}`,
          productId: producto.id,
          suggestion: "Registrar un ajuste de entrada para regularizar el stock.",
        });
      }

      if (producto.stockActual > 0 && producto.stockActual <= producto.stockMinimo) {
        nextIssues.push({
          type: "warning",
          message: `${producto.nombre} tiene stock bajo minimo. Stock: ${producto.stockActual}, minimo: ${producto.stockMinimo}`,
          productId: producto.id,
          suggestion: "Considerar reabastecimiento o compra de reposicion.",
        });
      }

      const tieneMovimientos = movimientos.some((movimiento) => movimiento.productoId === producto.id);
      if (!tieneMovimientos && producto.stockActual > 0) {
        nextIssues.push({
          type: "info",
          message: `${producto.nombre} tiene stock (${producto.stockActual}) pero no registra movimientos historicos`,
          productId: producto.id,
          suggestion: "Revisar si corresponde a inventario inicial o si faltan movimientos.",
        });
      }
    });

    const inventarioBalance = balanceData.activos.cuentas.find((cuenta) => cuenta.codigo === "1141");
    if (inventarioBalance && inventarioBalance.saldo < 0) {
      nextIssues.push({
        type: "critical",
        message: `Inventario en Balance General es negativo: ${inventarioBalance.saldo.toFixed(2)} Bs.`,
        suggestion: "Revisar asientos de inventario y regularizar saldos.",
      });
    }

    asientos.forEach((asiento) => {
      if (Math.abs(asiento.debe - asiento.haber) > 0.01) {
        nextIssues.push({
          type: "critical",
          message: `Asiento ${asiento.numero} esta desbalanceado. Debe: ${asiento.debe}, Haber: ${asiento.haber}`,
          suggestion: "Corregir la partida antes de continuar con el cierre.",
        });
      }
    });

    setIssues(nextIssues);
  }, [getAsientos, getBalanceSheetData, movimientos, productos]);

  const negativeStockProducts = useMemo(
    () => productos.filter((producto) => producto.stockActual < 0),
    [productos],
  );

  const handleAutoFix = async () => {
    const criticalIssues = issues.filter((issue) => issue.type === "critical");
    if (criticalIssues.length === 0) {
      toast({
        title: "Sin problemas criticos",
        description: "El sistema no detecta inconsistencias graves en esta lectura.",
      });
      return;
    }

    const hasNegativeStockIssues = criticalIssues.some(
      (issue) => issue.productId && issue.message.includes("stock negativo"),
    );

    if (!hasNegativeStockIssues || negativeStockProducts.length === 0) {
      toast({
        title: "Revision manual requerida",
        description: "Las incidencias criticas detectadas no pueden corregirse con ajuste automatico de stock.",
        variant: "destructive",
      });
      return;
    }

    setAutoFixing(true);
    try {
      setShowAdjustmentDialog(true);
      toast({
        title: "Ajuste requerido",
        description: "Se abrira el dialogo para regularizar productos con stock negativo.",
        variant: "destructive",
      });
    } finally {
      setAutoFixing(false);
    }
  };

  const getIssueIcon = (type: ValidationIssue["type"]) => {
    switch (type) {
      case "critical":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "info":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getIssueVariant = (type: ValidationIssue["type"]) => {
    switch (type) {
      case "critical":
        return "destructive" as const;
      case "warning":
        return "default" as const;
      case "info":
        return "default" as const;
    }
  };

  const criticalCount = issues.filter((issue) => issue.type === "critical").length;
  const warningCount = issues.filter((issue) => issue.type === "warning").length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Validador de flujo contable e inventario
              {criticalCount === 0 && warningCount === 0 && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </CardTitle>
            {criticalCount > 0 && (
              <Button
                onClick={() => void handleAutoFix()}
                variant="destructive"
                size="sm"
                disabled={autoFixing || showAdjustmentDialog || negativeStockProducts.length === 0}
              >
                <Wrench className="mr-1 h-4 w-4" />
                {autoFixing ? "Preparando..." : "Corregir automaticamente"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {criticalCount > 0 && <Badge variant="destructive">{criticalCount} Criticos</Badge>}
            {warningCount > 0 && <Badge variant="secondary">{warningCount} Advertencias</Badge>}
            {criticalCount === 0 && warningCount === 0 && (
              <Badge className="bg-green-100 text-green-800">Sistema validado</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {issues.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                El sistema contable e inventario estan funcionando correctamente. No se detectaron inconsistencias.
              </AlertDescription>
            </Alert>
          ) : (
            issues.map((issue, index) => (
              <Alert key={`${issue.type}-${issue.productId || "general"}-${index}`} variant={getIssueVariant(issue.type)}>
                <div className="flex items-start gap-2">
                  {getIssueIcon(issue.type)}
                  <div className="flex-1">
                    <AlertDescription>
                      <div className="font-medium">{issue.message}</div>
                      {issue.suggestion && (
                        <div className="mt-1 text-sm text-muted-foreground">{issue.suggestion}</div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))
          )}
        </CardContent>
      </Card>

      <InventoryAdjustmentDialog
        open={showAdjustmentDialog}
        onOpenChange={(open) => {
          if (!open && autoFixing) return;
          setShowAdjustmentDialog(open);
        }}
        productos={negativeStockProducts}
        onSaveMovement={onAddMovement}
      />
    </>
  );
};

export default InventoryFlowValidator;
