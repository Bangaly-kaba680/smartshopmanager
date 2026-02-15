import React, { createContext, useContext, useState, useEffect } from 'react';

// Available currencies
export const CURRENCIES = {
  GNF: { code: 'GNF', name: 'Franc Guinéen', symbol: 'GNF', locale: 'fr-GN' },
  XOF: { code: 'XOF', name: 'Franc CFA (FCFA)', symbol: 'FCFA', locale: 'fr-SN' },
  USD: { code: 'USD', name: 'Dollar US', symbol: '$', locale: 'en-US' }
};

const CurrencyContext = createContext(null);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem('app_currency');
    return saved ? CURRENCIES[saved] || CURRENCIES.GNF : CURRENCIES.GNF;
  });

  useEffect(() => {
    localStorage.setItem('app_currency', currency.code);
  }, [currency]);

  const changeCurrency = (code) => {
    if (CURRENCIES[code]) {
      setCurrency(CURRENCIES[code]);
    }
  };

  // Format a number as currency
  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return '0 ' + currency.symbol;
    
    const num = Number(amount);
    if (isNaN(num)) return '0 ' + currency.symbol;

    // Format based on currency
    if (currency.code === 'USD') {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 2 
      }).format(num);
    } else {
      // For African currencies, no decimals
      return new Intl.NumberFormat('fr-FR', { 
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(num) + ' ' + currency.symbol;
    }
  };

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency: changeCurrency, 
      formatAmount,
      currencies: Object.values(CURRENCIES)
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
