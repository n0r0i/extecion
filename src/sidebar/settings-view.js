const profileDisplay = document.getElementById('profile-display');
const profileEditForm = document.getElementById('profile-edit-form');
const editProfileBtn = document.getElementById('edit-profile-btn');
const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
const profileNameDisplay = document.getElementById('profile-name-display');
const profileAvatarDisplay = document.getElementById('profile-avatar-display');
const profileNameInput = document.getElementById('profile-name-input');
const profileAvatarInput = document.getElementById('profile-avatar-input');
const saveSettingsBtn = document.getElementById('save-all-settings-btn');
const settingsFeedback = document.getElementById('settings-feedback');
const apiKeyInput = document.getElementById('api-key-input');
const aiProviderSelect = document.getElementById('ai-provider-select');
const checkApiKeyBtn = document.getElementById('check-api-key-btn');
const modelsListContainer = document.getElementById('models-list-container');
const openRouterModelContainer = document.getElementById('openrouter-model-container');
const openRouterModelSelect = document.getElementById('openrouter-model-select');

function toggleProfileEditMode(isEditing) {
    if (!profileDisplay || !profileEditForm) return;
    profileDisplay.classList.toggle('hidden', isEditing);
    profileEditForm.classList.toggle('hidden', !isEditing);
}

function loadSettings() {
    if (!apiKeyInput || !aiProviderSelect) return;
    chrome.storage.local.get(['profile', 'apiKey', 'aiProvider', 'openRouterModel']).then((data) => {
        if (data && data.profile) {
            const { name, avatarDataUrl } = data.profile;
            if(profileNameDisplay) profileNameDisplay.textContent = name || 'Visitante';
            if(profileAvatarDisplay) profileAvatarDisplay.src = avatarDataUrl || 'avatar.png';
            if(profileNameInput) profileNameInput.value = name || '';
        } else if (profileNameDisplay) {
            profileNameDisplay.textContent = 'Visitante';
        }

        if (data && data.apiKey) apiKeyInput.value = data.apiKey;
        if (data && data.aiProvider) {
            aiProviderSelect.value = data.aiProvider;
            openRouterModelContainer.classList.toggle('hidden', data.aiProvider !== 'openrouter');
        } else {
            openRouterModelContainer.classList.add('hidden');
        }

        if (data && data.openRouterModel && openRouterModelSelect) {
            if (!Array.from(openRouterModelSelect.options).some(o => o.value === data.openRouterModel)) {
                const option = new Option(data.openRouterModel, data.openRouterModel);
                openRouterModelSelect.add(option);
            }
            openRouterModelSelect.value = data.openRouterModel;
        }
    });
}

function saveSettings() {
    if (!profileNameInput || !profileAvatarInput || !apiKeyInput || !aiProviderSelect) return;
    const newName = profileNameInput.value.trim();
    const avatarFile = profileAvatarInput.files[0];
    const newApiKey = apiKeyInput.value.trim();
    const selectedProvider = aiProviderSelect.value;
    const selectedOpenRouterModel = openRouterModelSelect.value;

    const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    chrome.storage.local.get('profile').then(async (data) => {
        let currentProfile = data.profile || {};
        let newAvatarDataUrl = currentProfile.avatarDataUrl;
        if (avatarFile) {
            try { newAvatarDataUrl = await readFileAsDataURL(avatarFile); }
            catch (error) { console.error("Erro ao ler avatar:", error); return; }
        }
        const newProfile = { name: newName, avatarDataUrl: newAvatarDataUrl };

        chrome.storage.local.set({
            profile: newProfile,
            apiKey: newApiKey,
            aiProvider: selectedProvider,
            openRouterModel: selectedOpenRouterModel
        }).then(() => {
            loadSettings();
            toggleProfileEditMode(false);
            if (settingsFeedback) {
                // --- MENSAGEM DE FEEDBACK ATUALIZADA ---
                let feedbackText = 'Configurações salvas!';
                if (selectedProvider === 'openrouter' && selectedOpenRouterModel) {
                    const readableModelName = selectedOpenRouterModel.split('/')[1] || selectedOpenRouterModel;
                    feedbackText = `Modelo '${readableModelName}' salvo com sucesso!`;
                } else if (selectedProvider) {
                    feedbackText = `Provedor '${selectedProvider}' salvo com sucesso!`;
                }
                settingsFeedback.textContent = feedbackText;
                settingsFeedback.classList.add('visible');
                setTimeout(() => { settingsFeedback.classList.remove('visible'); }, 3000);
            }
        });
    });
}

async function checkApiKeyAndListModels() {
    if (!apiKeyInput || !modelsListContainer || !aiProviderSelect) return;
    const key = apiKeyInput.value.trim();
    const provider = aiProviderSelect.value;

    modelsListContainer.classList.remove('hidden');
    modelsListContainer.classList.remove('success', 'error');

    if (!key) {
        modelsListContainer.value = "Por favor, insira uma chave de API.";
        modelsListContainer.classList.add('error');
        return;
    }

    modelsListContainer.value = `Verificando chave para ${provider}...`;
    let apiUrl = '', requestOptions = {};

    if (provider === 'google') {
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        requestOptions = { method: 'GET' };
    } else if (provider === 'openai') {
        apiUrl = 'https://api.openai.com/v1/models';
        requestOptions = { method: 'GET', headers: { 'Authorization': `Bearer ${key}` } };
    } else if (provider === 'openrouter') {
        apiUrl = 'https://openrouter.ai/api/v1/models';
        requestOptions = { method: 'GET', headers: { 'Authorization': `Bearer ${key}` } };
    }

    try {
        const response = await fetch(apiUrl, requestOptions);
        const data = await response.json();
        if (!response.ok) { throw new Error(data?.error?.message || 'Chave de API inválida ou erro de rede.'); }

        let modelNames = [];
        if (provider === 'google' && data.models) {
            modelNames = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent')).map(m => m.name);
        } else if (data.data) {
            modelNames = data.data.map(m => m.id);
        }

        if (provider === 'openrouter') {
            const freeModels = modelNames.filter(name => name.includes(':free')).sort();
            if (freeModels.length > 0) {
                if(openRouterModelSelect) openRouterModelSelect.innerHTML = '';
                freeModels.forEach(modelName => {
                    const option = new Option(modelName, modelName);
                    if(openRouterModelSelect) openRouterModelSelect.add(option);
                });
                if(modelsListContainer) {
                    modelsListContainer.value = `Chave válida! ${freeModels.length} modelos gratuitos encontrados e carregados no menu 'Modelo Específico'.`;
                    modelsListContainer.classList.add('success');
                }
            } else {
                if(modelsListContainer) {
                    modelsListContainer.value = "Chave válida, mas nenhum modelo gratuito foi encontrado.";
                    modelsListContainer.classList.add('error');
                }
            }
        } else {
            if (modelNames.length === 0) {
                if(modelsListContainer) {
                    modelsListContainer.value = "Nenhum modelo compatível encontrado.";
                    modelsListContainer.classList.add('error');
                }
            } else {
                if(modelsListContainer) {
                    modelsListContainer.value = `Chave válida! Modelos compatíveis:\n\n` + modelNames.join('\n');
                    modelsListContainer.classList.add('success');
                }
            }
        }
    } catch (error) {
        if(modelsListContainer) {
            modelsListContainer.value = `Erro: ${error.message}`;
            modelsListContainer.classList.add('error');
        }
    }
}

export function initSettingsView() {
    if(saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);
    if(editProfileBtn) editProfileBtn.addEventListener('click', () => toggleProfileEditMode(true));
    if(cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', () => toggleProfileEditMode(false));
    if(checkApiKeyBtn) checkApiKeyBtn.addEventListener('click', checkApiKeyAndListModels);
    if(aiProviderSelect) {
        aiProviderSelect.addEventListener('change', () => {
            if(openRouterModelContainer) openRouterModelContainer.classList.toggle('hidden', aiProviderSelect.value !== 'openrouter');
        });
    }
    loadSettings();
}
