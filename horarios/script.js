const API_URL = "https://script.google.com/macros/s/AKfycbzf7NU3lCTZrAoS88jsyByrkpKJyhvsyGqnClizCcp1q9vrvlXKDlHZh-BZnwYL6TK_XA/exec";

let dados = [];

const selectFaculdade = document.getElementById("faculdade");
const selectTurma = document.getElementById("turma");
const selectCurso = document.getElementById("curso");
const selectPeriodo = document.getElementById("periodo");

const resultado = document.getElementById("resultado");
const aulaAgora = document.getElementById("aulaAgora");
const proximaAula = document.getElementById("proximaAula");
const gradeHorarios = document.getElementById("gradeHorarios");

const ordemDias = {
  "Domingo": 0,
  "Segunda": 1,
  "Terça": 2,
  "Terca": 2,
  "Quarta": 3,
  "Quinta": 4,
  "Sexta": 5,
  "Sábado": 6,
  "Sabado": 6
};

fetch(API_URL, { cache: "no-store" })
  .then(res => {
    if (!res.ok) {
      throw new Error(`A API respondeu com status ${res.status}.`);
    }

    return res.json();
  })
  .then(json => {
    if (!Array.isArray(json)) {
      throw new Error(json?.mensagem || "A API não retornou uma lista de horários.");
    }

    dados = json;
    carregarFaculdades();
  })
  .catch(err => {
    console.error("Erro ao carregar horários:", err);
    alert("Erro ao carregar os horários. Verifique o Apps Script.");
  });

function carregarFaculdades() {
  preencherSelect(
    selectFaculdade,
    valoresUnicos(dados, "faculdade"),
    "Selecione a faculdade"
  );
}

selectFaculdade.addEventListener("change", () => {
  resetSelect(selectTurma, "Selecione a turma");
  resetSelect(selectCurso, "Selecione o curso");
  resetSelect(selectPeriodo, "Selecione o período");
  ocultarResultado();

  const faculdade = selectFaculdade.value;
  if (!faculdade) return;

  const turmas = valoresUnicos(
    dados.filter(item => item.faculdade === faculdade),
    "turma"
  );

  preencherSelect(selectTurma, turmas, "Selecione a turma");
});

selectTurma.addEventListener("change", () => {
  resetSelect(selectCurso, "Selecione o curso");
  resetSelect(selectPeriodo, "Selecione o período");
  ocultarResultado();

  const faculdade = selectFaculdade.value;
  const turma = selectTurma.value;

  if (!faculdade || !turma) return;

  const cursos = valoresUnicos(
    dados.filter(item =>
      item.faculdade === faculdade &&
      item.turma === turma
    ),
    "curso"
  );

  preencherSelect(selectCurso, cursos, "Selecione o curso");
});

selectCurso.addEventListener("change", () => {
  resetSelect(selectPeriodo, "Selecione o período");
  ocultarResultado();

  const faculdade = selectFaculdade.value;
  const turma = selectTurma.value;
  const curso = selectCurso.value;

  if (!faculdade || !turma || !curso) return;

  const periodos = valoresUnicos(
    dados.filter(item =>
      item.faculdade === faculdade &&
      item.turma === turma &&
      item.curso === curso &&
      item.periodo
    ),
    "periodo"
  );

  preencherSelect(selectPeriodo, periodos, "Selecione o período");
});

selectPeriodo.addEventListener("change", () => {
  const faculdade = selectFaculdade.value;
  const turma = selectTurma.value;
  const curso = selectCurso.value;
  const periodo = selectPeriodo.value;

  if (!faculdade || !turma || !curso || !periodo) {
    ocultarResultado();
    return;
  }

  const aulasCurso = dados.filter(item =>
    item.faculdade === faculdade &&
    item.turma === turma &&
    item.curso === curso &&
    item.periodo === periodo
  );

  mostrarResultado(aulasCurso);
});

function valoresUnicos(lista, campo) {
  return [...new Set(
    lista
      .map(item => String(item[campo] || "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
}

function preencherSelect(select, valores, textoInicial) {
  select.innerHTML = `<option value="">${textoInicial}</option>`;

  valores.forEach(valor => {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = valor;
    select.appendChild(option);
  });

  select.disabled = valores.length === 0;
}

function resetSelect(select, textoInicial) {
  select.innerHTML = `<option value="">${textoInicial}</option>`;
  select.disabled = true;
}

function ocultarResultado() {
  resultado.classList.add("oculto");
  aulaAgora.innerHTML = "";
  proximaAula.innerHTML = "";
  gradeHorarios.innerHTML = "";
}

function mostrarResultado(aulas) {
  resultado.classList.remove("oculto");

  const agora = new Date();
  const diaAtual = agora.getDay();
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  const aulaAtual = aulas.find(aula => {
    const dia = ordemDias[aula.dia];
    const inicio = horaParaMinutos(aula.horaInicio);
    const fim = horaParaMinutos(aula.horaFim);

    return dia === diaAtual && minutosAgora >= inicio && minutosAgora < fim;
  });

  if (aulaAtual) {
    aulaAgora.innerHTML = montarCardAula("🟢 Aula acontecendo agora", aulaAtual);
  } else {
    aulaAgora.innerHTML = `
      <div class="status">🔴 Nenhuma aula acontecendo agora</div>
      <p>Não há aula em andamento neste momento para esta turma, curso e período.</p>
    `;
  }

  const proxima = encontrarProximaAula(aulas);

  if (proxima) {
    proximaAula.innerHTML = montarCardAula("⏰ Próxima aula", proxima);
  } else {
    proximaAula.innerHTML = `
      <div class="status">Sem próxima aula encontrada</div>
      <p>Não encontramos próximas aulas cadastradas.</p>
    `;
  }

  montarGrade(aulas);
}

function encontrarProximaAula(aulas) {
  const agora = new Date();
  const diaAtual = agora.getDay();
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  const candidatas = [];

  aulas.forEach(aula => {
    const diaAula = ordemDias[aula.dia];
    const inicio = horaParaMinutos(aula.horaInicio);

    if (diaAula === undefined || isNaN(inicio)) return;

    let distanciaDias = diaAula - diaAtual;

    if (distanciaDias < 0) distanciaDias += 7;

    if (distanciaDias === 0 && inicio <= minutosAgora) {
      distanciaDias = 7;
    }

    candidatas.push({
      ...aula,
      distanciaTotal: distanciaDias * 1440 + inicio
    });
  });

  candidatas.sort((a, b) => a.distanciaTotal - b.distanciaTotal);

  return candidatas[0];
}

function montarCardAula(titulo, aula) {
  return `
    <div class="card-aula-layout">
      <div class="card-aula-principal">
        <div class="status">${titulo}</div>
        <div class="disciplina">${aula.disciplina}</div>
        <div class="horario">${aula.dia} • ${aula.horaInicio} às ${aula.horaFim}</div>
        ${aula.observacao ? `<p>${aula.observacao}</p>` : ""}
        <div class="botoes">
          ${aula.linkClassroom ? `<a class="botao" href="${corrigirLink(aula.linkMeet)}" target="_blank" rel="noopener noreferrer">Entrar na Aula Ao Vivo</a>` : ""}
          ${aula.linkMeet ? `<a class="botao secundario" href="${corrigirLink(aula.linkClassroom)}" target="_blank" rel="noopener noreferrer">Acessar o Google Sala de Aula</a>` : ""}
        </div>
      </div>

      <aside class="aviso-acesso" aria-label="Observação sobre acesso">
        <div class="aviso-acesso-icone">🔐</div>
        <div>
          <strong>Acesso às aulas</strong>
          <span>Google Sala de Aula e a Aula Ao Vivo só podem ser acessados com o e-mail institucional do aluno.</span>
        </div>
      </aside>
    </div>
  `;
}

function montarGrade(aulas) {
  const aulasOrdenadas = [...aulas].sort((a, b) => {
    const diaA = ordemDias[a.dia];
    const diaB = ordemDias[b.dia];

    if (diaA !== diaB) return diaA - diaB;

    return horaParaMinutos(a.horaInicio) - horaParaMinutos(b.horaInicio);
  });

  const grupos = {};

  aulasOrdenadas.forEach(aula => {
    if (!grupos[aula.dia]) grupos[aula.dia] = [];
    grupos[aula.dia].push(aula);
  });

  gradeHorarios.innerHTML = "";

  Object.keys(grupos).forEach(dia => {
    const div = document.createElement("div");
    div.className = "dia";

    div.innerHTML = `
      <h3>${dia}</h3>
      ${grupos[dia].map(aula => `
        <div class="aula-linha">
          <strong>${aula.horaInicio} às ${aula.horaFim}</strong> — ${aula.disciplina}
          ${aula.observacao ? `<br><small>${aula.observacao}</small>` : ""}
        </div>
      `).join("")}
    `;

    gradeHorarios.appendChild(div);
  });
}

function horaParaMinutos(hora) {
  if (!hora) return NaN;

  const partes = String(hora).split(":");

  if (partes.length < 2) return NaN;

  return Number(partes[0]) * 60 + Number(partes[1]);
}

function corrigirLink(link) {
  if (!link) return "";

  link = String(link).trim();

  if (!link.startsWith("http://") && !link.startsWith("https://")) {
    link = "https://" + link;
  }

  return link;
}
