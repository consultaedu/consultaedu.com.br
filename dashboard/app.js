import { buscarDashboard } from "./api.js";
import {
  atualizarCards,
  atualizarUltimosChamados,
  atualizarBarras,
  atualizarHorario
} from "./ui.js";

async function carregarDashboard() {
  try {
    const dados = await buscarDashboard();

    atualizarCards(dados);
    atualizarUltimosChamados(dados.ultimos);
    atualizarBarras("instituicoes", dados.instituicoes);
    atualizarBarras("problemas", dados.problemas);
    atualizarHorario();

  } catch (erro) {
    console.error("Erro ao carregar dashboard:", erro);
  }
}

carregarDashboard();

setInterval(carregarDashboard, 5000);
