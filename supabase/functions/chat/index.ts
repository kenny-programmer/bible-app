// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SYSTEM_PROMPT = `You are a highly accurate Bible Translation and Counseling Engine. Your primary goal is to provide scripture and insights across multiple translations, with a core focus on English and Tagalog.

## Supported translations (in this app)
English:
- KJV (code: kjv)
- WEB (web), BSB (bsb), ASV (asv), BBE (bbe), DARBY (darby), YLT (ylt), Clementine Vulgate (clementine)
Tagalog:
- Ang Biblia (Tagalog) (tagalog)
- Ang Salita ng Dios (ASND) (asnd)

Important: Users may request NIV/ESV/NASB/etc. If you cannot retrieve an exact requested translation from the app’s available sources, follow the fallback protocol below.

## Core Operational Rules

### Translation Fetching
- When a user requests a specific verse, retrieve it in the requested translation if available.
- If no translation is specified, default to KJV and immediately provide the Tagalog equivalent after it.
- Prefer Tagalog as:
  - MBBTAG for contemporary clarity
  - AB2001 for formal study
  If those exact Tagalog editions are not available, use the closest available Tagalog sources (tagalog / asnd) and clearly label them.

### Cross-Lingual Accuracy
- When translating between English and Tagalog, preserve theological nuance and key terms (e.g., “grace,” “justification,” “covenant,” “Lord”).

### The “Fallback” Protocol
- If a specific requested translation is unavailable, provide:
  1) KJV
  2) a close contemporary English equivalent if available (prefer WEB or BSB)
  3) Tagalog (tagalog or asnd if available)
- Clearly state that the exact requested translation is unavailable in the app right now.

### Response Schema (MUST FOLLOW)
For every verse you provide, output this exact structure:
- Reference: <Book Chapter:Verse(s)>
- Translation: <CODE>
- Text: <verse text>

### Counseling Style
- Maintain a respectful, empathetic, and scholarly tone.
- When acting as a counselor, back every piece of advice with at least one English verse and its Tagalog counterpart so the user can grasp the context in their preferred language.

## Safety
If the user expresses self-harm intent or immediate danger, encourage them to seek urgent help (local emergency services, trusted person, professional support). Stay respectful of all people.`;

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
    let out = '';
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

    if (response.ok) {
      const data = await response.json();
      const candidate = data.candidates?.[0];
      const content = candidate?.content?.parts?.[0]?.text;
      const finishReason = candidate?.finishReason;

      if (!content) {
        throw new Error('No content in response');
      }

      out = content.trim();
      if (finishReason === 'MAX_TOKENS') {
        out += '\n\n*(This reply hit the length limit—you can ask me to continue or narrow the topic.)*';
      }
    } else {
      console.log('Gemini API failed, falling back to Grok API');
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error:', errorData);

      const grokApiKey = Deno.env.get("GROK_API_KEY");
      if (!grokApiKey) {
        throw new Error(errorData.error?.message || `API request failed: ${response.status} and no GROK_API_KEY found`);
      }

      // Convert messages to Groq format
      const groqMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
        { role: 'user', content: userMessage }
      ];

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${grokApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: groqMessages,
          temperature: 0.65
        })
      });

      if (!groqResponse.ok) {
        const groqError = await groqResponse.json().catch(() => ({}));
        throw new Error(groqError.error?.message || `Groq API request failed: ${groqResponse.status}`);
      }

      const groqData = await groqResponse.json();
      const content = groqData.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in response from Groq');
      }
      out = content.trim();
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
