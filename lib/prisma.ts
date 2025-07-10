import { PrismaClient } from '@prisma/client'
import lecturerData from './lecturers.json'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Initialize default settings
export async function initializeDefaultSettings() {
  try {
    const defaultSettings = [
      {
        key: 'lecturers',
        value: JSON.stringify(lecturerData.lecturers)
      },
      {
        key: 'time_slots',
        value: JSON.stringify([
          { id: 1, name: '第一時段', time: '15:55-16:45' },
          { id: 2, name: '第二時段', time: '16:50-17:30' }
        ])
      },
      {
        key: 'max_capacity_per_lecturer',
        value: '13'
      },
      {
        key: 'allow_same_lecturer_both_slots',
        value: 'false'
      },
      {
        key: 'system_name',
        value: '講師選課系統'
      },
      {
        key: 'description',
        value: '學員可選擇喜好的講師與時段'
      }
    ];

    for (const setting of defaultSettings) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting
      });
    }
  } catch (error) {
    console.error('Failed to initialize default settings:', error);
  }
}

// Helper function to get system configuration
export async function getSystemConfig() {
  try {
    const settings = await prisma.setting.findMany();
    const config: Record<string, unknown> = {};
    
    settings.forEach(setting => {
      try {
        // Try to parse as JSON first, fall back to string value
        config[setting.key] = JSON.parse(setting.value);
      } catch {
        config[setting.key] = setting.value;
      }
    });

    return {
      lecturers: config.lecturers || lecturerData.lecturers,
      time_slots: config.time_slots || [
        { id: 1, name: '第一時段', time: '15:55-16:45' },
        { id: 2, name: '第二時段', time: '16:50-17:30' }
      ],
      max_capacity_per_lecturer: parseInt(String(config.max_capacity_per_lecturer)) || 13,
      allow_same_lecturer_both_slots: config.allow_same_lecturer_both_slots === 'true',
      system_name: config.system_name || '講師選課系統',
      description: config.description || '學員可選擇喜好的講師與時段'
    };
  } catch (error) {
    console.error('Failed to get system config:', error);
    // Return default configuration
    return {
      lecturers: lecturerData.lecturers,
      time_slots: [
        { id: 1, name: '第一時段', time: '15:55-16:45' },
        { id: 2, name: '第二時段', time: '16:50-17:30' }
      ],
      max_capacity_per_lecturer: 13,
      allow_same_lecturer_both_slots: false,
      system_name: '講師選課系統',
      description: '學員可選擇喜好的講師與時段'
    };
  }
}