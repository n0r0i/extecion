function getPageText() {
    let textContent = '';
    const article = document.querySelector('article');
    const main = document.querySelector('main');
    if (article) textContent = article.innerText;
    else if (main) textContent = main.innerText;
    else textContent = document.body.innerText;
    return textContent.replace(/\s\s+/g, ' ').trim();
}

async function getYouTubeTranscript() {
    try {
        const playerResponse = window.ytInitialPlayerResponse;
        if (!playerResponse || !playerResponse.captions) {
            throw new Error("Não foi possível encontrar os dados de legenda na página.");
        }

        const captionTracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
        if (!captionTracks || captionTracks.length === 0) {
            throw new Error("Nenhuma faixa de legenda encontrada nos dados do vídeo.");
        }

        const transcriptUrl = captionTracks[0].baseUrl;
        const transcriptResponse = await fetch(transcriptUrl);
        const transcriptXml = await transcriptResponse.text();

        const textSegments = [...transcriptXml.matchAll(/<text[^>]*>(.*?)<\/text>/gis)].map(match => match[1]);

        const fullTranscript = textSegments.map(line => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = line;
            return tempDiv.textContent || tempDiv.innerText || "";
        }).join(' ');

        return fullTranscript.trim();

    } catch (error) {
        console.error("Erro durante a extração da transcrição do YouTube:", error);
        return null;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "summarize-page") {
        (async () => {
            try {
                let textContent = '';
                if (window.location.hostname.includes("youtube.com") && window.location.pathname.includes("watch")) {
                    textContent = await getYouTubeTranscript();
                    if (!textContent) {
                        throw new Error('Não foi possível encontrar uma transcrição para este vídeo. Verifique se o vídeo possui legendas.');
                    }
                } else {
                    textContent = getPageText();
                }

                if (textContent.length < 100) {
                    throw new Error('Não foi possível encontrar conteúdo de texto significativo.');
                }

                chrome.runtime.sendMessage({
                    command: 'process-text-with-ai',
                    text: textContent.substring(0, 20000),
                    promptTemplate: message.prompt
                });

                sendResponse({ status: 'success' });

            } catch (error) {
                console.error("Falha ao processar a página:", error);
                sendResponse({ status: 'failure', reason: error.message });
            }
        })();

        return true;
    }
});
