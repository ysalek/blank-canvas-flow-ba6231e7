import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, DollarSign, Users, Truck, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useContabilidadIntegration } from "@/hooks/useContabilidadIntegration";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Anticipo {
  id: string;
  tipo: 'cliente' | 'proveedor';
  entidadId: string;
  entidadNombre: string;
  monto: number;
  fecha: string;
  concepto: string;
  estado: 'activo' | 'aplicado' | 'anulado';
  aplicadoEn?: string; // Número de factura o compra donde se aplicó
  fechaCreacion: string;
}

const AdvancesManagement = () => {
  const [anticipos, setAnticipos] = useState<Anticipo[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newAnticipo, setNewAnticipo] = useState({
    tipo: 'cliente' as 'cliente' | 'proveedor',
    entidadId: '',
    monto: 0,
    concepto: ''
  });
  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const { toast } = useToast();
  const { guardarAsiento } = useContabilidadIntegration();

  useEffect(() => {
    const anticiposGuardados = localStorage.getItem('anticipos');
    if (anticiposGuardados) setAnticipos(JSON.parse(anticiposGuardados));

    const clientesGuardados = localStorage.getItem('clientes');
    if (clientesGuardados) setClientes(JSON.parse(clientesGuardados));

    const proveedoresGuardados = localStorage.getItem('proveedores');
    if (proveedoresGuardados) setProveedores(JSON.parse(proveedoresGuardados));
  }, []);

  const generateAccountingEntry = (anticipo: Anticipo) => {
    const fecha = new Date().toISOString().slice(0, 10);
    const numero = `ANT-${Date.now()}`;
    
    if (anticipo.tipo === 'cliente') {
      // Anticipo de Cliente: 
      // DEBE: Caja (1111) 
      // HABER: Anticipo de Clientes (2121) - PASIVO
      return {
        id: numero,
        numero,
        fecha,
        concepto: `Anticipo recibido de ${anticipo.entidadNombre} - ${anticipo.concepto}`,
        referencia: `Anticipo Cliente ${anticipo.entidadNombre}`,
        estado: 'registrado' as const,
        debe: anticipo.monto,
        haber: anticipo.monto,
        cuentas: [
          {
            codigo: '1111',
            nombre: 'Caja',
            debe: anticipo.monto,
            haber: 0
          },
          {
            codigo: '2121',
            nombre: 'Anticipos de Clientes',
            debe: 0,
            haber: anticipo.monto
          }
        ]
      };
    } else {
      // Anticipo a Proveedor:
      // DEBE: Anticipo a Proveedores (1151) - ACTIVO
      // HABER: Caja (1111)
      return {
        id: numero,
        numero,
        fecha,
        concepto: `Anticipo entregado a ${anticipo.entidadNombre} - ${anticipo.concepto}`,
        referencia: `Anticipo Proveedor ${anticipo.entidadNombre}`,
        estado: 'registrado' as const,
        debe: anticipo.monto,
        haber: anticipo.monto,
        cuentas: [
          {
            codigo: '1151',
            nombre: 'Anticipos a Proveedores',
            debe: anticipo.monto,
            haber: 0
          },
          {
            codigo: '1111',
            nombre: 'Caja',
            debe: 0,
            haber: anticipo.monto
          }
        ]
      };
    }
  };

  const handleSaveAnticipo = async () => {
    if (!newAnticipo.entidadId || newAnticipo.monto <= 0) {
      toast({
        title: "Error",
        description: "Complete todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    const entidades = newAnticipo.tipo === 'cliente' ? clientes : proveedores;
    const entidad = entidades.find((e: any) => e.id === newAnticipo.entidadId);
    
    if (!entidad) {
      toast({
        title: "Error",
        description: "Entidad no encontrada",
        variant: "destructive"
      });
      return;
    }

    const nuevoAnticipo: Anticipo = {
      id: `ant-${Date.now()}`,
      tipo: newAnticipo.tipo,
      entidadId: newAnticipo.entidadId,
      entidadNombre: (entidad as any).nombre,
      monto: newAnticipo.monto,
      fecha: new Date().toISOString().slice(0, 10),
      concepto: newAnticipo.concepto,
      estado: 'activo',
      fechaCreacion: new Date().toISOString()
    };

    // Generar asiento contable
    const asientoContable = generateAccountingEntry(nuevoAnticipo);
    
    const asientoGuardado = await guardarAsiento(asientoContable);
    if (!asientoGuardado) {
      return; // Error ya mostrado por el hook
    }

    const nuevosAnticipos = [nuevoAnticipo, ...anticipos];
    setAnticipos(nuevosAnticipos);
    localStorage.setItem('anticipos', JSON.stringify(nuevosAnticipos));

    toast({
      title: "Anticipo Registrado",
      description: `Anticipo de ${nuevoAnticipo.tipo} por Bs. ${nuevoAnticipo.monto.toFixed(2)} registrado correctamente`,
    });

    setShowNewForm(false);
    setNewAnticipo({
      tipo: 'cliente',
      entidadId: '',
      monto: 0,
      concepto: ''
    });
  };

  const anticiposClientes = anticipos.filter(a => a.tipo === 'cliente' && a.estado === 'activo');
  const anticiposProveedores = anticipos.filter(a => a.tipo === 'proveedor' && a.estado === 'activo');
  const totalAnticiposClientes = anticiposClientes.reduce((sum, a) => sum + a.monto, 0);
  const totalAnticiposProveedores = anticiposProveedores.reduce((sum, a) => sum + a.monto, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Anticipos</h2>
          <p className="text-muted-foreground">Control contable de anticipos de clientes y proveedores</p>
        </div>
        <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Anticipo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Anticipo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo de Anticipo</Label>
                <Select value={newAnticipo.tipo} onValueChange={(value: 'cliente' | 'proveedor') => 
                  setNewAnticipo({...newAnticipo, tipo: value, entidadId: ''})
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente">Anticipo de Cliente</SelectItem>
                    <SelectItem value="proveedor">Anticipo a Proveedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{newAnticipo.tipo === 'cliente' ? 'Cliente' : 'Proveedor'}</Label>
                <div className="flex gap-2">
                  <Select value={newAnticipo.entidadId} onValueChange={(value) => 
                    setNewAnticipo({...newAnticipo, entidadId: value})
                  }>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={`Seleccionar ${newAnticipo.tipo}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(newAnticipo.tipo === 'cliente' ? clientes : proveedores).map((entidad: any) => (
                        <SelectItem key={entidad.id} value={entidad.id}>
                          {entidad.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      // TODO: Abrir modal para agregar nuevo cliente/proveedor
                      console.log(`Agregar nuevo ${newAnticipo.tipo}`);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Monto</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newAnticipo.monto || ''}
                  onChange={(e) => setNewAnticipo({...newAnticipo, monto: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Concepto</Label>
                <Textarea
                  value={newAnticipo.concepto}
                  onChange={(e) => setNewAnticipo({...newAnticipo, concepto: e.target.value})}
                  placeholder="Descripción del anticipo..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveAnticipo}>Registrar Anticipo</Button>
                <Button variant="outline" onClick={() => setShowNewForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Tratamiento Contable Correcto:</strong><br/>
          • <strong>Anticipos de Clientes:</strong> Se registran como PASIVO (cuenta 2121) porque es dinero que debemos al cliente en forma de productos/servicios.<br/>
          • <strong>Anticipos a Proveedores:</strong> Se registran como ACTIVO (cuenta 1151) porque es dinero que el proveedor nos debe en forma de productos/servicios.<br/>
          • En cuentas por cobrar/pagar se muestran en NEGATIVO para reflejar el saldo real.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anticipos de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Bs. {totalAnticiposClientes.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{anticiposClientes.length} anticipos activos (Pasivo)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anticipos a Proveedores</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Bs. {totalAnticiposProveedores.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{anticiposProveedores.length} anticipos activos (Activo)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Anticipos Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente/Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anticipos.filter(a => a.estado === 'activo').map((anticipo) => (
                <TableRow key={anticipo.id}>
                  <TableCell>
                    <Badge variant={anticipo.tipo === 'cliente' ? 'default' : 'secondary'}>
                      {anticipo.tipo === 'cliente' ? 'Cliente' : 'Proveedor'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{anticipo.entidadNombre}</TableCell>
                  <TableCell>{new Date(anticipo.fecha).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">Bs. {anticipo.monto.toFixed(2)}</TableCell>
                  <TableCell>{anticipo.concepto}</TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      {anticipo.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {anticipos.filter(a => a.estado === 'activo').length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No hay anticipos activos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancesManagement;
