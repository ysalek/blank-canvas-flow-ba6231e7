
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Cliente, ItemFactura, Factura, calcularIVA, calcularTotal, generarNumeroFactura, generarCUF, obtenerCUFD, puntosVenta, PuntoVenta } from "./BillingData";
import { Producto } from "../products/ProductsData";
import InvoiceClientSelector from "./InvoiceClientSelector";
import InvoiceItems from "./InvoiceItems";
import InvoiceTotals from "./InvoiceTotals";
import InvoiceActions from "./InvoiceActions";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import InvoicePreview from "./InvoicePreview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QuickProductForm from "../products/QuickProductForm";

interface InvoiceFormProps {
  clientes: Cliente[];
  productos: Producto[];
  facturas: Factura[];
  onSave: (factura: Factura) => void;
  onCancel: () => void;
  onAddNewClient: (cliente: Cliente) => void;
  onProductCreated?: (producto: Producto) => void;
}

const InvoiceForm = ({ clientes, productos, facturas, onSave, onCancel, onAddNewClient, onProductCreated }: InvoiceFormProps) => {
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [items, setItems] = useState<ItemFactura[]>([
    {
      id: Date.now().toString(),
      productoId: "",
      codigo: "",
      descripcion: "",
      cantidad: 1,
      precioUnitario: 0,
      descuento: 0,
      subtotal: 0,
      codigoSIN: ""
    }
  ]);
  const [observaciones, setObservaciones] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [previewingInvoice, setPreviewingInvoice] = useState<Factura | null>(null);
  const [selectedPuntoVenta, setSelectedPuntoVenta] = useState<PuntoVenta>(puntosVenta[0]);
  const [showQuickProductForm, setShowQuickProductForm] = useState(false);
  const [quickProductTargetIndex, setQuickProductTargetIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!selectedCliente) newErrors.cliente = "Debe seleccionar un cliente";
    if (items.some(item => !item.descripcion.trim())) {
      newErrors.items = "Todos los ítems deben tener descripción";
    }
    if (items.some(item => item.cantidad <= 0 || item.precioUnitario <= 0)) {
        newErrors.items = "Cantidad y Precio Unitario deben ser mayores a 0.";
    }
    
    // CRITICAL: Validar stock disponible para evitar ventas sin inventario
    for (const item of items) {
      if (item.productoId) {
        const producto = productos.find(p => p.id === item.productoId);
        // Los productos ya están convertidos correctamente por FacturacionModule
        const stockDisponible = Number(producto?.stockActual || 0);
        console.log(`🔍 Validando stock para ${producto?.nombre}: Stock disponible: ${stockDisponible}, Solicitado: ${item.cantidad}`);
        if (producto && stockDisponible < item.cantidad) {
          newErrors.stock = `Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible}, Solicitado: ${item.cantidad}`;
          break;
        }
      }
    }
    
    if (calculateSubtotal() <= 0) {
      newErrors.total = "El total debe ser mayor a 0";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addItem = () => {
    const newItem: ItemFactura = {
      id: Date.now().toString(),
      productoId: "",
      codigo: "",
      descripcion: "",
      cantidad: 1,
      precioUnitario: 0,
      descuento: 0,
      subtotal: 0,
      codigoSIN: ""
    };
    setItems(prev => [...prev, newItem]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems(prev => {
      const newItems = [...prev];
      
      if (field === 'productoId' && value) {
        const producto = productos.find(p => p.id === value);
        if (producto) {
          newItems[index] = {
            ...newItems[index],
            productoId: value,
            codigo: producto.codigo,
            descripcion: producto.nombre,
            precioUnitario: producto.precioVenta,
            codigoSIN: producto.codigoSIN,
            subtotal: newItems[index].cantidad * producto.precioVenta - newItems[index].descuento
          };
        }
      } else {
        newItems[index] = { ...newItems[index], [field]: value };
        
        if (field === 'cantidad' || field === 'precioUnitario' || field === 'descuento') {
          const cantidad = field === 'cantidad' ? value : newItems[index].cantidad;
          const precio = field === 'precioUnitario' ? value : newItems[index].precioUnitario;
          const descuento = field === 'descuento' ? value : newItems[index].descuento;
          newItems[index].subtotal = (cantidad * precio) - descuento;
        }
      }
      
      return newItems;
    });
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((total, item) => total + item.subtotal, 0);
  };

  const calculateDiscountTotal = () => {
    return items.reduce((total, item) => total + item.descuento, 0);
  };

  // Función para obtener fecha local exacta (YYYY-MM-DD)
  const obtenerFechaLocal = () => {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  const createInvoiceObject = (): Factura => {
    const subtotal = calculateSubtotal();
    const descuentoTotal = calculateDiscountTotal();
    const totalConDescuento = subtotal - descuentoTotal;
    // El total mostrado al cliente es exactamente lo que paga (ya incluye IVA)
    const total = totalConDescuento;
    // Para efectos contables internos, calculamos cuánto IVA está incluido
    const iva = calcularIVA(totalConDescuento);

    const numeros = facturas.map(f => parseInt(f.numero)).filter(n => !isNaN(n));
    const ultimoNumero = numeros.length > 0 ? Math.max(...numeros) : 0;
    const numeroFactura = generarNumeroFactura(ultimoNumero.toString());

    const cufd = obtenerCUFD(selectedPuntoVenta.codigo);

    // Data for CUF generation, mostly mocked for simulation
    const cufData = {
      nitEmisor: "123456789", // Mock NIT emisor from company data
      fechaHora: new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 17),
      sucursal: "0", // Mock sucursal (0 for Casa Matriz)
      modalidad: "1", // 1 for Electronica en linea
      tipoEmision: "1", // 1 for Online
      tipoFactura: "1", // 1 for Con derecho a credito fiscal
      tipoDocumentoSector: "1", // 1 for Factura Estandar
      numeroFactura: numeroFactura,
      pos: selectedPuntoVenta.codigo.toString(),
    };

    return {
      id: Date.now().toString(),
      numero: numeroFactura,
      cliente: selectedCliente!,
      fecha: obtenerFechaLocal(), // Fecha actual precisa
      fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      items: items.filter(item => item.descripcion.trim()),
      subtotal,
      descuentoTotal,
      iva,
      total,
      estado: 'enviada',
      estadoSIN: 'pendiente',
      cuf: generarCUF(cufData, cufd),
      cufd,
      puntoVenta: selectedPuntoVenta.codigo,
      codigoControl: `${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 90) + 10}`,
      observaciones,
      fechaCreacion: obtenerFechaLocal() // Fecha actual precisa
    };
  }

  const handlePreview = () => {
    if (!validateForm()) {
      toast({
        title: "Error en la validación",
        description: "Por favor corrija los errores para ver la vista previa.",
        variant: "destructive"
      });
      return;
    }
    const tempInvoice = createInvoiceObject();
    tempInvoice.numero = 'BORRADOR';
    setPreviewingInvoice(tempInvoice);
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast({
        title: "Error en la validación",
        description: "Por favor corrija los errores en el formulario.",
        variant: "destructive"
      });
      return;
    }

    try {
      const nuevaFactura = createInvoiceObject();
      onSave(nuevaFactura);

      toast({
        title: "Factura guardada",
        description: `La Factura N° ${nuevaFactura.numero} ha sido guardada y está lista para ser procesada.`,
      });
    } catch (error) {
      console.error("Error al crear la factura:", error);
      toast({
        title: "Error al crear la factura",
        description: "Ocurrió un error inesperado. Por favor intente nuevamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Nueva Factura</CardTitle>
              <CardDescription>
                Crear factura electrónica para envío al SIN
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel} className="text-muted-foreground hover:bg-muted">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <InvoiceClientSelector
              clientes={clientes}
              selectedCliente={selectedCliente}
              onSelectCliente={setSelectedCliente}
              onAddNewClient={onAddNewClient}
              error={errors.cliente}
            />
            <div className="space-y-2">
              <Label htmlFor="punto-venta">Punto de Venta</Label>
              <Select 
                onValueChange={(value) => setSelectedPuntoVenta(puntosVenta.find(p => p.codigo === parseInt(value))!)} 
                defaultValue={selectedPuntoVenta.codigo.toString()}
              >
                <SelectTrigger id="punto-venta">
                  <SelectValue placeholder="Seleccione un punto de venta" />
                </SelectTrigger>
                <SelectContent>
                  {puntosVenta.map(pv => (
                    <SelectItem key={pv.codigo} value={pv.codigo.toString()}>{pv.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <InvoiceItems
            items={items}
            productos={productos}
            updateItem={updateItem}
            addItem={addItem}
            removeItem={removeItem}
            error={errors.items}
            onCreateProduct={(index) => { setQuickProductTargetIndex(index); setShowQuickProductForm(true); }}
          />

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Observaciones adicionales"
            />
          </div>

          <InvoiceTotals
            subtotal={calculateSubtotal()}
            discountTotal={calculateDiscountTotal()}
            error={errors.total || errors.stock}
          />

          <InvoiceActions
            onPreview={handlePreview}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
      
      {previewingInvoice && (
        <Dialog open={!!previewingInvoice} onOpenChange={(open) => !open && setPreviewingInvoice(null)}>
          <DialogContent className="max-w-4xl p-0">
            <div className="p-6">
              <InvoicePreview invoice={previewingInvoice} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <QuickProductForm
        open={showQuickProductForm}
        onOpenChange={setShowQuickProductForm}
        onProductCreated={(producto) => {
          if (quickProductTargetIndex !== null) {
            updateItem(quickProductTargetIndex, 'productoId', producto.id);
          }
          setQuickProductTargetIndex(null);
          onProductCreated?.(producto);
        }}
      />
    </>
  );
};

export default InvoiceForm;
