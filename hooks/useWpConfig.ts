"use client";

import { useMemo } from "react";
import { WP_SITE_URL } from "@/lib/wp-config";
import type { WPUser } from "@/lib/api/auth";

export interface WPConfig {
  siteUrl: string;
  username: string;
  appPassword: string;
}

export function useWpConfig(user: WPUser | null): WPConfig | null {
  return useMemo(
    () => user ? { siteUrl: WP_SITE_URL, username: user.username, appPassword: user.password } : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.username, user?.password]
  );
}
