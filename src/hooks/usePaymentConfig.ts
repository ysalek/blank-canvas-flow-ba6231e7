import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentConfig {
  tigo_money_number: string;
  tigo_money_titular: string;
  banco_nombre: string;
  banco_titular: string;
  banco_cuenta: string;
  banco_moneda: string;
}

const CONFIG_EMAIL = '__payment_config__';

const DEFAULT_CONFIG: PaymentConfig = {
  tigo_money_number: '',
  tigo_money_titular: '',
  banco_nombre: '',
  banco_titular: '',
  banco_cuenta: '',
  banco_moneda: 'Bolivianos (BOB)',
};

export const usePaymentConfig = () => {
  const [config, setConfig] = useState<PaymentConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('subscribers')
        .select('stripe_customer_id')
        .eq('email', CONFIG_EMAIL)
        .maybeSingle();

      if (data?.stripe_customer_id) {
        try {
          const parsed = JSON.parse(data.stripe_customer_id);
          if (parsed.type === 'payment_config') {
            setConfig(parsed.config);
          }
        } catch { /* ignore parse errors */ }
      }
    } catch {
      // No config row yet
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const saveConfig = async (newConfig: PaymentConfig) => {
    const payload = JSON.stringify({ type: 'payment_config', config: newConfig });

    // Try update first
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id')
      .eq('email', CONFIG_EMAIL)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('subscribers')
        .update({ stripe_customer_id: payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('subscribers')
        .insert({ email: CONFIG_EMAIL, stripe_customer_id: payload });
    }

    setConfig(newConfig);
  };

  const isConfigured = config.tigo_money_number !== '' || config.banco_cuenta !== '';

  return { config, loading, saveConfig, loadConfig, isConfigured };
};
