import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: {
    title?: unknown;
    description?: unknown;
    category?: unknown;
    details?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const category =
    typeof body.category === "string" ? body.category.trim() : "";

  if (!title || !description) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Build a context string from structured details if provided
  let detailsContext = "";
  if (body.details && typeof body.details === "object") {
    const entries = Object.entries(body.details as Record<string, string>)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    if (entries) detailsContext = `\nДетайли: ${entries}`;
  }

  const prompt = `Ти си асистент за публикуване на обяви в DaiVzemi — български класифайд портал.

Задачата ти е да предложиш по-ясна и по-четима версия на заглавието и описанието на обявата.

ПРАВИЛА:
- Използвай САМО информацията, предоставена от потребителя. Не измисляй факти, спецификации, условия или характеристики.
- Може да подобриш форматирането, четимостта и структурата.
- Може да коригираш правописни грешки.
- Може да пренаредиш информацията за по-добра яснота.
- НЕ добавяй информация, която не е посочена.
- Пиши на български език.
- Отговори САМО с валиден JSON обект без никакъв допълнителен текст.

Обява:
Категория: ${category}${detailsContext}
Заглавие: ${title}
Описание: ${description}

Отговори с JSON в точно този формат:
{"title":"подобреното заглавие","description":"подобреното описание"}`;

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      message.content[0]?.type === "text" ? message.content[0].text.trim() : "";

    // Extract JSON — model may wrap in markdown code fences
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "parse_error" }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      title?: unknown;
      description?: unknown;
    };

    if (
      typeof parsed.title !== "string" ||
      typeof parsed.description !== "string"
    ) {
      return NextResponse.json({ error: "parse_error" }, { status: 502 });
    }

    return NextResponse.json({
      title: parsed.title.trim(),
      description: parsed.description.trim(),
    });
  } catch {
    return NextResponse.json({ error: "ai_error" }, { status: 502 });
  }
}
