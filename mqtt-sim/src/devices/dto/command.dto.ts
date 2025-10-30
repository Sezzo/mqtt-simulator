import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';

// Generische Command-Form für "light"; weitere Typen bekommen eigene Schemas in der Registry.
// DTO hält nur Basic-Validierung; die finale Prüfung macht die Kind-Registry.
export class CommandDtoLight {
    @IsOptional() @IsIn(['ON','OFF'])
    state?: 'ON'|'OFF';

    @IsOptional() @IsInt() @Min(0) @Max(255)
    brightness?: number;

    @IsOptional() @IsInt() @Min(153) @Max(500)
    colorTemp?: number;
}
