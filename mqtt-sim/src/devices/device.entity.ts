import {
    Column, CreateDateColumn, Entity, Index, OneToOne,
    PrimaryGeneratedColumn, UpdateDateColumn
} from 'typeorm';
import { DeviceState } from './device-state.entity';

@Entity()
@Index(['type', 'slug'], { unique: true })
export class Device {
    @PrimaryGeneratedColumn('uuid') id: string;

    @Column() type: string;            // e.g. "light", "switch"
    @Column() name: string;

    @Column({ nullable: true }) slug?: string; // human-readable id (per type unique)

    @Column('simple-json') capabilities: Record<string, any>;

    @Column({ nullable: true }) templateId?: string; // optional: Quelle der Caps

    @Column() topicBase: string;       // e.g. "sim/light"
    @Column({ default: true }) retained: boolean;

    @Column({ type: 'int', default: 0 })
    telemetryIntervalSec: number;      // 0 = disabled

    @OneToOne(() => DeviceState, (s) => s.device, { cascade: true })
    state?: DeviceState;

    @CreateDateColumn() createdAt: Date;
    @UpdateDateColumn() updatedAt: Date;
}
