import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import {TypeOrmModule} from "@nestjs/typeorm";
import {DeviceState} from "./device-state.entity";
import {Device} from "./device.entity";
import {MqttModule} from "../mqtt/mqtt.module";
import { DevicesGateway } from './devices.gateway';

@Module({
    imports: [TypeOrmModule.forFeature([Device, DeviceState]), MqttModule],
  controllers: [DevicesController],
  providers: [DevicesService, DevicesGateway]
})
export class DevicesModule {}
