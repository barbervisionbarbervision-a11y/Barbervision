const ETAPAS = ["Início", "Cadastro", "Selfie", "Preparo", "Simulação", "Sugestões", "Escolha"];

export default function ProgressSteps({ atual }) {
  return (
    <div
      className="flex items-center justify-center gap-1.5"
      role="list"
      aria-label={`Etapa ${atual} de ${ETAPAS.length}: ${ETAPAS[atual - 1]}`}
    >
      {ETAPAS.map((etapa, i) => {
        const passo = i + 1;
        const ativo = passo === atual;
        const feito = passo < atual;
        return (
          <div
            key={etapa}
            title={etapa}
            role="listitem"
            aria-label={`${passo}. ${etapa}${ativo ? ", etapa atual" : feito ? ", concluída" : ""}`}
            aria-current={ativo ? "step" : undefined}
            className={`h-1.5 rounded-full transition-all ${
              ativo ? "w-8 bg-brass" : feito ? "w-4 bg-steel" : "w-4 bg-steel/30"
            }`}
          />
        );
      })}
    </div>
  );
}
