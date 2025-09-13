document.addEventListener('DOMContentLoaded', () => {
    const notepadArea = document.getElementById('notepad-area');
    const storageKey = 'notepad_content';

    function loadNotes() {
        browser.storage.local.get(storageKey)
            .then((data) => {
                if (data[storageKey]) {
                    notepadArea.value = data[storageKey];
                }
            })
            .catch(error => {
                console.error('Erro ao carregar as notas:', error);
            });
    }

    function saveNotes() {
        const content = notepadArea.value;
        browser.storage.local.set({ [storageKey]: content })
            .catch(error => {
                console.error('Erro ao salvar as notas:', error);
            });
    }

    notepadArea.addEventListener('input', saveNotes);
    loadNotes();
});