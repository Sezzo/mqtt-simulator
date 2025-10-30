import { IsOptional, IsString, Matches, MinLength, IsIn, IsBoolean } from 'class-validator';
import { kindIds } from '../kinds/registry';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const SUPPORTED = kindIds();

class LightCapsDto {
    @ApiPropertyOptional({ description: 'Dimmbar (0..255)', default: undefined })
    @IsOptional() @IsBoolean() brightness?: boolean;

    @ApiPropertyOptional({ description: 'Farbtemperatur (mired)', default: undefined })
    @IsOptional() @IsBoolean() color_temp?: boolean;

    @ApiPropertyOptional({ description: 'RGB-Fähigkeit', default: undefined })
    @IsOptional() @IsBoolean() rgb?: boolean;
}

export class CreateDeviceDto {
    @ApiProperty({ enum: SUPPORTED, description: 'Gerätetyp/Kind' })
    @IsString() @IsIn(SUPPORTED)
    type!: string;

    @ApiProperty({ description: 'Anzeigename' })
    @IsString() @MinLength(1)
    name!: string;

    @ApiPropertyOptional({
        description: 'Optionale sprechbare ID (lowercase, 0-9, -)',
        pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    })
    @IsOptional() @IsString()
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    slug?: string;

    @ApiPropertyOptional({
        description: 'Optionales Template (aus /devices/templates)',
        example: 'light.rgbct',
    })
    @IsOptional() @IsString()
    templateId?: string;

    @ApiPropertyOptional({
        description: 'Capabilities (überschreibt ggf. Template-Felder)',
        type: LightCapsDto,
    })
    @IsOptional()
    capabilities?: LightCapsDto | Record<string, any>;
}
