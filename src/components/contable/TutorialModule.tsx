import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Award,
  BookOpen,
  Boxes,
  CheckCircle2,
  FileText,
  HelpCircle,
  Lightbulb,
  Monitor,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Workflow,
  Zap,
} from "lucide-react";
import { tutorialMasterIndex, type TutorialIndexModule } from "@/components/contable/tutorial/tutorialIndex";

interface TutorialPath {
  id: string;
  title: string;
  description: string;
  audience: string;
  modules: string[];
  checks: string[];
}

interface VisualMap {
  id: string;
  title: string;
  description: string;
  outcome: string;
  steps: string[];
}

interface VisualSpotlight {
  view: string;
  caption: string;
}

interface RolePlaybook {
  role: keyof typeof quickStartByRole;
  title: string;
  description: string;
  goal: string;
  modules: string[];
  deliverables: string[];
  mistakes: string[];
}

const quickStartByRole = {
  admin: [
    "Completa Configuracion con NIT, razon social y parametros fiscales.",
    "Revisa plan de cuentas, usuarios y salud operativa.",
    "Valida backup, tutorial y dashboard antes de abrir el sistema al equipo.",
  ],
  contador: [
    "Empieza por dashboard, diario y balance de comprobacion.",
    "Luego revisa libro C/V, facturacion electronica y declaraciones.",
    "Cierra con balances, reportes y alertas de cumplimiento.",
  ],
  ventas: [
    "Configura clientes, productos y precios antes de vender.",
    "Usa facturacion, POS o ventas credito segun el flujo comercial.",
    "Controla cartera y stock al final del dia.",
  ],
  usuario: [
    "Empieza por dashboard y este tutorial.",
    "Aprende primero el flujo del modulo que vas a operar.",
    "Consulta la guia maestra cuando tengas dudas sobre impacto contable o fiscal.",
  ],
} as const;

const processRoutes: TutorialPath[] = [
  {
    id: "ruta-ventas",
    title: "Ruta comercial de venta",
    description: "Secuencia recomendada para vender, facturar, cobrar y controlar cartera.",
    audience: "Ventas, facturacion y cobranza",
    modules: ["clientes", "productos", "facturacion", "punto-venta", "credit-sales", "cuentas-cobrar-pagar"],
    checks: [
      "Cliente con datos fiscales correctos.",
      "Producto con precio, costo y stock correcto.",
      "Factura emitida y estado validado.",
      "Cobranza o saldo pendiente controlado.",
    ],
  },
  {
    id: "ruta-compras",
    title: "Ruta de abastecimiento y compras",
    description: "Flujo para registrar compras con impacto fiscal, de inventario y de pagos.",
    audience: "Compras, proveedores y tesoreria",
    modules: ["proveedores", "compras", "inventario", "kardex", "cuentas-cobrar-pagar"],
    checks: [
      "Proveedor identificado con NIT correcto.",
      "Compra clasificada entre inventario, gasto o activo.",
      "Documento listo para libro de compras y pagos.",
    ],
  },
  {
    id: "ruta-cierre",
    title: "Ruta de cierre contable mensual",
    description: "Orden recomendado para revisar asientos, bancos y estados financieros.",
    audience: "Contabilidad y direccion financiera",
    modules: ["diario", "mayor", "balance-comprobacion", "bancos", "conciliacion-bancaria", "balance-general", "estado-resultados"],
    checks: [
      "Asientos revisados y diferencias explicadas.",
      "Conciliaciones con diferencia cero o justificadas.",
      "Balances y resultados consistentes con la operacion.",
    ],
  },
  {
    id: "ruta-tributaria",
    title: "Ruta tributaria y SIN",
    description: "Secuencia para revisar el periodo fiscal y presentar obligaciones con menos riesgo.",
    audience: "Responsable tributario y contador",
    modules: ["libro-compras-ventas", "facturacion-electronica", "declaraciones-tributarias", "retenciones", "cumplimiento-normativo"],
    checks: [
      "No dejar facturas electronicas rechazadas sin revision.",
      "Validar libro fiscal antes de exportar.",
      "Presentar declaraciones solo con el periodo revisado.",
    ],
  },
];

const visualMaps: VisualMap[] = [
  {
    id: "mapa-comercial",
    title: "Mapa comercial",
    description: "Resume como una venta nace, se documenta y termina en cobranza.",
    outcome: "Venta emitida, stock controlado y cartera actualizada.",
    steps: ["Clientes", "Productos", "Facturacion o POS", "Ventas Credito", "CxC / CxP"],
  },
  {
    id: "mapa-contable",
    title: "Mapa contable y cierre",
    description: "Orden recomendado para revisar la consistencia de la informacion financiera.",
    outcome: "Cierre revisado con balances mas confiables.",
    steps: ["Comprobantes", "Diario", "Mayor", "Balance Comprobacion", "Balance General", "Resultados"],
  },
  {
    id: "mapa-tributario",
    title: "Mapa tributario",
    description: "Circuito clave para no presentar obligaciones con incidencias abiertas.",
    outcome: "Periodo fiscal revisado antes de presentar.",
    steps: ["Facturacion Electronica", "Libro C/V", "Declaraciones", "Retenciones", "Cumplimiento"],
  },
];

const visualSpotlights: VisualSpotlight[] = [
  { view: "dashboard", caption: "Vista de control diario y alertas priorizadas." },
  { view: "facturacion", caption: "Flujo comercial con datos fiscales y control de documentos." },
  { view: "productos", caption: "Catalogo con precio, costo, stock e imagen principal." },
  { view: "bancos", caption: "Mesa de tesoreria con saldos y movimientos recientes." },
  { view: "conciliacion-bancaria", caption: "Revision de diferencias entre extractos y libros." },
  { view: "declaraciones-tributarias", caption: "Control de vencimientos y periodo fiscal." },
  { view: "facturacion-electronica", caption: "Seguimiento de incidencias SIN por factura." },
  { view: "nomina", caption: "Planillas, RC-IVA y estado de pago del personal." },
];

const faqItems = [
  {
    question: "Por donde empiezo si la empresa recien entra al sistema?",
    answer:
      "Empieza por Configuracion, despues Plan de Cuentas, luego maestros como Clientes, Proveedores y Productos. Recien despues conviene operar ventas, compras, bancos e impuestos.",
  },
  {
    question: "Que modulo debo revisar antes de presentar IVA o IT?",
    answer:
      "Siempre revisa Libro Compras/Ventas, Facturacion Electronica y Declaraciones Tributarias del mismo periodo. Si hay facturas observadas o pendientes, primero resuelvelas.",
  },
  {
    question: "Donde controlo problemas de liquidez o saldos bancarios?",
    answer:
      "Usa Bancos para ver movimientos y saldos, Conciliacion para explicar diferencias y Flujo Caja para anticipar entradas y salidas.",
  },
  {
    question: "Que hago si una venta quedo mal registrada?",
    answer:
      "Si es una venta normal, revisa Facturacion o Notas C/D. Si la observacion es tributaria o electronica, entra a Facturacion Electronica y sigue el flujo de correccion.",
  },
  {
    question: "Este tutorial ya refleja el sistema real?",
    answer:
      "Si. La guia maestra usa el menu actual del sistema y el manual en docs fue reescrito para eliminar contenido ficticio o poco util.",
  },
];

const rolePlaybooks: RolePlaybook[] = [
  {
    role: "admin",
    title: "Implementacion y control del sistema",
    description: "Ruta para quien configura, habilita y supervisa el uso global de la plataforma.",
    goal: "Dejar la empresa operativa, segura y con parametros consistentes.",
    modules: ["configuracion", "plan-cuentas", "dashboard", "backup", "tutorial"],
    deliverables: [
      "Empresa configurada con datos fiscales correctos.",
      "Plan de cuentas listo para operar.",
      "Usuarios alineados a roles y procesos.",
      "Equipo con ruta de capacitacion inicial definida.",
    ],
    mistakes: [
      "Abrir operacion sin completar parametros SIN.",
      "No revisar plan de cuentas antes de ventas y compras.",
      "No validar salud del sistema desde dashboard y backup.",
    ],
  },
  {
    role: "contador",
    title: "Operacion contable y cierre",
    description: "Ruta para quien revisa asientos, libros, declaraciones y estados financieros.",
    goal: "Cerrar el periodo con consistencia contable y fiscal.",
    modules: [
      "diario",
      "mayor",
      "balance-comprobacion",
      "libro-compras-ventas",
      "facturacion-electronica",
      "declaraciones-tributarias",
      "balance-general",
      "estado-resultados",
    ],
    deliverables: [
      "Asientos revisados y diferencias explicadas.",
      "Libro fiscal sin incidencias abiertas.",
      "Declaraciones registradas con periodo controlado.",
      "Estados financieros listos para gerencia.",
    ],
    mistakes: [
      "Presentar IVA o IT sin revisar facturas observadas.",
      "Confiar en balances sin revisar conciliaciones y cuentas sensibles.",
      "No rastrear el origen de saldos raros desde diario y mayor.",
    ],
  },
  {
    role: "ventas",
    title: "Operacion comercial y cobranza",
    description: "Ruta para el equipo que vende, factura y hace seguimiento a cobros.",
    goal: "Vender mas rapido sin perder control fiscal, stock ni cartera.",
    modules: ["clientes", "productos", "facturacion", "punto-venta", "credit-sales", "cuentas-cobrar-pagar"],
    deliverables: [
      "Clientes y productos limpios antes de vender.",
      "Facturas emitidas correctamente.",
      "Stock actualizado despues de cada venta.",
      "Cobranza y vencimientos visibles en cartera.",
    ],
    mistakes: [
      "Facturar con datos fiscales incompletos.",
      "Vender sin revisar stock o precio correcto.",
      "No pasar a cartera las ventas a credito.",
    ],
  },
  {
    role: "usuario",
    title: "Induccion operativa por modulo",
    description: "Ruta para usuarios que operan una parte del sistema y necesitan claridad de proceso.",
    goal: "Usar solo el flujo asignado sin romper controles del resto del sistema.",
    modules: ["dashboard", "tutorial", "facturacion", "compras", "bancos"],
    deliverables: [
      "Comprension clara del modulo asignado.",
      "Capacidad de reconocer que datos necesita antes de guardar.",
      "Capacidad de identificar a que area escalar una incidencia.",
    ],
    mistakes: [
      "Intentar resolver incidencias tributarias o contables desde el modulo equivocado.",
      "Guardar informacion incompleta por no revisar requisitos previos.",
      "No usar dashboard ni tutorial como punto de referencia.",
    ],
  },
];

const ModuleVisualReference = ({
  module,
  group,
  caption,
}: {
  module: TutorialIndexModule;
  group: string;
  caption: string;
}) => {
  return (
    <Card className="overflow-hidden border-slate-200">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-900 px-5 py-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">{group}</p>
            <h3 className="mt-1 text-lg font-semibold">{module.title}</h3>
          </div>
          <Badge className="border border-white/20 bg-white/10 text-white hover:bg-white/10">
            {module.plan}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-slate-200">{caption}</p>
      </div>

      <CardContent className="space-y-4 p-5">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-inner">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <div className="h-3 w-24 rounded-full bg-slate-200" />
              <div className="mt-2 h-2 w-40 rounded-full bg-slate-100" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 rounded-xl bg-sky-100" />
              <div className="h-8 w-10 rounded-xl bg-slate-100" />
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {module.produces.slice(0, 3).map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="h-2 w-14 rounded-full bg-slate-200" />
                <div className="mt-3 h-6 w-16 rounded-xl bg-emerald-100" />
                <p className="mt-3 text-xs font-medium text-slate-700">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="h-3 w-28 rounded-full bg-slate-200" />
                <div className="h-6 w-16 rounded-lg bg-slate-100" />
              </div>
              <div className="space-y-2">
                {module.controls.slice(0, 3).map((control) => (
                  <div key={control} className="rounded-xl border border-slate-100 px-3 py-2 text-xs text-slate-600">
                    {control}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="h-3 w-24 rounded-full bg-slate-200" />
              <div className="mt-3 space-y-2">
                {module.needs.slice(0, 3).map((need) => (
                  <div key={need} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-sky-500" />
                    <span>{need}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <span className="font-semibold">Que debes mirar en pantalla:</span> {module.whenToUse}
        </div>
      </CardContent>
    </Card>
  );
};

const TutorialModule = () => {
  const { user } = useAuth();
  const role = (user?.rol || "usuario") as keyof typeof quickStartByRole;
  const [activeTab, setActiveTab] = useState("inicio");
  const [completedPaths, setCompletedPaths] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [completedPlaybookModules, setCompletedPlaybookModules] = useState<string[]>([]);

  const navigateTo = (view: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    window.history.pushState({}, "", `${url.pathname}${url.search}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const roleSteps = quickStartByRole[role] || quickStartByRole.usuario;
  const groupLookup = useMemo(() => {
    return tutorialMasterIndex.reduce<Record<string, string>>((accumulator, group) => {
      group.modules.forEach((item) => {
        accumulator[item.view] = group.group;
      });
      return accumulator;
    }, {});
  }, []);

  const moduleLookup = useMemo(() => {
    return tutorialMasterIndex.reduce<Record<string, TutorialIndexModule>>((accumulator, group) => {
      group.modules.forEach((item) => {
        accumulator[item.view] = item;
      });
      return accumulator;
    }, {});
  }, []);

  const totalModules = useMemo(
    () => tutorialMasterIndex.reduce((sum, group) => sum + group.modules.length, 0),
    [],
  );
  const visibleModules = useMemo(
    () =>
      tutorialMasterIndex.reduce(
        (sum, group) =>
          sum +
          group.modules.filter((module) => {
            const query = searchTerm.trim().toLowerCase();
            if (!query) return true;
            const haystack = [
              group.group,
              group.description,
              module.title,
              module.view,
              module.summary,
              module.purpose,
              module.whenToUse,
              module.idealFor,
              module.needs.join(" "),
              module.produces.join(" "),
              module.controls.join(" "),
            ]
              .join(" ")
              .toLowerCase();
            return haystack.includes(query);
          }).length,
        0,
      ),
    [searchTerm],
  );
  const progress = processRoutes.length > 0 ? (completedPaths.length / processRoutes.length) * 100 : 0;

  const filteredGroups = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return tutorialMasterIndex;

    return tutorialMasterIndex
      .map((group) => ({
        ...group,
        modules: group.modules.filter((module) => {
          const haystack = [
            group.group,
            group.description,
            module.title,
            module.view,
            module.summary,
            module.purpose,
            module.whenToUse,
            module.idealFor,
            module.needs.join(" "),
            module.produces.join(" "),
            module.controls.join(" "),
            module.related
              .map((view) => moduleLookup[view]?.title || view)
              .join(" "),
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(query);
        }),
      }))
      .filter((group) => group.modules.length > 0);
    }, [moduleLookup, searchTerm]);

  const spotlightModules = useMemo(
    () =>
      visualSpotlights
        .map((spotlight) => {
          const module = moduleLookup[spotlight.view];
          if (!module) return null;

          return {
            ...spotlight,
            module,
            group: groupLookup[spotlight.view] || "General",
          };
        })
        .filter((item): item is VisualSpotlight & { module: TutorialIndexModule; group: string } => item !== null),
    [groupLookup, moduleLookup],
  );
  const activePlaybook = useMemo(
    () => rolePlaybooks.find((playbook) => playbook.role === role) || rolePlaybooks.find((playbook) => playbook.role === "usuario"),
    [role],
  );
  const playbookStorageKey = useMemo(
    () => `tutorial-playbook-progress:${user?.id || user?.email || role}`,
    [role, user?.email, user?.id],
  );
  const activePlaybookProgress = activePlaybook
    ? (completedPlaybookModules.filter((view) => activePlaybook.modules.includes(view)).length / activePlaybook.modules.length) * 100
    : 0;
  const nextPlaybookView = activePlaybook?.modules.find((view) => !completedPlaybookModules.includes(view)) || null;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(playbookStorageKey);
    if (!raw) {
      setCompletedPlaybookModules([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setCompletedPlaybookModules(parsed.filter((item): item is string => typeof item === "string"));
      } else {
        setCompletedPlaybookModules([]);
      }
    } catch {
      setCompletedPlaybookModules([]);
    }
  }, [playbookStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(playbookStorageKey, JSON.stringify(completedPlaybookModules));
  }, [completedPlaybookModules, playbookStorageKey]);

  const togglePath = (pathId: string) => {
    setCompletedPaths((prev) =>
      prev.includes(pathId) ? prev.filter((item) => item !== pathId) : [...prev, pathId],
    );
  };

  const togglePlaybookModule = (view: string) => {
    setCompletedPlaybookModules((prev) =>
      prev.includes(view) ? prev.filter((item) => item !== view) : [...prev, view],
    );
  };

  const resetPlaybookProgress = () => {
    setCompletedPlaybookModules([]);
  };

  const renderRelatedModule = (view: string) => {
    const relatedModule = moduleLookup[view];
    const label = relatedModule?.title || view;

    return (
      <Button key={view} size="sm" variant="secondary" onClick={() => navigateTo(view)}>
        {label}
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-sky-900 p-6 text-white shadow-xl">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-4">
            <Badge className="w-fit border border-white/20 bg-white/10 text-white hover:bg-white/10">
              Centro de aprendizaje operativo
            </Badge>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <Award className="h-6 w-6 text-sky-200" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Tutorial del sistema completo</h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-200">
                  Guia mejorada para entender que resuelve cada modulo, como se conecta con el resto y en que orden conviene operar.
                </p>
              </div>
            </div>
            <div className="grid gap-2 text-sm text-slate-200">
              {roleSteps.map((step) => (
                <div key={step} className="flex items-start gap-2 rounded-2xl bg-white/8 px-3 py-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">Estado del tutorial</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-200">Modulos documentados</p>
                <p className="mt-1 text-3xl font-semibold">{totalModules}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-200">Rutas operativas</p>
                <p className="mt-1 text-3xl font-semibold">{processRoutes.length}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 sm:col-span-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progreso de aprendizaje</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="mt-3 bg-white/10" />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-white/10" />
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="inicio" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Inicio
          </TabsTrigger>
          <TabsTrigger value="mapas" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Mapas
          </TabsTrigger>
          <TabsTrigger value="visuales" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Visuales
          </TabsTrigger>
          <TabsTrigger value="playbooks" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Playbooks
          </TabsTrigger>
          <TabsTrigger value="rutas" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Rutas
          </TabsTrigger>
          <TabsTrigger value="modulos" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Guia Maestra
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inicio" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Primeros pasos utiles
              </CardTitle>
              <CardDescription>
                Esta pantalla ya no solo lista modulos: explica el proposito de cada uno, que necesita y que genera.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Card className="border-slate-200 bg-slate-50">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-2 font-semibold text-slate-950">
                    <Settings className="h-4 w-4 text-slate-700" />
                    Base obligatoria
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li>Configura empresa, NIT, actividad economica y parametros SIN.</li>
                    <li>Revisa plan de cuentas antes de operar procesos contables.</li>
                    <li>Carga maestros: clientes, proveedores y productos.</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-slate-200 bg-slate-50">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-2 font-semibold text-slate-950">
                    <ShieldCheck className="h-4 w-4 text-slate-700" />
                    Disciplina operativa
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li>Resuelve alertas del dashboard antes de seguir acumulando transacciones.</li>
                    <li>No presentes declaraciones con facturas electronicas observadas.</li>
                    <li>No cierres conciliaciones con diferencias sin explicar.</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-slate-200 bg-slate-50">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-2 font-semibold text-slate-950">
                    <Boxes className="h-4 w-4 text-slate-700" />
                    Como leer la guia
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li>Primero mira los mapas para entender el flujo.</li>
                    <li>Luego revisa rutas por proceso.</li>
                    <li>Finalmente busca cada modulo en la guia maestra para ver detalle util.</li>
                  </ul>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card className="border-sky-200 bg-sky-50">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-sky-900">Manual ampliado disponible</p>
                <p className="mt-1 text-sm text-sky-800">
                  El documento <strong>docs/tutorial-completo-modulos-2026-03-23.md</strong> ahora incluye mapas visuales en texto y explicacion por areas.
                </p>
              </div>
              <Button variant="outline" onClick={() => setActiveTab("modulos")}>
                Abrir guia maestra
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapas" className="space-y-6">
          <div className="grid gap-4">
            {visualMaps.map((map) => (
              <Card key={map.id} className="border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-primary" />
                    {map.title}
                  </CardTitle>
                  <CardDescription>{map.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr]">
                    {map.steps.map((step, index) => (
                      <div key={`${map.id}-${step}`} className="contents">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900">
                          {step}
                        </div>
                        {index < map.steps.length - 1 ? (
                          <div className="hidden items-center justify-center lg:flex">
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <span className="font-semibold">Resultado esperado:</span> {map.outcome}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="visuales" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-primary" />
                Galeria visual referencial
              </CardTitle>
              <CardDescription>
                Estas vistas muestran que partes debes mirar en cada pantalla clave. No reemplazan la operacion real, pero ayudan mucho a capacitar equipos.
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            {spotlightModules.map((spotlight) => (
              <ModuleVisualReference
                key={spotlight.view}
                module={spotlight.module}
                group={spotlight.group}
                caption={spotlight.caption}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="playbooks" className="space-y-6">
          {activePlaybook ? (
            <Card className="border-sky-200 bg-sky-50">
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-sky-900 text-white hover:bg-sky-900">Playbook sugerido para tu rol</Badge>
                  <Badge variant="outline">{activePlaybook.role}</Badge>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-sky-950">{activePlaybook.title}</h3>
                  <p className="mt-1 text-sm text-sky-900">{activePlaybook.description}</p>
                </div>
                <div className="rounded-2xl border border-sky-200 bg-white/70 p-4 text-sm text-sky-950">
                  <span className="font-semibold">Objetivo:</span> {activePlaybook.goal}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activePlaybook ? (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-emerald-950">
                      <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                      Onboarding guiado del rol
                    </CardTitle>
                    <CardDescription className="text-emerald-900/80">
                      Marca cada paso cuando ya domines el modulo o cuando ya lo hayas revisado con tu equipo.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {nextPlaybookView ? (
                      <Button size="sm" variant="outline" onClick={() => navigateTo(nextPlaybookView)}>
                        Abrir siguiente paso
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={resetPlaybookProgress}>
                      Reiniciar checklist
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-emerald-950">
                    <span>Avance del playbook</span>
                    <span>
                      {completedPlaybookModules.filter((view) => activePlaybook.modules.includes(view)).length}/{activePlaybook.modules.length}
                    </span>
                  </div>
                  <Progress value={activePlaybookProgress} className="bg-emerald-100" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {activePlaybook.modules.map((view, index) => {
                  const isCompleted = completedPlaybookModules.includes(view);
                  const module = moduleLookup[view];

                  return (
                    <div
                      key={view}
                      className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${isCompleted ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-900"}`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-950">{module?.title || view}</p>
                            <Badge variant={isCompleted ? "default" : "outline"}>
                              {isCompleted ? "Completado" : "Pendiente"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            {module?.summary || "Paso del playbook operativo."}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigateTo(view)}>
                          Abrir modulo
                        </Button>
                        <Button size="sm" variant={isCompleted ? "secondary" : "default"} onClick={() => togglePlaybookModule(view)}>
                          {isCompleted ? "Marcar pendiente" : "Marcar completado"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4">
            {rolePlaybooks.map((playbook) => (
              <Card key={playbook.role} className="border-slate-200">
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle>{playbook.title}</CardTitle>
                      <CardDescription>{playbook.description}</CardDescription>
                    </div>
                    <Badge variant={playbook.role === role ? "default" : "outline"}>{playbook.role}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                    <span className="font-semibold text-slate-950">Objetivo del playbook:</span> {playbook.goal}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Modulos que debe dominar</p>
                    <div className="flex flex-wrap gap-2">
                      {playbook.modules.map((view) => (
                        <Button key={view} size="sm" variant="secondary" onClick={() => navigateTo(view)}>
                          {moduleLookup[view]?.title || view}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Resultados esperados</p>
                      <ul className="space-y-2 text-sm text-slate-700">
                        {playbook.deliverables.map((deliverable) => (
                          <li key={deliverable} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                            <span>{deliverable}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Errores frecuentes a evitar</p>
                      <ul className="space-y-2 text-sm text-slate-700">
                        {playbook.mistakes.map((mistake) => (
                          <li key={mistake} className="flex items-start gap-2">
                            <div className="mt-1.5 h-2 w-2 rounded-full bg-rose-500" />
                            <span>{mistake}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rutas" className="space-y-6">
          <div className="grid gap-4">
            {processRoutes.map((path) => (
              <Card key={path.id} className="border-slate-200">
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle>{path.title}</CardTitle>
                      <CardDescription>{path.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{path.audience}</Badge>
                      <Button size="sm" variant="outline" onClick={() => togglePath(path.id)}>
                        {completedPaths.includes(path.id) ? "Marcar pendiente" : "Marcar completada"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Modulos de la ruta</p>
                    <div className="flex flex-wrap gap-2">
                      {path.modules.map((view) => (
                        <Button key={view} size="sm" variant="secondary" onClick={() => navigateTo(view)}>
                          {moduleLookup[view]?.title || view}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Checklist de control</p>
                    <ul className="space-y-2 text-sm text-slate-700">
                      {path.checks.map((check) => (
                        <li key={check} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                          <span>{check}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="modulos" className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Guia maestra de modulos
                  </CardTitle>
                  <CardDescription>
                    Busca por modulo, proceso, area o palabra clave. Cada tarjeta explica para que sirve, cuando usarla, que necesita y que genera.
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {visibleModules} de {totalModules} modulos visibles
                </Badge>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar modulo, proceso, area o control..."
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-4">
                {filteredGroups.map((group) => (
                  <AccordionItem key={group.group} value={group.group} className="rounded-2xl border px-4">
                    <AccordionTrigger className="text-left">
                      <div>
                        <div className="font-semibold">{group.group}</div>
                        <div className="text-sm text-muted-foreground">{group.description}</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      {group.modules.map((module) => (
                        <Card key={module.view} className="border-slate-200">
                          <CardContent className="space-y-4 p-5">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-lg font-semibold text-slate-950">{module.title}</h4>
                                  <Badge variant="outline">{module.plan}</Badge>
                                </div>
                                <p className="text-sm text-slate-600">{module.summary}</p>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => navigateTo(module.view)}>
                                Abrir modulo
                              </Button>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Para que sirve</p>
                                <p className="mt-2 text-sm text-slate-700">{module.purpose}</p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Cuando abrirlo</p>
                                <p className="mt-2 text-sm text-slate-700">{module.whenToUse}</p>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                              <span className="font-semibold text-slate-950">Ideal para:</span> {module.idealFor}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Que necesita</p>
                                <ul className="space-y-2 text-sm text-slate-700">
                                  {module.needs.map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-slate-500" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Que genera</p>
                                <ul className="space-y-2 text-sm text-slate-700">
                                  {module.produces.map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                      <ArrowRight className="mt-0.5 h-4 w-4 text-slate-500" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            <Separator />

                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Controles clave</p>
                              <div className="flex flex-wrap gap-2">
                                {module.controls.map((control) => (
                                  <Badge key={control} variant="secondary" className="whitespace-normal py-1 text-left">
                                    {control}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Se conecta con</p>
                              <div className="flex flex-wrap gap-2">
                                {module.related.map((view) => renderRelatedModule(view))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Preguntas frecuentes utiles
              </CardTitle>
              <CardDescription>
                Respuestas practicas para operar mejor la suite actual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((faq, index) => (
                  <AccordionItem key={faq.question} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-sm text-slate-600">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                <div className="flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4" />
                  Material complementario
                </div>
                <p className="mt-1">
                  Usa <strong>docs/tutorial-completo-modulos-2026-03-23.md</strong> como material de capacitacion interna. Incluye mapas de proceso y explicacion ampliada por area.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TutorialModule;
