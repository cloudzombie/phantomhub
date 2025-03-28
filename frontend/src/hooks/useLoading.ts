import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setLoading } from '../store/slices/uiSlice';

interface UseLoadingOptions {
  showGlobalLoading?: boolean;
  initialLoading?: boolean;
}

export const useLoading = (options: UseLoadingOptions = {}) => {
  const {
    showGlobalLoading = true,
    initialLoading = false,
  } = options;

  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(initialLoading);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    if (showGlobalLoading) {
      dispatch(setLoading(true));
    }
  }, [dispatch, showGlobalLoading]);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    if (showGlobalLoading) {
      dispatch(setLoading(false));
    }
  }, [dispatch, showGlobalLoading]);

  const withLoading = useCallback(
    async <T>(promise: Promise<T>): Promise<T> => {
      try {
        startLoading();
        return await promise;
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
}; 