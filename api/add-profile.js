/**
 * Funcao serverless para Vercel.
 * Adiciona um novo perfil de busca via formulário web.
 * Grava no config/profiles.json via GitHub API e dispara o workflow.
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { profile } = req.body;
  if (!profile || !profile.origin || !profile.destination_value) {
    return res.status(400).json({ error: "Dados invalidos" });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !repo) {
    return res.status(500).json({
      error: "Servidor nao configurado. Configure GITHUB_TOKEN e GITHUB_REPO.",
    });
  }

  try {
    // Le profiles.json atual
    const getRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/config/profiles.json?ref=${branch}`,
      { headers: { Authorization: `token ${token}`, "User-Agent": "viagens-smart" } }
    );

    let profiles = [];
    let sha = null;

    if (getRes.ok) {
      const file = await getRes.json();
      sha = file.sha;
      const content = Buffer.from(file.content, "base64").toString("utf-8");
      profiles = JSON.parse(content);
    }

    // Adiciona novo perfil
    profiles.push({
      name: profile.name || `Perfil ${profiles.length + 1}`,
      origin: profile.origin.toUpperCase(),
      destination_type: profile.destination_type || "airport",
      destination_value: profile.destination_value.toUpperCase(),
      window_start_days: profile.window_start_days || 3,
      window_end_days: profile.window_end_days || 90,
      min_stay_days: profile.min_stay_days || 7,
      adults: profile.adults || 1,
      children_ages: profile.children_ages || [],
      max_price: profile.max_price || null,
      currency: profile.currency || "EUR",
    });

    // Salva profiles.json
    const body = {
      message: `Adiciona perfil: ${profile.name || "novo perfil"}`,
      content: Buffer.from(JSON.stringify(profiles, null, 2)).toString("base64"),
      branch,
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/config/profiles.json`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`,
          "User-Agent": "viagens-smart",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!putRes.ok) {
      const err = await putRes.text();
      return res.status(500).json({ error: `Erro ao salvar: ${err}` });
    }

    // Dispara workflow de busca
    await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/search.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "User-Agent": "viagens-smart",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: branch }),
      }
    );

    return res.status(200).json({ ok: true, message: "Perfil adicionado e busca iniciada." });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
