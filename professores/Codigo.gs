const CONFIG = {
  // Se o projeto estiver vinculado à planilha, pode deixar vazio.
  // Se for um Apps Script separado, cole aqui o ID da planilha.
  SPREADSHEET_ID: "",
  ABA: "SALAS_AGRUPADAS"
};

function doGet() {
  try {
    const ss = CONFIG.SPREADSHEET_ID
      ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      : SpreadsheetApp.getActiveSpreadsheet();

    if (!ss) {
      throw new Error("Planilha não encontrada. Vincule o Apps Script à planilha ou informe o SPREADSHEET_ID.");
    }

    const aba = ss.getSheetByName(CONFIG.ABA);

    if (!aba) {
      throw new Error('Aba "SALAS_AGRUPADAS" não encontrada.');
    }

    const valores = aba.getDataRange().getDisplayValues();

    if (valores.length < 2) {
      return responderJSON({
        sucesso: true,
        dados: []
      });
    }

    const cabecalhos = valores.shift().map(valor => String(valor).trim());
    const colunas = {};

    cabecalhos.forEach((cabecalho, indice) => {
      colunas[cabecalho] = indice;
    });

    const obrigatorias = [
      "ID_SESSAO",
      "ID_PROFESSOR",
      "Professor",
      "Faculdade",
      "Turmas",
      "Periodos",
      "Dia",
      "Hora_Inicio",
      "Hora_Fim",
      "Disciplinas",
      "Cursos",
      "Meet"
    ];

    const faltando = obrigatorias.filter(nome => colunas[nome] === undefined);

    if (faltando.length) {
      throw new Error("Colunas não encontradas: " + faltando.join(", "));
    }

    const dados = valores
      .filter(linha => valor(linha, colunas, "ID_SESSAO"))
      .map(linha => {
        const qtdCursos = Number(valor(linha, colunas, "Qtd_Cursos")) || 0;

        return {
          idSessao: valor(linha, colunas, "ID_SESSAO"),
          idProfessor: valor(linha, colunas, "ID_PROFESSOR"),
          professor: valor(linha, colunas, "Professor"),
          faculdade: valor(linha, colunas, "Faculdade"),
          turmas: valor(linha, colunas, "Turmas"),
          periodos: valor(linha, colunas, "Periodos"),
          dia: valor(linha, colunas, "Dia"),
          horaInicio: valor(linha, colunas, "Hora_Inicio"),
          horaFim: valor(linha, colunas, "Hora_Fim"),
          disciplinas: valor(linha, colunas, "Disciplinas"),
          cursos: valor(linha, colunas, "Cursos"),
          meet: valor(linha, colunas, "Meet"),
          qtdVinculosAgrupados: Number(valor(linha, colunas, "Qtd_Vinculos_Agrupados")) || 0,
          qtdCursos: qtdCursos,
          aulaCompartilhada:
            String(valor(linha, colunas, "Aula_Compartilhada")).toUpperCase() === "SIM" ||
            qtdCursos > 1
        };
      });

    return responderJSON({
      sucesso: true,
      atualizadoEm: new Date().toISOString(),
      dados: dados
    });

  } catch (erro) {
    console.error(erro);

    return responderJSON({
      sucesso: false,
      mensagem: erro.message || "Erro ao consultar a base de professores."
    });
  }
}

function valor(linha, colunas, nome) {
  const indice = colunas[nome];

  if (indice === undefined) {
    return "";
  }

  return String(linha[indice] || "").trim();
}

function responderJSON(conteudo) {
  return ContentService
    .createTextOutput(JSON.stringify(conteudo))
    .setMimeType(ContentService.MimeType.JSON);
}
