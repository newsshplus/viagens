/**
 * Funcao serverless para Netlify.
 * Mesma logica da versao Vercel, adaptada para Netlify Functions.
 */

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON invalido" }) };
  }

  const { profile } = body;
  if (!profile || !profile.origin || !profile.destination_value) {
    return { statusCode: 400, body: JSON.stringify({ error: "Dados invalidos" }) };
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !repo) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Servidor nao configurado. Configure GITHUB_TOKEN e GITHUB_REPO.",
      }),
    };
  }

  try {
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

    const putBody = {
      message: `Adiciona perfil: ${profile.name || "novo perfil"}`,
      content: Buffer.from(JSON.stringify(profiles, null, 2)).toString("base64"),
      branch,
    };
    if (sha) putBody.sha = sha;

    const putRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/config/profiles.json`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`,
          "User-Agent": "viagens-smart",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(putBody),
      }
    );

    if (!putRes.ok) {
      const err = await putRes.text();
      return { statusCode: 500, body: JSON.stringify({ error: `Erro ao salvar: ${err}` }) };
    }

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

    return { statusCode: 200, body: JSON.stringify({ ok: true, message: "Perfil adicionado." }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
