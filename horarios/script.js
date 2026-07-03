const API_URL = "https://script.google.com/macros/s/AKfycbzf7NU3lCTZrAoS88jsyByrkpKJyhvsyGqnClizCcp1q9vrvlXKDlHZh-BZnwYL6TK_XA/exec";

let dados = [];

const selectFaculdade = document.getElementById("faculdade");
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

fetch(API_URL)
  .then(res => res.json())
  .then(json => {
    dados = json;
    carregarFaculdades();
  })
  .catch(err => {
    console.error("Erro ao carregar horários:", err);
    alert("Erro ao carregar os horários. Verifique o Apps Script.");
  });

function carregarFaculdades() {
  selectFaculdade.innerHTML = '<option value="">Selecione a faculdade</option>';

  const faculdades = [...new Set(dados.map(item => item.faculdade))].sort();

  faculdades.forEach(faculdade => {
    const option = document.createElement("option");
    option.value = faculdade;
    option.textContent = faculdade;
    selectFaculdade.appendChild(option);
  });
}

selectFaculdade.addEventListener("change", () => {
  selectCurso.innerHTML = '<option value="">Selecione o curso</option>';
  selectPeriodo.innerHTML = '<option value="">Selecione o período</option>';

  selectCurso.disabled = true;
  selectPeriodo.disabled = true;
  resultado.classList.add("oculto");

  const faculdade = selectFaculdade.value;
  if (!faculdade) return;

  const cursos = [...new Set(
    dados
      .filter(item => item.faculdade === faculdade)
      .map(item => item.curso)
  )].sort();

  cursos.forEach(curso => {
    const option = document.createElement("option");
    option.value = curso;
    option.textContent = curso;
    selectCurso.appendChild(option);
  });

  selectCurso.disabled = false;
});

selectCurso.addEventListener("change", () => {
  selectPeriodo.innerHTML = '<option value="">Selecione o período</option>';
  selectPeriodo.disabled = true;
  resultado.classList.add("oculto");

  const faculdade = selectFaculdade.value;
  const curso = selectCurso.value;

  if (!faculdade || !curso) return;

  const periodos = [...new Set(
    dados
      .filter(item =>
        item.faculdade === faculdade &&
        item.curso === curso &&
        item.periodo
      )
      .map(item => item.periodo)
  )].sort();

  periodos.forEach(periodo => {
    const option = document.createElement("option");
    option.value = periodo;
    option.textContent = periodo;
    selectPeriodo.appendChild(option);
  });

  selectPeriodo.disabled = false;
});

selectPeriodo.addEventListener("change", () => {
  const faculdade = selectFaculdade.value;
  const curso = selectCurso.value;
  const periodo = selectPeriodo.value;

  if (!faculdade || !curso || !periodo) {
    resultado.classList.add("oculto");
    return;
  }

  const aulasCurso = dados.filter(item =>
    item.faculdade === faculdade &&
    item.curso === curso &&
    item.periodo === periodo
  );

  mostrarResultado(aulasCurso);
});

function mostrarResultado(aulas) {
  resultado.classList.remove("oculto");

  const agora = new Date();
  const diaAtual = agora.getDay();
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  const aulaAtual = aulas.find(aula => {
    const dia = ordemDias[aula.dia];
    const inicio = horaParaMinutos(aula.horaInicio);
    const fim = horaParaMinutos(aula.horaFim);

    return dia === diaAtual && minutosAgora >= inicio && minutosAgora <= fim;
  });

  if (aulaAtual) {
    aulaAgora.innerHTML = montarCardAula("🟢 Aula acontecendo agora", aulaAtual);
  } else {
    aulaAgora.innerHTML = `
      <div class="status">🔴 Nenhuma aula acontecendo agora</div>
      <p>Não há aula em andamento neste momento para este curso e período.</p>
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

  let candidatas = [];

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
    <div class="status">${titulo}</div>
    <div class="disciplina">${aula.disciplina}</div>
    <div class="horario">${aula.dia} • ${aula.horaInicio} às ${aula.horaFim}</div>
    ${aula.observacao ? `<p>${aula.observacao}</p>` : ""}
    <div class="botoes">
      ${aula.linkClassroom ? `<a class="botao" href="${corrigirLink(aula.linkClassroom)}" target="_blank" rel="noopener noreferrer">Acessar Classroom</a>` : ""}
      ${aula.linkMeet ? `<a class="botao secundario" href="${corrigirLink(aula.linkMeet)}" target="_blank" rel="noopener noreferrer">Entrar no Meet</a>` : ""}
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
