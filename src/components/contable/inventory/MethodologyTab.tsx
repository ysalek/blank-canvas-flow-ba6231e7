
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, BookOpen } from "lucide-react";

const MethodologyTab = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Metodología de Promedio Ponderado
          </CardTitle>
          <CardDescription>
            Explicación del método de valuación y registro contable según normativa boliviana
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2">¿Qué es el Promedio Ponderado?</h4>
            <p className="text-sm text-muted-foreground mb-4">
              El método de promedio ponderado calcula el costo unitario de los productos considerando 
              tanto las cantidades como los costos de todas las compras realizadas.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Fórmula de Cálculo</h4>
            <div className="bg-primary/5 p-4 rounded-lg">
              <p className="font-mono text-sm">
                Nuevo Costo Promedio = (Valor Inventario Anterior + Valor Compra Nueva) / (Stock Anterior + Cantidad Nueva)
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Ejemplo Práctico</h4>
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-xs font-medium border-b pb-2">
                <div>Operación</div>
                <div>Cantidad</div>
                <div>Costo Unit.</div>
                <div>Costo Prom.</div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>Stock inicial</div>
                <div>10 unidades</div>
                <div>Bs. 100</div>
                <div>Bs. 100</div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>Compra nueva</div>
                <div>5 unidades</div>
                <div>Bs. 120</div>
                <div>-</div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs border-t pt-2 font-medium">
                <div>Resultado</div>
                <div>15 unidades</div>
                <div>-</div>
                <div>Bs. 106.67</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Cálculo: (10×100 + 5×120) / (10+5) = 1600/15 = Bs. 106.67
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Integración Contable Automática</h4>
            <div className="space-y-3">
              <div className="border-l-4 border-green-500 pl-4">
                <p className="font-medium text-green-700">Entrada de Inventario</p>
                <p className="text-sm text-muted-foreground">
                  Débito: Inventarios / Crédito: Cuentas por Pagar
                </p>
              </div>
              <div className="border-l-4 border-red-500 pl-4">
                <p className="font-medium text-red-700">Salida de Inventario</p>
                <p className="text-sm text-muted-foreground">
                  Débito: Costo de Productos Vendidos / Crédito: Inventarios
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2 text-yellow-800">Ventajas del Promedio Ponderado</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Suaviza las fluctuaciones de precios</li>
              <li>• Método aceptado por normativas contables bolivianas</li>
              <li>• Refleja el costo real promedio del inventario</li>
              <li>• Integración automática con registros contables</li>
              <li>• Cumple con principios del SIN Bolivia</li>
            </ul>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="font-semibold mb-2 text-red-800">⚠️ Normativa Boliviana Crítica</h4>
            <div className="space-y-2 text-sm text-red-700">
              <p><strong>COMPRAS:</strong> Van al ACTIVO Inventarios (1141), NO a gastos</p>
              <p><strong>VENTAS:</strong> Solo van al Costo de Ventas (5111) para cálculo de utilidad</p>
              <p><strong>PÉRDIDAS:</strong> Van a cuenta específica (5322), NO distorsionan utilidad</p>
              <p><strong>ECUACIÓN:</strong> Inventario Final = Inicial + Compras - Costo Ventas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MethodologyTab;
