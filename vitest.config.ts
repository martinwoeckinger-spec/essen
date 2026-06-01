import { defineConfig } from 'vitest/config';

// Eigene Test-Konfiguration ohne PWA-/React-Plugins – die Berechnungslogik
// in src/lib/calc.ts ist reines TypeScript und läuft im Node-Environment.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
