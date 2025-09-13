// --- LÓGICA DO WEB REQUEST (PARA O IFRAME) ---
function removeSecurityHeaders(responseDetails) {
  const headers = responseDetails.responseHeaders;
  for (let i = 0; i < headers.length; i++) {
    const headerName = headers[i].name.toLowerCase();
    if (headerName === 'x-frame-options' || headerName === 'content-security-policy') {
      headers.splice(i, 1); i--; 
    }
  }
  return { responseHeaders: headers };
}
browser.webRequest.onHeadersReceived.addListener(
  removeSecurityHeaders, { urls: ["<all_urls>"] }, ["blocking", "responseHeaders"]
);

// --- LÓGICA DO ASSISTENTE AI ---
async function callGoogleAPI(prompt, key, imageData = null) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`;
    const parts = [{ text: prompt }];
    if (imageData) {
        parts.push({ inline_data: { mime_type: "image/jpeg", data: imageData.split(',')[1] } });
    }
    const body = { contents: [{ parts }] };
    const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) { throw new Error(data?.error?.message || `Erro HTTP: ${response.status}`); }
    if (!data.candidates || data.candidates.length === 0) { const reason = data?.promptFeedback?.blockReason; throw new Error(reason ? `Resposta bloqueada: ${reason}` : "A API retornou uma resposta vazia."); }
    return data.candidates[0].content.parts[0].text;
}

async function callOpenAIAPI(prompt, key, imageData = null) {
    const API_URL = 'https://api.openai.com/v1/chat/completions';
    const content = [{ type: "text", text: prompt }];
    if (imageData) {
        content.push({ type: "image_url", image_url: { url: imageData } });
    }
    const body = { model: 'gpt-4o', messages: [{ role: 'user', content }] };
    const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) { throw new Error(data?.error?.message || `Erro HTTP: ${response.status}`); }
    return data.choices[0].message.content;
}

async function callOpenRouterAPI(prompt, key, model, imageData = null) {
    const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
    const content = [];
    if (prompt) { content.push({ type: 'text', text: prompt }); }
    if (imageData) { content.push({ type: "image_url", image_url: { url: imageData } }); }
    const body = { model: model, messages: [{ role: 'user', content }] };
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': browser.runtime.getURL('sidebar.html'), 'X-Title': 'Multi-Ferramentas Firefox' },
        body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) { throw new Error(data?.error?.message || `Erro HTTP: ${response.status}`); }
    return data.choices[0].message.content;
}

// Ouve mensagens tanto do painel lateral quanto dos content scripts
browser.runtime.onMessage.addListener((message) => {
    // Processa perguntas diretas ou texto vindo do content script
    if (message.command === 'process-text-with-ai') {
        const { text, promptTemplate, imageData } = message;
        const fullPrompt = promptTemplate ? `${promptTemplate}: "${text}"` : text;

        (async () => {
            try {
                const settings = await browser.storage.local.get(['apiKey', 'aiProvider', 'openRouterModel']);
                const { apiKey, aiProvider, openRouterModel } = settings;
                if (!apiKey) { throw new Error("Chave de API não configurada."); }
                let botResponse;
                if (aiProvider === 'openai') {
                    botResponse = await callOpenAIAPI(fullPrompt, apiKey, imageData);
                } else if (aiProvider === 'openrouter') {
                    botResponse = await callOpenRouterAPI(fullPrompt, apiKey, openRouterModel, imageData);
                } else {
                    botResponse = await callGoogleAPI(fullPrompt, apiKey, imageData);
                }
                browser.runtime.sendMessage({ command: 'ai-response', data: botResponse });
            } catch (error) {
                console.error("Erro no background script ao chamar a API:", error);
                browser.runtime.sendMessage({ command: 'ai-response-error', error: error.message });
            }
        })();
        return true;
    }
});