import {http} from '@/api/http';
import type {AdminMonetizationRequest, EnCoinBalance, MonetizationPage, MonetizationRequest, MonetizationStatus} from '@/api/types/encoin';

export const httpEnCoinDriver = {
  getBalance(): Promise<EnCoinBalance> {
    return http.get('/balance');
  },
  withdraw(coins: number, clientRequestId: string): Promise<{item: MonetizationRequest}> {
    return http.post('/balance/withdrawals', {coins, clientRequestId});
  },
  getRequests(status: MonetizationStatus, page: number): Promise<MonetizationPage> {
    return http.get('/admin/monetization-requests', {params: {status, page}});
  },
  process(requestId: number): Promise<{item: AdminMonetizationRequest}> {
    return http.put(`/admin/monetization-requests/${requestId}/processed`);
  },
  getRate(): Promise<{rublesPerCoin: number}> {
    return http.get('/admin/encoin-rate');
  },
  updateRate(rublesPerCoin: string): Promise<{rublesPerCoin: number}> {
    return http.put('/admin/encoin-rate', {rublesPerCoin});
  },
};
