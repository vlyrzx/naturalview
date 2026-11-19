
export default {
  async fetch(request, env) {
    const allowedOrigin = "https://vlyrzx.github.io";

    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.headers.get("Origin") !== allowedOrigin) {
      return Response.json(
        { error: "Unauthorized website" },
        { status: 403 }
      );
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (request.method !== "POST") {
      return Response.json(
        { error: "POST required" },
        { status: 405, headers }
      );
    }

    try {
      const body = await request.json();

      const modes = ["late", "heavy", "custom"];
      const mode = modes.includes(body.mode) ? body.mode : "late";
      const idea = String(body.idea || "").slice(0, 500);

      if (mode === "custom" && !idea.trim()) {
        return Response.json(
          { error: "Please enter a story idea." },
          { status: 400, headers }
        );
      }

      const topics = {
        late: "A realistic late-night conversation between two friends.",
        heavy: "An emotionally meaningful conversation about difficult feelings, friendship, or loneliness. End with genuine support.",
        custom: "Create a conversation based on this idea: " + idea
      };

      const prompt = `
Create a completely original iMessage conversation.

STORY TYPE:
${topics[mode]}

RULES:
- Write 20 to 26 messages.
- Use exactly two characters.
- Alternate between the two characters.
- Make the dialogue sound like real texting.
- Use natural, varied message lengths.
- No forced misspellings.
- No repetitive motivational quotes.
- Make the ending meaningful and believable.
- Keep everything age appropriate.
- Do not include narration or stage directions.

Return ONLY valid JSON:
{
  "messages": [
    {"sender":"other","text":"Example message"},
    {"sender":"me","text":"Example reply"}
  ]
}
`;

      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          prompt,
          max_tokens: 1800
        }
      );

      let output = result.response || "";
      output = output.replace(/```json|```/g, "").trim();

      const start = output.indexOf("{");
      const end = output.lastIndexOf("}");

      if (start === -1 || end === -1) {
        throw new Error("Invalid AI response");
      }

      const story = JSON.parse(output.slice(start, end + 1));

      if (!Array.isArray(story.messages) ||
          story.messages.length < 10 ||
          story.messages.some(m =>
            !["me", "other"].includes(m.sender) ||
            typeof m.text !== "string"
          )) {
        throw new Error("Invalid story format");
      }

      return Response.json(story, { headers });

    } catch (error) {
      return Response.json(
        { error: "AI generation failed. Please try again." },
        { status: 500, headers }
      );
    }
  }
};
