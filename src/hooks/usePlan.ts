import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

export type PlanType = 'basic' | 'pro' | 'enterprise';

export interface PlanFeatures {
  maxTransactionsPerMonth: number;
  maxUsers: number;
  maxEmpresas: number;
  modules: string[];
}

const BASIC_MODULES = [
  'dashboard', 'plan-cuentas', 'diario', 'mayor', 'balance-comprobacion',
  'comprobantes-integrados', 'facturacion', 'productos', 'inventario',
  'clientes', 'configuracion', 'tutorial',
];

const PRO_MODULES = [
  ...BASIC_MODULES,
  'balance-general', 'estado-resultados', 'punto-venta', 'credit-sales',
  'compras', 'kardex', 'activos-fijos', 'bancos', 'flujo-caja',
  'cuentas-cobrar-pagar', 'declaraciones-tributarias', 'cumplimiento-normativo',
  'nomina', 'empleados', 'reportes', 'analisis-financiero',
  'presupuestos', 'centros-costo', 'facturacion-electronica', 'retenciones',
  'backup', 'usuarios', 'proveedores', 'conciliacion-bancaria',
  'notas-credito-debito', 'libro-compras-ventas',
];

const ENTERPRISE_MODULES = [
  ...PRO_MODULES,
  'auditoria-avanzada', 'analisis-inteligente', 'rentabilidad',
  'multi-empresa', 'api-siat', 'soporte-prioritario',
];

const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  basic: {
    maxTransactionsPerMonth: 100,
    maxUsers: 1,
    maxEmpresas: 1,
    modules: BASIC_MODULES,
  },
  pro: {
    maxTransactionsPerMonth: Infinity,
    maxUsers: 5,
    maxEmpresas: 1,
    modules: PRO_MODULES,
  },
  enterprise: {
    maxTransactionsPerMonth: Infinity,
    maxUsers: 50,
    maxEmpresas: 10,
    modules: ENTERPRISE_MODULES,
  },
};

export const PLAN_PRICES = {
  basic: { monthly: 0, label: 'Gratuito', labelBs: 'Gratis' },
  pro: { monthly: 29, monthlyBs: 199, label: '$29/mes', labelBs: 'Bs 199/mes' },
  enterprise: { monthly: 99, monthlyBs: 699, label: '$99/mes', labelBs: 'Bs 699/mes' },
};

export const usePlan = () => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';

  const [currentPlan, setCurrentPlan] = useState<PlanType>('basic');
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Load plan from Supabase (sole source of truth)
  useEffect(() => {
    if (!user?.id) {
      setLoadingPlan(false);
      return;
    }

    const loadPlanFromSupabase = async () => {
      try {
        const { data } = await supabase
          .from('subscribers')
          .select('subscription_tier')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.subscription_tier) {
          setCurrentPlan(data.subscription_tier as PlanType);
        } else {
          setCurrentPlan('basic');
        }
      } catch (e) {
        console.error('Error loading plan from Supabase:', e);
      } finally {
        setLoadingPlan(false);
      }
    };

    loadPlanFromSupabase();
  }, [user?.id]);

  const features = PLAN_FEATURES[currentPlan];

  const hasAccess = (moduleId: string): boolean => {
    if (isAdmin) return true;
    return features.modules.includes(moduleId);
  };

  const isProFeature = (moduleId: string): boolean => {
    return !BASIC_MODULES.includes(moduleId);
  };

  const isEnterpriseFeature = (moduleId: string): boolean => {
    return ENTERPRISE_MODULES.includes(moduleId) && !PRO_MODULES.includes(moduleId);
  };

  const getRequiredPlan = (moduleId: string): PlanType => {
    if (BASIC_MODULES.includes(moduleId)) return 'basic';
    if (PRO_MODULES.includes(moduleId)) return 'pro';
    return 'enterprise';
  };

  const persistPlan = async (newPlan: PlanType) => {
    if (!user?.id) return;
    setCurrentPlan(newPlan); // Respuesta inmediata en UI

    try {
      // Check if subscriber record exists (no UNIQUE constraint on user_id)
      const { data: existing } = await supabase
        .from('subscribers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('subscribers')
          .update({ subscription_tier: newPlan, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        await supabase
          .from('subscribers')
          .insert({ user_id: user.id, subscription_tier: newPlan, email: authUser?.email || '' });
      }
    } catch (e) {
      console.error('Error persisting plan upgrade:', e);
    }
  };

  const upgradeToPro = () => persistPlan('pro');
  const upgradeToEnterprise = () => persistPlan('enterprise');

  const [monthlyTxnCount, setMonthlyTxnCount] = useState(0);

  // Load monthly transaction count from Supabase
  useEffect(() => {
    if (!user?.id || currentPlan !== 'basic') return;

    const loadTxnCount = async () => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const { count, error } = await supabase
          .from('asientos_contables')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('fecha', startOfMonth)
          .lte('fecha', endOfMonth);

        if (!error) {
          setMonthlyTxnCount(count || 0);
        }
      } catch (e) {
        console.error('Error loading txn count:', e);
      }
    };

    loadTxnCount();
  }, [user?.id, currentPlan]);

  const transactionCount = (): number => monthlyTxnCount;

  const canCreateTransaction = (): boolean => {
    if (isAdmin) return true;
    if (currentPlan !== 'basic') return true;
    return monthlyTxnCount < features.maxTransactionsPerMonth;
  };

  const incrementTransactionCount = () => {
    setMonthlyTxnCount(prev => prev + 1);
  };

  return {
    currentPlan,
    setCurrentPlan,
    features,
    hasAccess,
    isProFeature,
    isEnterpriseFeature,
    getRequiredPlan,
    isAdmin,
    loadingPlan,
    upgradeToPro,
    upgradeToEnterprise,
    canCreateTransaction,
    incrementTransactionCount,
    transactionCount,
    prices: PLAN_PRICES,
  };
};
