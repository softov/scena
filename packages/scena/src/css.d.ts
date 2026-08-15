// CSS side-effect imports (`import './Foo.css'`) — Vite handles bundling.
// This module declaration tells TypeScript the imports are valid even
// though they don't produce a JS value.
declare module '*.css';
