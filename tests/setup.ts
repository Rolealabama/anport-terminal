import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

beforeEach(() => {
	vi.stubGlobal('alert', vi.fn());
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});
