document.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById('display');
    const buttons = document.querySelector('.buttons');
    let expression = '';

    function updateDisplay(value) {
        display.textContent = value || expression || '0';
    }

    function handleInput(value) {
        if (value === 'C') {
            expression = '';
        } else if (value === 'CE') {
            expression = expression.slice(0, -1);
            if (expression === '') {
                expression = '0';
            }
        } else if (value === '=') {
            try {
                // Adiciona um substituto para 'mod', caso a biblioteca precise
                const safeExpression = expression.replace(/mod/g, '%');
                const result = math.evaluate(safeExpression);
                expression = result.toString();
            } catch (error) {
                expression = 'Erro';
            }
        } else {
            if (expression === '0' || expression === 'Erro') {
                expression = '';
            }
            expression += value;
        }
        updateDisplay();
    }

    // --- LÓGICA PARA CLIQUES NOS BOTÕES ---
    buttons.addEventListener('click', (event) => {
        if (!event.target.matches('button')) return;
        handleInput(event.target.value);
    });

    // --- LÓGICA PARA ENTRADA DO TECLADO (ATUALIZADA) ---
    document.addEventListener('keydown', (event) => {
        const key = event.key;

        if ('0123456789.'.includes(key)) {
            handleInput(key);
        } else if ('+-*/%'.includes(key)) { // Adicionado '%' aqui
            handleInput(key);
        } else if (key === 'Enter' || key === '=') {
            handleInput('=');
        } else if (key === 'Backspace') {
            handleInput('CE');
        } else if (key === 'Escape' || key === 'Delete') {
            handleInput('C');
        }
    });

    updateDisplay();
});