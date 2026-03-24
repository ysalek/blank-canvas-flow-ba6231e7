import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, ChevronDown, ImagePlus, Link2, Package, Plus, Save, Trash2, UploadCloud, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CategoriaProductoSupabase, ProductoSupabase, useSupabaseProductos } from "@/hooks/useSupabaseProductos";
import { useSupabaseProveedores } from "@/hooks/useSupabaseProveedores";
import ProveedorSearchCombobox from "../purchases/ProveedorSearchCombobox";
import ProveedorForm from "../purchases/ProveedorForm";
import { Proveedor } from "../purchases/PurchasesData";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ProductThumbnail from "./ProductThumbnail";

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

interface ProductoFormProps {
  producto?: ProductoSupabase | null;
  productos: ProductoSupabase[];
  categorias: CategoriaProductoSupabase[];
  onSave: () => Promise<void>;
  onCancel: () => void;
}

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 4 * 1024 * 1024;

const ProductoForm = ({ producto, productos, onSave, onCancel }: ProductoFormProps) => {
  const {
    crearProducto,
    actualizarProducto,
    generarCodigoProducto,
    crearCategoria,
    categorias: categoriasHook,
    refetch,
    subirImagenProducto,
    eliminarImagenProducto,
  } = useSupabaseProductos();
  const { proveedores: proveedoresDB } = useSupabaseProveedores();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [showNewCatDialog, setShowNewCatDialog] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [selectedProveedorId, setSelectedProveedorId] = useState("");
  const [showProveedorForm, setShowProveedorForm] = useState(false);
  const [proveedorOpen, setProveedorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('url');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    categoria_id: "",
    unidad_medida: "PZA",
    precio_venta: 0,
    precio_compra: 0,
    costo_unitario: 0,
    stock_actual: 0,
    stock_minimo: 0,
    codigo_sin: "",
    imagen_url: "",
    activo: true
  });

  useEffect(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (producto) {
      setFormData({
        codigo: producto.codigo,
        nombre: producto.nombre,
        descripcion: producto.descripcion || "",
        categoria_id: producto.categoria_id || "",
        unidad_medida: producto.unidad_medida || "PZA",
        precio_venta: producto.precio_venta,
        precio_compra: producto.precio_compra,
        costo_unitario: producto.costo_unitario,
        stock_actual: producto.stock_actual,
        stock_minimo: producto.stock_minimo,
        codigo_sin: producto.codigo_sin || "",
        imagen_url: producto.imagen_url || "",
        activo: producto.activo
      });
      setImageMode(producto.imagen_storage_path ? 'upload' : 'url');
      setImagePreviewUrl(producto.imagen_url || "");
    } else {
      setFormData({
        codigo: generarCodigoProducto(),
        nombre: "",
        descripcion: "",
        categoria_id: "",
        unidad_medida: "PZA",
        precio_venta: 0,
        precio_compra: 0,
        costo_unitario: 0,
        stock_actual: 0,
        stock_minimo: 0,
        codigo_sin: "",
        imagen_url: "",
        activo: true
      });
      setImageMode('url');
      setImagePreviewUrl("");
    }

    setSelectedImageFile(null);
    setRemoveExistingImage(false);
  }, [producto, generarCodigoProducto]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.codigo.trim()) {
      newErrors.codigo = "El codigo es requerido";
    } else if (formData.codigo.length < 3) {
      newErrors.codigo = "El codigo debe tener al menos 3 caracteres";
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido";
    } else if (formData.nombre.length < 2) {
      newErrors.nombre = "El nombre debe tener al menos 2 caracteres";
    }

    if (!formData.categoria_id.trim()) {
      newErrors.categoria_id = "La categoria es requerida";
    }

    if (formData.precio_venta <= 0) {
      newErrors.precio_venta = "El precio de venta debe ser mayor a 0";
    }

    if (formData.stock_minimo < 0) {
      newErrors.stock_minimo = "El stock minimo no puede ser negativo";
    }

    if (formData.stock_actual < 0) {
      newErrors.stock_actual = "El stock actual no puede ser negativo";
    }

    if (!producto) {
      const codigoExiste = productos.some((item) => item.codigo.toLowerCase() === formData.codigo.toLowerCase().trim());
      if (codigoExiste) {
        newErrors.codigo = "Este codigo ya existe en otro producto";
      }
    }

    if (imageMode === 'url' && formData.imagen_url.trim()) {
      try {
        new URL(formData.imagen_url.trim());
      } catch {
        newErrors.imagen_url = "La URL de imagen no es valida";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageFile = (file?: File | null) => {
    if (!file) return;

    if (!VALID_TYPES.includes(file.type)) {
      toast({
        title: "Formato no permitido",
        description: "Usa una imagen JPG, PNG o WEBP.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > MAX_SIZE) {
      toast({
        title: "Imagen demasiado grande",
        description: "La imagen no debe superar los 4 MB.",
        variant: "destructive"
      });
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const localUrl = URL.createObjectURL(file);
    previewUrlRef.current = localUrl;
    setSelectedImageFile(file);
    setImagePreviewUrl(localUrl);
    setImageMode('upload');
    setRemoveExistingImage(false);
  };

  const handleRemoveImage = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setSelectedImageFile(null);
    setImagePreviewUrl("");
    handleInputChange("imagen_url", "");
    setRemoveExistingImage(true);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Revision pendiente",
        description: "Corrige los campos marcados para continuar.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    let uploadedPath: string | null = null;

    try {
      let imagenUrl = formData.imagen_url.trim() || undefined;
      let imagenStoragePath = producto?.imagen_storage_path ?? null;

      if (selectedImageFile) {
        const uploadedImage = await subirImagenProducto(selectedImageFile, producto?.imagen_storage_path);
        imagenUrl = uploadedImage.publicUrl;
        imagenStoragePath = uploadedImage.path;
        uploadedPath = uploadedImage.path;
      } else if (imageMode === 'url') {
        if (removeExistingImage && producto?.imagen_storage_path) {
          await eliminarImagenProducto(producto.imagen_storage_path);
        }
        imagenStoragePath = null;
        imagenUrl = formData.imagen_url.trim() || undefined;
      } else if (removeExistingImage) {
        if (producto?.imagen_storage_path) {
          await eliminarImagenProducto(producto.imagen_storage_path);
        }
        imagenStoragePath = null;
        imagenUrl = undefined;
      }

      const productoData = {
        codigo: formData.codigo.trim(),
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        categoria_id: formData.categoria_id || null,
        unidad_medida: formData.unidad_medida,
        precio_venta: Number(formData.precio_venta),
        precio_compra: Number(formData.precio_compra),
        costo_unitario: Number(formData.costo_unitario),
        stock_actual: Number(formData.stock_actual),
        stock_minimo: Number(formData.stock_minimo),
        codigo_sin: formData.codigo_sin.trim() || "00000000",
        imagen_url: imagenUrl,
        imagen_storage_path: imagenStoragePath,
        activo: formData.activo
      };

      if (producto) {
        await actualizarProducto(producto.id, productoData);
      } else {
        await crearProducto(productoData);
      }

      await onSave();
    } catch (error: unknown) {
      if (uploadedPath) {
        try {
          await eliminarImagenProducto(uploadedPath);
        } catch {
          // Ignorar limpieza secundaria
        }
      }
      toast({
        title: "Error al guardar",
        description: getErrorMessage(error) || "Ocurrio un error inesperado",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const imagePreview = imageMode === 'upload'
    ? imagePreviewUrl || producto?.imagen_url || ""
    : formData.imagen_url.trim() || (removeExistingImage ? "" : producto?.imagen_url || "");

  return (
    <Card className="card-modern rounded-[2rem]">
      <CardHeader className="border-b border-border/70 pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <span className="feature-chip">
              <Package className="h-3.5 w-3.5 text-primary" />
              Catalogo comercial
            </span>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                {producto ? "Editar producto" : "Nuevo producto"}
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl text-sm leading-6">
                Registra una ficha de producto con datos contables, comerciales e imagen principal para POS, catalogo e inventario.
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} className="rounded-2xl" disabled={saving}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="btn-gradient rounded-2xl text-white">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : producto ? "Actualizar producto" : "Crear producto"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 p-6">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codigo">Codigo *</Label>
                <Input id="codigo" value={formData.codigo} onChange={(e) => handleInputChange("codigo", e.target.value)} placeholder="Codigo del producto" className={`executive-input ${errors.codigo ? "border-destructive" : ""}`} />
                {errors.codigo && <p className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{errors.codigo}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => handleInputChange("nombre", e.target.value)} placeholder="Nombre del producto" className={`executive-input ${errors.nombre ? "border-destructive" : ""}`} />
                {errors.nombre && <p className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{errors.nombre}</p>}
              </div>

              <div className="space-y-2">
                <Label>Categoria *</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={formData.categoria_id} onValueChange={(value) => handleInputChange("categoria_id", value)} disabled={saving || creatingCat}>
                      <SelectTrigger className={`executive-input ${errors.categoria_id ? "border-destructive" : ""}`}>
                        <SelectValue placeholder="Seleccionar categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriasHook.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowNewCatDialog(true)} title="Crear categoria" className="rounded-2xl" disabled={saving || creatingCat}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {errors.categoria_id && <p className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{errors.categoria_id}</p>}
              </div>

              <div className="space-y-2">
                <Label>Unidad de medida</Label>
                <Select value={formData.unidad_medida} onValueChange={(value) => handleInputChange("unidad_medida", value)}>
                  <SelectTrigger className="executive-input">
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PZA">Pieza (PZA)</SelectItem>
                    <SelectItem value="KG">Kilogramo (KG)</SelectItem>
                    <SelectItem value="LT">Litro (LT)</SelectItem>
                    <SelectItem value="MT">Metro (MT)</SelectItem>
                    <SelectItem value="HR">Hora (HR)</SelectItem>
                    <SelectItem value="SRV">Servicio (SRV)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="precio_venta">Precio de venta (Bs.) *</Label>
                <Input id="precio_venta" type="number" value={formData.precio_venta || ''} onChange={(e) => handleInputChange("precio_venta", parseFloat(e.target.value) || 0)} placeholder="0.00" min="0" step="0.01" className={`executive-input ${errors.precio_venta ? "border-destructive" : ""}`} />
                {errors.precio_venta && <p className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{errors.precio_venta}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="precio_compra">Precio de compra (Bs.)</Label>
                <Input id="precio_compra" type="number" value={formData.precio_compra || ''} onChange={(e) => handleInputChange("precio_compra", parseFloat(e.target.value) || 0)} placeholder="0.00" min="0" step="0.01" className="executive-input" />
                <p className="text-xs text-muted-foreground">Precio pagado al proveedor, sin costos accesorios.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="costo_unitario">Costo unitario real (Bs.) *</Label>
                <Input id="costo_unitario" type="number" value={formData.costo_unitario || ''} onChange={(e) => handleInputChange("costo_unitario", parseFloat(e.target.value) || 0)} placeholder="0.00" min="0" step="0.01" className="executive-input" />
                <p className="text-xs text-muted-foreground">Incluye compra, flete, aranceles y otros costos asociados.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_actual">Stock actual</Label>
                <Input id="stock_actual" type="number" value={formData.stock_actual || ''} onChange={(e) => handleInputChange("stock_actual", parseInt(e.target.value) || 0)} placeholder="Stock inicial" min="0" className="executive-input" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_minimo">Stock minimo</Label>
                <Input id="stock_minimo" type="number" value={formData.stock_minimo || ''} onChange={(e) => handleInputChange("stock_minimo", parseInt(e.target.value) || 0)} placeholder="Stock minimo" min="0" className={`executive-input ${errors.stock_minimo ? "border-destructive" : ""}`} />
                {errors.stock_minimo && <p className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{errors.stock_minimo}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigo_sin">Codigo SIN</Label>
                <Input id="codigo_sin" value={formData.codigo_sin} onChange={(e) => handleInputChange("codigo_sin", e.target.value)} placeholder="Codigo del SIN" className="executive-input" />
              </div>

              {producto && (
                <div className="space-y-2">
                  <Label>Estado del producto</Label>
                  <Select value={formData.activo ? 'true' : 'false'} onValueChange={(value) => handleInputChange("activo", value === 'true')}>
                    <SelectTrigger className="executive-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Activo</SelectItem>
                      <SelectItem value="false">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripcion</Label>
              <Textarea id="descripcion" value={formData.descripcion} onChange={(e) => handleInputChange("descripcion", e.target.value)} placeholder="Descripcion comercial, tecnica o logistica del producto" className="executive-input min-h-[120px]" />
            </div>

            <Collapsible open={proveedorOpen} onOpenChange={setProveedorOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" type="button" className="w-full justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 hover:bg-muted/35">
                  <span className="text-sm font-medium">Proveedor principal (opcional)</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${proveedorOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <ProveedorSearchCombobox
                      proveedores={proveedoresDB.map((p) => ({
                        id: p.id,
                        nombre: p.nombre,
                        nit: p.nit,
                        email: p.email || "",
                        telefono: p.telefono,
                        direccion: p.direccion,
                        activo: p.activo,
                        fechaCreacion: p.created_at || "",
                      }))}
                      value={selectedProveedorId}
                      onValueChange={setSelectedProveedorId}
                      placeholder="Buscar proveedor..."
                    />
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowProveedorForm(true)} title="Crear proveedor" className="rounded-2xl" disabled={saving}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Puedes dejar preparado el proveedor principal aunque esta fase no lo persista como relacion formal.</p>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="space-y-5">
            <Card className="surface-panel rounded-[1.75rem]">
              <CardHeader>
                <CardTitle className="text-lg">Imagen principal del producto</CardTitle>
                <CardDescription>Sube un archivo al storage del sistema o usa una URL externa como alternativa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={imageMode === 'upload' ? 'default' : 'outline'} className="rounded-2xl" onClick={() => { setImageMode('upload'); setRemoveExistingImage(false); }}>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Subir archivo
                  </Button>
                  <Button type="button" variant={imageMode === 'url' ? 'default' : 'outline'} className="rounded-2xl" onClick={() => { setImageMode('url'); if (producto?.imagen_storage_path) setRemoveExistingImage(true); }}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Usar URL
                  </Button>
                </div>

                <div className="rounded-[1.75rem] border border-border/70 bg-white/70 p-4">
                  <div className="mb-4 flex justify-center">
                    <ProductThumbnail imageUrl={imagePreview} name={formData.nombre || "Producto"} className="h-52 w-full max-w-xs" iconClassName="h-10 w-10" roundedClassName="rounded-[1.5rem]" />
                  </div>

                  {imageMode === 'upload' ? (
                    <div
                      className="dropzone-shell"
                      data-active={isDragActive ? "true" : "false"}
                      onDragOver={(event) => { event.preventDefault(); setIsDragActive(true); }}
                      onDragLeave={() => setIsDragActive(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setIsDragActive(false);
                        handleImageFile(event.dataTransfer.files?.[0]);
                      }}
                    >
                      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => handleImageFile(event.target.files?.[0])} />
                      <div className="space-y-3 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                          <ImagePlus className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Arrastra una imagen aqui o selecciona un archivo</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">JPG, PNG o WEBP. Tamano maximo: 4 MB.</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button type="button" variant="outline" className="rounded-2xl" onClick={() => fileInputRef.current?.click()}>
                            <UploadCloud className="mr-2 h-4 w-4" />
                            Elegir archivo
                          </Button>
                          {(selectedImageFile || imagePreview) && (
                            <Button type="button" variant="ghost" className="rounded-2xl text-destructive hover:text-destructive" onClick={handleRemoveImage}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Quitar imagen
                            </Button>
                          )}
                        </div>
                        {selectedImageFile && (
                          <p className="text-xs text-muted-foreground">Archivo listo para guardar: <span className="font-medium text-foreground">{selectedImageFile.name}</span></p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="imagen_url">URL de imagen</Label>
                      <Input id="imagen_url" value={formData.imagen_url} onChange={(e) => { handleInputChange("imagen_url", e.target.value); setImagePreviewUrl(e.target.value); setRemoveExistingImage(false); }} placeholder="https://.../imagen-del-producto.jpg" className={`executive-input ${errors.imagen_url ? "border-destructive" : ""}`} />
                      {errors.imagen_url && <p className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{errors.imagen_url}</p>}
                      <p className="text-xs leading-5 text-muted-foreground">Ideal si tu equipo ya gestiona imagenes desde un catalogo externo o CDN.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="surface-panel rounded-[1.75rem]">
              <CardHeader>
                <CardTitle className="text-lg">Resumen rapido</CardTitle>
                <CardDescription>Como se vera el producto dentro del sistema comercial.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-[1.5rem] border border-border/70 bg-white/75 p-4">
                  <div className="flex items-start gap-4">
                    <ProductThumbnail imageUrl={imagePreview} name={formData.nombre || "Producto"} className="h-20 w-20 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-foreground">{formData.nombre || "Nuevo producto"}</p>
                        <span className="status-pill">{formData.codigo || "SIN-CODIGO"}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{formData.descripcion || "Agrega una descripcion util para ventas, inventario y operacion interna."}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Precio</p>
                          <p className="font-semibold text-foreground">Bs. {Number(formData.precio_venta || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Stock</p>
                          <p className="font-semibold text-foreground">{Number(formData.stock_actual || 0)} {formData.unidad_medida}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>

      <Dialog
        open={showNewCatDialog}
        onOpenChange={(value) => {
          if (creatingCat && !value) return;
          setShowNewCatDialog(value);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-cat-name">Nombre *</Label>
              <Input id="new-cat-name" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nombre de la categoria" className="executive-input" disabled={creatingCat} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-cat-desc">Descripcion</Label>
              <Input id="new-cat-desc" value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} placeholder="Descripcion opcional" className="executive-input" disabled={creatingCat} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewCatDialog(false); setNewCatName(""); setNewCatDesc(""); }} disabled={creatingCat}>
              Cancelar
            </Button>
            <Button
              disabled={!newCatName.trim() || creatingCat}
              onClick={async () => {
                setCreatingCat(true);
                try {
                  const nuevaCat = await crearCategoria({
                    nombre: newCatName.trim(),
                    descripcion: newCatDesc.trim() || undefined,
                    activo: true,
                  });
                  await refetch();
                  if (nuevaCat?.id) {
                    handleInputChange("categoria_id", nuevaCat.id);
                  }
                  setShowNewCatDialog(false);
                  setNewCatName("");
                  setNewCatDesc("");
                } finally {
                  setCreatingCat(false);
                }
              }}
            >
              {creatingCat ? "Creando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProveedorForm
        open={showProveedorForm}
        onOpenChange={setShowProveedorForm}
        onSave={async (proveedor: Proveedor) => {
          setSelectedProveedorId(proveedor.id);
        }}
      />
    </Card>
  );
};

export default ProductoForm;
