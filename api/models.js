const FALLBACK_MODELS = [
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini - cheaper, fast" },
  { id: "gpt-5.4-nano", label: "GPT-5.4 Nano - cheapest, fastest" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 Mini - affordable classic" },
  { id: "gpt-4.1-nano", label: "GPT-4.1 Nano - very low cost" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini - low cost" },
  { id: "gpt-5.4", label: "GPT-5.4 - balanced" },
  { id: "gpt-5.5", label: "GPT-5.5 - strongest" },
  { id: "gpt-4.1", label: "GPT-4.1 - older flagship" },
  { id: "gpt-4o", label: "GPT-4o - older omni model" },
  { id: "gpt-4-turbo", label: "GPT-4 Turbo - legacy" },
  { id: "gpt-4", label: "GPT-4 - legacy" }
];

const PREFERRED_ORDER = [
  "gpt-5.4-mini",
  "gpt-5.4-nano",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4o-mini",
  "gpt-5.4",
  "gpt-5.5",
  "gpt-4.1",
  "gpt-4o",
  "gpt-4-turbo",
  "gpt-4"
];

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function describeModel(id) {
  if (id === "gpt-5.4-nano") return "GPT-5.4 Nano - cheapest, fastest";
  if (id === "gpt-5.4-mini") return "GPT-5.4 Mini - cheaper, fast";
  if (id === "gpt-4.1-nano") return "GPT-4.1 Nano - very low cost";
  if (id === "gpt-4.1-mini") return "GPT-4.1 Mini - affordable classic";
  if (id === "gpt-4o-mini") return "GPT-4o Mini - low cost";
  if (id === "gpt-5.4") return "GPT-5.4 - balanced";
  if (id === "gpt-5.5") return "GPT-5.5 - strongest";
  if (id === "gpt-4.1") return "GPT-4.1 - older flagship";
  if (id === "gpt-4o") return "GPT-4o - older omni model";
  if (id === "gpt-4-turbo") return "GPT-4 Turbo - legacy";
  if (id === "gpt-4") return "GPT-4 - legacy";
  return id;
}

function isUsefulTextModel(id) {
  if (!id || typeof id !== "string") return false;
  if (!id.startsWith("gpt-")) return false;
  if (id.includes("image")) return false;
  if (id.includes("audio")) return false;
  if (id.includes("realtime")) return false;
  if (id.includes("transcribe")) return false;
  if (id.includes("tts")) return false;
  if (id.includes("whisper")) return false;
  if (id.includes("search")) return false;
  return true;
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
      defaultModel: "gpt-5.4-mini",
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
        defaultModel: "gpt-5.4-mini",
        source: "fallback"
      });
      return;
    }

    const models = (payload.data || [])
      .map((model) => model.id)
      .filter(isUsefulTextModel)
      .map((id) => ({ id, label: describeModel(id) }))
      .sort(sortModels);

    sendJson(response, 200, {
      models: models.length ? models : FALLBACK_MODELS,
      defaultModel: models.some((model) => model.id === "gpt-5.4-mini") ? "gpt-5.4-mini" : models[0]?.id || "gpt-5.4-mini",
      source: models.length ? "openai" : "fallback"
    });
  } catch (error) {
    sendJson(response, 200, {
      models: FALLBACK_MODELS,
      defaultModel: "gpt-5.4-mini",
      source: "fallback"
    });
  }
};
