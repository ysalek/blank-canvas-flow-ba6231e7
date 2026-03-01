import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Truck, Phone, Mail, Users, Activity } from 'lucide-react';
import { useSupabaseProveedores } from '@/hooks/useSupabaseProveedores';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { EnhancedHeader, MetricGrid, EnhancedMetricCard, Section } from '../dashboard/EnhancedLayout';

const ProveedoresModule = () => {
  const { proveedores, loading, crearProveedor } = useSupabaseProveedores();
  const [busqueda, setBusqueda] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [nuevoProveedor, setNuevoProveedor] = useState({
    nombre: '', nit: '', email: '', telefono: '', direccion: '', contacto: '',
  });

  const proveedoresFiltrados = proveedores.filter((p: any) =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.nit?.includes(busqueda)
  );

  const proveedoresActivos = proveedores.filter((p: any) => p.activo !== false).length;

  const handleAgregar = async () => {
    if (!nuevoProveedor.nombre || !nuevoProveedor.nit) {
      toast({ title: 'Error', description: 'Nombre y NIT son obligatorios', variant: 'destructive' });
      return;
    }
    await crearProveedor(nuevoProveedor as any);
    setDialogOpen(false);
    setNuevoProveedor({ nombre: '', nit: '', email: '', telefono: '', direccion: '', contacto: '' });
    toast({ title: 'Proveedor registrado', description: `${nuevoProveedor.nombre} agregado exitosamente` });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <EnhancedHeader
        title="Proveedores"
        subtitle="Gestión de proveedores y contactos comerciales"
        badge={{
          text: `${proveedoresActivos} activos`,
          variant: "default"
        }}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Nuevo
              </Button>
            </DialogTrigger>
            <DialogContent className="dialog-animated">
              <DialogHeader><DialogTitle>Registrar Proveedor</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Nombre/Razón Social *</Label><Input value={nuevoProveedor.nombre} onChange={e => setNuevoProveedor(p => ({ ...p, nombre: e.target.value }))} /></div>
                  <div><Label>NIT *</Label><Input value={nuevoProveedor.nit} onChange={e => setNuevoProveedor(p => ({ ...p, nit: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Email</Label><Input type="email" value={nuevoProveedor.email} onChange={e => setNuevoProveedor(p => ({ ...p, email: e.target.value }))} /></div>
                  <div><Label>Teléfono</Label><Input value={nuevoProveedor.telefono} onChange={e => setNuevoProveedor(p => ({ ...p, telefono: e.target.value }))} /></div>
                </div>
                <div><Label>Dirección</Label><Input value={nuevoProveedor.direccion} onChange={e => setNuevoProveedor(p => ({ ...p, direccion: e.target.value }))} /></div>
                <div><Label>Persona de Contacto</Label><Input value={nuevoProveedor.contacto} onChange={e => setNuevoProveedor(p => ({ ...p, contacto: e.target.value }))} /></div>
                <Button onClick={handleAgregar} className="w-full">Registrar Proveedor</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Section title="Resumen" subtitle="">
        <MetricGrid columns={3}>
          <EnhancedMetricCard
            title="Total Proveedores"
            value={proveedores.length}
            subtitle="Base completa"
            icon={Truck}
            variant="default"
            trend="up"
            trendValue="Registro activo"
          />
          <EnhancedMetricCard
            title="Proveedores Activos"
            value={proveedoresActivos}
            subtitle="Operativos"
            icon={Users}
            variant="success"
            trend="up"
            trendValue={`${((proveedoresActivos / Math.max(proveedores.length, 1)) * 100).toFixed(0)}% del total`}
          />
          <EnhancedMetricCard
            title="Inactivos"
            value={proveedores.length - proveedoresActivos}
            subtitle="Sin actividad"
            icon={Activity}
            variant={proveedores.length - proveedoresActivos > 0 ? "warning" : "success"}
            trend={proveedores.length - proveedoresActivos > 0 ? "down" : "up"}
            trendValue="Gestión de proveedores"
          />
        </MetricGrid>
      </Section>

      <Section title="Directorio" subtitle="">
        <Card className="card-gradient">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-primary" />
                  Lista de Proveedores
                </CardTitle>
                <CardDescription>Busca y gestiona tus proveedores</CardDescription>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por nombre o NIT..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando proveedores...</div>
            ) : proveedoresFiltrados.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Truck className="w-16 h-16 mx-auto mb-4 empty-state-icon" />
                <p className="font-semibold">No hay proveedores registrados</p>
                <p className="text-sm">Agrega tu primer proveedor para comenzar.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre/Razón Social</TableHead>
                    <TableHead>NIT</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proveedoresFiltrados.map((p: any) => (
                    <TableRow key={p.id} className="table-row-interactive">
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="font-mono text-sm">{p.nit}</TableCell>
                      <TableCell>
                        {p.email ? (
                          <span className="flex items-center gap-1.5 text-sm">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                            {p.email}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {p.telefono ? (
                          <span className="flex items-center gap-1.5 text-sm">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            {p.telefono}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{p.contacto || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={p.activo !== false ? 'default' : 'secondary'}>
                          {p.activo !== false ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  );
};

export default ProveedoresModule;
