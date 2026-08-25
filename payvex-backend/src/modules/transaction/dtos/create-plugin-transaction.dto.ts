/* eslint-disable prettier/prettier */
export class CreatePluginTransactionDto {
  amount: number;

  currency?: string;

  paymentMethod: string;

  customerEmail?: string;

  customerName?: string;

  customerDocument?: string;

  metadata?: Record<string, any>;

  gateway?: string;

  orderId?: string;

  returnUrl?: string;

  webhookUrl?: string;

  installments?: number;

  customerPhone?: string;

  shippingName?: string;

  expirationDate?: string;

  description?: string;

  qrCode?: string;

  // Stone/Cielo extras
  pix?: any;
  securityCode?: string;
  cardNumber?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cardToken?: string;
  cardId?: string;
  cardBrand?: string;
  paymentToken?: string;
  cardHolder?: string;
  encryptedCard?: string;
  capture?: boolean;
  channel?: string;
  statementDescriptor?: string;
  localDatetime?: string;
  remoteIp?: string;
  notificationDisabled?: boolean;

  // Boleto/address extras
  street?: string;
  number?: string;
  complement?: string;
  locality?: string;
  neighborhood?: string;
  city?: string;
  regionCode?: string;
  postalCode?: string;
  cep?: string;

  // NOWPayments extras
  cryptoCurrency?: string;
  orderHash?: string;
  ipAddress?: string;
  cancelUrl?: string;
  amountLimit?: number;
  refundable?: boolean;
  sig?: string;

  // PicPay extras
  merchantKeyId?: string;
  merchantKeySecret?: string;
  siteId?: string;

  // PagSeguro extras
  quantity?: number;
  itemName?: string;
  itemLink?: string;
  itemWeight?: number;
  itemId?: string;
  shippingType?: string;
  sandbox?: boolean;
}
