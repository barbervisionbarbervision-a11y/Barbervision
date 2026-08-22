"use client";

import { createBrowserClient } from "@supabase/ssr";
import { exigirConfiguracaoPublicaSupabase } from "./config";

let clienteBrowser;

export function criarClienteSupabaseBrowser() {
  if (clienteBrowser) return clienteBrowser;

  const { url, publishableKey } = exigirConfiguracaoPublicaSupabase();
  clienteBrowser = createBrowserClient(url, publishableKey);
  return clienteBrowser;
}
