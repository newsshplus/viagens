/**
 * Recebe o formulario de busca/cadastro do painel web, grava um novo
 * perfil em config/profiles.json (via API do GitHub) e dispara o
 * workflow de busca imediatamente (nao espera o proximo agendamento).
 *
 * Precisa de duas variaveis de ambiente configuradas no Netlify
 * (Site settings -> Environment variables):
 *   GITHUB_TOKEN  - fine-grained personal access token, com permissao
 *                   "Contents: read and write" e "Actions: read and write"
 *                   restrita ao repositorio viagens. Nunca exponha esse
 *                   token no navegador ou o adicione ao repositorio.
 *   GITHUB_REPO   - "usuario/repositorio", ex: "newsshplus/viagens"
 * Opcional:
 *   GITHUB_BRANCH - branch alvo (padrao "main")
 */

const GITHUB_API = "https://api.github.com";

function githubError(action, response, body) {
  const acceptedPermissions = response.headers.get("x-accepted-github-permissions");
  const details = body || `HTTP ${response.status}`;

  if (response.status === 401 || response.status === 403) {
    const hint = action === "salvar"
      ? "Verifique GITHUB_TOKEN: ele deve ser um fine-grained PAT do dono do repositorio, limitado a newsshplus/viagens, com Contents: Read and write."
      : "Verifique GITHUB_TOKEN: alem de Contents: Read and write, ele precisa de Actions: Read and write para disparar o workflow.";
    return `${hint}${acceptedPermissions ? ` Permissoes aceitas pelo GitHub: ${acceptedPermissions}.` : ""}`;
  }

  return `Erro ao ${action}: ${details}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Metodo nao permitido." }) };
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !repo) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "GITHUB_TOKEN ou GITHUB_REPO nao configurados nas variaveis de ambiente do Netlify." }),
    };
  }

  let input;
  try {
    input = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Corpo da requisicao invalido." }) };
  }

  const required = ["name", "origin", "destination_type", "destination_value"];
  const missing = required.filter((f) => !input[f]);
  if (missing.length) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: `Campos obrigatorios faltando: ${missing.join(", ")}` }) };
  }

  const childrenAges = String(input.children_ages || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);

  const newProfile = {
    name: input.name,
    origin: String(input.origin).toUpperCase(),
    destination_type: input.destination_type,
    destination_value:
      input.destination_type === "airport" ? String(input.destination_value).toUpperCase() : input.destination_value,
    window_start_days: Number(input.window_start_days || 3),
    window_end_days: Number(input.window_end_days || 90),
    min_stay_days: Number(input.min_stay_days || 7),
    adults: Number(input.adults || 1),
    children_ages: childrenAges,
    max_price: input.max_price ? Number(input.max_price) : null,
    currency: input.currency || "EUR",
  };

  if (!["airport", "continent"].includes(newProfile.destination_type)) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "destination_type deve ser airport ou continent." }) };
  }
  if (!/^[A-Z]{3}$/.test(newProfile.origin) ||
      (newProfile.destination_type === "airport" && !/^[A-Z]{3}$/.test(newProfile.destination_value))) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Origem e destino por aeroporto devem usar codigos IATA de 3 letras (ex.: LIS)." }) };
  }

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "viagens-netlify-function",
  };

  try {
    const contentUrl = `${GITHUB_API}/repos/${repo}/contents/config/profiles.json?ref=${branch}`;
    const getResp = await fetch(contentUrl, { headers: authHeaders });
    if (!getResp.ok) {
      const errText = await getResp.text();
      return { statusCode: 502, body: JSON.stringify({ ok: false, error: githubError("ler profiles.json", getResp, errText) }) };
    }
    const getData = await getResp.json();
    const currentProfiles = JSON.parse(Buffer.from(getData.content, "base64").toString("utf-8"));

    currentProfiles.push(newProfile);
    const newContentB64 = Buffer.from(JSON.stringify(currentProfiles, null, 2), "utf-8").toString("base64");

    const putResp = await fetch(`${GITHUB_API}/repos/${repo}/contents/config/profiles.json`, {
      method: "PUT",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Adiciona perfil de busca via painel: ${newProfile.name}`,
        content: newContentB64,
        sha: getData.sha,
        branch,
      }),
    });

    if (!putResp.ok) {
      const errText = await putResp.text();
      return { statusCode: 502, body: JSON.stringify({ ok: false, error: githubError("salvar", putResp, errText) }) };
    }

    const dispatchResp = await fetch(`${GITHUB_API}/repos/${repo}/actions/workflows/search.yml/dispatches`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ref: branch }),
    });

    if (!dispatchResp.ok) {
      const errText = await dispatchResp.text();
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          message: `Perfil salvo, mas a busca nao foi disparada agora. ${githubError("disparar o workflow", dispatchResp, errText)} Ela sera executada no proximo agendamento.`,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "Perfil salvo e busca disparada agora. Acompanhe a aba Actions do GitHub - os resultados aparecem no painel em alguns minutos.",
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err) }) };
  }
};
