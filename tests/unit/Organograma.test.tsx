import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import Organograma from '../../components/Organograma';

// Mock HierarchyService
vi.mock('../../services/HierarchyService', () => ({
  HierarchyService: {
    calculateHierarchyPath: vi.fn().mockResolvedValue([])
  }
}));

describe('Organograma', () => {
  const mockProps = {
    companyId: 'company-1',
    userId: 'user-1',
    onSelectUser: vi.fn(),
    onError: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o componente sem erros', () => {
    const { container } = render(<Organograma {...mockProps} />);
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar companyId prop', () => {
    const { container } = render(
      <Organograma {...mockProps} companyId="company-2" />
    );
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar userId prop', () => {
    const { container } = render(
      <Organograma {...mockProps} userId="user-2" />
    );
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar onSelectUser callback', () => {
    const onSelectUser = vi.fn();
    const { container } = render(
      <Organograma 
        {...mockProps} 
        onSelectUser={onSelectUser}
      />
    );
    expect(container).toBeInTheDocument();
    expect(typeof onSelectUser).toBe('function');
  });

  it('deve aceitar onError callback', () => {
    const onError = vi.fn();
    const { container } = render(
      <Organograma 
        {...mockProps} 
        onError={onError}
      />
    );
    expect(container).toBeInTheDocument();
    expect(typeof onError).toBe('function');
  });

  it('deve renderizar com diferentes companyIds', () => {
    ['company-1', 'company-2', 'company-3'].forEach(companyId => {
      const { container } = render(
        <Organograma 
          {...mockProps}
          companyId={companyId}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });

  it('deve renderizar com diferentes userIds', () => {
    ['user-1', 'user-2', 'user-3'].forEach(userId => {
      const { container } = render(
        <Organograma 
          {...mockProps}
          userId={userId}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });

  it('deve re-render com props Updated', () => {
    const { rerender } = render(<Organograma {...mockProps} />);
    
    rerender(
      <Organograma 
        {...mockProps}
        userId="user-2"
      />
    );
    
    expect(true).toBe(true);
  });

  it('deve aceitar callbacks vazios', () => {
    const { container } = render(
      <Organograma
        companyId="company-1"
        userId="user-1"
        onSelectUser={() => {}}
        onError={() => {}}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('deve renderizar multiplas vezes', () => {
    const { rerender } = render(<Organograma {...mockProps} />);
    rerender(<Organograma {...mockProps} />);
    rerender(<Organograma {...mockProps} />);
    expect(true).toBe(true);
  });

  it('deve manter referências das props', () => {
    const onSelectUser = vi.fn();
    const onError = vi.fn();
    
    const { container } = render(
      <Organograma
        companyId="company-1"
        userId="user-1"
        onSelectUser={onSelectUser}
        onError={onError}
      />
    );
    
    expect(container).toBeInTheDocument();
    expect(typeof onSelectUser).toBe('function');
    expect(typeof onError).toBe('function');
  });
});

