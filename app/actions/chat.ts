"use server";

export async function sendMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Chat] Missing Supabase configuration');
      return {
        content: '',
        error: 'Service configuration error. Please contact support.',
      };
    }

    // Call Supabase Edge Function
    const apiUrl = `${supabaseUrl}/functions/v1/chat`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        userMessage,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('[Chat] Edge function error:', responseText);
      if (response.status === 404) {
        return {
          content: '',
          error:
            'Chat function not found (404). Deploy it: supabase functions deploy chat, and set GEMINI_API_KEY in Supabase → Edge Functions → Secrets.',
        };
      }
      let errorMessage = `Request failed (${response.status}).`;
      try {
        const errBody = JSON.parse(responseText) as { error?: string; msg?: string };
        if (typeof errBody.error === 'string' && errBody.error.trim()) {
          errorMessage = errBody.error.trim();
        } else if (typeof errBody.msg === 'string' && errBody.msg.trim()) {
          errorMessage = errBody.msg.trim();
        }
      } catch {
        if (responseText.trim()) {
          errorMessage = responseText.trim().slice(0, 300);
        }
      }
      return { content: '', error: errorMessage };
    }

    const data = JSON.parse(responseText) as {
      content?: string;
      error?: string | null;
    };

    if (data.error) {
      return {
        content: '',
        error: data.error,
      };
    }

    if (!data.content || data.content.trim().length === 0) {
      console.error('[Chat] Empty response from edge function');
      return {
        content: '',
        error: 'Received empty response. Please try again.',
      };
    }

    return {
      content: data.content,
      error: null,
    };
  } catch (error: any) {
    console.error('[Chat] Error:', error);

    let errorMessage = 'Unable to process your request. Please try again.';

    if (error?.message) {
      const msg = error.message.toLowerCase();

      if (msg.includes('fetch') || msg.includes('network')) {
        errorMessage = 'Connection error. Please check your internet and try again.';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      content: '',
      error: errorMessage,
    };
  }
}
