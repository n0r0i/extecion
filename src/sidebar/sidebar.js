import { initNavigation } from './navigation.js';
import { initHomeView } from './home-view.js';
import { initSettingsView } from './settings-view.js';
import { initStoreView } from './store-view.js';

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initHomeView();
    initSettingsView();
    initStoreView();
});