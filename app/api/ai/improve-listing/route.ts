import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { fetchAISettings, isFeatureEnabled } from "@/lib/ai/settings";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  // Check DB settings first — env killswitch and global/feature toggles
  const aiSettings = await fetchAISettings();
  if (!isFeatureEnabled(aiSettings, "ai_listing_assistant_enabled")) {
    return NextResponse.json({ error: "feature_disabled" }, { status: 503 });
  }

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

  const prompt = `Ти си редактор на обяви в DaiVzemi — български класифайд портал.

ТВОЯТА РОЛЯ:
Да направиш текста по-четим, без да добавяш нищо ново.
Мисли за себе си като за лек редактор — не като автор.

АБСОЛЮТНИ ЗАБРАНИ:
- Не добавяй факти, спецификации, марки, модели, пробег, мощност, условие, цена или каквото и да е, което потребителят не е написал.
- Не коментирай обявата.
- Не казвай какво липсва.
- Не питай за повече информация.
- Не добавяй маркетингов език или хвалебствени думи, които не са в оригинала.
- Не разширявай кратко съдържание — ако входът е кратък, изходът трябва да е също толкова кратък.

ПОЗВОЛЕНО — само леко редактиране:
- Коригирай правопис и пунктуация.
- Оправи главни букви.
- Подобри четимостта на изреченията.
- Добави абзаци само ако текстът е много дълъг.
- Направи заглавието по-ясно, използвайки само думи от входа.
- Пренареди съществуващата информация за по-добра логика.

ПРАВИЛО ЗА ВЕРИФИКАЦИЯ:
Преди да върнеш отговор, провери: всяко съществително, всяко число и всяка характеристика в изхода трябва да се съдържа дословно в предоставения от потребителя вход или в детайлите от формата. Ако не е в оригинала — не го включвай.

ОБЯВА:
Категория: ${category}${detailsContext}
Заглавие: ${title}
Описание: ${description}

Върни САМО валиден JSON без допълнителен текст:
{"title":"...","description":"..."}`;

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
