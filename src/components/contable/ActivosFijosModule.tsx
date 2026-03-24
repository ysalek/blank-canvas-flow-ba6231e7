import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { useSupabaseActivosFijos } from "@/hooks/useSupabaseActivosFijos";
import { Building, Plus, Calculator, TrendingDown, FileText, Wrench } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { EnhancedHeader, EnhancedMetricCard, MetricGrid } from "./dashboard/EnhancedLayout";

type ActivoFijo = Database['public']['Tables']['activos_fijos']['Row'];
type DepreciacionActivo = Database['public']['Tables']['depreciaciones_activos']['Row'];
type NuevoActivoFormData = {
  codigo: string;
  descripcion: string;
  categoria: string;
  fechaAdquisicion: string;
  costoAdquisicion: number;
  vidaUtilAnios: number;
  valorResidual: number;
  metodoDepreciacion: string;
  ubicacion: string;
  estado: string;
};

const categoriasActivos = [
  { value: 'edificios', label: 'Edificios y Construcciones', vidaUtil: 40, coeficiente: 2.5 },
  { value: 'maquinaria', label: 'Maquinaria y Equipo Industrial', vidaUtil: 8, coeficiente: 12.5 },
  { value: 'vehiculos', label: 'VehÃ­culos de Transporte', vidaUtil: 5, coeficiente: 20 },
  { value: 'muebles', label: 'Muebles y Enseres', vidaUtil: 10, coeficiente: 10 },
  { value: 'equipos_computo', label: 'Equipos de ComputaciÃ³n', vidaUtil: 4, coeficiente: 25 },
  { value: 'herramientas', label: 'Herramientas y Equipos', vidaUtil: 8, coeficiente: 12.5 },
  { value: 'otros', label: 'Otros Activos Fijos', vidaUtil: 10, coeficiente: 10 }
];

const ActivosFijosModule = () => {
  const [selectedActivo, setSelectedActivo] = useState<ActivoFijo | null>(null);
  const [showNewActivo, setShowNewActivo] = useState(false);
  const [showDepreciacion, setShowDepreciacion] = useState(false);
  const { toast } = useToast();
  const { guardarAsiento } = useContabilidadIntegration();
  const { 
    activosFijos: activos, 
    depreciaciones, 
    loading, 
    createActivoFijo, 
    updateActivoFijo, 
    deleteActivoFijo,
    createDepreciacion,
    refetch
  } = useSupabaseActivosFijos();

  const guardarActivo = async (nuevoActivo: NuevoActivoFormData) => {
    try {
      const activoData = {
        codigo: nuevoActivo.codigo,
        nombre: nuevoActivo.descripcion,
        descripcion: nuevoActivo.descripcion,
        categoria: nuevoActivo.categoria,
        fecha_adquisicion: nuevoActivo.fechaAdquisicion,
        costo_inicial: nuevoActivo.costoAdquisicion,
        vida_util_anos: nuevoActivo.vidaUtilAnios,
        valor_residual: nuevoActivo.valorResidual,
        metodo_depreciacion: nuevoActivo.metodoDepreciacion,
        ubicacion: nuevoActivo.ubicacion,
        estado: nuevoActivo.estado
      };
      
      const activo = await createActivoFijo(activoData);
      
      // Generar asiento de compra
      const asientoCompra = {
        id: Date.now().toString(),
        numero: `AF-${Date.now().toString().slice(-6)}`,
        fecha: nuevoActivo.fechaAdquisicion,
        concepto: `AdquisiciÃ³n de activo fijo - ${nuevoActivo.descripcion}`,
        referencia: `CÃ³digo: ${nuevoActivo.codigo}`,
        debe: nuevoActivo.costoAdquisicion,
        haber: nuevoActivo.costoAdquisicion,
        estado: 'registrado' as const,
        cuentas: [
          {
            codigo: "1241",
            nombre: "Activos Fijos",
            debe: nuevoActivo.costoAdquisicion,
            haber: 0
          },
          {
            codigo: "1111",
            nombre: "Caja y Bancos",
            debe: 0,
            haber: nuevoActivo.costoAdquisicion
          }
        ]
      };

      const asientoGuardado = await guardarAsiento(asientoCompra);
      if (!asientoGuardado) {
        toast({
          title: "Activo registrado sin asiento",
          description: `${activo.codigo} fue creado, pero el asiento contable necesita revision manual`,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Activo fijo registrado",
        description: `${activo.codigo} - ${activo.nombre}`,
      });
      
      setShowNewActivo(false);
    } catch (error) {
      toast({
        title: "Error al registrar activo",
        description: "No se pudo registrar el activo fijo",
        variant: "destructive"
      });
    }
  };

  const calcularDepreciacionMensual = async () => {
    const periodoActual = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    for (const activo of activos) {
      if (activo.estado === 'activo') {
        const categoria = categoriasActivos.find(c => c.value === activo.categoria);
        if (categoria) {
          const depreciacionAnual = (activo.costo_inicial - activo.valor_residual) * (categoria.coeficiente / 100);
          const depreciacionMensual = depreciacionAnual / 12;
          
          // Verificar si ya existe depreciaciÃ³n para este perÃ­odo
          const yaExiste = depreciaciones.some(d => 
            d.activo_id === activo.id && d.periodo === periodoActual
          );
          
          if (!yaExiste && depreciacionMensual > 0) {
            const depreciacionesActivo = depreciaciones.filter(d => d.activo_id === activo.id);
            const depreciacionAcumuladaAnterior = depreciacionesActivo.reduce((sum, d) => sum + d.valor_depreciacion, 0);
            const nuevaDepreciacionAcumulada = depreciacionAcumuladaAnterior + depreciacionMensual;
            const nuevoValorNeto = activo.costo_inicial - nuevaDepreciacionAcumulada;
            
            await createDepreciacion({
              activo_id: activo.id,
              periodo: periodoActual,
              valor_depreciacion: depreciacionMensual,
              depreciacion_acumulada: nuevaDepreciacionAcumulada,
              valor_neto: Math.max(nuevoValorNeto, activo.valor_residual),
              fecha_depreciacion: new Date().toISOString().split('T')[0]
            });
          }
        }
      }
    }
    
    toast({
      title: "DepreciaciÃ³n calculada",
      description: "Se calculÃ³ la depreciaciÃ³n mensual de activos fijos",
    });
  };

  const activosActivos = activos.filter(a => a.estado === 'activo');
  const valorTotalActivos = activosActivos.reduce((sum, a) => sum + a.costo_inicial, 0);
  const depreciacionTotalAcumulada = depreciaciones.reduce((sum, d) => sum + d.valor_depreciacion, 0);
  const valorTotalLibros = valorTotalActivos - depreciacionTotalAcumulada;

  if (loading) {
    return <div className="flex items-center justify-center p-8">Cargando activos fijos...</div>;
  }

  return (
    <div className="page-shell space-y-6 pb-12">
      <EnhancedHeader
        title="Activos fijos"
        subtitle="Gestiona altas, depreciacion y valor en libros con una vista mas ejecutiva y auditable."
        badge={{
          text: `${activosActivos.length} activos`,
          variant: "secondary"
        }}
        actions={
          <div className="flex gap-2">
            <Dialog open={showNewActivo} onOpenChange={setShowNewActivo}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Activo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Registrar Activo Fijo</DialogTitle>
                  <DialogDescription>
                    Ingrese la informaciÃƒÂ³n del nuevo activo fijo
                  </DialogDescription>
                </DialogHeader>
                <NewActivoForm onSave={guardarActivo} onCancel={() => setShowNewActivo(false)} />
              </DialogContent>
            </Dialog>
            
            <Button onClick={calcularDepreciacionMensual}>
              <Calculator className="w-4 h-4 mr-2" />
              Calcular DepreciaciÃƒÂ³n
            </Button>
          </div>
        }
      />

      <MetricGrid columns={4}>
        <EnhancedMetricCard title="Total activos" value={`Bs ${valorTotalActivos.toFixed(2)}`} subtitle={`${activosActivos.length} activos registrados`} icon={Building} />
        <EnhancedMetricCard title="Valor en libros" value={`Bs ${valorTotalLibros.toFixed(2)}`} subtitle="Valor actual neto" icon={FileText} variant="success" />
        <EnhancedMetricCard title="Depreciacion acumulada" value={`Bs ${depreciacionTotalAcumulada.toFixed(2)}`} subtitle="Total depreciado" icon={TrendingDown} variant="warning" />
        <EnhancedMetricCard title="% depreciacion" value={`${valorTotalActivos > 0 ? ((depreciacionTotalAcumulada / valorTotalActivos) * 100).toFixed(1) : 0}%`} subtitle="Promedio general" icon={Wrench} />
      </MetricGrid>

      <Tabs defaultValue="activos" className="w-full">
        <TabsList>
          <TabsTrigger value="activos">Activos Fijos</TabsTrigger>
          <TabsTrigger value="depreciaciones">Depreciaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="activos">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Activos Fijos</CardTitle>
              <CardDescription>
                Lista completa de activos fijos de la empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CÃ³digo</TableHead>
                    <TableHead>DescripciÃ³n</TableHead>
                    <TableHead>CategorÃ­a</TableHead>
                    <TableHead>Fecha AdquisiciÃ³n</TableHead>
                    <TableHead className="text-right">Costo Inicial</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activos.map(activo => (
                    <TableRow key={activo.id}>
                      <TableCell className="font-medium">{activo.codigo}</TableCell>
                      <TableCell>{activo.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {categoriasActivos.find(c => c.value === activo.categoria)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(activo.fecha_adquisicion).toLocaleDateString('es-BO')}</TableCell>
                      <TableCell className="text-right">Bs. {activo.costo_inicial.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={activo.estado === 'activo' ? 'default' : 'secondary'}>
                          {activo.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depreciaciones">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Depreciaciones</CardTitle>
              <CardDescription>
                Registro mensual de depreciaciones calculadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PerÃ­odo</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead className="text-right">DepreciaciÃ³n Mensual</TableHead>
                    <TableHead className="text-right">DepreciaciÃ³n Acumulada</TableHead>
                    <TableHead className="text-right">Valor Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {depreciaciones.map(dep => {
                    const activo = activos.find(a => a.id === dep.activo_id);
                    return (
                      <TableRow key={dep.id}>
                        <TableCell>{dep.periodo}</TableCell>
                        <TableCell>{activo?.nombre || 'Activo no encontrado'}</TableCell>
                        <TableCell className="text-right">Bs. {dep.valor_depreciacion.toFixed(2)}</TableCell>
                        <TableCell className="text-right">Bs. {dep.depreciacion_acumulada.toFixed(2)}</TableCell>
                        <TableCell className="text-right">Bs. {dep.valor_neto.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Componente para formulario de nuevo activo
const NewActivoForm = ({ onSave, onCancel }: { 
  onSave: (activo: NuevoActivoFormData) => Promise<void>, 
  onCancel: () => void 
}) => {
  const [formData, setFormData] = useState({
    codigo: '',
    descripcion: '',
    categoria: 'muebles',
    fechaAdquisicion: new Date().toISOString().slice(0, 10),
    costoAdquisicion: 0,
    vidaUtilAnios: 10,
    valorResidual: 0,
    metodoDepreciacion: 'lineal',
    estado: 'activo',
    ubicacion: ''
  });
  const [saving, setSaving] = useState(false);

  const handleCategoriaChange = (categoria: string) => {
    const categoriaInfo = categoriasActivos.find(c => c.value === categoria);
    setFormData(prev => ({ 
      ...prev, 
      categoria,
      vidaUtilAnios: categoriaInfo?.vidaUtil || 10
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="codigo">CÃ³digo del Activo</Label>
          <Input
            id="codigo"
            value={formData.codigo}
            onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
            placeholder="AF-001"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="categoria">CategorÃ­a</Label>
          <Select onValueChange={handleCategoriaChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione categorÃ­a" />
            </SelectTrigger>
            <SelectContent>
              {categoriasActivos.map(categoria => (
                <SelectItem key={categoria.value} value={categoria.value}>
                  {categoria.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">DescripciÃ³n</Label>
        <Input
          id="descripcion"
          value={formData.descripcion}
          onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
          placeholder="DescripciÃ³n detallada del activo"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fechaAdquisicion">Fecha de AdquisiciÃ³n</Label>
          <Input
            id="fechaAdquisicion"
            type="date"
            value={formData.fechaAdquisicion}
            onChange={(e) => setFormData(prev => ({ ...prev, fechaAdquisicion: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="costoAdquisicion">Costo de AdquisiciÃ³n (Bs.)</Label>
          <Input
            id="costoAdquisicion"
            type="number"
            step="0.01"
            value={formData.costoAdquisicion}
            onChange={(e) => setFormData(prev => ({ ...prev, costoAdquisicion: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valorResidual">Valor Residual (Bs.)</Label>
          <Input
            id="valorResidual"
            type="number"
            step="0.01"
            value={formData.valorResidual}
            onChange={(e) => setFormData(prev => ({ ...prev, valorResidual: parseFloat(e.target.value) || 0 }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vidaUtilAnios">Vida Ãštil (AÃ±os)</Label>
          <Input
            id="vidaUtilAnios"
            type="number"
            value={formData.vidaUtilAnios}
            onChange={(e) => setFormData(prev => ({ ...prev, vidaUtilAnios: parseInt(e.target.value) || 0 }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ubicacion">UbicaciÃ³n</Label>
          <Input
            id="ubicacion"
            value={formData.ubicacion}
            onChange={(e) => setFormData(prev => ({ ...prev, ubicacion: e.target.value }))}
            placeholder="Oficina, Planta, AlmacÃ©n, etc."
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Registrar Activo"}
        </Button>
      </div>
    </form>
  );
};

export default ActivosFijosModule;

