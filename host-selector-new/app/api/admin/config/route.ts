import { NextRequest, NextResponse } from 'next/server';
import { prisma, getSystemConfig } from '@/lib/prisma';
import { isValidAdminRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization');
    const adminSession = isValidAdminRequest(authHeader);
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get system configuration using the helper function
    const config = await getSystemConfig();

    return NextResponse.json({
      config,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching system configuration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization');
    const adminSession = isValidAdminRequest(authHeader);
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { config } = body;

    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'Config object is required' }, { status: 400 });
    }

    // Validate configuration
    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: 'Configuration validation failed', 
        details: validationErrors 
      }, { status: 400 });
    }

    // Update each configuration item using Prisma
    for (const [key, value] of Object.entries(config)) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      await prisma.setting.upsert({
        where: { key },
        update: { value: stringValue },
        create: { key, value: stringValue }
      });
    }

    // Fetch updated configuration
    const updatedConfig = await getSystemConfig();

    return NextResponse.json({
      config: updatedConfig,
      message: 'Configuration updated successfully',
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating system configuration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function validateConfig(config: any): string[] {
  const errors: string[] = [];

  // Validate lecturers
  if (config.lecturers) {
    if (!Array.isArray(config.lecturers)) {
      errors.push('lecturers must be an array');
    } else if (config.lecturers.length === 0) {
      errors.push('lecturers array cannot be empty');
    } else if (!config.lecturers.every((l: any) => typeof l === 'string')) {
      errors.push('all lecturers must be strings');
    }
  }

  // Validate time_slots
  if (config.time_slots) {
    if (!Array.isArray(config.time_slots)) {
      errors.push('time_slots must be an array');
    } else if (config.time_slots.length === 0) {
      errors.push('time_slots array cannot be empty');
    } else {
      config.time_slots.forEach((slot: any, index: number) => {
        if (!slot.id || !slot.name || !slot.time) {
          errors.push(`time_slots[${index}] must have id, name, and time properties`);
        }
      });
    }
  }

  // Validate max_capacity_per_lecturer
  if (config.max_capacity_per_lecturer !== undefined) {
    const capacity = parseInt(config.max_capacity_per_lecturer);
    if (isNaN(capacity) || capacity < 1 || capacity > 100) {
      errors.push('max_capacity_per_lecturer must be a number between 1 and 100');
    }
  }

  // Validate allow_same_lecturer_both_slots
  if (config.allow_same_lecturer_both_slots !== undefined) {
    if (typeof config.allow_same_lecturer_both_slots !== 'boolean' && 
        config.allow_same_lecturer_both_slots !== 'true' && 
        config.allow_same_lecturer_both_slots !== 'false') {
      errors.push('allow_same_lecturer_both_slots must be a boolean or "true"/"false" string');
    }
  }

  // Validate system_name
  if (config.system_name !== undefined && typeof config.system_name !== 'string') {
    errors.push('system_name must be a string');
  }

  // Validate description
  if (config.description !== undefined && typeof config.description !== 'string') {
    errors.push('description must be a string');
  }

  return errors;
}