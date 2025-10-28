import { useEffect } from 'react';
import useAppDispatch from './useAppDispatch';
import useAppSelector from './useAppSelector';
import { selectCurrentBusiness } from '../store/slices/authSlice';
import { fetchSettings } from '../store/slices/settingsSlice';

/**
 * Hook to ensure settings are loaded for the current business
 * Automatically fetches settings when business changes
 * 
 * Usage:
 * ```typescript
 * const MyComponent = () => {
 *   useBusinessSettings(); // Ensures settings are loaded for current business
 *   const { formatCurrency } = useCurrency();
 *   // ... rest of component
 * };
 * ```
 */
export const useBusinessSettings = () => {
  const dispatch = useAppDispatch();
  const currentBusiness = useAppSelector(selectCurrentBusiness);

  useEffect(() => {
    if (currentBusiness?.id) {
      // Fetch settings whenever business changes
      void dispatch(fetchSettings());
    }
  }, [currentBusiness?.id, dispatch]);
};

export default useBusinessSettings;
