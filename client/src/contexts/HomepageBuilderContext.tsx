import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { broadcastHomepageUpdate } from '@/hooks/customizationBroadcast';

interface Widget {
  id: string;
  name: string;
  enabled: boolean;
  position: number;
  size?: 'small' | 'medium' | 'large';
  [key: string]: any;
}

interface HomepageBuilderContextType {
  widgets: Widget[];
  widgetOrder: string[];
  reorderWidgets: (order: string[]) => void;
  toggleWidget: (id: string) => void;
  updateWidget: (id: string, config: Partial<Widget>) => void;
}

const HomepageBuilderContext = createContext<HomepageBuilderContextType | undefined>(undefined);

interface HomepageBuilderProviderProps {
  children: ReactNode;
}

export function HomepageBuilderProvider({ children }: HomepageBuilderProviderProps) {
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    try {
      const stored = localStorage.getItem('melitech_homepage_widgets');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('melitech_homepage_order');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const reorderWidgets = (order: string[]) => {
    setWidgetOrder(order);
  };

  const toggleWidget = (id: string) => {
    setWidgets(prev => prev.map(w => 
      w.id === id ? { ...w, enabled: !w.enabled } : w
    ));
  };

  const updateWidget = (id: string, config: Partial<Widget>) => {
    setWidgets(prev => prev.map(w =>
      w.id === id ? { ...w, ...config } : w
    ));
  };

  // Persist to localStorage when widgets change
  useEffect(() => {
    localStorage.setItem('melitech_homepage_widgets', JSON.stringify(widgets));
    broadcastHomepageUpdate(widgets, widgetOrder);
  }, [widgets, widgetOrder]);

  return (
    <HomepageBuilderContext.Provider value={{ widgets, widgetOrder, reorderWidgets, toggleWidget, updateWidget }}>
      {children}
    </HomepageBuilderContext.Provider>
  );
}

export function useHomepageBuilder() {
  const context = useContext(HomepageBuilderContext);
  if (!context) {
    throw new Error('useHomepageBuilder must be used within HomepageBuilderProvider');
  }
  return context;
}

// For store-like interface compatibility
export const useHomepageBuilderStore = useHomepageBuilder;
