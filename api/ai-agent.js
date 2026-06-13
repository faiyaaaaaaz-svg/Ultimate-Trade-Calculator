const DEFAULT_MODEL = "gpt-5.4-mini";
const MODEL_ID_PATTERN = /^[a-zA-Z0-9._:-]+$/;

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request is too large."));
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("Invalid JSON request."));
      }
    });

    request.on("error", reject);
  });
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item && typeof item.content === "string")
    .slice(-10)
    .map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.content.slice(0, 3000)
    }));
}

function buildCalculatorContext(calculatorData) {
  if (!calculatorData || typeof calculatorData !== "object") {
    return "No calculator data was provided.";
  }

  const activeInstruments = Array.isArray(calculatorData.instruments)
    ? calculatorData.instruments.filter((item) => item.active !== false)
    : [];
  const activeModels = Array.isArray(calculatorData.models)
    ? calculatorData.models.filter((item) => item.active !== false)
    : [];
  const conversions = Array.isArray(calculatorData.conversionPrices)
    ? calculatorData.conversionPrices
    : [];

  return JSON.stringify({
    updatedAt: calculatorData.updatedAt || "",
    markets: calculatorData.markets || [],
    instruments: activeInstruments,
    models: activeModels,
    conversionPrices: conversions
  });
}

function extractOutputText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const textParts = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Only POST requests are allowed." });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 500, {
      error: "OpenAI API key is missing. Add OPENAI_API_KEY in Vercel Environment Variables, then redeploy."
    });
    return;
  }

  try {
    const body = await readRequestBody(request);
    const message = String(body.message || "").trim();

    if (!message) {
      sendJson(response, 400, { error: "Please enter a question." });
      return;
    }

    const requestedModel = String(body.model || "").trim();
    const model = MODEL_ID_PATTERN.test(requestedModel) ? requestedModel : DEFAULT_MODEL;
    const history = normalizeHistory(body.history);
    const calculatorContext = buildCalculatorContext(body.calculatorData);

    const instructions =
      "You are the FundedNext Web Calculator AI support agent. Help users understand margin, PnL, pip movement, max lot, stop loss, take profit, risk percentage, leverage, contract size, pip size, and conversion factor calculations. Use the calculator data provided when answering instrument/model-specific questions.\n\n" +
      "Core behavior: act like a professional support agent, not a trading signal provider. Do not tell users what to buy or sell. Do not promise profits. Do not agree with wrong assumptions; correct them politely and explain why.\n\n" +
      "Output format rule: always answer in plain text only. Do not use Markdown. Do not use headings with #, ##, or ###. Do not use bold, italics, bullet markdown, tables, code blocks, LaTeX, \\text{}, \\frac{}, square-bracket math blocks, or any symbols that make the answer look like raw formatting. The final response must be directly copy-pasteable to a client without editing. Use simple numbered lines or short plain paragraphs only.\n\n" +
      "Missing-information rule: if the user asks for SL, TP, risk, reward, lot size, max lot, margin, or PnL but does not provide enough information, ask only for the missing required details before calculating. For SL/TP planning, usually ask for instrument, buy/sell position, entry price, account balance, risk amount or risk percentage, reward amount or reward percentage, and either lot size or stop-loss distance depending on the method. For margin/max lot, usually ask for instrument, market/model or leverage, current price, account size or lot size. For PnL, usually ask for instrument, buy/sell, open price, close price, and lot size.\n\n" +
      "Explanation style: explain like the client is totally new to trading. Use plain text section labels only, such as What I need:, Formula:, Calculation:, Final answer:, and Important note:. Include formulas when calculating, but write formulas in normal plain text only. Common formulas: Margin = (Price x Contract Size x Lot Size / Leverage) x Conversion Factor. PnL = Price Movement x Contract Size x Lot Size x Conversion Factor. Pip Movement = Price Movement / Pip Size. Risk Amount = Account Balance x Risk %. Lot Size = Risk Amount / (Conversion Factor x Contract Size x Pip Size x SL Pips). Max Lot = (Account Size x Leverage) / (Price x Contract Size x Conversion Factor).\n\n" +
      "Be concise but complete. Use USD formatting when money is involved. If a calculation depends on live market price and the user did not provide it, ask for the price instead of inventing one.\n\n" +
      `Calculator data JSON: ${calculatorContext}`;

    const input = [
      ...history.map((item) => ({
        role: item.role,
        content: item.content
      })),
      {
        role: "user",
        content: message
      }
    ];

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        instructions,
        input,
        max_output_tokens: 900
      })
    });

    const payload = await openAiResponse.json();

    if (!openAiResponse.ok) {
      const errorMessage = payload.error?.message || "OpenAI request failed.";
      sendJson(response, openAiResponse.status, { error: errorMessage });
      return;
    }

    const answer = extractOutputText(payload);
    sendJson(response, 200, {
      answer: answer || "I could not generate an answer. Please try again.",
      model
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error.message || "Something went wrong while contacting the AI agent."
    });
  }
};
