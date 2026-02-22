import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator, FileText, AlertTriangle, Receipt, Download, Plus, CheckCircle, Banknote } from "lucide-react";
import { AsientoContable } from '../diary/DiaryData';
import * as XLSX from '@e965/xlsx';

interface Retencion {
  id: string;
  numeroRetencion: string;
  fechaRetencion: string;
  nitRetenido: string;
  razonSocialRetenido: string;
  numeroFactura: string;
  fechaFactura: string;
  montoFactura: number;
  tipoRetencion: 'rc_iva' | 'it' | 'rc_iva_it';
  porcentajeRetencion: number;
  montoRetencion: number;
  codigoRetencion: string;
  estado: 'emitida' | 'presentada' | 'anulada';
}

interface ConfiguracionRetencion {
  tipo: string;
  descripcion: string;
  porcentaje: number;
  montoMinimo: number;
  codigo: string;
  activo: boolean;
}

// Configuraciones de retención actualizadas según normativa 2024-2025
const configuracionesRetencion: ConfiguracionRetencion[] = [
  {
    tipo: 'rc_iva',
    descripcion: 'Retención Complementaria al IVA',
    porcentaje: 13,
    montoMinimo: 1000,
    codigo: 'RC-IVA',
    activo: true
  },
  {
    tipo: 'it',
    descripcion: 'Impuesto a las Transacciones',
    porcentaje: 3,
    montoMinimo: 500,
    codigo: 'IT',
    activo: true
  },
  {
    tipo: 'rc_iva_servicios',
    descripcion: 'RC-IVA para Servicios',
    porcentaje: 15,
    montoMinimo: 1000,
    codigo: 'RC-IVA-SERV',
    activo: true
  },
  {
    tipo: 'it_alquileres',
    descripcion: 'IT para Alquileres',
    porcentaje: 2,
    montoMinimo: 10000,
    codigo: 'IT-ALQ',
    activo: true
  },
  {
    tipo: 'profesionales',
    descripcion: 'Retención a Profesionales',
    porcentaje: 12.5,
    montoMinimo: 500,
    codigo: 'PROF',
    activo: true
  }
];

const RetencionesModule = () => {
  const [retenciones, setRetenciones] = useState<Retencion[]>([]);
  const [showCalculadora, setShowCalculadora] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = () => {
    const retencionesGuardadas = localStorage.getItem('retenciones');
    if (retencionesGuardadas) {
      setRetenciones(JSON.parse(retencionesGuardadas));
    }
  };

  const calcularRetencion = (montoFactura: number, tipoRetencion: string): { porcentaje: number, monto: number, aplica: boolean } => {
    const config = configuracionesRetencion.find(c => c.tipo === tipoRetencion);
    if (!config) return { porcentaje: 0, monto: 0, aplica: false };

    const aplica = montoFactura >= config.montoMinimo;
    const monto = aplica ? (montoFactura * config.porcentaje) / 100 : 0;

    return {
      porcentaje: config.porcentaje,
      monto,
      aplica
    };
  };

  const crearRetencion = (datosRetencion: Partial<Retencion>) => {
    const numeroRetencion = `RET-${(retenciones.length + 1).toString().padStart(6, '0')}`;
    const codigoRetencion = `${numeroRetencion}-${Date.now().toString().slice(-4)}`;

    const nuevaRetencion: Retencion = {
      id: Date.now().toString(),
      numeroRetencion,
      fechaRetencion: datosRetencion.fechaRetencion || new Date().toISOString().slice(0, 10),
      nitRetenido: datosRetencion.nitRetenido || '',
      razonSocialRetenido: datosRetencion.razonSocialRetenido || '',
      numeroFactura: datosRetencion.numeroFactura || '',
      fechaFactura: datosRetencion.fechaFactura || '',
      montoFactura: datosRetencion.montoFactura || 0,
      tipoRetencion: datosRetencion.tipoRetencion || 'rc_iva',
      porcentajeRetencion: datosRetencion.porcentajeRetencion || 0,
      montoRetencion: datosRetencion.montoRetencion || 0,
      codigoRetencion,
      estado: 'emitida',
    };

    const nuevasRetenciones = [...retenciones, nuevaRetencion];
    setRetenciones(nuevasRetenciones);
    localStorage.setItem('retenciones', JSON.stringify(nuevasRetenciones));

    toast({
      title: "Retención creada",
      description: `Retención ${numeroRetencion} creada exitosamente`,
    });
  };

  const generarReporteRetenciones = () => {
    const reporte = retenciones.map(r => ({
      numero: r.numeroRetencion,
      fecha: r.fechaRetencion,
      retenido: r.razonSocialRetenido,
      nit: r.nitRetenido,
      tipo: configuracionesRetencion.find(c => c.tipo === r.tipoRetencion)?.descripcion,
      monto: r.montoRetencion,
      estado: r.estado
    }));

    console.log('Reporte de retenciones:', reporte);
    
    toast({
      title: "Reporte generado",
      description: "El reporte está disponible en la consola",
    });
  };

  const retencionesDelMes = retenciones.filter(r => {
    const fechaRetencion = new Date(r.fechaRetencion);
    const hoy = new Date();
    return fechaRetencion.getMonth() === hoy.getMonth() && 
           fechaRetencion.getFullYear() === hoy.getFullYear();
  });

  const totalRetencionesDelMes = retencionesDelMes.reduce((sum, r) => sum + r.montoRetencion, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Receipt className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Gestión de Retenciones</h2>
            <p className="text-slate-600">
              Sistema de retenciones tributarias - Normativa 2025
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCalculadora(!showCalculadora)} variant="outline">
            <Calculator className="w-4 h-4 mr-2" />
            Calculadora
          </Button>
          <Button onClick={generarReporteRetenciones}>
            <Download className="w-4 h-4 mr-2" />
            Reporte
          </Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Retenciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{retenciones.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{retencionesDelMes.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monto del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Bs. {totalRetencionesDelMes.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {retenciones.filter(r => r.estado === 'emitida').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calculadora de Retenciones */}
      {showCalculadora && (
        <Card>
          <CardHeader>
            <CardTitle>Calculadora de Retenciones</CardTitle>
            <CardDescription>
              Calcule automáticamente las retenciones según la normativa vigente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CalculadoraRetenciones onCalcular={calcularRetencion} />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="retenciones" className="w-full">
        <TabsList>
          <TabsTrigger value="retenciones">Retenciones</TabsTrigger>
          <TabsTrigger value="nueva">Nueva Retención</TabsTrigger>
          <TabsTrigger value="configuracion">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="retenciones">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Retenciones</CardTitle>
              <CardDescription>
                Historial de retenciones emitidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Retenido</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Monto Factura</TableHead>
                    <TableHead className="text-right">Retención</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retenciones.map(retencion => {
                    const config = configuracionesRetencion.find(c => c.tipo === retencion.tipoRetencion);
                    return (
                      <TableRow key={retencion.id}>
                        <TableCell className="font-medium">{retencion.numeroRetencion}</TableCell>
                        <TableCell>{new Date(retencion.fechaRetencion).toLocaleDateString('es-BO')}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{retencion.razonSocialRetenido}</div>
                            <div className="text-sm text-muted-foreground">NIT: {retencion.nitRetenido}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{retencion.numeroFactura}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(retencion.fechaFactura).toLocaleDateString('es-BO')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {config?.codigo} ({retencion.porcentajeRetencion}%)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">Bs. {retencion.montoFactura.toFixed(2)}</TableCell>
                        <TableCell className="text-right">Bs. {retencion.montoRetencion.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            retencion.estado === 'presentada' ? 'default' :
                            retencion.estado === 'anulada' ? 'destructive' : 'secondary'
                          }>
                            {retencion.estado === 'presentada' ? 'Presentada' :
                             retencion.estado === 'anulada' ? 'Anulada' : 'Emitida'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <FileText className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nueva">
          <Card>
            <CardHeader>
              <CardTitle>Nueva Retención</CardTitle>
              <CardDescription>
                Crear una nueva retención tributaria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NuevaRetencionForm 
                onCrear={crearRetencion}
                configuraciones={configuracionesRetencion}
                onCalcular={calcularRetencion}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuracion">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Retenciones</CardTitle>
              <CardDescription>
                Tipos de retención y porcentajes según normativa 2025
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {configuracionesRetencion.map(config => (
                  <Card key={config.tipo}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{config.descripcion}</CardTitle>
                      <CardDescription>Código: {config.codigo}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Porcentaje:</span>
                          <Badge>{config.porcentaje}%</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Monto mínimo:</span>
                          <span>Bs. {config.montoMinimo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Estado:</span>
                          <Badge variant={config.activo ? 'default' : 'destructive'}>
                            {config.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Componente calculadora
const CalculadoraRetenciones = ({ onCalcular }: {
  onCalcular: (monto: number, tipo: string) => { porcentaje: number, monto: number, aplica: boolean };
}) => {
  const [montoFactura, setMontoFactura] = useState<number>(0);
  const [tipoRetencion, setTipoRetencion] = useState<string>('rc_iva');
  const [resultado, setResultado] = useState<{ porcentaje: number, monto: number, aplica: boolean } | null>(null);

  const calcular = () => {
    const result = onCalcular(montoFactura, tipoRetencion);
    setResultado(result);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Monto de Factura (Bs.)</Label>
          <Input
            type="number"
            step="0.01"
            value={montoFactura}
            onChange={(e) => setMontoFactura(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo de Retención</Label>
          <Select value={tipoRetencion} onValueChange={setTipoRetencion}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {configuracionesRetencion.map(config => (
                <SelectItem key={config.tipo} value={config.tipo}>
                  {config.descripcion} ({config.porcentaje}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={calcular} className="w-full">
        <Calculator className="w-4 h-4 mr-2" />
        Calcular Retención
      </Button>

      {resultado && (
        <Card className={`${resultado.aplica ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Aplica retención:</span>
                <Badge variant={resultado.aplica ? 'default' : 'secondary'}>
                  {resultado.aplica ? 'SÍ' : 'NO'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Porcentaje:</span>
                <span>{resultado.porcentaje}%</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Monto a retener:</span>
                <span>Bs. {resultado.monto.toFixed(2)}</span>
              </div>
              {!resultado.aplica && (
                <p className="text-sm text-yellow-700 mt-2">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  El monto no alcanza el mínimo requerido para esta retención
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Formulario nueva retención
const NuevaRetencionForm = ({ onCrear, configuraciones, onCalcular }: {
  onCrear: (datos: Partial<Retencion>) => void;
  configuraciones: ConfiguracionRetencion[];
  onCalcular: (monto: number, tipo: string) => { porcentaje: number, monto: number, aplica: boolean };
}) => {
  const [formData, setFormData] = useState({
    nitRetenido: '',
    razonSocialRetenido: '',
    numeroFactura: '',
    fechaFactura: '',
    montoFactura: 0,
    tipoRetencion: 'rc_iva' as const,
  });

  const [retencionCalculada, setRetencionCalculada] = useState<{ porcentaje: number, monto: number, aplica: boolean } | null>(null);

  useEffect(() => {
    if (formData.montoFactura > 0) {
      const result = onCalcular(formData.montoFactura, formData.tipoRetencion);
      setRetencionCalculada(result);
    }
  }, [formData.montoFactura, formData.tipoRetencion, onCalcular]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retencionCalculada?.aplica) return;

    onCrear({
      ...formData,
      porcentajeRetencion: retencionCalculada.porcentaje,
      montoRetencion: retencionCalculada.monto,
    });

    // Limpiar formulario
    setFormData({
      nitRetenido: '',
      razonSocialRetenido: '',
      numeroFactura: '',
      fechaFactura: '',
      montoFactura: 0,
      tipoRetencion: 'rc_iva',
    });
    setRetencionCalculada(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>NIT del Retenido</Label>
          <Input
            value={formData.nitRetenido}
            onChange={(e) => setFormData(prev => ({ ...prev, nitRetenido: e.target.value }))}
            placeholder="123456789"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Razón Social</Label>
          <Input
            value={formData.razonSocialRetenido}
            onChange={(e) => setFormData(prev => ({ ...prev, razonSocialRetenido: e.target.value }))}
            placeholder="Nombre de la empresa"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Número de Factura</Label>
          <Input
            value={formData.numeroFactura}
            onChange={(e) => setFormData(prev => ({ ...prev, numeroFactura: e.target.value }))}
            placeholder="001234"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Fecha de Factura</Label>
          <Input
            type="date"
            value={formData.fechaFactura}
            onChange={(e) => setFormData(prev => ({ ...prev, fechaFactura: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Monto de Factura (Bs.)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.montoFactura}
            onChange={(e) => setFormData(prev => ({ ...prev, montoFactura: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo de Retención</Label>
          <Select 
            value={formData.tipoRetencion} 
            onValueChange={(value: any) => setFormData(prev => ({ ...prev, tipoRetencion: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {configuraciones.filter(c => c.activo).map(config => (
                <SelectItem key={config.tipo} value={config.tipo}>
                  {config.descripcion} ({config.porcentaje}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {retencionCalculada && (
        <Card className={`${retencionCalculada.aplica ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-muted-foreground">Porcentaje</div>
                <div className="font-bold">{retencionCalculada.porcentaje}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Monto a Retener</div>
                <div className="font-bold">Bs. {retencionCalculada.monto.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Aplica</div>
                <Badge variant={retencionCalculada.aplica ? 'default' : 'destructive'}>
                  {retencionCalculada.aplica ? 'SÍ' : 'NO'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button 
        type="submit" 
        className="w-full" 
        disabled={!retencionCalculada?.aplica}
      >
        <Receipt className="w-4 h-4 mr-2" />
        Crear Retención
      </Button>
    </form>
  );
};

export default RetencionesModule;