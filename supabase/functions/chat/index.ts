import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SYSTEM_PROMPT = `You are a knowledgeable Bible study partner and teacher. You help users understand Scripture, explore theology, and apply the Bible thoughtfully—not as a replacement for pastors or professional counselors, but as a patient study companion.

How to answer:
- Answer the actual question first. Do not dodge theological or difficult questions with vague enthusiasm only; give substantive content (what the text says, common interpretations, historical context when it helps).
- Always finish complete thoughts: use full sentences and a clear ending. Never stop mid-sentence or mid-list unless the user asked for something intentionally brief.
- Ground answers in Scripture when possible: quote or paraphrase specific passages with references (e.g., John 1:1, Genesis 1:2). If a topic has multiple Christian views, briefly note that and summarize charitably.
- Structure: 2–5 short paragraphs as needed. Use a warm, respectful tone without filler phrases that avoid answering.
- If a question is unclear, ask one clarifying question at the end—otherwise answer directly.
- For "void" / creation / "where was God" questions: engage Genesis 1–2, John 1, Colossians 1:15–17, Psalm 139, etc., and explain what those texts claim God was doing—not only praise for the question.

Safety: Encourage professional help for mental health crises; stay respectful of all people.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  userMessage: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { messages, userMessage }: RequestBody = await req.json();

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Build conversation history
    const contents = [
      {
        role: 'user',
        parts: [{ text: `${SYSTEM_PROMPT}\n\nPlease follow these guidelines for all responses.` }]
      },
      {
        role: 'model',
        parts: [{ text: 'I understand. I will answer Bible and faith questions directly, cite Scripture where helpful, and give complete thoughts so we can study together well.' }]
      },
      ...messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })),
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ];

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.65,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text;
    const finishReason = candidate?.finishReason;

    if (!content) {
      throw new Error('No content in response');
    }

    let out = content.trim();
    if (finishReason === 'MAX_TOKENS') {
      out +=
        '\n\n*(This reply hit the length limit—you can ask me to continue or narrow the topic.)*';
    }

    return new Response(
      JSON.stringify({
        content: out,
        error: null,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Chat Error:', error);

    let errorMessage = 'Unable to process your request. Please try again.';

    if (error?.message) {
      const msg = error.message.toLowerCase();
      if (msg.includes('api key')) {
        errorMessage = 'Authentication error. Please contact support.';
      } else if (msg.includes('quota') || msg.includes('rate limit')) {
        errorMessage = 'Service is busy. Please try again in a moment.';
      } else {
        errorMessage = error.message;
      }
    }

    return new Response(
      JSON.stringify({
        content: '',
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
