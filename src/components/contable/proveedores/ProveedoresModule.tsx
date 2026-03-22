import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Truck, Phone, Mail, Users, Activity } from "lucide-react";
import { useSupabaseProveedores } from "@/hooks/useSupabaseProveedores";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  EnhancedHeader,
  MetricGrid,
  EnhancedMetricCard,
  Section,
} from "../dashboard/EnhancedLayout";

const ProveedoresModule = () => {
  const { proveedores, loading, crearProveedor } = useSupabaseProveedores();
  const [busqueda, setBusqueda] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [nuevoProveedor, setNuevoProveedor] = useState({
    nombre: "",
    nit: "",
    email: "",
    telefono: "",
    direccion: "",
    contacto: "",
  });

  const proveedoresFiltrados = proveedores.filter(
    (proveedor) =>
      proveedor.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      proveedor.nit?.includes(busqueda),
  );

  const proveedoresActivos = proveedores.filter((proveedor) => proveedor.activo !== false).length;
  const proveedoresInactivos = proveedores.length - proveedoresActivos;

  const handleAgregar = async () => {
    if (!nuevoProveedor.nombre || !nuevoProveedor.nit) {
      toast({
        title: "Error",
        description: "Nombre y NIT son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    await crearProveedor({
      nombre: nuevoProveedor.nombre,
      nit: nuevoProveedor.nit,
      email: nuevoProveedor.email || undefined,
      telefono: nuevoProveedor.telefono || "",
      direccion: nuevoProveedor.direccion || "",
      codigo: `PROV-${Date.now()}`,
      activo: true,
      saldo_deuda: 0,
    });

    setDialogOpen(false);
    setNuevoProveedor({
      nombre: "",
      nit: "",
      email: "",
      telefono: "",
      direccion: "",
      contacto: "",
    });

    toast({
      title: "Proveedor registrado",
      description: `${nuevoProveedor.nombre} fue agregado exitosamente.`,
    });
  };

  return (
    <div className="page-shell space-y-6 pb-12">
      <EnhancedHeader
        title="Proveedores"
        subtitle="Gestiona tu red de abastecimiento y contactos comerciales con una vista mas clara y profesional."
        badge={{
          text: `${proveedoresActivos} activos`,
          variant: "default",
        }}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Nuevo proveedor
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[1.75rem]">
              <DialogHeader>
                <DialogTitle>Registrar proveedor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre o razon social *</Label>
                    <Input
                      value={nuevoProveedor.nombre}
                      onChange={(event) =>
                        setNuevoProveedor((prev) => ({ ...prev, nombre: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>NIT *</Label>
                    <Input
                      value={nuevoProveedor.nit}
                      onChange={(event) =>
                        setNuevoProveedor((prev) => ({ ...prev, nit: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={nuevoProveedor.email}
                      onChange={(event) =>
                        setNuevoProveedor((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Telefono</Label>
                    <Input
                      value={nuevoProveedor.telefono}
                      onChange={(event) =>
                        setNuevoProveedor((prev) => ({ ...prev, telefono: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Direccion</Label>
                  <Input
                    value={nuevoProveedor.direccion}
                    onChange={(event) =>
                      setNuevoProveedor((prev) => ({ ...prev, direccion: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Persona de contacto</Label>
                  <Input
                    value={nuevoProveedor.contacto}
                    onChange={(event) =>
                      setNuevoProveedor((prev) => ({ ...prev, contacto: event.target.value }))
                    }
                  />
                </div>
                <Button onClick={handleAgregar} className="w-full">
                  Registrar proveedor
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="hero-panel rounded-[2rem] p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Red de suministro
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">
                Proveedores listos para compras y pagos
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                El directorio alimenta compras, cuentas por pagar y negociacion con terceros
                desde una sola base persistida.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                  {proveedores.length} registros
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                  {proveedoresInactivos} inactivos
                </Badge>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Lectura operativa
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold">Cobertura activa</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {`${((proveedoresActivos / Math.max(proveedores.length, 1)) * 100).toFixed(0)}% de la base esta disponible para operacion.`}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold">Busqueda rapida</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    Usa razon social o NIT para encontrar rapidamente al proveedor correcto.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Enfoque del dia
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Activos</p>
                  <p className="text-xs text-slate-500">Proveedores operativos</p>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{proveedoresActivos}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Inactivos</p>
                  <p className="text-xs text-slate-500">Casos para depuracion</p>
                </div>
                <p className="text-2xl font-bold text-amber-700">{proveedoresInactivos}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Base total</p>
                  <p className="text-xs text-slate-500">Relacion de abastecimiento</p>
                </div>
                <p className="text-2xl font-bold text-slate-950">{proveedores.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MetricGrid columns={3}>
        <EnhancedMetricCard
          title="Total proveedores"
          value={proveedores.length}
          subtitle="Base completa"
          icon={Truck}
          trend="up"
          trendValue="Registro activo"
        />
        <EnhancedMetricCard
          title="Activos"
          value={proveedoresActivos}
          subtitle="Operativos"
          icon={Users}
          variant="success"
          trend="up"
          trendValue={`${((proveedoresActivos / Math.max(proveedores.length, 1)) * 100).toFixed(0)}% del total`}
        />
        <EnhancedMetricCard
          title="Inactivos"
          value={proveedoresInactivos}
          subtitle="Sin actividad"
          icon={Activity}
          variant={proveedoresInactivos > 0 ? "warning" : "success"}
          trend={proveedoresInactivos > 0 ? "down" : "up"}
          trendValue="Gestion de suministro"
        />
      </MetricGrid>

      <Section title="Directorio" subtitle="Busqueda y gestion del ecosistema de proveedores">
        <Card className="card-gradient rounded-[1.75rem]">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-primary" />
                  Lista de proveedores
                </CardTitle>
                <CardDescription>Busca y gestiona tus proveedores</CardDescription>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o NIT..."
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Cargando proveedores...</div>
            ) : proveedoresFiltrados.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Truck className="empty-state-icon mx-auto mb-4 h-16 w-16" />
                <p className="font-semibold">No hay proveedores registrados</p>
                <p className="text-sm">Agrega tu primer proveedor para comenzar.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/85">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre o razon social</TableHead>
                      <TableHead>NIT</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proveedoresFiltrados.map((proveedor) => (
                      <TableRow key={proveedor.id} className="table-row-interactive">
                        <TableCell className="font-medium">{proveedor.nombre}</TableCell>
                        <TableCell className="font-mono text-sm">{proveedor.nit}</TableCell>
                        <TableCell>
                          {proveedor.email ? (
                            <span className="flex items-center gap-1.5 text-sm">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              {proveedor.email}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {proveedor.telefono ? (
                            <span className="flex items-center gap-1.5 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {proveedor.telefono}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{proveedor.contacto || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={proveedor.activo !== false ? "default" : "secondary"}>
                            {proveedor.activo !== false ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  );
};

export default ProveedoresModule;
