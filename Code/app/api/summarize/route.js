export const runtime = "nodejs";

function cleanTextKeepNewlines(t) {
  return (t || "")
    .replace(/\u0000/g, "")
    // normalize Windows newlines
    .replace(/\r\n/g, "\n")
    // collapse excessive blank lines, but keep paragraph structure
    .replace(/\n{3,}/g, "\n\n")
    // trim spaces around lines
    .split("\n")
    .map(line => line.trim())
    .join("\n")
    .trim();
}

function pickSummaryFromChatCompletions(json) {
  const choice = json?.choices?.[0];
  const msg = choice?.message;

  if (typeof msg?.content === "string") return msg.content;

  if (Array.isArray(msg?.content)) {
    return msg.content
      .map(part => (typeof part === "string" ? part : part?.text || ""))
      .join("\n");
  }

  if (typeof msg?.refusal === "string") return msg.refusal;

  return "";
}

export async function POST(req) {
  try {
    const { extractedText, url, title } = await req.json();

    if (!extractedText) {
      return Response.json({ error: "Missing extractedText" }, { status: 400 });
    }

    // Keep more context; preserve structure
    const safeText = cleanTextKeepNewlines(extractedText).slice(0, 9000);

    const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, "");
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
    const deployment =
      process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT;

    if (!endpoint || !apiKey || !apiVersion || !deployment) {
      return Response.json(
        { error: "Missing Azure OpenAI env vars", debug: { endpoint, apiVersion, deployment } },
        { status: 500 }
      );
    }

    const apiUrl =
      `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}` +
      `/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

    const prompt =
      `Summarize the scraped webpage faithfully.\n` +
      `URL: ${url || ""}\nTitle: ${title || ""}\n\n` +
      `Content:\n${safeText}\n\n` +
      `Return:\n` +
      `- 5 key takeaways (bullets)\n` +
      `- 1 short paragraph summary\n`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);

    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "Summarize accurately based only on the provided text." },
          { role: "user", content: prompt },
        ],

        // ✅ Correct for Azure chat/completions:
        max_completion_tokens: 1500,

        // Optional (safe defaults)
        temperature: 1,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const raw = await resp.text();

    if (!resp.ok) {
      return Response.json(
        { error: "Azure summarize failed", status: resp.status, azureBody: raw.slice(0, 2000) },
        { status: 500 }
      );
    }

    const json = JSON.parse(raw);
    const summaryRaw = pickSummaryFromChatCompletions(json);
    const summary = (summaryRaw || "").trim();

    return Response.json({
      summary,
      debug: summary
        ? undefined
        : {
            hasChoices: !!json?.choices?.length,
            finish_reason: json?.choices?.[0]?.finish_reason,
            rawContent: summaryRaw,
            usage: json?.usage,
          },
    });
  } catch (e) {
    return Response.json(
      {
        error: "Summarize failed",
        message: e?.name === "AbortError" ? "Timed out" : (e?.message || String(e)),
      },
      { status: 500 }
    );
  }
}
