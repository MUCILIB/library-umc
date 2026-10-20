import { useCallback, useEffect, useState } from "react";
import {
  auditLogsService,
  type AuditLog,
} from "@/services/dashboard/auditLogsService";

interface UseAuditLogsParams {
  action?: string;
  entity?: string;
  limit?: number;
  offset?: number;
}

export function useAuditLogs(
  enabled: boolean,
  initialParams?: UseAuditLogsParams,
) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [params, setParams] = useState<UseAuditLogsParams>(initialParams || {});

  const fetchLogs = useCallback(
    async (nextParams?: UseAuditLogsParams) => {
      setLoading(true);
      setError(null);
      try {
        const effectiveParams = nextParams || params;
        const data = await auditLogsService.getLogs(effectiveParams);
        setLogs(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat audit logs",
        );
        setLogs([]);
      } finally {
        setHasLoaded(true);
        setLoading(false);
      }
    },
    [params],
  );

  useEffect(() => {
    if (enabled && !hasLoaded && !loading) {
      void fetchLogs(params);
    }
  }, [enabled, hasLoaded, loading, fetchLogs, params]);

  const refetch = useCallback(async () => {
    await fetchLogs(params);
  }, [fetchLogs, params]);

  const updateParams = useCallback(
    async (nextParams: UseAuditLogsParams) => {
      setParams(nextParams);
      await fetchLogs(nextParams);
    },
    [fetchLogs],
  );

  return {
    logs,
    loading,
    error,
    hasLoaded,
    params,
    refetch,
    updateParams,
  };
}
