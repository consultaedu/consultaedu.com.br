alert("SCRIPT NOVO - TESTE");
const API_URL = "https://script.google.com/macros/s/AKfycbxjZc4ZAbMdHEf38zuprYlcnzwDQsWiSf64DHX48RPtqGB7ShiHncpGZurRSisZXShbvg/exec";

const logos = {
  UNISBA: "https://raw.githubusercontent.com/suportemarcos-rgb/logos-email-aluno/main/images-Photoroom.png",
  UNIABEU: "https://raw.githubusercontent.com/suportemarcos-rgb/logos-email-aluno/main/UNIABEU-Photoroom.png",
  UNIFAVENI: "https://raw.githubusercontent.com/suportemarcos-rgb/logos-email-aluno/main/CENTRO-UNIVERSIT%C3%81RIO-FAVEN%20HORIZONTAL.png"
};

let ultimaConsulta = 0;

function normalizar(texto = "") {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function handleEnter(event) {
  const botao = document.getElementById("btn");
  if (event.key === "Enter" && !botao.disabled) consultar();
}

function renderMessage(tipo, titulo, mensagem) {
  const classe = tipo === "ok" ? "success" : "error";
  document.getElementById("retorno").innerHTML = `
    <div class="status-card ${classe}">
      <strong>${titulo}</strong>
      <p>${mensagem}</p>
    </div>
  `;
}

async function consultar() {
  const agora = Date.now();
  if (agora - ultimaConsulta < 1500) return;
  ultimaConsulta = agora;

  const campo = document.getElementById("busca");
  const retorno = document.getElementById("retorno");
  const loading = document.getElementById("loading");
  const botao = document.getElementById("btn");
  const q = campo.value.replace(/\s+/g, " ").trim();

  if (!q) {
    renderMessage("erro", "⚠️ Atenção", "Digite seu nome completo ou matrícula para realizar a consulta.");
    campo.focus();
    return;
  }

  if (!/^\d+$/.test(q) && q.split(" ").filter(Boolean).length < 2) {
    renderMessage("erro", "⚠️ Nome incompleto", "Digite seu nome completo exatamente como está na matrícula.");
    campo.focus();
    return;
  }

  botao.disabled = true;
  loading.style.display = "flex";
  retorno.innerHTML = "";

  try {
    const resposta = await fetch(`${API_URL}?q=${encodeURIComponent(q)}`);
    let res = await resposta.json();

    if (res && !Array.isArray(res)) res = [res];

    if (Array.isArray(res) && res.length > 0) {
      if (/^\d+$/.test(q)) {
        mostrarResultados(res);
      } else {
        const buscaNormalizada = normalizar(q);
        const iguais = res.filter(aluno => normalizar(aluno.nome) === buscaNormalizada);

        if (iguais.length > 0) {
          mostrarResultados(iguais);
        } else {
          renderMessage(
            "erro",
            "⚠️ Múltiplos resultados encontrados",
            "Encontramos nomes parecidos. Digite o nome completo exatamente como está na matrícula."
          );
        }
      }
    } else {
      renderMessage(
        "erro",
        "❌ Cadastro não localizado",
        "Nenhum aluno foi encontrado. Verifique se o nome completo está correto ou tente consultar pela matrícula."
      );
    }
  } catch (erro) {
    renderMessage("erro", "🚫 Falha na consulta", "Não foi possível consultar agora. Tente novamente em instantes.");
  } finally {
    loading.style.display = "none";
    botao.disabled = false;
  }
}

function mostrarResultados(lista) {
  const htmlResultados = lista.map((aluno, index) => {
    const instituicao = aluno.instituicao || "Instituição";
    const logo = logos[instituicao] || "";
    const emailId = `email-${index}`;

    return `
      <article class="result-card">
        <div class="result-top">
          ${logo ? `<img src="${logo}" alt="Logo ${instituicao}" />` : `<div class="fallback-logo">${instituicao}</div>`}
          <span>${instituicao}</span>
        </div>

        <div class="student-name">${aluno.nome || "Nome não informado"}</div>

        <div class="data-list">
          <div><span>Matrícula</span><strong>${aluno.matricula || "Não informada"}</strong></div>
          <div><span>E-mail</span><strong id="${emailId}">${aluno.email || "Não informado"}</strong></div>
          <div><span>Senha de primeiro acesso</span><strong>${aluno.senha ?? "Não cadastrada"}</strong></div>
          <div><span>Curso</span><strong>${aluno.curso || "Não informado"}</strong></div>
        </div>

        <button class="copy-btn" onclick="copiarEmail('${emailId}', this)">📋 Copiar e-mail</button>
      </article>
    `;
  }).join("");

  document.getElementById("retorno").innerHTML = `
    <div class="result-summary">✅ ${lista.length} vínculo(s) encontrado(s)</div>
    ${htmlResultados}
  `;
}

async function copiarEmail(id, botao) {
  const elemento = document.getElementById(id);
  const email = elemento?.innerText || "";

  try {
    await navigator.clipboard.writeText(email);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = email;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
  }

  const textoOriginal = botao.innerText;
  botao.innerText = "✅ E-mail copiado";
  botao.classList.add("copied");

  setTimeout(() => {
    botao.innerText = textoOriginal;
    botao.classList.remove("copied");
  }, 2000);
}
