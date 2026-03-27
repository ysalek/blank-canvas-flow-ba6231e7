
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductoInventario, MovimientoInventario, calcularPromedioPonderado } from "./InventoryData";
import { useToast } from "@/hooks/use-toast";
import ProductSearchSelect from "./ProductSearchSelect";
import { AlertTriangle, Package, Calculator } from "lucide-react";

interface InventoryMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: 'entrada' | 'salida';
  productos: ProductoInventario[];
  onMovimiento: (movimiento: MovimientoInventario, productoActualizado: ProductoInventario) => Promise<void> | void;
}

const InventoryMovementDialog = ({ open, onOpenChange, tipo, productos, onMovimiento }: InventoryMovementDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    productoId: "",
    cantidad: 0,
    costoUnitario: 0,
    motivo: "",
    documento: ""
  });

  const [calculatedValues, setCalculatedValues] = useState({
    valorTotal: 0,
    nuevoCostoPromedio: 0,
    nuevoStock: 0
  });
  const [saving, setSaving] = useState(false);

  const selectedProduct = productos.find(p => p.id === formData.productoId);

  // Calcular valores automáticamente cuando cambian los datos
  useEffect(() => {
    if (!selectedProduct || formData.cantidad <= 0) {
      setCalculatedValues({ valorTotal: 0, nuevoCostoPromedio: 0, nuevoStock: 0 });
      return;
    }

    const cantidadMovimiento = tipo === 'entrada' ? formData.cantidad : -formData.cantidad;
    const nuevoStock = selectedProduct.stockActual + cantidadMovimiento;
    
    let valorTotal = 0;
    let nuevoCostoPromedio = selectedProduct.costoPromedioPonderado;

    if (tipo === 'entrada') {
      valorTotal = formData.cantidad * formData.costoUnitario;
      nuevoCostoPromedio = calcularPromedioPonderado(
        selectedProduct.stockActual,
        selectedProduct.costoPromedioPonderado,
        formData.cantidad,
        formData.costoUnitario
      );
    } else {
      valorTotal = formData.cantidad * selectedProduct.costoPromedioPonderado;
    }

    setCalculatedValues({
      valorTotal,
      nuevoCostoPromedio,
      nuevoStock
    });
  }, [selectedProduct, formData.cantidad, formData.costoUnitario, tipo]);

  const resetForm = () => {
    setFormData({
      productoId: "",
      cantidad: 0,
      costoUnitario: 0,
      motivo: "",
      documento: ""
    });
    setCalculatedValues({ valorTotal: 0, nuevoCostoPromedio: 0, nuevoStock: 0 });
  };

  const handleSubmit = async () => {
    // Validaciones básicas
    if (!formData.productoId) {
      toast({
        title: "Error",
        description: "Debe seleccionar un producto",
        variant: "destructive"
      });
      return;
    }

    if (formData.cantidad <= 0) {
      toast({
        title: "Error", 
        description: "La cantidad debe ser mayor a cero",
        variant: "destructive"
      });
      return;
    }

    if (tipo === 'entrada' && formData.costoUnitario <= 0) {
      toast({
        title: "Error",
        description: "El costo unitario debe ser mayor a cero para entradas",
        variant: "destructive"
      });
      return;
    }

    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "Producto no encontrado",
        variant: "destructive"
      });
      return;
    }

    // Validación de stock para salidas
    if (tipo === 'salida' && formData.cantidad > selectedProduct.stockActual) {
      toast({
        title: "Stock insuficiente",
        description: `Stock disponible: ${selectedProduct.stockActual} unidades. No se puede procesar la salida de ${formData.cantidad} unidades.`,
        variant: "destructive"
      });
      return;
    }

    // Crear el movimiento
    const stockAnterior = selectedProduct.stockActual;
    const cantidadMovimiento = tipo === 'entrada' ? formData.cantidad : -formData.cantidad;
    const stockNuevo = stockAnterior + cantidadMovimiento;

    const nuevoMovimiento: MovimientoInventario = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fecha: new Date().toISOString().slice(0, 10),
      tipo,
      productoId: selectedProduct.id,
      producto: selectedProduct.nombre,
      cantidad: formData.cantidad,
      costoUnitario: tipo === 'entrada' ? formData.costoUnitario : selectedProduct.costoPromedioPonderado,
      costoPromedioPonderado: calculatedValues.nuevoCostoPromedio,
      motivo: formData.motivo || (tipo === 'entrada' ? 'Ingreso de mercadería' : 'Salida de mercadería'),
      documento: formData.documento || 'N/A',
      usuario: "Usuario Actual",
      stockAnterior,
      stockNuevo,
      valorMovimiento: calculatedValues.valorTotal
    };

    const productoActualizado: ProductoInventario = {
      ...selectedProduct,
      stockActual: stockNuevo,
      costoPromedioPonderado: calculatedValues.nuevoCostoPromedio,
      costoUnitario: tipo === 'entrada' ? formData.costoUnitario : selectedProduct.costoUnitario,
      fechaUltimoMovimiento: new Date().toISOString().slice(0, 10),
      valorTotalInventario: stockNuevo * calculatedValues.nuevoCostoPromedio
    };

    console.log("Procesando movimiento:", nuevoMovimiento);
    console.log("Producto actualizado:", productoActualizado);

    try {
      setSaving(true);
      await Promise.resolve(onMovimiento(nuevoMovimiento, productoActualizado));
      resetForm();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && saving) {
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Registrar {tipo === 'entrada' ? 'Entrada' : 'Salida'} de Inventario
          </DialogTitle>
          <DialogDescription>
            Complete la información del movimiento de inventario. Todos los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selección de producto */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Producto *</Label>
            <ProductSearchSelect
              productos={productos}
              value={formData.productoId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, productoId: value }))}
              placeholder="Buscar y seleccionar producto..."
              disabled={saving}
            />
          </div>

          {/* Información del producto seleccionado */}
          {selectedProduct && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Información del Producto</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Código:</span> {selectedProduct.codigo}
                </div>
                <div>
                  <span className="font-medium">Categoría:</span> {selectedProduct.categoria}
                </div>
                <div>
                  <span className="font-medium">Stock actual:</span> {selectedProduct.stockActual} unidades
                </div>
                <div>
                  <span className="font-medium">Costo promedio:</span> Bs. {selectedProduct.costoPromedioPonderado.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Ubicación:</span> {selectedProduct.ubicacion}
                </div>
                <div>
                  <span className="font-medium">Último movimiento:</span> {selectedProduct.fechaUltimoMovimiento}
                </div>
              </div>
              
              {tipo === 'salida' && selectedProduct.stockActual <= selectedProduct.stockMinimo && (
                <div className="flex items-center gap-2 mt-3 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Stock bajo - Stock mínimo: {selectedProduct.stockMinimo}</span>
                </div>
              )}
            </div>
          )}

          {/* Datos del movimiento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cantidad *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={formData.cantidad || ""}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  cantidad: parseInt(e.target.value) || 0 
                }))}
                placeholder="Ingrese cantidad"
                disabled={saving}
              />
            </div>

            {tipo === 'entrada' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Costo Unitario (Bs.) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costoUnitario || ""}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    costoUnitario: parseFloat(e.target.value) || 0 
                  }))}
                  placeholder="Costo del producto"
                  disabled={saving}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Motivo</Label>
              <Input
                value={formData.motivo}
                onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                disabled={saving}
                placeholder={tipo === 'entrada' ? 'Ej: Compra, Ajuste' : 'Ej: Venta, Devolución'}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">N° Documento</Label>
              <Input
                value={formData.documento}
                onChange={(e) => setFormData(prev => ({ ...prev, documento: e.target.value }))}
                disabled={saving}
                placeholder="Ej: FAC-001, REC-002"
              />
            </div>
          </div>

          {/* Cálculos automáticos */}
          {selectedProduct && formData.cantidad > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Cálculos Automáticos
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Valor total del movimiento:</span>
                  <div className="text-lg font-bold text-green-700">
                    Bs. {calculatedValues.valorTotal.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Stock resultante:</span>
                  <div className="text-lg font-bold text-green-700">
                    {calculatedValues.nuevoStock} unidades
                  </div>
                </div>
                {tipo === 'entrada' && (
                  <div className="col-span-2">
                    <span className="font-medium">Nuevo costo promedio ponderado:</span>
                    <div className="text-lg font-bold text-green-700">
                      Bs. {calculatedValues.nuevoCostoPromedio.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={saving || !formData.productoId || formData.cantidad <= 0 || (tipo === 'entrada' && formData.costoUnitario <= 0)}
            >
              {saving ? "Guardando..." : `Registrar ${tipo === 'entrada' ? 'Entrada' : 'Salida'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryMovementDialog;
