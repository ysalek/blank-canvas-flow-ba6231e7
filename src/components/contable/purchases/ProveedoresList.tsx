import { Proveedor } from "./PurchasesData";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Phone } from "lucide-react";

interface ProveedoresListProps {
  proveedores: Proveedor[];
}

const ProveedoresList = ({ proveedores }: ProveedoresListProps) => {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-primary/10 p-2.5">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Base de proveedores
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">Relacion comercial activa</h3>
          <p className="mt-1 text-sm text-slate-600">
            Directorio operativo para compras, pagos y seguimiento.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {proveedores.length > 0 ? (
          proveedores.slice(0, 6).map((proveedor) => (
            <div
              key={proveedor.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{proveedor.nombre}</p>
                  <p className="text-xs text-slate-500">NIT {proveedor.nit}</p>
                </div>
                <Badge
                  className={
                    proveedor.activo
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }
                >
                  {proveedor.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{proveedor.email || "Sin correo registrado"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{proveedor.telefono || "Sin telefono registrado"}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No se encontraron proveedores.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProveedoresList;
