import { Outlet, useNavigate } from 'solid-app-router';
import { useAuth } from '../../services/useAuth';


const AuthGuard = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth()!;

  if (!isAuthenticated()) {
    // TODO add dynamic comeback URL
    navigate('/login', { replace: true });
    return null;
  }

  return <Outlet />;
};

export default AuthGuard;
