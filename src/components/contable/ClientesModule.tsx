import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
  Phone,
  Mail,
  MapPin,
  Check,
  Activity,
  UserCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Cliente } from "./billing/BillingData";
import { useSupabaseClientes } from "@/hooks/useSupabaseClientes";
import ClienteForm from "./clients/ClienteForm";
import {
  EnhancedHeader,
  MetricGrid,
  EnhancedMetricCard,
  Section,
} from "./dashboard/EnhancedLayout";

type ClientePayload = {
  nombre: string;
  nit: string;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  activo?: boolean;
};

const ClientesModule = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { clientes, crearCliente, actualizarCliente, eliminarCliente, refetch } =
    useSupabaseClientes();

  const handleSaveCliente = async (cliente: Cliente) => {
    try {
      const payload: ClientePayload = {
        nombre: cliente.nombre,
        nit: cliente.nit,
        email: cliente.email || null,
        telefono: cliente.telefono || null,
        direccion: cliente.direccion || null,
        activo: cliente.activo ?? true,
      };

      if (editingCliente) {
        await actualizarCliente(editingCliente.id, payload);
        toast({
          title: "Cliente actualizado",
          description: `${cliente.nombre} fue actualizado exitosamente.`,
        });
      } else {
        await crearCliente(payload);
        toast({
          title: "Cliente creado",
          description: `${cliente.nombre} fue agregado exitosamente.`,
        });
      }

      setShowForm(false);
      setEditingCliente(null);
      refetch();
    } catch {
      toast({
        title: "Error",
        description: "No se pudo guardar el cliente. Verifica la conexion.",
        variant: "destructive",
      });
    }
  };

  const handleEditCliente = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setShowForm(true);
  };

  const handleDeleteCliente = async (clienteId: string) => {
    const cliente = clientes.find((item) => item.id === clienteId);
    if (!cliente) return;

    if (confirm(`Esta seguro de desactivar el cliente ${cliente.nombre}?`)) {
      try {
        await eliminarCliente(clienteId);
        toast({
          title: "Cliente desactivado",
          description: `${cliente.nombre} fue dado de baja correctamente.`,
        });
        refetch();
      } catch {
        toast({
          title: "Error",
          description: "No se pudo desactivar el cliente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleReactivateCliente = async (clienteId: string) => {
    const cliente = clientes.find((item) => item.id === clienteId);
    if (!cliente) return;

    if (confirm(`Esta seguro de reactivar el cliente ${cliente.nombre}?`)) {
      try {
        await actualizarCliente(clienteId, { activo: true });
        toast({
          title: "Cliente reactivado",
          description: `${cliente.nombre} fue reactivado exitosamente.`,
        });
        refetch();
      } catch {
        toast({
          title: "Error",
          description: "No se pudo reactivar el cliente.",
          variant: "destructive",
        });
      }
    }
  };

  const clientesFiltrados = clientes.filter(
    (cliente) =>
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.nit.includes(searchTerm) ||
      cliente.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const clientesActivos = clientes.filter((cliente) => cliente.activo).length;
  const clientesInactivos = clientes.filter((cliente) => !cliente.activo).length;

  if (showForm) {
    return (
      <ClienteForm
        cliente={editingCliente}
        onSave={handleSaveCliente}
        onCancel={() => {
          setShowForm(false);
          setEditingCliente(null);
        }}
      />
    );
  }

  return (
    <div className="page-shell space-y-6 pb-12">
      <EnhancedHeader
        title="Clientes"
        subtitle="Gestiona cartera comercial, contactos y seguimiento de relacion con una superficie mas premium y clara."
        badge={{
          text: `${clientesActivos} activos`,
          variant: "default",
        }}
        actions={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo cliente
          </Button>
        }
      />

      <div className="hero-panel rounded-[2rem] p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Directorio comercial
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">
                Base de clientes lista para facturacion y cobranza
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                El directorio alimenta ventas, cartera y seguimiento comercial desde la misma
                fuente de datos.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                  {clientes.length} clientes registrados
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                  {clientesInactivos} por reactivar
                </Badge>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-50 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Pulso relacional
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold">Cobertura activa</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    {`${((clientesActivos / Math.max(clientes.length, 1)) * 100).toFixed(0)}% de la base esta habilitada para operar.`}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold">Busqueda rapida</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    Usa nombre, NIT o correo para llegar rapido al contacto correcto.
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
                  <p className="text-xs text-slate-500">Clientes operativos</p>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{clientesActivos}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Inactivos</p>
                  <p className="text-xs text-slate-500">Casos para reactivacion</p>
                </div>
                <p className="text-2xl font-bold text-amber-700">{clientesInactivos}</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Base total</p>
                  <p className="text-xs text-slate-500">Directorio comercial visible</p>
                </div>
                <p className="text-2xl font-bold text-slate-950">{clientes.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MetricGrid columns={3}>
        <EnhancedMetricCard
          title="Clientes activos"
          value={clientesActivos}
          subtitle="Base operativa"
          icon={Users}
          variant="success"
          trend="up"
          trendValue={`${((clientesActivos / Math.max(clientes.length, 1)) * 100).toFixed(0)}% del total`}
        />
        <EnhancedMetricCard
          title="Inactivos"
          value={clientesInactivos}
          subtitle="Casos a gestionar"
          icon={UserCheck}
          variant={clientesInactivos > 0 ? "warning" : "success"}
          trend={clientesInactivos > 0 ? "down" : "up"}
          trendValue="Reactivacion comercial"
        />
        <EnhancedMetricCard
          title="Total registrados"
          value={clientes.length}
          subtitle="Base completa de clientes"
          icon={Activity}
          trend="up"
          trendValue="Cartera consolidada"
        />
      </MetricGrid>

      <Section title="Directorio" subtitle="Busqueda y gestion del directorio comercial">
        <Card className="card-gradient rounded-[1.75rem]">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  Clientes registrados
                </CardTitle>
                <CardDescription>
                  Busca y gestiona la informacion clave de tus clientes.
                </CardDescription>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, NIT o email..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/85">
              <div className="divide-y divide-border">
                {clientesFiltrados.map((cliente) => (
                  <div key={cliente.id} className="group p-5 transition hover:bg-slate-50/70">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-slate-950">{cliente.nombre}</h3>
                          <Badge variant={cliente.activo ? "default" : "secondary"}>
                            {cliente.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm text-slate-600 md:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-950">NIT:</span>
                            <span>{cliente.nit}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span>{cliente.email || "Sin correo"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span>{cliente.telefono || "Sin telefono"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span>{cliente.direccion || "Sin direccion"}</span>
                          </div>
                        </div>

                        <div className="text-xs text-slate-500">
                          Registrado el {new Date(cliente.created_at || "").toLocaleDateString("es-BO")}
                        </div>
                      </div>

                      <div className="flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <Button size="sm" variant="outline" onClick={() => handleEditCliente(cliente)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {cliente.activo ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteCliente(cliente.id)}
                            aria-label="Desactivar cliente"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReactivateCliente(cliente.id)}
                            aria-label="Reactivar cliente"
                          >
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {clientesFiltrados.length === 0 && (
                  <div className="py-16 text-center text-slate-500">
                    <Users className="empty-state-icon mx-auto mb-4 h-12 w-12" />
                    <p className="font-semibold">No se encontraron clientes</p>
                    <p className="text-sm">Intenta con otro termino de busqueda.</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
};

export default ClientesModule;
