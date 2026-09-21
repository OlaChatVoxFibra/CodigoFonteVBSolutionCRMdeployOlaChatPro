/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({
    description: 'nome da empresa',
    default: 'Empresa A',
    example: 'Empresa A',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'ID da empresa no VB Solution CRM',
    default: 1,
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  idEmpresaMult100: number;
}
