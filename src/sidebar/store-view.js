import { availableTools } from './tools.js';

const toolList = document.getElementById('tool-list');

function addToolToHome(tool) {
    chrome.storage.local.get({ savedSites: [] }).then(data => {
        const savedSites = data.savedSites || [];
        const alreadyExists = savedSites.some(item => (item.id || item.url) === (tool.id || tool.url));
        if (alreadyExists) return;
        const updatedSites = [...savedSites, tool];
        chrome.storage.local.set({ savedSites: updatedSites }).then(() => {
            window.dispatchEvent(new CustomEvent('sitesChanged'));
        });
    });
}

async function renderStore() {
    if (!toolList) return;
    const { savedSites = [] } = await chrome.storage.local.get('savedSites');
    toolList.innerHTML = '';
    availableTools.forEach(tool => {
        const alreadyAdded = savedSites.some(item => item.id === tool.id);
        const listItem = document.createElement('li');
        listItem.className = 'tool-item';
        listItem.innerHTML = `<div class="tool-icon-container"><i class="${tool.iconClass}"></i></div><div class="tool-details"><h3 class="tool-name">${tool.name}</h3><p class="tool-description">${tool.description}</p></div><div class="tool-action"><button class="add-tool-btn" data-tool-id="${tool.id}" ${alreadyAdded ? 'disabled' : ''}>${alreadyAdded ? 'Adicionado' : 'Adicionar'}</button></div>`;
        const addButton = listItem.querySelector('.add-tool-btn');
        if (addButton && !alreadyAdded) {
            addButton.addEventListener('click', () => addToolToHome(tool));
        }
        toolList.appendChild(listItem);
    });
}

export function initStoreView() {
    renderStore();
    window.addEventListener('sitesChanged', renderStore);
}
