const rubles = new Intl.NumberFormat('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 2});
export const formatRubles = (amount: number): string => rubles.format(amount);
export const formatEnCoinDate = (value: string): string => new Intl.DateTimeFormat('ru-RU', {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value));
