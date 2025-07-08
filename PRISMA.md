# Prisma Database Documentation

This project uses Prisma as the ORM for database operations with SQLite.

## Database Schema

The application uses the following models:

### Student
- `id`: Auto-incrementing primary key
- `studentId`: Unique UUID for each student
- `name`: Student name (unique for login)
- `preferences`: JSON string of lecturer preferences
- `submittedAt`: Timestamp when preferences were submitted
- `isSubmitted`: Boolean flag for submission status
- `createdAt/updatedAt`: Automatic timestamps

### Allocation
- `id`: Auto-incrementing primary key
- `studentId`: Foreign key to Student
- `timeSlot`: Time slot (1 or 2)
- `lecturer`: Assigned lecturer name
- `createdAt`: Timestamp

### Setting
- `key`: Primary key for setting name
- `value`: Setting value (often JSON)
- `updatedAt`: Last update timestamp

### AllocationHistory
- `id`: Auto-incrementing primary key
- `allocationData`: JSON string of allocation results
- `stats`: JSON string of allocation statistics
- `createdAt`: Timestamp

## Available Scripts

### Database Management
```bash
# Push schema changes to database (development)
npm run db:push

# Deploy migrations (production)
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Generate Prisma client
npm run db:generate

# Reset database (development only)
npm run db:reset
```

### Development Workflow

1. **Make schema changes** in `prisma/schema.prisma`
2. **Push changes** with `npm run db:push` 
3. **Generate client** with `npm run db:generate` (or automatic with postinstall)

## Database Location

- **Development**: `prisma/dev.db` (SQLite file)
- **Schema**: `prisma/schema.prisma`

## Default Settings

The system initializes with these default settings:
- **Lecturers**: ['飛飛', '豆泥', '吳政賢', '趙式隆']
- **Time Slots**: Two slots (15:55-16:45, 16:50-17:30)
- **Max Capacity**: 13 students per lecturer per slot
- **System Name**: 講師選課系統

## Usage in Code

```typescript
import { prisma } from '@/lib/prisma';

// Find student by name
const student = await prisma.student.findUnique({
  where: { name: studentName }
});

// Create allocation
await prisma.allocation.create({
  data: {
    studentId: student.studentId,
    timeSlot: 1,
    lecturer: 'lecturerName'
  }
});

// Get system config
import { getSystemConfig } from '@/lib/prisma';
const config = await getSystemConfig();
```

## Type Safety

Prisma provides full TypeScript support with:
- Auto-generated types for all models
- Type-safe queries and mutations
- IntelliSense for database operations
- Compile-time error checking

## Migration from SQLite

This project has been migrated from raw SQLite to Prisma, providing:
- **Better type safety** with auto-generated TypeScript types
- **Easier database operations** with intuitive query API
- **Migration management** with version control
- **Database introspection** and schema validation
- **GUI tools** like Prisma Studio for data management