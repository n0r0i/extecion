const navButtons = document.querySelectorAll('.nav-button');
const views = document.querySelectorAll('.view');

function showView(viewId) {
    if (!views || !navButtons) return;
    views.forEach(v => v.classList.remove('active'));
    navButtons.forEach(b => b.classList.remove('active'));
    const viewToShow = document.getElementById(viewId);
    const btnToActivate = document.getElementById(`nav-${viewId.split('-')[1]}`);
    if(viewToShow) viewToShow.classList.add('active');
    if(btnToActivate) btnToActivate.classList.add('active');
}

export function initNavigation() {
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const viewName = button.id.split('-')[1];
            showView(`view-${viewName}`);
        });
    });
    showView('view-home');
}