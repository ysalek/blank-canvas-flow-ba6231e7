
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  usuario: string;
  nombre: string;
  rol: string;
  empresa: string;
  permisos: string[];
  email?: string;
  telefono?: string;
  nit?: string;
  ci?: string;
}

interface AuthContextProps {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: {
    nombre: string;
    email: string;
    telefono?: string;
    empresa: string;
    nitOrCI: string;
    usuario?: string;
    password: string;
  }) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Mapear perfil + roles de Supabase a nuestro User
  const buildUserFromSupabase = async (sessionUser: SupabaseUser): Promise<User> => {
    const email = sessionUser.email as string | undefined;
    const baseUsuario = email ? email.split('@')[0] : sessionUser.id;

    // Cargar perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, empresa, telefono, permisos')
      .eq('id', sessionUser.id)
      .maybeSingle();

    // Cargar roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', sessionUser.id);

    const isAdmin = (roles || []).some((r) => r.role === 'admin');

    return {
      id: sessionUser.id,
      usuario: baseUsuario,
      nombre: profile?.display_name || email || 'Usuario',
      rol: isAdmin ? 'admin' : 'usuario',
      empresa: profile?.empresa || 'Mi Empresa',
      permisos: isAdmin ? ['*'] : (profile?.permisos || []),
      email,
      telefono: profile?.telefono,
    };
  };

  // Inicialización segura: listener primero, luego getSession
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('🔐 AuthProvider - Auth state change:', event, !!newSession);
      console.log('🔐 AuthProvider - Session user:', newSession?.user?.id);
      
      setSession(newSession);
      setIsAuthenticated(!!newSession);
      
      if (newSession?.user) {
        // Usar setTimeout para evitar deadlocks
        setTimeout(async () => {
          try {
            const mapped = await buildUserFromSupabase(newSession.user);
            setUser(mapped);
            console.log('✅ AuthProvider - Usuario mapeado:', mapped.email, mapped.id);
          } catch (e) {
            console.error('❌ AuthProvider - Error construyendo usuario:', e);
            setUser(null);
          }
        }, 0);
      } else {
        console.log('🚪 AuthProvider - No hay sesión, limpiando usuario');
        setUser(null);
      }
    });

    // Verificar sesión inicial
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      console.log('🔐 AuthProvider - Sesión inicial:', !!initialSession, error);
      if (initialSession?.user) {
        console.log('🔐 AuthProvider - Usuario en sesión inicial:', initialSession.user.id);
      }
      
      setSession(initialSession);
      setIsAuthenticated(!!initialSession);
      
      if (initialSession?.user) {
        setTimeout(async () => {
          try {
            const mapped = await buildUserFromSupabase(initialSession.user);
            setUser(mapped);
            console.log('✅ AuthProvider - Usuario inicial mapeado:', mapped.email);
          } catch (e) {
            console.error('❌ AuthProvider - Error inicializando usuario:', e);
            setUser(null);
          }
        }, 0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Intentando login con:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.warn('❌ Login fallido:', error.message);
        return false;
      }
      console.log('✅ Login exitoso, sesión establecida');
      console.log('👤 Usuario ID:', data.user?.id);
      return true;
    } catch (e) {
      console.error('❌ Error en login:', e);
      return false;
    }
  };

  const register = async (data: {
    nombre: string;
    email: string;
    telefono?: string;
    empresa: string;
    nitOrCI: string;
    usuario?: string;
    password: string;
  }) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nombre: data.nombre,
            telefono: data.telefono,
            empresa: data.empresa,
            nitOrCI: data.nitOrCI,
          },
        },
      });
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true };
    } catch (e) {
      console.error('Error en registro:', e);
      return { success: false, message: 'Error inesperado en el registro' };
    }
  };

  const logout = async () => {
    console.log('🚪 Iniciando logout...');
    // Limpiar estado PRIMERO para feedback inmediato
    setIsAuthenticated(false);
    setUser(null);
    setSession(null);
    
    try {
      await supabase.auth.signOut();
      console.log('✅ Logout exitoso');
    } catch (error) {
      console.error('❌ Error en signOut:', error);
    }
    
    // Forzar limpieza de storage y recarga
    localStorage.removeItem('sb-mfhgekyriwabgksreszy-auth-token');
    window.location.href = '/';
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.rol === 'admin') return true;
    return user.permisos.includes(permission) || user.permisos.includes('*');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        session,
        login,
        register,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
