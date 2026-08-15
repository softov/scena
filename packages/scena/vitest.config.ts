import { defineConfig } from 'vitest/config';

// Core/store/resolver suites run in node. React hook tests opt into jsdom with a
// `// @vitest-environment jsdom` docblock at the top of the file.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
