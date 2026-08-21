// Shared between the pre-React apply in main.tsx and the controller in
// register-app.ts. They must agree, or the first paint uses one preference and
// the controller immediately replaces it with another.
export const THEME_ID_KEY = 'scena-demo.theme-id';
export const THEME_MODE_KEY = 'scena-demo.theme-mode';
