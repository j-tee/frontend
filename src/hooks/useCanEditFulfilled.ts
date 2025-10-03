import usePermissions from './usePermissions.js'

/**
 * Hook to check if the current user can edit fulfilled stock requests
 * Only Managers, Admins, and Owners can edit fulfilled requests
 */
export const useCanEditFulfilled = (): boolean => {
  const permissions = usePermissions()
  
  // Managers, Admins, and Owners can edit fulfilled requests
  return permissions.role === 'MANAGER' || 
         permissions.role === 'ADMIN' || 
         permissions.role === 'OWNER'
}

export default useCanEditFulfilled
