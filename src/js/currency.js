// currency.js
// Simple currency conversion stub

const exchangeRates = {
    USD: 1,
    EUR: 0.9,
    GBP: 0.8,
    JPY: 140,
    AUD: 1.4,
    CAD: 1.3,
    CHF: 0.92,
    CNY: 6.9,
    SEK: 10,
    NZD: 1.5,
  };
  
  export async function convert(amount, fromCurrency, toCurrency) {
    fromCurrency = fromCurrency.toUpperCase();
    toCurrency = toCurrency.toUpperCase();
  
    const rateFromUSD = exchangeRates[toCurrency] || 1;
    const rateToUSD = exchangeRates[fromCurrency] || 1;
  
    const amountInUSD = amount / rateToUSD;
    const convertedAmount = amountInUSD * rateFromUSD;
  
    return new Promise(resolve => setTimeout(() => resolve(convertedAmount), 100));
  }  