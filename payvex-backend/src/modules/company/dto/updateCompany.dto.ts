import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional()
  @IsNotEmpty()
  companyName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsNotEmpty()
  phoneNumber?: string;

  @IsOptional()
  @IsNotEmpty()
  postalCode?: string;

  @IsOptional()
  @IsNotEmpty()
  address?: string;

  @IsOptional()
  @IsNotEmpty()
  neighborhood?: string;

  @IsOptional()
  @IsNotEmpty()
  state?: string;

  @IsOptional()
  @IsNotEmpty()
  city?: string;
}
