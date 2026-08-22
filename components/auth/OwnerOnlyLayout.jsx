import { exigirDono } from "@/lib/auth/context";
import { supabaseEstaConfigurado } from "@/lib/supabase/config";

export default async function OwnerOnlyLayout({ children }) {
  if (supabaseEstaConfigurado()) await exigirDono();
  return children;
}
