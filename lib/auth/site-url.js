import "server-only";

export function obterUrlBaseAplicacao() {
  const valor = process.env.BARBERVISION_APP_URL?.trim();

  if (!valor) {
    if (process.env.NODE_ENV !== "production") return "http://127.0.0.1:3000";
    throw new Error("Configure BARBERVISION_APP_URL com a origem pública HTTPS da aplicação.");
  }

  const url = new URL(valor);
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) {
    throw new Error("BARBERVISION_APP_URL deve usar HTTPS, exceto em loopback local.");
  }

  return url.origin;
}
