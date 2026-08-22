import RecuperarSenhaForm from "@/components/auth/RecuperarSenhaForm";
import LoginDemo from "@/components/auth/LoginDemo";
import { supabaseEstaConfigurado } from "@/lib/supabase/config";

export default function EsqueciSenha() {
  return supabaseEstaConfigurado() ? <RecuperarSenhaForm /> : <LoginDemo />;
}
