import { Module } from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MqttModule } from './mqtt/mqtt.module';
import { DevicesModule } from './devices/devices.module';
import {Device} from "./devices/device.entity";
import {DeviceState} from "./devices/device-state.entity";
import {HealthModule} from "./health/health.module";

@Module({
  imports: [
      ConfigModule.forRoot({isGlobal: true}),
      TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (cfg: ConfigService) => ({
              type: cfg.get<'sqlite'>('DB_TYPE') || 'sqlite',
              database: cfg.get<string>('DB_DATABASE'),
              entities: [Device, DeviceState],
              synchronize: cfg.get('DB_SYNCHRONIZE') === 'true',
          }),
          inject: [ConfigService],
      }),
      MqttModule,
      DevicesModule,
      HealthModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
