const useOpenAI = import.meta.env.VITE_USE_OPENAI === 'true';
const key = import.meta.env.VITE_OPENAI_KEY;

export async function openaiChat(prompt, system='You are an interviewer.') {
  if (!useOpenAI || !key) {
    throw new Error('OpenAI disabled or key missing.');
  }
  const body = {
    model: 'gpt-4o-mini', // example; change to what's available
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt }
    ],
    max_tokens: 400
  };

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify(body)
  });
  const json = await r.json();
  return json;
}
