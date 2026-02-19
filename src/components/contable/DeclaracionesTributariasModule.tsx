
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Calendar, AlertTriangle, CheckCircle, Download, Upload, Calculator } from "lucide-react";

interface DeclaracionTributaria {
  id: string;
  tipoDeclaracion: 'iva' | 'it' | 'iue' | 'rc_iva' | 'formulario_110' | 'formulario_500';
  periodo: string; // YYYY-MM
  fechaVencimiento: string;
  fechaPresentacion?: string;
  estado: 'pendiente' | 'presentada' | 'vencida' | 'observada' | 'aceptada';
  montoBase: number;
  montoImpuesto: number;
  multa: number;
  interes: number;
  totalPagar: number;
  numeroFormulario?: string;
  observaciones: string;
}

interface PeriodoFiscal {
  periodo: string;
  fechaVencimiento: string;
  diasRestantes: number;
  estado: 'vigente' | 'vencido' | 'presentado';
}

const tiposDeclaracion = [
  { value: 'iva', label: 'IVA Mensual', formulario: 'Formulario 200 v.3 (SIAT en Línea)', vencimiento: 20 },
  { value: 'it', label: 'IT Mensual', formulario: 'Formulario 400 (SIAT en Línea)', vencimiento: 20 },
  { value: 'iue', label: 'IUE Anual', formulario: 'Formulario 500 (SIAT en Línea)', vencimiento: 120 },
  { value: 'rc_iva', label: 'RC-IVA Dependientes', formulario: 'Formulario 110 (SIAT en Línea)', vencimiento: 20 },
  { value: 'rc_iva_profesionales', label: 'RC-IVA Independientes', formulario: 'Formulario 610 (SIAT en Línea)', vencimiento: 20 },
  { value: 'formulario_605', label: 'Estados Financieros IUE', formulario: 'Formulario 605 (SIAT en Línea)', vencimiento: 120 },
  { value: 'formulario_750', label: 'Régimen Simplificado', formulario: 'Formulario 750 (SIAT en Línea)', vencimiento: 20 },
  { value: 'iva_tasa_cero', label: 'IVA Tasa Cero', formulario: 'RND 102500000002 - Ley 1613', vencimiento: 20 },
  { value: 'sectores_especiales', label: 'Sectores Especiales ICE', formulario: 'Formularios 650/651/652 (CEP)', vencimiento: 25 },
  { value: 'estados_financieros', label: 'Memoria Anual + Dictámenes', formulario: 'Formulario 601/605 (Cierre 31/12)', vencimiento: 120 },
  { value: 'bancarizacion', label: 'Control Bancarización', formulario: 'RND 102400000021 - Bs 50.000+', vencimiento: 31 },
  { value: 'facilidades_pago', label: 'Facilidades de Pago', formulario: 'RND 102500000019 - Hasta 30 meses', vencimiento: 60 },
  { value: 'ds_5503', label: 'Incentivos DS 5503', formulario: 'Hecho en Bolivia / Deprec. Acelerada', vencimiento: 30 },
  { value: 'beneficiario_final', label: 'Beneficiarios Finales', formulario: 'RND 102500000005 - Personas Jurídicas', vencimiento: 120 }
];

const DeclaracionesTributariasModule = () => {
  const [declaraciones, setDeclaraciones] = useState<DeclaracionTributaria[]>([]);
  const [periodosFiscales, setPeriodosFiscales] = useState<PeriodoFiscal[]>([]);
  const [showNewDeclaracion, setShowNewDeclaracion] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    cargarDatos();
    generarPeriodosFiscales();
  }, []);

  const cargarDatos = () => {
    const declaracionesGuardadas = localStorage.getItem('declaracionesTributarias');
    if (declaracionesGuardadas) {
      setDeclaraciones(JSON.parse(declaracionesGuardadas));
    }
  };

  const generarPeriodosFiscales = () => {
    const hoy = new Date();
    const periodos: PeriodoFiscal[] = [];

    // Generar períodos para los próximos 3 meses
    for (let i = 0; i < 3; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
      const periodo = fecha.toISOString().slice(0, 7); // YYYY-MM
      
      // Fecha de vencimiento: día 20 del mes siguiente
      const fechaVencimiento = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 20);
      const diasRestantes = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 3600 * 24));
      
      let estado: 'vigente' | 'vencido' | 'presentado' = 'vigente';
      if (diasRestantes < 0) estado = 'vencido';
      
      // Verificar si ya fue presentado
      const yaDeclarado = declaraciones.some(d => 
        d.periodo === periodo && d.estado === 'presentada'
      );
      if (yaDeclarado) estado = 'presentado';

      periodos.push({
        periodo,
        fechaVencimiento: fechaVencimiento.toISOString().slice(0, 10),
        diasRestantes,
        estado
      });
    }

    setPeriodosFiscales(periodos);
  };

  const guardarDeclaracion = (nuevaDeclaracion: Omit<DeclaracionTributaria, 'id'>) => {
    const declaracion: DeclaracionTributaria = {
      ...nuevaDeclaracion,
      id: Date.now().toString()
    };
    
    const nuevasDeclaraciones = [...declaraciones, declaracion];
    setDeclaraciones(nuevasDeclaraciones);
    localStorage.setItem('declaracionesTributarias', JSON.stringify(nuevasDeclaraciones));
    
    toast({
      title: "Declaración registrada",
      description: `${tiposDeclaracion.find(t => t.value === declaracion.tipoDeclaracion)?.label} - ${declaracion.periodo}`,
    });
    
    setShowNewDeclaracion(false);
    generarPeriodosFiscales(); // Actualizar períodos
  };

  const marcarComoPresentada = (id: string) => {
    const declaracionesActualizadas = declaraciones.map(d => 
      d.id === id ? { 
        ...d, 
        estado: 'presentada' as const, 
        fechaPresentacion: new Date().toISOString().slice(0, 10) 
      } : d
    );
    setDeclaraciones(declaracionesActualizadas);
    localStorage.setItem('declaracionesTributarias', JSON.stringify(declaracionesActualizadas));
    
    toast({
      title: "Declaración presentada",
      description: "La declaración ha sido marcada como presentada",
    });
    
    generarPeriodosFiscales();
  };

  const calcularMultaInteres = (fechaVencimiento: string, montoImpuesto: number, tipoDeclaracion: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diasRetraso = Math.max(0, Math.ceil((hoy.getTime() - vencimiento.getTime()) / (1000 * 3600 * 24)));
    
    let multa = 0;
    let interes = 0;
    
    if (diasRetraso > 0) {
      // Multas actualizadas según normativa 2026 - Ley 1448
      const ufv = 3.05; // UFV actualizado enero 2026
      
      switch (tipoDeclaracion) {
        case 'iva':
        case 'it':
          // Multa escalonada RND-102500000031
          if (diasRetraso <= 15) {
            multa = diasRetraso * 50 * ufv; // Reducción por cumplimiento temprano
          } else if (diasRetraso <= 30) {
            multa = (15 * 50 * ufv) + ((diasRetraso - 15) * 100 * ufv);
          } else {
            multa = (15 * 50 * ufv) + (15 * 100 * ufv) + ((diasRetraso - 30) * 250 * ufv);
          }
          break;
        case 'iue':
          // IUE: Multa progresiva según Ley 1448
          multa = Math.max((montoImpuesto * 0.08), (300 * ufv)) + (diasRetraso * 25 * ufv);
          break;
        case 'rc_iva_profesionales':
          // RC-IVA Profesionales: Tratamiento especial 2025
          multa = (montoImpuesto * 0.12) + (diasRetraso * 75 * ufv);
          break;
        case 'estados_financieros':
          // Estados Financieros: Con prórroga hasta 21 julio 2025
          if (diasRetraso <= 15) {
            multa = 200 * ufv; // Multa fija reducida con prórroga
          } else {
            multa = (200 * ufv) + ((diasRetraso - 15) * 150 * ufv);
          }
          break;
        default:
          // Multa estándar actualizada
          multa = (montoImpuesto * 0.05) + (diasRetraso * 30 * ufv);
      }
      
      // Interés actualizado: Tasa BCB 2026 - 6% anual (0.0164% diario)
      interes = montoImpuesto * 0.000164 * diasRetraso;
    }
    
    return { multa, interes };
  };

  const declaracionesPendientes = declaraciones.filter(d => d.estado === 'pendiente');
  const declaracionesVencidas = declaraciones.filter(d => d.estado === 'vencida');
  const proximosVencimientos = periodosFiscales.filter(p => p.diasRestantes > 0 && p.diasRestantes <= 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Declaraciones Tributarias</h2>
            <p className="text-slate-600">
              Gestión de obligaciones tributarias 2026 - SIAT en Línea (RND 102500000016)
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={showNewDeclaracion} onOpenChange={setShowNewDeclaracion}>
            <DialogTrigger asChild>
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                Nueva Declaración
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Declaración Tributaria</DialogTitle>
                <DialogDescription>
                  Complete la información de la declaración tributaria
                </DialogDescription>
              </DialogHeader>
              <NewDeclaracionForm onSave={guardarDeclaracion} onCancel={() => setShowNewDeclaracion(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alertas */}
      {(declaracionesVencidas.length > 0 || proximosVencimientos.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {declaracionesVencidas.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Declaraciones Vencidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700">
                  {declaracionesVencidas.length} declaraciones vencidas requieren atención inmediata
                </p>
              </CardContent>
            </Card>
          )}
          
          {proximosVencimientos.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-orange-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Próximos Vencimientos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-orange-700">
                  {proximosVencimientos.length} períodos vencen en los próximos 10 días
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs defaultValue="declaraciones" className="w-full">
        <TabsList>
          <TabsTrigger value="declaraciones">Declaraciones</TabsTrigger>
          <TabsTrigger value="periodos">Períodos Fiscales</TabsTrigger>
          <TabsTrigger value="calculadora">Calculadora</TabsTrigger>
        </TabsList>

        <TabsContent value="declaraciones">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Declaraciones</CardTitle>
              <CardDescription>
                Historial de declaraciones tributarias presentadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Monto Base</TableHead>
                    <TableHead className="text-right">Impuesto</TableHead>
                    <TableHead className="text-right">Total a Pagar</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {declaraciones.map(declaracion => (
                    <TableRow key={declaracion.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {tiposDeclaracion.find(t => t.value === declaracion.tipoDeclaracion)?.label}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tiposDeclaracion.find(t => t.value === declaracion.tipoDeclaracion)?.formulario}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{declaracion.periodo}</TableCell>
                      <TableCell>{new Date(declaracion.fechaVencimiento).toLocaleDateString('es-BO')}</TableCell>
                      <TableCell className="text-right">Bs. {declaracion.montoBase.toFixed(2)}</TableCell>
                      <TableCell className="text-right">Bs. {declaracion.montoImpuesto.toFixed(2)}</TableCell>
                      <TableCell className="text-right">Bs. {declaracion.totalPagar.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          declaracion.estado === 'presentada' ? 'default' :
                          declaracion.estado === 'vencida' ? 'destructive' :
                          declaracion.estado === 'pendiente' ? 'secondary' : 'outline'
                        }>
                          {declaracion.estado === 'presentada' ? 'Presentada' :
                           declaracion.estado === 'vencida' ? 'Vencida' :
                           declaracion.estado === 'pendiente' ? 'Pendiente' :
                           declaracion.estado === 'observada' ? 'Observada' : 'Aceptada'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {declaracion.estado === 'pendiente' && (
                          <Button
                            size="sm"
                            onClick={() => marcarComoPresentada(declaracion.id)}
                          >
                            Marcar Presentada
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="periodos">
          <Card>
            <CardHeader>
              <CardTitle>Calendario Fiscal</CardTitle>
              <CardDescription>
                Períodos fiscales y fechas de vencimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {periodosFiscales.map(periodo => (
                  <Card key={periodo.periodo} className={`
                    ${periodo.estado === 'vencido' ? 'border-red-200 bg-red-50' :
                      periodo.estado === 'presentado' ? 'border-green-200 bg-green-50' :
                      periodo.diasRestantes <= 5 ? 'border-orange-200 bg-orange-50' : ''}
                  `}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{periodo.periodo}</CardTitle>
                      <CardDescription>
                        Vence: {new Date(periodo.fechaVencimiento).toLocaleDateString('es-BO')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant={
                          periodo.estado === 'presentado' ? 'default' :
                          periodo.estado === 'vencido' ? 'destructive' : 'secondary'
                        }>
                          {periodo.estado === 'presentado' ? 'Presentado' :
                           periodo.estado === 'vencido' ? 'Vencido' :
                           `${periodo.diasRestantes} días`}
                        </Badge>
                        {periodo.estado === 'vigente' && (
                          <Button size="sm" variant="outline">
                            Declarar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculadora">
          <Card>
            <CardHeader>
              <CardTitle>Calculadora de Impuestos</CardTitle>
              <CardDescription>
                Calcule multas e intereses por presentación tardía
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monto del Impuesto (Bs.)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Vencimiento</Label>
                    <Input type="date" />
                  </div>
                </div>
                <Button>
                  <Calculator className="w-4 h-4 mr-2" />
                  Calcular Multa e Intereses
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Componente para formulario de nueva declaración
const NewDeclaracionForm = ({ onSave, onCancel }: { 
  onSave: (declaracion: Omit<DeclaracionTributaria, 'id'>) => void, 
  onCancel: () => void 
}) => {
  const [formData, setFormData] = useState<Omit<DeclaracionTributaria, 'id'>>({
    tipoDeclaracion: 'iva',
    periodo: new Date().toISOString().slice(0, 7),
    fechaVencimiento: '',
    estado: 'pendiente',
    montoBase: 0,
    montoImpuesto: 0,
    multa: 0,
    interes: 0,
    totalPagar: 0,
    observaciones: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalPagar = formData.montoImpuesto + formData.multa + formData.interes;
    onSave({ ...formData, totalPagar });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Declaración</Label>
          <Select onValueChange={(value: any) => setFormData(prev => ({ ...prev, tipoDeclaracion: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione tipo" />
            </SelectTrigger>
            <SelectContent>
              {tiposDeclaracion.map(tipo => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Período</Label>
          <Input
            type="month"
            value={formData.periodo}
            onChange={(e) => setFormData(prev => ({ ...prev, periodo: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fecha de Vencimiento</Label>
          <Input
            type="date"
            value={formData.fechaVencimiento}
            onChange={(e) => setFormData(prev => ({ ...prev, fechaVencimiento: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Monto Base (Bs.)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.montoBase}
            onChange={(e) => setFormData(prev => ({ ...prev, montoBase: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Impuesto (Bs.)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.montoImpuesto}
            onChange={(e) => setFormData(prev => ({ ...prev, montoImpuesto: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Multa (Bs.)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.multa}
            onChange={(e) => setFormData(prev => ({ ...prev, multa: parseFloat(e.target.value) || 0 }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Intereses (Bs.)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.interes}
            onChange={(e) => setFormData(prev => ({ ...prev, interes: parseFloat(e.target.value) || 0 }))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          Registrar Declaración
        </Button>
      </div>
    </form>
  );
};

export default DeclaracionesTributariasModule;
