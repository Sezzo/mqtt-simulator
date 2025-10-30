import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
    imports: [TypeOrmModule, MqttModule],
    controllers: [HealthController],
})
export class HealthModule {}
