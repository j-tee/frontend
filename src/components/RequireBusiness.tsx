import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '../hooks/index.js'
import { selectAuthState } from '../store/slices/authSlice.js'

const RequireBusiness = () => {
  const location = useLocation()
  const { user, business } = useAppSelector(selectAuthState)

  const isOwnerWithoutBusiness =
    user?.account_type?.toUpperCase() === 'OWNER' && !business

  if (isOwnerWithoutBusiness) {
    return <Navigate to="/onboarding/register-business" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default RequireBusiness
