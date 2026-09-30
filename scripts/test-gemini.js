require('dotenv').config();

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`;

  const payload = {
    contents: [{
      parts: [{
        text: 'Generate a JSON object with: { "message": "hello", "theory": "explanation of transactions" }'
      }]
    }],
    generationConfig: {
      response_mime_type: 'application/json'
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload)
    });

    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Raw text:', data.candidates?.[0]?.content?.parts?.[0]?.text);
    const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);
    console.log('Parsed successfully:', parsed);
  } catch (err) {
    console.error('Test error:', err);
  }
}

test();
