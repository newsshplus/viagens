/**
 * Versao Vercel da mesma funcao do Netlify (netlify/functions/add-profile.js).
 * Recebe o formulario do painel, grava um novo perfil em config/profiles.json
 * via API do GitHub, e dispara o workflow de busca imediatamente.
 *
 * Variaveis de ambiente (Vercel: Project Settings -> Environment Variables):
 *   GITHUB_TOKEN  - fine-grained personal access token, com permissao
 *                   "Contents: read and write" e "Actions: read and write"
 *                   restrita ao repositorio viagens.
 *   GITHUB_REPO   - "usuario/repositorio", ex: "newsshplus/viagens"
 * Opcional:
 *   GITHUB_BRANCH - branch alvo (padrao "main")
 */

const GITHUB_API = "https://api.github.com";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Metodo nao permitido." });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !repo) {
    res.status(500).json({
      ok: false,
      error: "GITHUB_TOKEN ou GITHUB_REPO nao configurados nas variaveis de ambiente do Vercel.",
    });
    return;
  }

  const input = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

  const required = ["name", "origin", "destination_type", "destination_value"];
  const missing = required.filter((f) => !input[f]);
  if (missing.length) {
    res.status(400).json({ ok: false, error: `Campos obrigatorios faltando: ${missing.join(", ")}` });
    return;
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

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "viagens-vercel-function",
  };

  try {
    const contentUrl = `${GITHUB_API}/repos/${repo}/contents/config/profiles.json?ref=${branch}`;
    const getResp = await fetch(contentUrl, { headers: authHeaders });
    if (!getResp.ok) {
      const errText = await getResp.text();
      res.status(502).json({ ok: false, error: `Erro ao ler profiles.json: ${errText}` });
      return;
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
      res.status(502).json({ ok: false, error: `Erro ao salvar profiles.json: ${errText}` });
      return;
    }

    const dispatchResp = await fetch(`${GITHUB_API}/repos/${repo}/actions/workflows/search.yml/dispatches`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ref: branch }),
    });

    res.status(200).json({
      ok: true,
      message: dispatchResp.ok
        ? "Perfil salvo e busca disparada agora. Acompanhe a aba Actions do GitHub - os resultados aparecem no painel em alguns minutos."
        : "Perfil salvo, mas nao consegui disparar a busca agora - ela roda no proximo agendamento (a cada 6h).",
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
};
