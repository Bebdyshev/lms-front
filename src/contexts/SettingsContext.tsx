import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  isLookUpEnabled: boolean;
  setLookUpEnabled: (enabled: boolean) => void;
  toggleLookUp: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLookUpEnabled, setIsLookUpEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('settings_lookup_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('settings_lookup_enabled', JSON.stringify(isLookUpEnabled));
  }, [isLookUpEnabled]);

  const toggleLookUp = () => setIsLookUpEnabled(!isLookUpEnabled);

  return (
    <SettingsContext.Provider value={{ isLookUpEnabled, setLookUpEnabled: setIsLookUpEnabled, toggleLookUp }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
