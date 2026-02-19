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
import { FileText, Zap, AlertTriangle, CheckCircle, Download, Wifi, Settings } from "lucide-react";
import { sectoresEspeciales, actividadesEconomicas, validarNITBoliviano } from "../billing/BillingData";

interface FacturaElectronica {
  id: string;
  numero: string;
  codigoPuntoVenta: number;
  nit: string;
  razonSocial: string;
  fecha: string;
  montoTotal: number;
  codigoSector: number;
  actividadEconomica: string;
  cuf: string;
  cufd: string;
  estado: 'borrador' | 'enviado' | 'autorizado' | 'rechazado' | 'anulado';
  codigoRecepcion?: string;
  motivoRechazo?: string;
}

interface PuntoVentaElectronico {
  codigo: number;
  nombre: string;
  tipo: 'fijo' | 'movil';
  estado: 'activo' | 'inactivo';
}

const FacturacionElectronicaModule = () => {
  const [facturas, setFacturas] = useState<FacturaElectronica[]>([]);
  const [puntosVenta, setPuntosVenta] = useState<PuntoVentaElectronico[]>([]);
  const [cufdActual, setCufdActual] = useState<string>('');
  const [conectadoSIN, setConectadoSIN] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    cargarDatos();
    verificarConexionSIN();
    inicializarPuntosVenta();
  }, []);

  const cargarDatos = () => {
    const facturasGuardadas = localStorage.getItem('facturasElectronicas');
    if (facturasGuardadas) {
      setFacturas(JSON.parse(facturasGuardadas));
    }
  };

  const verificarConexionSIN = async () => {
    try {
      // Simulación de verificación con SIN
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConectadoSIN(true);
      
      // Obtener CUFD actual
      const cufd = `CUFD${Date.now()}`;
      setCufdActual(cufd);
      
      toast({
        title: "Conexión SIN verificada",
        description: "Sistema conectado correctamente",
      });
    } catch (error) {
      setConectadoSIN(false);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el SIN",
        variant: "destructive",
      });
    }
  };

  const inicializarPuntosVenta = () => {
    const puntosInicial: PuntoVentaElectronico[] = [
      { codigo: 0, nombre: "Oficina Central", tipo: "fijo", estado: "activo" },
      { codigo: 1, nombre: "Sucursal Norte", tipo: "fijo", estado: "activo" },
      { codigo: 2, nombre: "Punto Móvil 1", tipo: "movil", estado: "activo" }
    ];
    setPuntosVenta(puntosInicial);
  };

  const generarCUF = (numeroFactura: string, puntoVenta: number): string => {
    // Algoritmo simplificado para demo
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const hora = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
    return `CUF${fecha}${hora}${numeroFactura.padStart(6, '0')}${puntoVenta}`;
  };

  const crearFacturaElectronica = (datosFactura: Partial<FacturaElectronica>) => {
    if (!conectadoSIN) {
      toast({
        title: "Error",
        description: "No hay conexión con el SIN",
        variant: "destructive",
      });
      return;
    }

    const validacionNIT = validarNITBoliviano(datosFactura.nit || '');
    if (!validacionNIT.valido) {
      toast({
        title: "NIT inválido",
        description: validacionNIT.mensaje,
        variant: "destructive",
      });
      return;
    }

    const numeroFactura = (facturas.length + 1).toString();
    const cuf = generarCUF(numeroFactura, datosFactura.codigoPuntoVenta || 0);

    const nuevaFactura: FacturaElectronica = {
      id: Date.now().toString(),
      numero: numeroFactura.padStart(6, '0'),
      codigoPuntoVenta: datosFactura.codigoPuntoVenta || 0,
      nit: datosFactura.nit || '',
      razonSocial: datosFactura.razonSocial || '',
      fecha: new Date().toISOString().slice(0, 10),
      montoTotal: datosFactura.montoTotal || 0,
      codigoSector: datosFactura.codigoSector || 1,
      actividadEconomica: datosFactura.actividadEconomica || '',
      cuf,
      cufd: cufdActual,
      estado: 'borrador',
    };

    const nuevasFacturas = [...facturas, nuevaFactura];
    setFacturas(nuevasFacturas);
    localStorage.setItem('facturasElectronicas', JSON.stringify(nuevasFacturas));

    toast({
      title: "Factura creada",
      description: `Factura ${nuevaFactura.numero} creada exitosamente`,
    });
  };

  const enviarFacturaSIN = async (facturaId: string) => {
    const factura = facturas.find(f => f.id === facturaId);
    if (!factura) return;

    try {
      // Simulación de envío al SIN
      toast({
        title: "Enviando al SIN",
        description: "Procesando factura...",
      });

      // Actualizar estado a enviado
      const facturasActualizadas = facturas.map(f => 
        f.id === facturaId ? { ...f, estado: 'enviado' as const } : f
      );
      setFacturas(facturasActualizadas);

      // Simular respuesta del SIN después de 3 segundos
      setTimeout(() => {
        const exito = Math.random() > 0.2; // 80% de éxito
        
        const facturasFinales = facturasActualizadas.map(f => 
          f.id === facturaId ? { 
            ...f, 
            estado: exito ? 'autorizado' as const : 'rechazado' as const,
            codigoRecepcion: exito ? `REC${Date.now()}` : undefined,
            motivoRechazo: !exito ? 'Error de validación simulado' : undefined
          } : f
        );
        
        setFacturas(facturasFinales);
        localStorage.setItem('facturasElectronicas', JSON.stringify(facturasFinales));

        toast({
          title: exito ? "Factura autorizada" : "Factura rechazada",
          description: exito ? 
            `Factura ${factura.numero} autorizada por el SIN` : 
            `Factura ${factura.numero} fue rechazada`,
          variant: exito ? "default" : "destructive",
        });
      }, 3000);

    } catch (error) {
      toast({
        title: "Error de envío",
        description: "No se pudo enviar la factura al SIN",
        variant: "destructive",
      });
    }
  };

  const obtenerSectorEspecial = (codigo: number) => {
    return Object.values(sectoresEspeciales).find(s => s.codigo === codigo);
  };

  const facturasAutorizadas = facturas.filter(f => f.estado === 'autorizado');
  const facturasRechazadas = facturas.filter(f => f.estado === 'rechazado');
  const facturasPendientes = facturas.filter(f => f.estado === 'borrador' || f.estado === 'enviado');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Facturación Electrónica</h2>
            <p className="text-slate-600">
              Sistema de facturación electrónica SIN - SIAT v2.0 - Normativa 2026
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={conectadoSIN ? "default" : "destructive"} className="flex items-center gap-1">
            <Wifi className="w-3 h-3" />
            {conectadoSIN ? "Conectado SIN" : "Sin conexión"}
          </Badge>
          <Button onClick={() => verificarConexionSIN()}>
            <Settings className="w-4 h-4 mr-2" />
            Verificar Conexión
          </Button>
        </div>
      </div>

      {/* Panel de Estado */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facturas.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Autorizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{facturasAutorizadas.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{facturasRechazadas.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{facturasPendientes.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="facturas" className="w-full">
        <TabsList>
          <TabsTrigger value="facturas">Facturas</TabsTrigger>
          <TabsTrigger value="nueva">Nueva Factura</TabsTrigger>
          <TabsTrigger value="puntos-venta">Puntos de Venta</TabsTrigger>
          <TabsTrigger value="sectores">Sectores Especiales</TabsTrigger>
        </TabsList>

        <TabsContent value="facturas">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Facturas Electrónicas</CardTitle>
              <CardDescription>
                Historial de facturas electrónicas emitidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturas.map(factura => {
                    const sector = obtenerSectorEspecial(factura.codigoSector);
                    return (
                      <TableRow key={factura.id}>
                        <TableCell className="font-medium">{factura.numero}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{factura.razonSocial}</div>
                            <div className="text-sm text-muted-foreground">NIT: {factura.nit}</div>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(factura.fecha).toLocaleDateString('es-BO')}</TableCell>
                        <TableCell className="text-right">Bs. {factura.montoTotal.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {sector ? `${sector.codigo} - Tasa ${sector.tasa}%` : factura.codigoSector}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            factura.estado === 'autorizado' ? 'default' :
                            factura.estado === 'rechazado' ? 'destructive' :
                            factura.estado === 'enviado' ? 'secondary' : 'outline'
                          }>
                            {factura.estado === 'autorizado' ? 'Autorizado' :
                             factura.estado === 'rechazado' ? 'Rechazado' :
                             factura.estado === 'enviado' ? 'Enviado' : 'Borrador'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {factura.estado === 'borrador' && (
                            <Button
                              size="sm"
                              onClick={() => enviarFacturaSIN(factura.id)}
                              disabled={!conectadoSIN}
                            >
                              Enviar SIN
                            </Button>
                          )}
                          {factura.estado === 'autorizado' && (
                            <Button size="sm" variant="outline">
                              <Download className="w-4 h-4 mr-1" />
                              PDF
                            </Button>
                          )}
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
              <CardTitle>Nueva Factura Electrónica</CardTitle>
              <CardDescription>
                Crear nueva factura electrónica según normativa 2026 - Facturación en Línea
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NuevaFacturaForm 
                onCrear={crearFacturaElectronica}
                puntosVenta={puntosVenta}
                conectado={conectadoSIN}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="puntos-venta">
          <Card>
            <CardHeader>
              <CardTitle>Puntos de Venta</CardTitle>
              <CardDescription>
                Gestión de puntos de venta habilitados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {puntosVenta.map(punto => (
                  <Card key={punto.codigo}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{punto.nombre}</CardTitle>
                      <CardDescription>Código: {punto.codigo}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant={punto.tipo === 'fijo' ? 'default' : 'secondary'}>
                          {punto.tipo === 'fijo' ? 'Fijo' : 'Móvil'}
                        </Badge>
                        <Badge variant={punto.estado === 'activo' ? 'default' : 'destructive'}>
                          {punto.estado === 'activo' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sectores">
          <Card>
            <CardHeader>
              <CardTitle>Sectores Especiales</CardTitle>
              <CardDescription>
                Sectores con tratamiento tributario especial según RND 2025-2026 (incluye DS 5503)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(sectoresEspeciales).map(([nombre, sector]) => (
                  <Card key={sector.codigo}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg capitalize">{nombre.replace(/([A-Z])/g, ' $1')}</CardTitle>
                      <CardDescription>Código: {sector.codigo}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Badge variant={sector.tasa === 0 ? 'default' : 'secondary'}>
                        Tasa IVA: {sector.tasa}%
                      </Badge>
                      {sector.tasa === 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Exento de IVA según normativa vigente
                        </p>
                      )}
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

// Componente para formulario de nueva factura
const NuevaFacturaForm = ({ onCrear, puntosVenta, conectado }: {
  onCrear: (datos: Partial<FacturaElectronica>) => void;
  puntosVenta: PuntoVentaElectronico[];
  conectado: boolean;
}) => {
  const [formData, setFormData] = useState({
    codigoPuntoVenta: 0,
    nit: '',
    razonSocial: '',
    montoTotal: 0,
    codigoSector: 1,
    actividadEconomica: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conectado) return;
    
    onCrear(formData);
    
    // Limpiar formulario
    setFormData({
      codigoPuntoVenta: 0,
      nit: '',
      razonSocial: '',
      montoTotal: 0,
      codigoSector: 1,
      actividadEconomica: ''
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Punto de Venta</Label>
          <Select 
            value={formData.codigoPuntoVenta.toString()} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, codigoPuntoVenta: parseInt(value) }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione punto de venta" />
            </SelectTrigger>
            <SelectContent>
              {puntosVenta.filter(p => p.estado === 'activo').map(punto => (
                <SelectItem key={punto.codigo} value={punto.codigo.toString()}>
                  {punto.codigo} - {punto.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Sector</Label>
          <Select 
            value={formData.codigoSector.toString()} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, codigoSector: parseInt(value) }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione sector" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(sectoresEspeciales).map(([nombre, sector]) => (
                <SelectItem key={sector.codigo} value={sector.codigo.toString()}>
                  {sector.codigo} - {nombre} (IVA {sector.tasa}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>NIT Cliente</Label>
          <Input
            value={formData.nit}
            onChange={(e) => setFormData(prev => ({ ...prev, nit: e.target.value }))}
            placeholder="Ej: 1234567890"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Razón Social</Label>
          <Input
            value={formData.razonSocial}
            onChange={(e) => setFormData(prev => ({ ...prev, razonSocial: e.target.value }))}
            placeholder="Nombre del cliente"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Monto Total (Bs.)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.montoTotal}
            onChange={(e) => setFormData(prev => ({ ...prev, montoTotal: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Actividad Económica</Label>
          <Select 
            value={formData.actividadEconomica} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, actividadEconomica: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione actividad" />
            </SelectTrigger>
            <SelectContent>
              {actividadesEconomicas.map(actividad => (
                <SelectItem key={actividad.codigo} value={actividad.codigo}>
                  {actividad.codigo} - {actividad.descripcion}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={!conectado}
      >
        <FileText className="w-4 h-4 mr-2" />
        Crear Factura Electrónica
      </Button>
      
      {!conectado && (
        <p className="text-sm text-red-600 text-center">
          Debe verificar la conexión con el SIN antes de crear facturas
        </p>
      )}
    </form>
  );
};

export default FacturacionElectronicaModule;