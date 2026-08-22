// Calcula quantos dias se passaram desde uma data no formato "DD/MM/AAAA".
// Retorna null se não houver data (cliente que nunca visitou, ex: "—").
export function diasDesde(dataBr) {
  if (!dataBr || dataBr === "—") return null;
  const [dia, mes, ano] = dataBr.split("/").map(Number);
  if (!dia || !mes || !ano) return null;
  const data = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  const diffMs = hoje - data;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Gera um código de indicação simples e estável a partir do id do cliente.
export function gerarCodigoIndicacao(clienteId, nome) {
  const iniciais = (nome || "AMIGO").replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase();
  return `BARBER-${iniciais}${clienteId}`;
}
