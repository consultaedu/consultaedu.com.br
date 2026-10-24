const DASHBOARD_URL = "https://consultaedu-dashboard-api.marcosdalleprane2.workers.dev/dashboard";

export async function buscarDashboard() {
  const resposta = await fetch(`${DASHBOARD_URL}?t=${Date.now()}`);

  if (!resposta.ok) {
    throw new Error("Erro ao buscar dashboard");
  }

  return await resposta.json();
}
