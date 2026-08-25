/* eslint-disable prettier/prettier */
import { PaymentMethod } from '@prisma/client';
import {
    IsObject,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsBoolean,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number; // Ex: 100.50

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @IsString()
  @IsNotEmpty()
  gateway: string; // "STRIPE" ou "MERCADO_PAGO"

  @IsString()
  @IsNotEmpty()
  filialId: string; // O ID da filial que está realizando a venda

  // Dados do cliente (opcionais mas recomendados)
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerDocument?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  cryptoCurrency?: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  orderHash?: string;

  @IsString()
  @IsOptional()
  returnUrl?: string;

  @IsString()
  @IsOptional()
  successUrl?: string;

  @IsString()
  @IsOptional()
  cancelUrl?: string;

  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  cardToken?: string;

  @IsString()
  @IsOptional()
  cardId?: string;

  @IsString()
  @IsOptional()
  cardBrand?: string;

  @IsString()
  @IsOptional()
  paymentToken?: string;

  @IsString()
  @IsOptional()
  securityCode?: string;

  @IsString()
  @IsOptional()
  cardNumber?: string;

  @IsString()
  @IsOptional()
  expiryMonth?: string;

  @IsString()
  @IsOptional()
  expiryYear?: string;

  @IsString()
  @IsOptional()
  cardHolder?: string;

  @IsString()
  @IsOptional()
  encryptedCard?: string;

  @IsNumber()
  @IsOptional()
  installments?: number;

  @IsBoolean()
  @IsOptional()
  capture?: boolean;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsString()
  @IsOptional()
  statementDescriptor?: string;

  @IsString()
  @IsOptional()
  localDatetime?: string;

  @IsString()
  @IsOptional()
  remoteIp?: string;

  @IsBoolean()
  @IsOptional()
  notificationDisabled?: boolean;

  @IsString()
  @IsOptional()
  itemId?: string;

  @IsString()
  @IsOptional()
  itemName?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  expirationDate?: string;

  @IsString()
  @IsOptional()
  street?: string;

  @IsString()
  @IsOptional()
  number?: string;

  @IsString()
  @IsOptional()
  complement?: string;

  @IsString()
  @IsOptional()
  locality?: string;

  @IsString()
  @IsOptional()
  neighborhood?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  regionCode?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  cep?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
