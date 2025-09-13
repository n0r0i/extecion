import { availableTools } from './tools.js';

const siteList = document.getElementById('site-list');
const addSiteBtn = document.getElementById('add-site-btn');
const webPanel = document.getElementById('web-panel');
const emptyState = document.getElementById('empty-state');
const modal = document.getElementById('add-site-modal');
const modalTitle = document.getElementById('modal-title');
const cancelButton = document.getElementById('cancel-btn');
const saveButton = document.getElementById('save-btn');
const siteNameInput = document.getElementById('site-name');
const siteUrlInput = document.getElementById('site-url');
const isSeparatorCheckbox = document.getElementById('is-separator');
const urlFieldContainer = document.getElementById('url-field-container');

let draggedItem = null;
let editMode = false;
let idSendoEditado = null;

const saveOrder = () => {
    const currentListItems = Array.from(siteList.querySelectorAll('li'));
    const newOrderIds = currentListItems.map(item => item.dataset.id);
    browser.storage.local.get({ savedSites: [] }).then(data => {
        const reorderedSites = newOrderIds.map(id => data.savedSites.find(site => (site.id || site.url) === id)).filter(Boolean);
        browser.storage.local.set({ savedSites: reorderedSites });
    });
};

const removeItem = (idToRemove) => {
    browser.storage.local.get({ savedSites: [], lastOpenedUrl: null }).then(data => {
        const sites = data.savedSites || [];
        const itemToRemove = sites.find(item => (item.id || item.url) === idToRemove);
        if (!itemToRemove) return;
        if (window.confirm(`Tem certeza que deseja remover "${itemToRemove.name}"?`)) {
            const updatedSites = sites.filter(item => (item.id || item.url) !== idToRemove);
            if (data.lastOpenedUrl === idToRemove) {
                browser.storage.local.remove('lastOpenedUrl');
            }
            browser.storage.local.set({ savedSites: updatedSites }).then(() => {
                window.dispatchEvent(new CustomEvent('sitesChanged'));
            });
        }
    });
};

const renderSavedSites = () => {
    if (!siteList) return;
    browser.storage.local.get({ savedSites: [], lastOpenedUrl: null }).then((data) => {
        const savedSites = data.savedSites || [];
        siteList.innerHTML = '';
        
        if (emptyState && webPanel) {
            const firstClickableItem = savedSites.find(item => item.type !== 'separator');

            if (firstClickableItem) {
                emptyState.style.display = 'none';
                webPanel.style.display = 'block';

                const lastUrlIsValid = data.lastOpenedUrl && savedSites.some(site => site.url === data.lastOpenedUrl);

                if (lastUrlIsValid) {
                    if (webPanel.src !== data.lastOpenedUrl) webPanel.src = data.lastOpenedUrl;
                } else {
                    if (webPanel.src !== firstClickableItem.url) webPanel.src = firstClickableItem.url;
                    browser.storage.local.set({ lastOpenedUrl: firstClickableItem.url });
                }
            } else {
                emptyState.style.display = 'flex';
                webPanel.style.display = 'none';
            }
        }
        
        savedSites.forEach(item => {
            const listItem = document.createElement('li');
            listItem.draggable = true;
            const itemId = item.id || item.url;
            listItem.dataset.id = itemId;
            const itemControls = document.createElement('div');
            itemControls.className = 'item-controls';
            const editButton = document.createElement('span');
            editButton.className = 'edit-btn';
            editButton.innerHTML = '✏️';
            editButton.title = `Editar ${item.name}`;
            editButton.addEventListener('click', (event) => { event.stopPropagation(); openModalInEditMode(item); });
            const removeButton = document.createElement('span');
            removeButton.className = 'remove-btn';
            removeButton.innerHTML = '&times;';
            removeButton.title = `Remover ${item.name}`;
            removeButton.addEventListener('click', (event) => { event.stopPropagation(); removeItem(itemId); });
            itemControls.appendChild(editButton);
            itemControls.appendChild(removeButton);
            if (item.type === 'separator') {
                listItem.classList.add('list-separator');
                const separatorText = document.createElement('span');
                separatorText.textContent = item.name;
                listItem.appendChild(document.createElement('hr'));
                listItem.appendChild(separatorText);
                listItem.appendChild(document.createElement('hr'));
            } else {
                let iconElement;
                if (item.type === 'site') {
                    iconElement = document.createElement('img');
                    iconElement.src = `https://www.google.com/s2/favicons?domain=${item.url}&sz=32`;
                    iconElement.className = 'site-favicon';
                } else if (item.type === 'tool') {
                    iconElement = document.createElement('i');
                    iconElement.className = `tool-icon ${item.iconClass}`;
                }
                if (iconElement) {
                    iconElement.title = item.name;
                    iconElement.addEventListener('click', () => {
                        webPanel.src = item.url;
                        browser.storage.local.set({ lastOpenedUrl: item.url });
                    });
                    listItem.appendChild(iconElement);
                }
            }
            listItem.appendChild(itemControls);
            listItem.addEventListener('dragstart', function () { draggedItem = this; setTimeout(() => this.classList.add('dragging'), 0); });
            listItem.addEventListener('dragend', function () { if (draggedItem) draggedItem.classList.remove('dragging'); draggedItem = null; saveOrder(); });
            listItem.addEventListener('dragover', function (e) { e.preventDefault(); if (draggedItem && draggedItem !== this) { const rect = this.getBoundingClientRect(); const offset = e.clientY - rect.top - (rect.height / 2); if (offset < 0) { this.parentElement.insertBefore(draggedItem, this); } else { this.parentElement.insertBefore(draggedItem, this.nextSibling); } } });
            siteList.appendChild(listItem);
        });
    });
};

const openModalInAddMode = async () => {
    editMode = false; idSendoEditado = null;
    if(modalTitle) modalTitle.textContent = 'Adicionar Novo Item';
    if(saveButton) saveButton.textContent = 'Salvar';
    if(siteNameInput) siteNameInput.value = ''; 
    if(siteUrlInput) siteUrlInput.value = '';
    if(isSeparatorCheckbox) isSeparatorCheckbox.checked = false;
    if(urlFieldContainer) urlFieldContainer.style.display = 'flex';
    try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
            siteNameInput.value = tabs[0].title || '';
            siteUrlInput.value = tabs[0].url || '';
        }
    } catch (error) { console.error("Erro:", error); }
    if(modal) modal.classList.remove('modal-hidden');
};

const openModalInEditMode = (item) => {
    editMode = true; idSendoEditado = item.id || item.url;
    if (modalTitle) modalTitle.textContent = 'Editar Item';
    if (saveButton) saveButton.textContent = 'Atualizar';
    if (siteNameInput) siteNameInput.value = item.name;
    if (item.type === 'separator') {
        if(isSeparatorCheckbox) isSeparatorCheckbox.checked = true;
        if(urlFieldContainer) urlFieldContainer.style.display = 'none';
        if(siteUrlInput) siteUrlInput.value = '';
    } else {
        if(isSeparatorCheckbox) isSeparatorCheckbox.checked = false;
        if(urlFieldContainer) urlFieldContainer.style.display = 'flex';
        if(siteUrlInput) siteUrlInput.value = item.url;
    }
    if(modal) modal.classList.remove('modal-hidden');
};

const closeModal = () => {
    if(modal) modal.classList.add('modal-hidden');
};

const handleSave = () => {
    const name = siteNameInput.value.trim(); const url = siteUrlInput.value.trim(); const isSeparator = isSeparatorCheckbox.checked;
    if (!name) { alert('O nome é obrigatório.'); return; }
    if (!isSeparator && !url) { alert('A URL é obrigatória para sites.'); return; }
    browser.storage.local.get({ savedSites: [] }).then((data) => {
        let newItem;
        if (isSeparator) {
            const id = editMode ? idSendoEditado : 'sep-' + Date.now();
            newItem = { type: 'separator', name, id };
        } else {
            const tool = availableTools.find(t => t.url === url);
            newItem = tool ? tool : { type: 'site', name, url };
        }
        let updatedSites;
        if (editMode) {
            updatedSites = data.savedSites.map(item => ((item.id || item.url) === idSendoEditado) ? newItem : item);
        } else {
            updatedSites = [...data.savedSites, newItem];
        }
        browser.storage.local.set({ savedSites: updatedSites }).then(() => {
            window.dispatchEvent(new CustomEvent('sitesChanged'));
            closeModal();
        });
    });
};

export function initHomeView() {
    if(isSeparatorCheckbox) isSeparatorCheckbox.addEventListener('change', () => { urlFieldContainer.style.display = isSeparatorCheckbox.checked ? 'none' : 'flex'; });
    if(addSiteBtn) addSiteBtn.addEventListener('click', openModalInAddMode);
    if(cancelButton) cancelButton.addEventListener('click', closeModal);
    if(saveButton) saveButton.addEventListener('click', handleSave);
    if(modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    
    window.addEventListener('sitesChanged', renderSavedSites);
    renderSavedSites();
}