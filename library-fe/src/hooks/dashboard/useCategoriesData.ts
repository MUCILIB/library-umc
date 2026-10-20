import { useCallback, useEffect, useState } from "react";
import {
  dashboardDataService,
  type CategoryItem,
} from "@/services/dashboard/dashboardDataService";

export function useCategoriesData(enabled: boolean) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardDataService.getCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat kategori");
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && !hasLoaded && !loading) {
      void fetchCategories();
    }
  }, [enabled, hasLoaded, loading, fetchCategories]);

  const refetch = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    hasLoaded,
    refetch,
  };
}
