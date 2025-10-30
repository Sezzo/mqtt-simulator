import { ApiPropertyOptional } from '@nestjs/swagger';

export type ExportedDevice = {
    id?: string;                       // optional (wir matchen primär über type+slug)
    type: string;
    name: string;
    slug?: string;
    templateId?: string | null;
    capabilities?: Record<string, any>;
    telemetryIntervalSec?: number;
    state?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
};

export class ImportPayloadDto {
    @ApiPropertyOptional({ enum: ['upsert'] })
    mode?: 'upsert' = 'upsert';

    @ApiPropertyOptional({ description: 'Vorhandene Geräte, die im Payload NICHT enthalten sind, löschen', default: false })
    replaceAll?: boolean = false;

    @ApiPropertyOptional({ description: 'Geräte im Payload', type: Array })
    devices!: ExportedDevice[];
}
