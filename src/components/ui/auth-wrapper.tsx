import { useAuth } from '@/components/auth/AuthProvider';
import LoginForm from '@/components/auth/LoginForm';
import { useLocation } from 'react-router-dom';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper = ({ children }: AuthWrapperProps) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const publicPaths = ['/signup', '/web', '/suscripcion', '/reset-password'];
  const pathname = location.pathname;
  const isPublic = publicPaths.includes(pathname) || /^\/e\/[^/]+\/(web|suscripcion)$/.test(pathname);

  if (!isAuthenticated && !isPublic) {
    return <LoginForm />;
  }

  return <>{children}</>;
};

export default AuthWrapper;