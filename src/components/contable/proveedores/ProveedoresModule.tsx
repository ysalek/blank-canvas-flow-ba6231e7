import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Truck, Phone, Mail } from 'lucide-react';
import { useSupabaseProveedores } from '@/hooks/useSupabaseProveedores';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Proveedores</h2>
          <p className="text-muted-foreground">Gestión de proveedores y contactos comerciales</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nuevo Proveedor</Button>
          </DialogTrigger>
          <DialogContent>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10"><Truck className="w-6 h-6 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Proveedores</p>
              <p className="text-2xl font-bold">{proveedores.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-success/10"><Truck className="w-6 h-6 text-success" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Activos</p>
              <p className="text-2xl font-bold">{proveedores.filter((p: any) => p.activo !== false).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Proveedores</CardTitle>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nombre o NIT..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="pl-9 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando proveedores...</div>
          ) : proveedoresFiltrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No hay proveedores registrados</p>
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
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell>{p.nit}</TableCell>
                    <TableCell>{p.email || '-'}</TableCell>
                    <TableCell>{p.telefono || '-'}</TableCell>
                    <TableCell>{p.contacto || '-'}</TableCell>
                    <TableCell><Badge variant={p.activo !== false ? 'default' : 'secondary'}>{p.activo !== false ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProveedoresModule;
