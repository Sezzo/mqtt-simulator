import { Body, Controller, Delete, Get, Param, Patch, Post, Query, BadRequestException } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { listKinds } from './kinds/registry';
import { getTemplate, listTemplateIds } from './templates';
import { ApiTags, ApiOkResponse, ApiCreatedResponse, ApiBadRequestResponse, ApiSecurity, ApiOperation } from '@nestjs/swagger';
import { ImportPayloadDto } from './dto/import.dto';
import {getTemplateMap} from "./kinds/templates";

@ApiTags('devices')
@ApiSecurity('apiKey')
@Controller('devices')
export class DevicesController {
    constructor(private svc: DevicesService) {}

    @ApiOperation({ summary: 'Liste Geräte (optional gefiltert und paginiert)' })
    @ApiOkResponse({ description: 'Liste der Geräte mit State und Pagination' })
    @Get()
    list(
        @Query('type') type?: string,
        @Query('slug') slug?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        return this.svc.list(type, slug, Number(page) || 1, Number(limit) || 50);
    }

    @ApiOperation({ summary: 'Liste verfügbare Gerätetypen' })
    @ApiOkResponse({ description: 'Typen mit Basis-Capabilities' })
    @Get('types')
    listTypes() { return listKinds(); }

    @ApiOperation({ summary: 'Liste Capability-Templates' })
    @ApiOkResponse({ description: 'Templates aus Config-Datei' })
    @Get('templates')
    listTemplates() { return { ids: listTemplateIds(), templates: getTemplateMap() }; }

    @ApiOperation({ summary: 'Gerät anlegen' })
    @ApiCreatedResponse({ description: 'Gerät erstellt oder bereits vorhanden (idempotent)' })
    @ApiBadRequestResponse({ description: 'Ungültiger Typ, Template o. Payload' })
    @Post()
    async create(@Body() dto: CreateDeviceDto) {
        let mergedCaps = dto.capabilities || {};
        let templateId: string | undefined = undefined;
        if (dto.templateId) {
            const tpl = getTemplate(dto.templateId);
            if (!tpl) throw new BadRequestException(`Unknown templateId: ${dto.templateId}`);
            if (tpl.kind !== dto.type) {
                throw new BadRequestException(`Template kind '${tpl.kind}' does not match type '${dto.type}'`);
            }
            templateId = dto.templateId;
            mergedCaps = { ...(tpl.capabilities || {}), ...(dto.capabilities || {}) };
        }
        return this.svc.createDevice(dto.type, dto.name, dto.slug, mergedCaps, templateId);
    }

    @ApiOperation({ summary: 'Command an Gerät senden' })
    @ApiOkResponse({ description: 'State aktualisiert & veröffentlicht' })
    @Post(':id/command')
    send(@Param('id') id: string, @Body() body: any) {
        return this.svc.sendById(id, body);
    }

    @ApiOperation({ summary: 'Telemetry-Intervall setzen' })
    @ApiOkResponse({ description: 'Intervall gesetzt' })
    @Patch(':id/telemetry')
    setTelemetry(@Param('id') id: string, @Body() body: { intervalSec: number }) {
        return this.svc.updateTelemetry(id, Number(body.intervalSec));
    }

    @ApiOperation({ summary: 'Gerät aktualisieren (name/capabilities/templateId)' })
    @ApiOkResponse({ description: 'Gerät aktualisiert; Discovery republished (wenn aktiv)' })
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() body: { name?: string; capabilities?: Record<string, any>; templateId?: string }
    ) {
        return this.svc.updateDevice(id, body);
    }

    @ApiOperation({ summary: 'Discovery-Payload manuell neu veröffentlichen' })
    @ApiOkResponse({ description: 'Discovery erneut veröffentlicht' })
    @Post(':id/discovery')
    refreshDiscovery(@Param('id') id: string) {
        return this.svc.refreshDiscovery(id);
    }

    @ApiOperation({ summary: 'Gerät löschen' })
    @ApiOkResponse({ description: 'Gerät entfernt, retained Topics gelöscht' })
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.svc.remove(id);
    }

    // ------------ Export / Import ------------

    @ApiOperation({ summary: 'Alle Geräte + States exportieren' })
    @ApiOkResponse({ description: 'Export-Payload' })
    @Get('export/json')
    exportAll() {
        return this.svc.exportAll();
    }

    @ApiOperation({ summary: 'Geräte importieren (Upsert). Optional replaceAll.' })
    @ApiOkResponse({ description: 'Import-Report' })
    @Post('import/json')
    importAll(@Body() body: ImportPayloadDto) {
        return this.svc.importAll(body);
    }
}
