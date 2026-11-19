import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
export class TarifaDto {
  @IsIn(['CARRO', 'MOTO']) tipoVehiculo!: string;
  @IsIn(['DIURNA', 'NOCTURNA']) franja!: 'DIURNA' | 'NOCTURNA';
  @IsInt() @Min(0) @Max(2147483647) valor!: number;
}
export class ActualizarTarifasDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsObject({ each: true })
  @ArrayUnique(
    (tarifa: TarifaDto | null) => `${tarifa?.tipoVehiculo}:${tarifa?.franja}`,
  )
  @ValidateNested({ each: true })
  @Type(() => TarifaDto)
  tarifas!: TarifaDto[];
}
