import { Navigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

const OwnerOrgRedirect = () => {
  const { orgId } = useParams<{ orgId: string }>();
  return <Navigate to={orgId ? ROUTES.ADMIN_ORGANIZATION(orgId) : ROUTES.ADMIN_STUDIOS} replace />;
};

export default OwnerOrgRedirect;
