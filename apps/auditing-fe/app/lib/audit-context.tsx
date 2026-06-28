"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchAuditorToken } from "./token";
import { fetchAuditStatus, type AuditStatus } from "./org";

interface AuditContextValue {
  token: string | null;
  auditStatus: AuditStatus | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuditContext = createContext<AuditContextValue>({
  token: null,
  auditStatus: null,
  loading: true,
  refresh: async () => {},
});

export function AuditProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [auditStatus, setAuditStatus] = useState<AuditStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [tok, status] = await Promise.all([
      fetchAuditorToken(),
      fetchAuditStatus(),
    ]);
    setToken(tok);
    setAuditStatus(status);
    setLoading(false);
  }, []);

  useEffect(() => {
    Promise.all([fetchAuditorToken(), fetchAuditStatus()])
      .then(([tok, status]) => {
        setToken(tok);
        setAuditStatus(status);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuditContext.Provider value={{ token, auditStatus, loading, refresh }}>
      {children}
    </AuditContext.Provider>
  );
}

export function useAudit() {
  return useContext(AuditContext);
}
