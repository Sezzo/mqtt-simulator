import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Device } from './device.entity';

@Entity()
export class DeviceState {
    @PrimaryColumn() deviceId: string;

    @OneToOne(() => Device, (d) => d.state, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'deviceId' })
    device: Device;

    @Column('simple-json') data: Record<string, any>; // generic JSON state
    @UpdateDateColumn() updatedAt: Date;
}
