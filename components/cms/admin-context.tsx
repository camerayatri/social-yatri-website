"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * What every admin client component may need to know about where it is: the
 * admin's base path (`/<ADMIN_PATH>`), which only the server can read. The
 * panel layout provides it, so fields deep in an editor can reach the upload
 * route without the path being threaded through every prop.
 */
const AdminContext = createContext<{ base: string }>({ base: "" });

export function AdminProvider({ base, children }: { base: string; children: ReactNode }) {
  return <AdminContext.Provider value={{ base }}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  return useContext(AdminContext);
}
