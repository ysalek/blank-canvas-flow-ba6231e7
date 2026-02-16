
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search, Users, Phone, Mail, MapPin, Check, TrendingUp, Activity, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Cliente, clientesIniciales } from "./billing/BillingData";
import { useSupabaseClientes } from "@/hooks/useSupabaseClientes";
import ClienteForm from "./clients/ClienteForm";
import { EnhancedHeader, MetricGrid, EnhancedMetricCard, Section } from "./dashboard/EnhancedLayout";

const ClientesModule = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const {
    clientes,
    loading,
    crearCliente,
    actualizarCliente,
    eliminarCliente,
    refetch
  } = useSupabaseClientes();

  const handleSaveCliente = async (cliente: any) => {
    try {
      const payload = {
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
          description: `${cliente.nombre} ha sido actualizado exitosamente.`,
        });
      } else {
        await crearCliente(payload);
        toast({
          title: "Cliente creado",
          description: `${cliente.nombre} ha sido agregado exitosamente.`,
        });
      }
      
      setShowForm(false);
      setEditingCliente(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el cliente. Verifique su conexión.",
        variant: "destructive"
      });
    }
  };

  const handleEditCliente = (cliente: any) => {
    setEditingCliente(cliente);
    setShowForm(true);
  };

  const handleDeleteCliente = async (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    if (confirm(`¿Está seguro de eliminar el cliente ${cliente.nombre}?`)) {
      try {
        await eliminarCliente(clienteId);
        toast({
          title: "Cliente eliminado",
          description: `${cliente.nombre} ha sido eliminado exitosamente.`,
        });
        refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo eliminar el cliente",
          variant: "destructive"
        });
      }
    }
  };

  const handleReactivateCliente = async (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    if (confirm(`¿Está seguro de reactivar el cliente ${cliente.nombre}?`)) {
      try {
        await actualizarCliente(clienteId, { activo: true });
        toast({
          title: "Cliente reactivado",
          description: `${cliente.nombre} ha sido reactivado exitosamente.`,
        });
        refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo reactivar el cliente",
          variant: "destructive"
        });
      }
    }
  };

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.nit.includes(searchTerm) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clientesActivos = clientes.filter(c => c.activo).length;
  const clientesInactivos = clientes.filter(c => !c.activo).length;

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
    <div className="space-y-8">
      {/* Enhanced Header */}
      <EnhancedHeader
        title="Centro de Relaciones Comerciales"
        subtitle="Gestión integral de clientes con historial comercial y análisis de comportamiento"
        badge={{
          text: `${clientesActivos} Clientes Activos`,
          variant: "default"
        }}
        actions={
          <Button 
            className="bg-gradient-to-r from-primary to-primary/80 shadow-lg hover:shadow-xl"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        }
      />

      {/* Enhanced Metrics Section */}
      <Section 
        title="Métricas de Clientes" 
        subtitle="Indicadores clave de la base de clientes y actividad comercial"
      >
        <MetricGrid columns={3}>
          <EnhancedMetricCard
            title="Clientes Activos"
            value={clientesActivos}
            subtitle="Base de clientes operativa"
            icon={Users}
            variant="success"
            trend="up"
            trendValue={`${((clientesActivos / Math.max(clientes.length, 1)) * 100).toFixed(0)}% del total`}
          />
          <EnhancedMetricCard
            title="Clientes Inactivos"
            value={clientesInactivos}
            subtitle="Requieren reactivación"
            icon={UserCheck}
            variant={clientesInactivos > 0 ? "warning" : "success"}
            trend={clientesInactivos > 0 ? "down" : "up"}
            trendValue="Gestión de cartera"
          />
          <EnhancedMetricCard
            title="Total Registrados"
            value={clientes.length}
            subtitle="Base completa de clientes"
            icon={Activity}
            variant="default"
            trend="up"
            trendValue="Crecimiento de cartera"
          />
        </MetricGrid>
      </Section>

      {/* Enhanced Client List */}
      <Section 
        title="Directorio de Clientes"
        subtitle="Base de datos completa con información de contacto y estado comercial"
      >
        <Card className="card-gradient">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  Clientes Registrados
                </CardTitle>
                <CardDescription>
                  Busca y gestiona la información de tus clientes
                </CardDescription>
              </div>
              <div className="w-full max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, NIT o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <div className="divide-y divide-border">
                {clientesFiltrados.map((cliente) => (
                <div key={cliente.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{cliente.nombre}</h3>
                        <Badge variant={cliente.activo ? "default" : "secondary"}>
                            {cliente.activo ? "Activo" : "Inactivo"}
                        </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">NIT:</span>
                            <span>{cliente.nit}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{cliente.email}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{cliente.telefono}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{cliente.direccion}</span>
                        </div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground pt-2">
                        Registrado el: {new Date(cliente.created_at || '').toLocaleDateString('es-BO')}
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditCliente(cliente)}
                        >
                        <Edit className="w-4 h-4" />
                        </Button>
                        {cliente.activo ? (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteCliente(cliente.id)}
                            aria-label="Desactivar cliente"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReactivateCliente(cliente.id)}
                            aria-label="Reactivar cliente"
                        >
                            <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        )}
                    </div>
                    </div>
                </div>
                ))}
                
                {clientesFiltrados.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-semibold">No se encontraron clientes</p>
                    <p className="text-sm">Intenta con otro término de búsqueda.</p>
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
