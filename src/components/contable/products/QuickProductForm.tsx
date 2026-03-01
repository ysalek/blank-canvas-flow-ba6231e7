import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertCircle } from "lucide-react";
import { useSupabaseProductos } from "@/hooks/useSupabaseProductos";
import { Producto } from "./ProductsData";

interface QuickProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductCreated: (producto: Producto) => void;
}

const QuickProductForm = ({ open, onOpenChange, onProductCreated }: QuickProductFormProps) => {
  const { crearProducto, generarCodigoProducto, crearCategoria, categorias, refetch } = useSupabaseProductos();
  const [saving, setSaving] = useState(false);
  const [showNewCatDialog, setShowNewCatDialog] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    nombre: "",
    categoria_id: "",
    unidad_medida: "PZA",
    precio_venta: 0,
    costo_unitario: 0,
    stock_actual: 0,
  });

  const resetForm = () => {
    setForm({ nombre: "", categoria_id: "", unidad_medida: "PZA", precio_venta: 0, costo_unitario: 0, stock_actual: 0 });
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = "Requerido";
    if (!form.categoria_id) e.categoria_id = "Requerido";
    if (form.precio_venta <= 0) e.precio_venta = "Debe ser mayor a 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const codigo = generarCodigoProducto();
      const created = await crearProducto({
        codigo,
        nombre: form.nombre.trim(),
        descripcion: "",
        categoria_id: form.categoria_id || null,
        unidad_medida: form.unidad_medida,
        precio_venta: form.precio_venta,
        precio_compra: form.costo_unitario,
        costo_unitario: form.costo_unitario,
        stock_actual: form.stock_actual,
        stock_minimo: 0,
        codigo_sin: "00000000",
        activo: true,
      });

      if (created) {
        const cat = categorias.find(c => c.id === created.categoria_id);
        const productoConverted: Producto = {
          id: created.id,
          codigo: created.codigo,
          nombre: created.nombre,
          descripcion: created.descripcion || "",
          categoria: cat?.nombre || "",
          unidadMedida: created.unidad_medida,
          precioVenta: created.precio_venta,
          precioCompra: created.precio_compra,
          costoUnitario: created.costo_unitario,
          stockActual: created.stock_actual,
          stockMinimo: created.stock_minimo,
          codigoSIN: created.codigo_sin || "",
          activo: created.activo,
          fechaCreacion: created.created_at || new Date().toISOString(),
          fechaActualizacion: created.updated_at || new Date().toISOString(),
        };
        onProductCreated(productoConverted);
        resetForm();
        onOpenChange(false);
      }
    } catch {
      // toast handled by hook
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const cat = await crearCategoria({ nombre: newCatName.trim(), activo: true });
      await refetch();
      if (cat?.id) setForm(prev => ({ ...prev, categoria_id: cat.id }));
      setShowNewCatDialog(false);
      setNewCatName("");
    } catch {
      // handled
    } finally {
      setCreatingCat(false);
    }
  };

  const update = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Producto Rápido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Nombre *</Label>
            <Input value={form.nombre} onChange={e => update("nombre", e.target.value)} placeholder="Nombre del producto" className={errors.nombre ? "border-destructive" : ""} />
            {errors.nombre && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.nombre}</p>}
          </div>

          <div className="space-y-1">
            <Label>Categoría *</Label>
            <div className="flex gap-2">
              <Select value={form.categoria_id} onValueChange={v => update("categoria_id", v)}>
                <SelectTrigger className={`flex-1 ${errors.categoria_id ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" onClick={() => setShowNewCatDialog(true)}><Plus className="h-4 w-4" /></Button>
            </div>
            {errors.categoria_id && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.categoria_id}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Precio Venta (Bs.) *</Label>
              <Input type="number" value={form.precio_venta || ""} onChange={e => update("precio_venta", parseFloat(e.target.value) || 0)} min="0" step="0.01" className={errors.precio_venta ? "border-destructive" : ""} />
              {errors.precio_venta && <p className="text-xs text-destructive">{errors.precio_venta}</p>}
            </div>
            <div className="space-y-1">
              <Label>Costo Unitario (Bs.)</Label>
              <Input type="number" value={form.costo_unitario || ""} onChange={e => update("costo_unitario", parseFloat(e.target.value) || 0)} min="0" step="0.01" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Unidad</Label>
              <Select value={form.unidad_medida} onValueChange={v => update("unidad_medida", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PZA">Pieza</SelectItem>
                  <SelectItem value="KG">Kilogramo</SelectItem>
                  <SelectItem value="LT">Litro</SelectItem>
                  <SelectItem value="MT">Metro</SelectItem>
                  <SelectItem value="HR">Hora</SelectItem>
                  <SelectItem value="SRV">Servicio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Stock Inicial</Label>
              <Input type="number" value={form.stock_actual || ""} onChange={e => update("stock_actual", parseInt(e.target.value) || 0)} min="0" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Creando..." : "Crear Producto"}</Button>
        </DialogFooter>
      </DialogContent>

      {/* Inline category creation */}
      <Dialog open={showNewCatDialog} onOpenChange={setShowNewCatDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nueva Categoría</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nombre" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewCatDialog(false); setNewCatName(""); }}>Cancelar</Button>
            <Button onClick={handleCreateCategory} disabled={!newCatName.trim() || creatingCat}>{creatingCat ? "Creando..." : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default QuickProductForm;
