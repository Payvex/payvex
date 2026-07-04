/* eslint-disable prettier/prettier */
import { PaymentMethod } from '@prisma/client';
import {
    IsObject,
    IsEnum,
    IsNotEmpty,
    IsNumber,
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

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
