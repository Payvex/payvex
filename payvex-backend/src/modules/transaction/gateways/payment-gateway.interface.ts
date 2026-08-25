export interface PaymentResponse {
  externalId: string;
  paymentUrl?: string;
  pixQrCode?: string;
  status?: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELED';
  rawResponse: any;
}

export interface PaymentGateway {
  createPayment(data: any, credentials: any): Promise<PaymentResponse>;
}
