export function atualizarCards(dados) {
  document.getElementById("aguardando").textContent = dados.aguardando || 0;
  document.getElementById("atendimento").textContent = dados.atendimento || 0;
  document.getElementById("finalizado").textContent = dados.finalizado || 0;
  document.getElementById("total").textContent = dados.total || 0;
}

export function atualizarUltimosChamados(chamados) {
  const container = document.getElementById("ultimosChamados");
  container.innerHTML = "";

  if (!chamados || chamados.length === 0) {
    container.innerHTML = "<p>Nenhum chamado encontrado.</p>";
    return;
  }

  chamados.forEach(chamado => {
    const statusIcone = {
      "AGUARDANDO": "🟡",
      "EM ATENDIMENTO": "🟢",
      "FINALIZADO": "✅"
    }[chamado.status] || "⚪";

    const item = document.createElement("div");
    item.className = "list-item";

    item.innerHTML = `
      <div>
        <strong>${statusIcone} ${chamado.professor}</strong>
        <small>${chamado.instituicao} • ${chamado.problema}</small>
      </div>
      <small>${chamado.status}</small>
    `;

    container.appendChild(item);
  });
}

export function atualizarBarras(id, dados) {
  const container = document.getElementById(id);
  container.innerHTML = "";

  const entradas = Object.entries(dados || {});
  const maior = Math.max(...entradas.map(([, valor]) => valor), 1);

  entradas.forEach(([nome, valor]) => {
    const largura = Math.round((valor / maior) * 100);

    const item = document.createElement("div");
    item.className = "bar";

    item.innerHTML = `
      <div class="bar-header">
        <span>${nome}</span>
        <strong>${valor}</strong>
      </div>
      <div class="progress">
        <div style="width:${largura}%"></div>
      </div>
    `;

    container.appendChild(item);
  });
}

export function atualizarHorario() {
  const agora = new Date();

  document.getElementById("ultimaAtualizacao").textContent =
    agora.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
}
