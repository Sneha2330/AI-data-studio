
import * as cheerio from "cheerio";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) return Response.json({ error: "Missing url" }, { status: 400 });

    const html = await fetch(url, { redirect: "follow" }).then(r => r.text());
    const $ = cheerio.load(html);

    const title = $("title").text().trim();
    const metaDesc = $('meta[name="description"]').attr("content") || "";

    const headings = $("h1,h2,h3")
      .slice(0, 20)
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);

    const paragraphs = $("p")
      .slice(0, 40)
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .filter(t => t.length > 40);

    const extractedText = [title, metaDesc, ...headings, ...paragraphs]
      .join("\n")
      .slice(0, 12000);

    // Agent-1 output
    return Response.json({ url, title, metaDesc, headings, extractedText });
  } catch (e) {
    return Response.json({ error: "Scrape failed", details: String(e) }, { status: 500 });
  }
}
