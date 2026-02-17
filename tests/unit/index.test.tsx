import React from 'react';
import { describe, expect, it, vi } from 'vitest';

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({ render: renderMock }));

vi.mock('react-dom/client', () => ({
  createRoot: createRootMock
}));

vi.mock('../../App.tsx', () => ({
  default: () => <div>Mock App</div>
}));

describe('index', () => {
  it('renders the app into #root', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import('../../index.tsx');
    expect(createRootMock).toHaveBeenCalled();
    expect(renderMock).toHaveBeenCalled();
  });
});
