/*
  MODO PADRÃO:
  O site usa professores.json, então já funciona sem Apps Script.

  MODO DINÂMICO:
  Depois de publicar o Codigo.gs como Web App, cole a URL abaixo.
  Exemplo:
  const API_URL = "https://script.google.com/macros/s/SEU_DEPLOY/exec";
*/
const API_URL = "";
const BASE_LOCAL_URL = "professores.json";

const TIMEZONE = "America/Sao_Paulo";
const LIMITE_SUGESTOES = 10;

let sessoes = [];
let professores = [];
let professorAtual = null;

const carregamentoBase = document.getElementById("carregamentoBase");
const carregamentoTitulo = document.getElementById("carregamentoTitulo");
const carregamentoMensagem = document.getElementById("carregamentoMensagem");
const botaoTentarNovamente = document.getElementById("botaoTentarNovamente");

const buscaProfessor = document.getElementById("buscaProfessor");
const limparBusca = document.getElementById("limparBusca");
const sugestoesProfessores = document.getElementById("sugestoesProfessores");
const dicaBusca = document.getElementById("dicaBusca");

const resultado = document.getElementById("resultado");
const resumoProfessor = document.getElementById("resumoProfessor");
const aulaAgora = document.getElementById("aulaAgora");
const aulasHoje = document.getElementById("aulasHoje");
const agendaSemana = document.getElementById("agendaSemana");
const contadorHoje = document.getElementById("contadorHoje");
const contadorSemana = document.getElementById("contadorSemana");

const ordemDias = {
  "DOMINGO": 0,
  "SEGUNDA-FEIRA": 1,
  "TERCA-FEIRA": 2,
  "QUARTA-FEIRA": 3,
  "QUINTA-FEIRA": 4,
  "SEXTA-FEIRA": 5,
  "SABADO": 6
};

const nomesDias = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado"
};

carregarBaseProfessores();

if (botaoTentarNovamente) {
  botaoTentarNovamente.addEventListener("click", carregarBaseProfessores);
}

buscaProfessor.addEventListener("input", () => {
  const termo = buscaProfessor.value.trim();
  limparBusca.hidden = !termo;

  if (professorAtual && normalizarTexto(termo) !== normalizarTexto(professorAtual.professor)) {
    professorAtual = null;
    ocultarResultado();
  }

  mostrarSugestoes(termo);
});

buscaProfessor.addEventListener("focus", () => {
  if (buscaProfessor.value.trim()) {
    mostrarSugestoes(buscaProfessor.value.trim());
  }
});

buscaProfessor.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    fecharSugestoes();
    return;
  }

  if (event.key === "Enter") {
    const botoes = [...sugestoesProfessores.querySelectorAll(".sugestao-professor")];

    if (botoes.length === 1) {
      event.preventDefault();
      botoes[0].click();
    }
  }
});

limparBusca.addEventListener("click", () => {
  buscaProfessor.value = "";
  limparBusca.hidden = true;
  professorAtual = null;
  fecharSugestoes();
  ocultarResultado();
  buscaProfessor.focus();
});

document.addEventListener("click", event => {
  if (!event.target.closest(".pesquisa-professor")) {
    fecharSugestoes();
  }
});

function carregarBaseProfessores() {
  carregamentoBase.hidden = false;
  carregamentoBase.classList.remove("oculto", "erro");

  carregamentoTitulo.textContent = "Carregando a base de professores...";
  carregamentoMensagem.textContent = "Na primeira abertura, isso pode levar alguns segundos.";
  botaoTentarNovamente.hidden = true;

  buscaProfessor.disabled = true;
  buscaProfessor.value = "";
  limparBusca.hidden = true;
  professorAtual = null;
  fecharSugestoes();
  ocultarResultado();

  const fonte = API_URL.trim() || BASE_LOCAL_URL;

  fetch(fonte, { cache: "no-store" })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Falha HTTP ${res.status}`);
      }
      return res.json();
    })
    .then(json => {
      const lista = Array.isArray(json)
        ? json
        : (json && Array.isArray(json.dados) ? json.dados : null);

      if (!lista) {
        throw new Error(
          (json && json.mensagem) ||
          "A fonte de dados não retornou uma lista de aulas."
        );
      }

      sessoes = lista
        .map(normalizarRegistro)
        .filter(item => item.idProfessor && item.professor && item.dia);

      professores = montarCadastroProfessores(sessoes);

      if (!professores.length) {
        throw new Error("Nenhum professor foi encontrado na base.");
      }

      buscaProfessor.disabled = false;

      carregamentoTitulo.textContent = "Base carregada!";
      carregamentoMensagem.textContent =
        `${professores.length} professores disponíveis para consulta.`;

      dicaBusca.textContent =
        `${professores.length} professores na base • pesquise por qualquer parte do nome.`;

      setTimeout(() => {
        carregamentoBase.classList.add("oculto");

        setTimeout(() => {
          carregamentoBase.hidden = true;
        }, 300);
      }, 450);

      abrirProfessorDaURL();
    })
    .catch(err => {
      console.error("Erro ao carregar professores:", err);

      carregamentoBase.hidden = false;
      carregamentoBase.classList.remove("oculto");
      carregamentoBase.classList.add("erro");

      carregamentoTitulo.textContent =
        "Não foi possível carregar a base de professores.";

      carregamentoMensagem.textContent =
        "Confira o arquivo professores.json ou a URL da API e tente novamente.";

      botaoTentarNovamente.hidden = false;
    });
}

function normalizarRegistro(item) {
  const valor = (...nomes) => {
    for (const nome of nomes) {
      if (item[nome] !== undefined && item[nome] !== null) {
        return item[nome];
      }
    }
    return "";
  };

  const qtdCursos = Number(valor("qtdCursos", "Qtd_Cursos")) || 0;
  const compartilhada = valor("aulaCompartilhada", "Aula_Compartilhada");

  return {
    idSessao: String(valor("idSessao", "ID_SESSAO")).trim(),
    idProfessor: String(valor("idProfessor", "ID_PROFESSOR")).trim(),
    professor: String(valor("professor", "Professor")).trim(),
    faculdade: String(valor("faculdade", "Faculdade")).trim(),
    turmas: String(valor("turmas", "Turmas")).trim(),
    periodos: String(valor("periodos", "Periodos")).trim(),
    dia: String(valor("dia", "Dia")).trim(),
    horaInicio: String(valor("horaInicio", "Hora_Inicio")).trim(),
    horaFim: String(valor("horaFim", "Hora_Fim")).trim(),
    disciplinas: String(valor("disciplinas", "Disciplinas")).trim(),
    cursos: String(valor("cursos", "Cursos")).trim(),
    meet: String(valor("meet", "Meet")).trim(),
    qtdVinculosAgrupados:
      Number(valor("qtdVinculosAgrupados", "Qtd_Vinculos_Agrupados")) || 0,
    qtdCursos,
    aulaCompartilhada:
      compartilhada === true ||
      String(compartilhada).trim().toUpperCase() === "SIM" ||
      qtdCursos > 1
  };
}

function montarCadastroProfessores(lista) {
  const mapa = new Map();

  lista.forEach(sessao => {
    if (!mapa.has(sessao.idProfessor)) {
      mapa.set(sessao.idProfessor, {
        idProfessor: sessao.idProfessor,
        professor: sessao.professor,
        chaveBusca: normalizarTexto(sessao.professor),
        faculdades: new Set(),
        cursos: new Set(),
        sessoes: 0
      });
    }

    const professor = mapa.get(sessao.idProfessor);

    if (sessao.faculdade) {
      professor.faculdades.add(sessao.faculdade);
    }

    separarLista(sessao.cursos).forEach(curso => professor.cursos.add(curso));
    professor.sessoes++;
  });

  return [...mapa.values()]
    .map(item => ({
      ...item,
      faculdades: [...item.faculdades].sort(localeSort),
      cursos: [...item.cursos].sort(localeSort)
    }))
    .sort((a, b) => localeSort(a.professor, b.professor));
}

function mostrarSugestoes(termo) {
  const chave = normalizarTexto(termo);

  if (!chave) {
    fecharSugestoes();
    return;
  }

  const palavras = chave.split(" ").filter(Boolean);

  const encontrados = professores
    .filter(item => palavras.every(palavra => item.chaveBusca.includes(palavra)))
    .slice(0, LIMITE_SUGESTOES);

  if (!encontrados.length) {
    sugestoesProfessores.innerHTML = `
      <div class="sugestao-vazia">
        <strong>Nenhum professor encontrado</strong>
        <span>Tente outra parte do nome.</span>
      </div>
    `;
    sugestoesProfessores.classList.remove("oculto");
    return;
  }

  sugestoesProfessores.innerHTML = encontrados
    .map(item => `
      <button
        type="button"
        class="sugestao-professor"
        role="option"
        data-id-professor="${escaparAtributo(item.idProfessor)}"
      >
        <span class="sugestao-avatar">👨‍🏫</span>
        <span class="sugestao-conteudo">
          <strong>${escaparHtml(item.professor)}</strong>
          <small>
            ${escaparHtml(item.faculdades.join(" • "))}
            ${item.cursos.length ? ` • ${item.cursos.length} ${item.cursos.length === 1 ? "curso" : "cursos"}` : ""}
          </small>
        </span>
        <span class="sugestao-seta">→</span>
      </button>
    `)
    .join("");

  sugestoesProfessores
    .querySelectorAll(".sugestao-professor")
    .forEach(botao => {
      botao.addEventListener("click", () => {
        selecionarProfessor(botao.dataset.idProfessor);
      });
    });

  sugestoesProfessores.classList.remove("oculto");
}

function fecharSugestoes() {
  sugestoesProfessores.classList.add("oculto");
  sugestoesProfessores.innerHTML = "";
}

function selecionarProfessor(idProfessor, atualizarURL = true) {
  const professor = professores.find(item => item.idProfessor === idProfessor);
  if (!professor) return;

  professorAtual = professor;
  buscaProfessor.value = professor.professor;
  limparBusca.hidden = false;
  fecharSugestoes();

  if (atualizarURL) {
    const url = new URL(window.location.href);
    url.searchParams.set("prof", professor.idProfessor);
    history.replaceState(null, "", url);
  }

  mostrarResultadoProfessor(professor);
}

function abrirProfessorDaURL() {
  const id = new URLSearchParams(window.location.search).get("prof");
  if (!id) return;

  if (professores.some(item => item.idProfessor === id)) {
    selecionarProfessor(id, false);
  }
}

function mostrarResultadoProfessor(professor) {
  const aulasProfessor = sessoes
    .filter(item => item.idProfessor === professor.idProfessor)
    .sort(ordenarSessoes);

  if (!aulasProfessor.length) {
    ocultarResultado();
    return;
  }

  resultado.classList.remove("oculto");

  resumoProfessor.innerHTML = montarResumoProfessor(professor, aulasProfessor);
  montarAulaAgora(aulasProfessor);
  montarAulasHoje(aulasProfessor);
  montarAgendaSemanal(aulasProfessor);

  resultado.scrollIntoView({ behavior: "smooth", block: "start" });
}

function montarResumoProfessor(professor, aulasProfessor) {
  const faculdades = professor.faculdades
    .map(item => `<span class="pill">${escaparHtml(item)}</span>`)
    .join("");

  const qtdSessoes = aulasProfessor.length;

  return `
    <div class="professor-topo">
      <div class="professor-avatar">👨‍🏫</div>

      <div class="professor-identidade">
        <span class="section-kicker">Professor selecionado</span>
        <h2>${escaparHtml(professor.professor)}</h2>
        <div class="professor-pills">${faculdades}</div>
      </div>

      <div class="professor-numeros">
        <strong>${qtdSessoes}</strong>
        <span>${qtdSessoes === 1 ? "sessão semanal" : "sessões semanais"}</span>
      </div>
    </div>
  `;
}

function montarAulaAgora(aulasProfessor) {
  const agora = obterAgoraSaoPaulo();
  const atuais = aulasProfessor.filter(aula => aulaEstaAgora(aula, agora));

  if (atuais.length) {
    aulaAgora.classList.remove("sem-aula");

    aulaAgora.innerHTML = `
      <div class="section-heading compacta">
        <div>
          <span class="status status-agora">🟢 Em aula agora</span>
          <h2>${atuais.length === 1 ? "Sala atual" : `${atuais.length} salas neste horário`}</h2>
        </div>
        <span class="relogio-atual">${escaparHtml(agora.horaTexto)}</span>
      </div>

      <div class="sessoes-grid">
        ${atuais.map(aula => montarCardSessao(aula, "agora")).join("")}
      </div>
    `;
    return;
  }

  aulaAgora.classList.add("sem-aula");

  const proximas = encontrarProximasAulas(aulasProfessor, agora);

  aulaAgora.innerHTML = `
    <div class="section-heading compacta">
      <div>
        <span class="status status-sem-aula">⚪ Sem aula agora</span>
        <h2>Nenhuma sala em andamento</h2>
      </div>
      <span class="relogio-atual">${escaparHtml(agora.horaTexto)}</span>
    </div>

    ${
      proximas.length
        ? `
          <p class="texto-suave">Próxima aula encontrada:</p>
          <div class="sessoes-grid proxima-grid">
            ${proximas.map(aula => montarCardSessao(aula, "proxima")).join("")}
          </div>
        `
        : `<p class="texto-suave">Não encontramos uma próxima aula cadastrada para este professor.</p>`
    }
  `;
}

function montarAulasHoje(aulasProfessor) {
  const agora = obterAgoraSaoPaulo();

  const hoje = aulasProfessor
    .filter(aula => indiceDia(aula.dia) === agora.diaSemana)
    .sort((a, b) => horaParaMinutos(a.horaInicio) - horaParaMinutos(b.horaInicio));

  contadorHoje.textContent =
    `${hoje.length} ${hoje.length === 1 ? "aula" : "aulas"}`;

  if (!hoje.length) {
    aulasHoje.innerHTML = `
      <div class="estado-vazio">
        <span>☕</span>
        <div>
          <strong>Sem aulas hoje</strong>
          <p>Não há sessões cadastradas para ${escaparHtml(nomesDias[agora.diaSemana])}.</p>
        </div>
      </div>
    `;
    return;
  }

  aulasHoje.innerHTML = `
    <div class="timeline">
      ${hoje.map(aula => montarLinhaHoje(aula, agora)).join("")}
    </div>
  `;
}

function montarLinhaHoje(aula, agora) {
  const inicio = horaParaMinutos(aula.horaInicio);
  const fim = horaParaMinutos(aula.horaFim);

  let estado = "futura";
  let rotulo = "Mais tarde";

  if (agora.minutos >= inicio && agora.minutos < fim) {
    estado = "agora";
    rotulo = "Agora";
  } else if (agora.minutos >= fim) {
    estado = "encerrada";
    rotulo = "Encerrada";
  }

  const disciplinas = separarLista(aula.disciplinas);

  return `
    <article class="timeline-item ${estado}">
      <div class="timeline-hora">
        <strong>${escaparHtml(aula.horaInicio)}</strong>
        <span>${escaparHtml(aula.horaFim)}</span>
      </div>

      <div class="timeline-corpo">
        <div class="linha-topo">
          <span class="mini-status ${estado}">${rotulo}</span>
          ${aula.aulaCompartilhada ? `<span class="mini-status compartilhada">👥 ${aula.qtdCursos} cursos</span>` : ""}
        </div>

        <h3>${escaparHtml(tituloSessao(aula))}</h3>

        ${
          disciplinas.length > 1
            ? `<div class="lista-chips">${disciplinas.map(item => `<span>${escaparHtml(item)}</span>`).join("")}</div>`
            : ""
        }

        <p>${escaparHtml(aula.faculdade)} • Turma ${escaparHtml(aula.turmas)} • ${escaparHtml(formatarPeriodo(aula.periodos))}</p>

        <div class="linha-acoes">
          ${botaoMeet(aula.meet, "Abrir Meet")}
          ${botaoCursos(aula)}
        </div>
      </div>
    </article>
  `;
}

function montarAgendaSemanal(aulasProfessor) {
  const grupos = {};

  aulasProfessor
    .slice()
    .sort(ordenarSessoes)
    .forEach(aula => {
      const dia = indiceDia(aula.dia);
      if (dia === undefined) return;

      if (!grupos[dia]) {
        grupos[dia] = [];
      }

      grupos[dia].push(aula);
    });

  contadorSemana.textContent =
    `${aulasProfessor.length} ${aulasProfessor.length === 1 ? "sessão" : "sessões"}`;

  agendaSemana.innerHTML = Object.keys(grupos)
    .map(Number)
    .sort((a, b) => a - b)
    .map(dia => `
      <section class="dia">
        <div class="dia-cabecalho">
          <h3>${escaparHtml(nomesDias[dia])}</h3>
          <span>${grupos[dia].length} ${grupos[dia].length === 1 ? "sessão" : "sessões"}</span>
        </div>

        <div class="agenda-lista">
          ${grupos[dia].map(aula => montarLinhaSemana(aula)).join("")}
        </div>
      </section>
    `)
    .join("");
}

function montarLinhaSemana(aula) {
  const disciplinas = separarLista(aula.disciplinas);

  return `
    <article class="agenda-item">
      <div class="agenda-horario">
        <strong>${escaparHtml(aula.horaInicio)}</strong>
        <span>às ${escaparHtml(aula.horaFim)}</span>
      </div>

      <div class="agenda-conteudo">
        <div class="linha-topo">
          <span class="faculdade-tag">${escaparHtml(aula.faculdade)}</span>
          ${aula.aulaCompartilhada ? `<span class="mini-status compartilhada">👥 ${aula.qtdCursos} cursos</span>` : ""}
        </div>

        <h4>${escaparHtml(tituloSessao(aula))}</h4>

        ${
          disciplinas.length > 1
            ? `<div class="lista-chips compacta">${disciplinas.map(item => `<span>${escaparHtml(item)}</span>`).join("")}</div>`
            : ""
        }

        <p>Turma ${escaparHtml(aula.turmas)} • ${escaparHtml(formatarPeriodo(aula.periodos))}</p>

        <div class="linha-acoes">
          ${botaoMeet(aula.meet, "Meet")}
          ${botaoCursos(aula)}
        </div>
      </div>
    </article>
  `;
}

function montarCardSessao(aula, tipo) {
  const disciplinas = separarLista(aula.disciplinas);
  const cursos = separarLista(aula.cursos);

  return `
    <article class="sessao-card ${tipo === "agora" ? "sessao-agora" : ""}">
      <div class="sessao-cabecalho">
        <div>
          <span class="faculdade-tag">${escaparHtml(aula.faculdade)}</span>
          ${aula.aulaCompartilhada ? `<span class="mini-status compartilhada">👥 Aula compartilhada</span>` : ""}
        </div>
        <strong class="sessao-hora">${escaparHtml(aula.horaInicio)}–${escaparHtml(aula.horaFim)}</strong>
      </div>

      <h3>${escaparHtml(tituloSessao(aula))}</h3>

      ${
        disciplinas.length > 1
          ? `
            <div class="bloco-informacao">
              <span>Disciplinas</span>
              <div class="lista-chips">
                ${disciplinas.map(item => `<span>${escaparHtml(item)}</span>`).join("")}
              </div>
            </div>
          `
          : ""
      }

      <div class="sessao-meta">
        <span>👥 Turma ${escaparHtml(aula.turmas)}</span>
        <span>📘 ${escaparHtml(formatarPeriodo(aula.periodos))}</span>
      </div>

      <div class="sessao-acoes">
        ${botaoMeet(aula.meet, "Abrir sala no Google Meet")}

        ${
          cursos.length
            ? `
              <details class="cursos-details">
                <summary>
                  ${cursos.length === 1 ? "Ver curso" : `Ver ${cursos.length} cursos atendidos`}
                </summary>
                <div class="cursos-lista">
                  ${cursos.map(curso => `<span>${escaparHtml(curso)}</span>`).join("")}
                </div>
              </details>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function botaoMeet(link, texto) {
  const url = normalizarUrl(link);

  if (!url) {
    return `<span class="sem-meet">Meet não cadastrado</span>`;
  }

  return `
    <a class="botao" href="${escaparAtributo(url)}" target="_blank" rel="noopener noreferrer">
      🎥 ${escaparHtml(texto)}
    </a>
  `;
}

function botaoCursos(aula) {
  const cursos = separarLista(aula.cursos);

  if (!cursos.length) return "";

  const id = `cursos-${aula.idSessao}`;

  return `
    <button
      type="button"
      class="botao-link"
      onclick="alternarCursos('${escaparJs(aula.idSessao)}')"
      aria-controls="${escaparAtributo(id)}"
    >
      ${cursos.length === 1 ? "Ver curso" : `Ver ${cursos.length} cursos`}
    </button>

    <div id="${escaparAtributo(id)}" class="cursos-inline oculto">
      ${cursos.map(curso => `<span>${escaparHtml(curso)}</span>`).join("")}
    </div>
  `;
}

function alternarCursos(idSessao) {
  const bloco = document.getElementById(`cursos-${idSessao}`);
  if (!bloco) return;

  bloco.classList.toggle("oculto");
}

function encontrarProximasAulas(aulasProfessor, agora) {
  const candidatas = [];

  aulasProfessor.forEach(aula => {
    const diaAula = indiceDia(aula.dia);
    const inicio = horaParaMinutos(aula.horaInicio);

    if (diaAula === undefined || Number.isNaN(inicio)) return;

    let distanciaDias = diaAula - agora.diaSemana;

    if (distanciaDias < 0) {
      distanciaDias += 7;
    }

    if (distanciaDias === 0 && inicio <= agora.minutos) {
      distanciaDias = 7;
    }

    candidatas.push({
      aula,
      distancia: distanciaDias * 1440 + inicio
    });
  });

  if (!candidatas.length) return [];

  candidatas.sort((a, b) => a.distancia - b.distancia);
  const menorDistancia = candidatas[0].distancia;

  return candidatas
    .filter(item => item.distancia === menorDistancia)
    .map(item => item.aula);
}

function aulaEstaAgora(aula, agora) {
  const dia = indiceDia(aula.dia);
  const inicio = horaParaMinutos(aula.horaInicio);
  const fim = horaParaMinutos(aula.horaFim);

  return (
    dia === agora.diaSemana &&
    !Number.isNaN(inicio) &&
    !Number.isNaN(fim) &&
    agora.minutos >= inicio &&
    agora.minutos < fim
  );
}

function obterAgoraSaoPaulo() {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());

  const mapa = {};

  partes.forEach(parte => {
    mapa[parte.type] = parte.value;
  });

  const diaSemana = indiceDia(mapa.weekday);
  const hora = Number(mapa.hour);
  const minuto = Number(mapa.minute);

  return {
    diaSemana,
    minutos: hora * 60 + minuto,
    horaTexto: `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`
  };
}

function indiceDia(dia) {
  return ordemDias[normalizarDia(dia)];
}

function normalizarDia(dia) {
  return normalizarTexto(dia)
    .toUpperCase()
    .replace(/\s+/g, "-");
}

function horaParaMinutos(hora) {
  if (!hora) return NaN;

  const partes = String(hora).trim().split(":");
  if (partes.length < 2) return NaN;

  return Number(partes[0]) * 60 + Number(partes[1]);
}

function ordenarSessoes(a, b) {
  const diaA = indiceDia(a.dia);
  const diaB = indiceDia(b.dia);

  if (diaA !== diaB) return diaA - diaB;

  const horaA = horaParaMinutos(a.horaInicio);
  const horaB = horaParaMinutos(b.horaInicio);

  if (horaA !== horaB) return horaA - horaB;

  return localeSort(a.faculdade, b.faculdade);
}

function separarLista(valor) {
  if (!valor) return [];

  return [...new Set(
    String(valor)
      .split("|")
      .map(item => item.trim())
      .filter(Boolean)
  )];
}

function tituloSessao(aula) {
  const disciplinas = separarLista(aula.disciplinas);

  if (disciplinas.length === 1) {
    return disciplinas[0];
  }

  if (!disciplinas.length) {
    return "Aula";
  }

  return `${disciplinas.length} disciplinas na mesma sala`;
}

function formatarPeriodo(valor) {
  const partes = separarLista(valor);

  if (!partes.length) return "Período não informado";

  return partes
    .map(item => /PER[IÍ]ODO/i.test(item) ? item : `${item} período`)
    .join(" • ");
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function localeSort(a, b) {
  return String(a).localeCompare(String(b), "pt-BR", {
    sensitivity: "base",
    numeric: true
  });
}

function normalizarUrl(link) {
  if (!link) return "";

  let url = String(link).trim();

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "";
    }

    return parsed.href;
  } catch {
    return "";
  }
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escaparAtributo(valor) {
  return escaparHtml(valor);
}

function escaparJs(valor) {
  return String(valor ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

function ocultarResultado() {
  resultado.classList.add("oculto");
  resumoProfessor.innerHTML = "";
  aulaAgora.innerHTML = "";
  aulasHoje.innerHTML = "";
  agendaSemana.innerHTML = "";
  contadorHoje.textContent = "";
  contadorSemana.textContent = "";
}
