document.addEventListener('DOMContentLoaded', () => {
    // Seleciona todos os elementos da interface
    const keywordInput = document.getElementById('keyword-input');
    const tracesKeyword = document.getElementById('traces-keyword');
    const deleteByKeywordBtn = document.getElementById('delete-by-keyword-btn');

    const timeValueInput = document.getElementById('time-value');
    const timeUnitSelect = document.getElementById('time-unit');
    const tracesRecent = document.getElementById('traces-recent');
    const deleteByTimeBtn = document.getElementById('delete-by-time-btn');

    const quickCleanBtn = document.getElementById('quick-clean-btn');
    const feedbackMessage = document.getElementById('feedback-message');

    const dataTypes = {
        cache: true, cookies: true, localStorage: true, formData: true
    };

    function showFeedback(message) {
        feedbackMessage.textContent = message;
        setTimeout(() => { feedbackMessage.textContent = ''; }, 3000);
    }

    // Função 1: Apagar por Palavra-chave
    async function deleteByKeyword() {
        const query = keywordInput.value.trim();
        if (!query) return;

        try {
            const historyItems = await chrome.history.search({ text: query, maxResults: 10000 });
            for (const item of historyItems) {
                await chrome.history.deleteUrl({ url: item.url });
            }

            if (tracesKeyword.checked) {
                // Para apagar "rastros", precisamos extrair os domínios (origins)
                const origins = [...new Set(historyItems.map(item => new URL(item.url).origin))];
                if (origins.length > 0) {
                    await chrome.browsingData.remove({ origins }, dataTypes);
                }
            }
            showFeedback('Limpeza por palavra-chave concluída!');
        } catch (error) {
            console.error('Erro ao apagar por palavra-chave:', error);
            showFeedback('Ocorreu um erro.');
        }
    }

    // Função 2: Apagar Recentes
    async function deleteByTime() {
        const value = parseInt(timeValueInput.value, 10);
        const unit = timeUnitSelect.value;
        if (isNaN(value) || value <= 0) return;

        let multiplier = 1000 * 60; // Milissegundos em um minuto
        if (unit === 'hours') multiplier *= 60;
        if (unit === 'days') multiplier *= 60 * 24;

        const endTime = Date.now();
        const startTime = endTime - (value * multiplier);

        try {
            await chrome.history.deleteRange({ startTime, endTime });

            if (tracesRecent.checked) {
                await chrome.browsingData.remove({ since: startTime }, dataTypes);
            }
            showFeedback('Histórico recente apagado!');
        } catch (error) {
            console.error('Erro ao apagar recentes:', error);
            showFeedback('Ocorreu um erro.');
        }
    }

    // Função 3: Limpeza Rápida
    async function quickClean() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0 || !tabs[0].url.startsWith('http')) {
                showFeedback('Nenhuma aba de site ativa encontrada.');
                return;
            }

            const currentOrigin = new URL(tabs[0].url).origin;
            await chrome.browsingData.remove({ origins: [currentOrigin] }, dataTypes);
            showFeedback(`Rastros de ${currentOrigin} apagados!`);
        } catch (error) {
            console.error('Erro na limpeza rápida:', error);
            showFeedback('Ocorreu um erro.');
        }
    }

    // Adiciona os eventos aos botões
    deleteByKeywordBtn.addEventListener('click', deleteByKeyword);
    deleteByTimeBtn.addEventListener('click', deleteByTime);
    quickCleanBtn.addEventListener('click', quickClean);
});
