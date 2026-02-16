import { useAuth } from '@/components/auth/AuthProvider';

export const useAdmin = () => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';
  return { isAdmin };
};
