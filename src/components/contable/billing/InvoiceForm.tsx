import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Cliente,
  ItemFactura,
  Factura,
  calcularIVA,
  generarNumeroFactura,
  puntosVenta,
  prepararFacturaTributaria,
  PuntoVenta,
  validarNITBoliviano
} from "./BillingData";
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
  onSave: (factura: Factura) => Promise<void>;
  onCancel: () => void;
  onAddNewClient: (cliente: Cliente) => Promise<void> | void;
  onProductCreated?: (producto: Producto) => void;
  saving?: boolean;
}

const InvoiceForm = ({
  clientes,
  productos,
  facturas,
  onSave,
  onCancel,
  onAddNewClient,
  onProductCreated,
  saving = false,
}: InvoiceFormProps) => {
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

    if (!selectedCliente) {
      newErrors.cliente = "Debe seleccionar un cliente";
    } else if (!validarNITBoliviano(selectedCliente.nit).valido) {
      newErrors.cliente = "El NIT del cliente no supera la validacion boliviana";
    }

    if (items.some((item) => !item.descripcion.trim())) {
      newErrors.items = "Todos los items deben tener descripcion";
    }

    if (items.some((item) => item.cantidad <= 0 || item.precioUnitario <= 0)) {
      newErrors.items = "Cantidad y precio unitario deben ser mayores a 0.";
    }

    for (const item of items) {
      if (item.productoId) {
        const producto = productos.find((p) => p.id === item.productoId);
        const stockDisponible = Number(producto?.stockActual || 0);
        if (producto && stockDisponible < item.cantidad) {
          newErrors.stock = `Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible}, solicitado: ${item.cantidad}`;
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
    setItems((prev) => [...prev, newItem]);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setItems((prev) => {
      const newItems = [...prev];

      if (field === "productoId" && value) {
        const producto = productos.find((p) => p.id === value);
        if (producto) {
          newItems[index] = {
            ...newItems[index],
            productoId: String(value),
            codigo: producto.codigo,
            descripcion: producto.nombre,
            precioUnitario: producto.precioVenta,
            codigoSIN: producto.codigoSIN,
            subtotal: newItems[index].cantidad * producto.precioVenta - newItems[index].descuento
          };
        }
      } else {
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === "cantidad" || field === "precioUnitario" || field === "descuento") {
          const cantidad = field === "cantidad" ? Number(value) : newItems[index].cantidad;
          const precio = field === "precioUnitario" ? Number(value) : newItems[index].precioUnitario;
          const descuento = field === "descuento" ? Number(value) : newItems[index].descuento;
          newItems[index].subtotal = (cantidad * precio) - descuento;
        }
      }

      return newItems;
    });
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    }
  };

  const calculateSubtotal = () => items.reduce((total, item) => total + item.subtotal, 0);

  const calculateDiscountTotal = () => items.reduce((total, item) => total + item.descuento, 0);

  const obtenerFechaLocal = () => {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const createInvoiceObject = (): Factura => {
    const subtotal = calculateSubtotal();
    const descuentoTotal = calculateDiscountTotal();
    const totalConDescuento = subtotal - descuentoTotal;
    const total = totalConDescuento;
    const iva = calcularIVA(totalConDescuento);

    const numeros = facturas.map((factura) => parseInt(factura.numero)).filter((numero) => !isNaN(numero));
    const ultimoNumero = numeros.length > 0 ? Math.max(...numeros) : 0;
    const numeroFactura = generarNumeroFactura(ultimoNumero.toString());
    const fechaLocal = obtenerFechaLocal();
    const itemsValidos = items.filter((item) => item.descripcion.trim());

    return prepararFacturaTributaria({
      id: Date.now().toString(),
      numero: numeroFactura,
      cliente: selectedCliente!,
      fecha: fechaLocal,
      fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      items: itemsValidos,
      subtotal,
      descuentoTotal,
      iva,
      total,
      puntoVenta: selectedPuntoVenta.codigo,
      observaciones,
      tipoDocumentoSector: itemsValidos.find((item) => item.codigoSIN)?.codigoSIN || "1",
      fechaCreacion: fechaLocal,
    });
  };

  const handlePreview = () => {
    if (!validateForm()) {
      toast({
        title: "Error en la validacion",
        description: "Por favor corrija los errores para ver la vista previa.",
        variant: "destructive"
      });
      return;
    }

    const tempInvoice = createInvoiceObject();
    tempInvoice.numero = "BORRADOR";
    setPreviewingInvoice(tempInvoice);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Error en la validacion",
        description: "Por favor corrija los errores en el formulario.",
        variant: "destructive"
      });
      return;
    }

    try {
      const nuevaFactura = createInvoiceObject();
      await onSave(nuevaFactura);
    } catch (error) {
      console.error("Error al crear la factura:", error);
      toast({
        title: "Error al crear la factura",
        description: "Ocurrio un error inesperado. Por favor intente nuevamente.",
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
                Crear factura electronica para validacion operativa y registro comercial.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              disabled={saving}
              className="text-muted-foreground hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <InvoiceClientSelector
              clientes={clientes}
              selectedCliente={selectedCliente}
              onSelectCliente={setSelectedCliente}
              onAddNewClient={onAddNewClient}
              error={errors.cliente}
              disabled={saving}
            />
            <div className="space-y-2">
              <Label htmlFor="punto-venta">Punto de Venta</Label>
              <Select
                disabled={saving}
                onValueChange={(value) => setSelectedPuntoVenta(puntosVenta.find((punto) => punto.codigo === parseInt(value, 10)) || puntosVenta[0])}
                defaultValue={selectedPuntoVenta.codigo.toString()}
              >
                <SelectTrigger id="punto-venta">
                  <SelectValue placeholder="Seleccione un punto de venta" />
                </SelectTrigger>
                <SelectContent>
                  {puntosVenta.map((puntoVenta) => (
                    <SelectItem key={puntoVenta.codigo} value={puntoVenta.codigo.toString()}>
                      {puntoVenta.nombre}
                    </SelectItem>
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
            onCreateProduct={(index) => {
              if (saving) return;
              setQuickProductTargetIndex(index);
              setShowQuickProductForm(true);
            }}
            disabled={saving}
          />

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
              placeholder="Observaciones adicionales"
              disabled={saving}
            />
          </div>

          <InvoiceTotals
            subtotal={calculateSubtotal()}
            discountTotal={calculateDiscountTotal()}
            error={errors.total || errors.stock}
          />

          <InvoiceActions
            onPreview={handlePreview}
            onSubmit={() => void handleSubmit()}
            disabled={saving}
            submitLabel={saving ? "Guardando..." : "Crear Factura"}
          />
        </CardContent>
      </Card>

      {previewingInvoice && (
        <Dialog
          open={Boolean(previewingInvoice)}
          onOpenChange={(open) => !open && !saving && setPreviewingInvoice(null)}
        >
          <DialogContent className="max-w-4xl p-0">
            <div className="p-6">
              <InvoicePreview invoice={previewingInvoice} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <QuickProductForm
        open={showQuickProductForm}
        onOpenChange={(open) => {
          if (!saving) {
            setShowQuickProductForm(open);
          }
        }}
        onProductCreated={(producto) => {
          if (quickProductTargetIndex !== null) {
            updateItem(quickProductTargetIndex, "productoId", producto.id);
          }
          setQuickProductTargetIndex(null);
          onProductCreated?.(producto);
        }}
      />
    </>
  );
};

export default InvoiceForm;
