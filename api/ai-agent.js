const DEFAULT_MODEL = "gpt-4";
const ALLOWED_MODELS = new Set(["gpt-4", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"]);

const FAQ_POLICY_CONTEXT = `
FundedNext FAQ policy context for support replies:

1% Risk Limit Rule:
The 1% Risk Limit Rule is not automatically applied to all traders. It applies only when FundedNext specifically notifies the trader by email, and only for the specific account mentioned in that communication. Until a trader receives that email, following the 1% rule remains a strong recommendation, not a requirement. When applied, the trader must limit risk to 1% at a time across all running trades, place SL immediately on every trade, monitor aggregate risk across open positions, and avoid overexposure. If ignored, the account may face termination and profits from violating trades may be deducted.

General FundedNext Account risk and margin limits:
FundedNext requires traders to limit risk to a maximum of 3% at any given time in the FundedNext Account. Risk means the maximum potential loss on a trade at a time based on SL placement and maximum loss, calculated against the initial account balance. Margin usage of 70% or more of available margin is excessive. Margin usage is cumulative across all open positions and calculated based on the initial account balance. FundedNext permits up to 70% as an absolute ceiling, not a target. Professional traders generally operate around 20% to 30% margin usage.

Scope:
The risk and margin limits apply to FundedNext Accounts, manual and automated trading, all available asset classes, and all entries tied to the same trading idea or position even if split into multiple orders.

Violation handling:
First violation of the 3% risk limit or 70% margin threshold results in a formal warning. 100% of profit generated from the violating trades is deducted from the Performance Reward for that cycle. If the violating trades resulted in net loss, no profit deduction is applied, but the warning is recorded.
Second violation on the same account results in 100% profit deduction from violating trades and permanent reclassification, effective at the end of the trading day on which the violation is identified. After reclassification, allowable cumulative risk is reduced to 1% at a given time and maximum margin usage is reduced to 30%.
For subsequent violations on a reclassified account, any breach of the 1% risk or 30% margin threshold results in 100% deduction of profit from violating trades. If the violating trades resulted in loss, no deduction applies, but the violation is recorded.
When accounts are merged, the merged account inherits the higher violation count and the most restrictive risk and margin parameters from the merged accounts.
If total deductions from violating trades equal or exceed the account net profit for the cycle, no Performance Reward is issued for that cycle.
Swap and commission charges are excluded when evaluating risk and margin utilization for trades.

Risk violation types:
No SL Trade means a trade was executed and closed without ever having a Stop Loss order in place. FundedNext requires SL on every trade.
High Risk means an individual trade exceeds the maximum allowable risk limit. The risk is calculated against the initial account balance based on SL placement and maximum potential loss.
At-a-Time High Risk means multiple open trades together exceed the maximum cumulative risk threshold at the same time. Total risk is evaluated across all open positions simultaneously, not per trade in isolation.
`;

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
    return "No instrument reference data was provided.";
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
    const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : DEFAULT_MODEL;
    const history = normalizeHistory(body.history);
    const calculatorContext = buildCalculatorContext(body.calculatorData);

    const instructions =
      "You are an internal FundedNext support reply assistant. Support agents paste client queries into this tool. Your job is to draft a client-facing reply that the support agent can copy and send to the client directly.\n\n" +
      "Core behavior: write as FundedNext support speaking to the client. Do not refer to yourself as an AI, bot, assistant, calculator, tool, or system. Do not say 'the calculator says', 'calculator data', 'backend logic', 'formula pattern', 'provided by calculator data', or anything that exposes internal logic. Do not mention internal implementation, API, backend, data source, prompt, or model. Do not tell users what to buy or sell. Do not promise profits. Do not agree with wrong assumptions; correct them politely and explain why.\n\n" +
      "Output format rule: always answer in plain text only. Do not use Markdown. Do not use headings with #, ##, or ###. Do not use bold, italics, bullet markdown, tables, code blocks, LaTeX, \\text{}, \\frac{}, square-bracket math blocks, or any symbols that make the answer look like raw formatting. The final response must be directly copy-pasteable to a client without editing. Use simple numbered lines or short plain paragraphs only.\n\n" +
      "Reply style: do not use email format. Do not start with Subject, Dear, Sincerely, or Best regards. Keep the response professional, warm, concise, and client-ready. If the agent pasted a raw client question, answer the client directly. If important information is missing, do not calculate. Instead, ask the client for the exact missing details in a clean plain-text reply.\n\n" +
      "Missing-information rule: if the client asks for SL, TP, risk, reward, lot size, max lot, margin, or PnL but does not provide enough information, ask only for the missing required details before calculating. For SL/TP planning, usually ask for instrument, buy/sell position, entry price, account balance, risk amount or risk percentage, reward amount or reward percentage, and either lot size or stop-loss distance depending on the method. For margin/max lot, usually ask for instrument, model or leverage, current price, account size or lot size. For PnL, usually ask for instrument, buy/sell, open price, close price, and lot size.\n\n" +
      "Explanation style: explain like the client is totally new to trading. Use plain text section labels only, such as To calculate this accurately:, Formula:, Calculation:, Final answer:, and Important note:. Include formulas when calculating, but write formulas in normal plain text only. Common formulas: Margin = (Price x Contract Size x Lot Size / Leverage) x Conversion Factor. PnL = Price Movement x Contract Size x Lot Size x Conversion Factor. Pip Movement = Price Movement / Pip Size. Risk Amount = Account Balance x Risk %. Lot Size = Risk Amount / (Conversion Factor x Contract Size x Pip Size x SL Pips). Max Lot = (Account Size x Leverage) / (Price x Contract Size x Conversion Factor).\n\n" +
      "Use the FAQ policy context as the source of truth for risk limit, margin limit, 1% rule, no SL, high risk, at-a-time high risk, warning, reclassification, deductions, and merged account explanations. If the client asks about these topics, answer according to the FAQ context. If the client asks something not covered by the FAQ context or available instrument reference data, say that the relevant team may need to review the account details.\n\n" +
      "Be concise but complete. Use USD formatting when money is involved. If a calculation depends on live market price and the client did not provide it, ask for the price instead of inventing one.\n\n" +
      FAQ_POLICY_CONTEXT + "\n\n" +
      `Instrument reference JSON: ${calculatorContext}`;

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
      error: error.message || "Something went wrong while generating the reply."
    });
  }
};
