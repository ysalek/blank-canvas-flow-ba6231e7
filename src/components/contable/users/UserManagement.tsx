import { AlertTriangle, ShieldCheck, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EnhancedHeader, EnhancedMetricCard, MetricGrid, Section } from "../dashboard/EnhancedLayout";
import UserProductionManager from "./UserProductionManager";

const UserManagement = () => {
  return (
    <div className="page-shell space-y-6 pb-12">
      <EnhancedHeader
        title="Usuarios"
        subtitle="Administracion operativa de perfiles, roles y permisos conectados a la base principal."
        badge={{
          text: "Gestion real",
          variant: "secondary",
        }}
      />

      <MetricGrid columns={3}>
        <EnhancedMetricCard
          title="Perfiles conectados"
          value="Base principal"
          subtitle="Usuarios reales, no simulados"
          icon={Users}
        />
        <EnhancedMetricCard
          title="Roles auditables"
          value="Profiles + Roles"
          subtitle="Permisos y configuracion persistida"
          icon={ShieldCheck}
          variant="success"
        />
        <EnhancedMetricCard
          title="Altas de acceso"
          value="Via signup"
          subtitle="El modulo no crea credenciales ficticias"
          icon={AlertTriangle}
          variant="warning"
        />
      </MetricGrid>

      <Section title="Mesa de usuarios" subtitle="Version productiva y conectada">
        <Alert className="border-amber-300 bg-amber-50/90">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-amber-900">
            Esta vista reemplaza el antiguo formulario demostrativo. La alta de credenciales debe hacerse por el flujo real de autenticacion y aqui solo se administran configuraciones operativas.
          </AlertDescription>
        </Alert>

        <div className="mt-6">
          <UserProductionManager />
        </div>
      </Section>
    </div>
  );
};

export default UserManagement;
