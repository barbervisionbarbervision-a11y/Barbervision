import AuthShell from "@/components/auth/AuthShell";
import SairButton from "@/components/auth/SairButton";

export default function SemAcesso() {
  return (
    <AuthShell
      titulo="Conta sem acesso"
      descricao="A conta foi confirmada, mas não possui uma membership ativa em uma barbearia ativa. Peça ao responsável para conferir o convite ou a suspensão."
    >
      <SairButton />
    </AuthShell>
  );
}
