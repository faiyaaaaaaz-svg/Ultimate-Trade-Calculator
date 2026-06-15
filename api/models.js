const FALLBACK_MODELS = [
  { id: "gpt-4", label: "GPT-4.0 - default" },
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { id: "gpt-4.1-nano", label: "GPT-4.1 Nano" }
];

const PREFERRED_ORDER = [
  "gpt-4",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano"
];

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function describeModel(id) {
  if (id === "gpt-4") return "GPT-4.0 - default";
  if (id === "gpt-4.1") return "GPT-4.1";
  if (id === "gpt-4.1-mini") return "GPT-4.1 Mini";
  if (id === "gpt-4.1-nano") return "GPT-4.1 Nano";
  return id;
}

function isAllowedModel(id) {
  return PREFERRED_ORDER.includes(id);
}

function sortModels(a, b) {
  const aIndex = PREFERRED_ORDER.indexOf(a.id);
  const bIndex = PREFERRED_ORDER.indexOf(b.id);

  if (aIndex !== -1 || bIndex !== -1) {
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  }

  return a.id.localeCompare(b.id);
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Only GET requests are allowed." });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 200, {
      models: FALLBACK_MODELS,
      defaultModel: "gpt-4",
      source: "fallback"
    });
    return;
  }

  try {
    const openAiResponse = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    const payload = await openAiResponse.json();
    if (!openAiResponse.ok) {
      sendJson(response, 200, {
        models: FALLBACK_MODELS,
        defaultModel: "gpt-4",
        source: "fallback"
      });
      return;
    }

    const models = (payload.data || [])
      .map((model) => model.id)
      .filter(isAllowedModel)
      .map((id) => ({ id, label: describeModel(id) }))
      .sort(sortModels);

    sendJson(response, 200, {
      models: models.length ? models : FALLBACK_MODELS,
      defaultModel: models.some((model) => model.id === "gpt-4") ? "gpt-4" : models[0]?.id || "gpt-4",
      source: models.length ? "openai" : "fallback"
    });
  } catch (error) {
    sendJson(response, 200, {
      models: FALLBACK_MODELS,
      defaultModel: "gpt-4",
      source: "fallback"
    });
  }
};
