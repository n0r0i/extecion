document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const imageUploadInput = document.getElementById('image-upload-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');

    let aiProvider = 'google';
    let attachedImageBase64 = null;
    let lastUserPrompt = '';

    function addMessage(sender, text, imageUrl = null) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        if (text) {
            const textElement = document.createElement('div');
            if (sender === 'bot' || sender === 'error') {
                textElement.innerHTML = marked.parse(text);
            } else {
                textElement.textContent = text;
            }
            messageElement.appendChild(textElement);
        }
        if (imageUrl) {
            const imageElement = document.createElement('img');
            imageElement.src = imageUrl;
            imageElement.className = 'message-image';
            messageElement.appendChild(imageElement);
        }
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageElement;
    }

    function resetImageAttachment() {
        attachedImageBase64 = null;
        if (imageUploadInput) imageUploadInput.value = '';
        if (imagePreviewContainer) imagePreviewContainer.classList.add('hidden');
    }

    async function getAiResponse(prompt, imageData = null) {
        lastUserPrompt = prompt;
        const promptLowerCase = prompt.toLowerCase();
        
        if (promptLowerCase.includes('abra')) {
            const words = promptLowerCase.split(' ');
            const siteWord = words.find(w => w.includes('.') || ['youtube', 'google', 'twitter', 'github'].includes(w));
            if (siteWord) {
                let url = siteWord;
                if (!url.includes('.')) { url = `https://www.${url}.com`; }
                else if (!url.startsWith('http')) { url = 'https://' + url; }
                try {
                    new URL(url);
                    browser.tabs.create({ url: url });
                    addMessage('bot', `Ok, abrindo uma nova aba para: **${url}**`);
                } catch (error) {
                    addMessage('error', `Não consegui entender "${siteWord}" como uma URL válida.`);
                }
                return;
            }
        }
        
        const isContextualCommand = promptLowerCase.includes('resuma') || promptLowerCase.includes('explique') || promptLowerCase.includes('traduza');
        if (isContextualCommand) {
            const readingMessage = 'Ok, lendo o conteúdo da página atual...';
            addMessage('bot', readingMessage);
            const loadingIndicator = addMessage('bot', '');
            loadingIndicator.classList.add('loading');
            loadingIndicator.innerHTML = '<span></span><span></span><span></span>';

            try {
                const tabs = await browser.tabs.query({ active: true, currentWindow: true });
                if (tabs.length > 0 && tabs[0].id) {
                    const response = await browser.tabs.sendMessage(tabs[0].id, {
                        command: 'summarize-page',
                        prompt: prompt 
                    });
                    
                    if (response && response.status === 'failure') {
                        throw new Error(response.reason);
                    }
                } else { throw new Error("Nenhuma aba ativa encontrada."); }
            } catch (error) {
                loadingIndicator.remove();
                if (error.message.includes('Receiving end does not exist')) {
                    addMessage('error', 'Desculpe, não consigo ler o conteúdo de páginas especiais do navegador.');
                } else {
                    addMessage('error', `Erro ao ler a página: ${error.message}`);
                }
            }
            return; 
        }
        
        const loadingIndicator = addMessage('bot', '');
        loadingIndicator.classList.add('loading');
        loadingIndicator.innerHTML = '<span></span><span></span><span></span>';
        
        browser.runtime.sendMessage({
            command: 'process-text-with-ai',
            text: prompt,
            promptTemplate: '',
            imageData: imageData
        });
    }

    browser.runtime.onMessage.addListener((message) => {
        const loadingIndicator = document.querySelector('.message.loading');
        if (loadingIndicator) { loadingIndicator.remove(); }
        if (message.command === 'ai-response') {
            addMessage('bot', message.data);
        } else if (message.command === 'ai-response-error') {
            const errorMsgElement = addMessage('error', `Não foi possível obter uma resposta.\n**Detalhe:** ${message.error}`);
            const retryButton = document.createElement('button');
            retryButton.textContent = 'Tentar Novamente';
            retryButton.className = 'retry-btn';
            chatMessages.appendChild(retryButton);
            retryButton.addEventListener('click', () => {
                errorMsgElement.remove();
                retryButton.remove();
                getAiResponse(lastUserPrompt, attachedImageBase64); 
            });
        }
    });

    chatForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const userInput = chatInput.value.trim();
        if (!userInput && !attachedImageBase64) return;
        addMessage('user', userInput, attachedImageBase64);
        getAiResponse(userInput, attachedImageBase64);
        chatInput.value = '';
        resetImageAttachment();
    });

    if(imageUploadInput) imageUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                attachedImageBase64 = e.target.result;
                if(imagePreview) imagePreview.src = attachedImageBase64;
                if(imagePreviewContainer) imagePreviewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    if (removeImageBtn) removeImageBtn.addEventListener('click', resetImageAttachment);

    browser.storage.local.get('aiProvider').then(data => {
        aiProvider = data.aiProvider || 'google';
        addMessage('bot', `Olá! Usando **${aiProvider}**. Como posso ajudar?`);
    }).catch(() => {
        addMessage('bot', 'Olá! Como posso ajudar?');
    });
});