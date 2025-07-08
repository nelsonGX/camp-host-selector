interface Student {
  studentId: string;
  name: string;
  preferences: string[];
}

interface AllocationResult {
  studentId: string;
  timeSlot: number;
  lecturer: string;
}

interface AllocationStats {
  total_students: number;
  allocated_students: number;
  unallocated_students: number;
  lecturer_distribution: { [key: string]: { slot1: number; slot2: number; total: number } };
  capacity_utilization: { [key: string]: { slot1: number; slot2: number } };
  preference_satisfaction: {
    first_choice: number;
    second_choice: number;
    third_choice: number;
    fourth_choice: number;
    no_preference_satisfied: number;
  };
}

export class AllocationAlgorithm {
  private lecturers: string[];
  private maxCapacity: number;

  constructor(lecturers: string[], maxCapacity: number = 13) {
    this.lecturers = lecturers;
    this.maxCapacity = maxCapacity;
  }

  allocate(students: Student[]): { allocation: AllocationResult[]; stats: AllocationStats } {
    const allocation: AllocationResult[] = [];
    const capacity: { [key: string]: { slot1: number; slot2: number } } = {};

    // Initialize capacity tracking
    this.lecturers.forEach(lecturer => {
      capacity[lecturer] = { slot1: 0, slot2: 0 };
    });

    // Track preference satisfaction
    const preferenceSatisfaction = {
      first_choice: 0,
      second_choice: 0,
      third_choice: 0,
      fourth_choice: 0,
      no_preference_satisfied: 0
    };

    // Allocate each student
    for (const student of students) {
      const result = this.allocateStudent(student, allocation, capacity);
      if (result.success) {
        allocation.push(...result.allocations);
        
        // Track preference satisfaction
        if (result.preferenceRank !== null) {
          switch (result.preferenceRank) {
            case 0: preferenceSatisfaction.first_choice++; break;
            case 1: preferenceSatisfaction.second_choice++; break;
            case 2: preferenceSatisfaction.third_choice++; break;
            case 3: preferenceSatisfaction.fourth_choice++; break;
          }
        } else {
          preferenceSatisfaction.no_preference_satisfied++;
        }
      }
    }

    // Generate statistics
    const stats = this.generateStats(students, allocation, capacity, preferenceSatisfaction);

    return { allocation, stats };
  }

  private allocateStudent(
    student: Student, 
    currentAllocation: AllocationResult[], 
    capacity: { [key: string]: { slot1: number; slot2: number } }
  ): { success: boolean; allocations: AllocationResult[]; preferenceRank: number | null } {
    const preferences = student.preferences || [];
    
    // If no preferences, allocate randomly
    if (preferences.length === 0) {
      return this.allocateStudentRandomly(student, capacity);
    }

    // Generate all possible combinations of preferences
    const combinations = this.generateCombinations(preferences);

    // Try each combination in order of preference priority
    for (const combination of combinations) {
      const [lecturer1, lecturer2] = combination.lecturers;
      const preferenceRank = combination.maxRank;

      // Check if this combination is valid
      if (lecturer1 === lecturer2) continue; // Can't have same lecturer in both slots

      // Check capacity constraints
      if (capacity[lecturer1].slot1 < this.maxCapacity && 
          capacity[lecturer2].slot2 < this.maxCapacity) {
        
        // Allocate the student
        const allocations: AllocationResult[] = [
          { studentId: student.studentId, timeSlot: 1, lecturer: lecturer1 },
          { studentId: student.studentId, timeSlot: 2, lecturer: lecturer2 }
        ];

        // Update capacity
        capacity[lecturer1].slot1++;
        capacity[lecturer2].slot2++;

        return { success: true, allocations, preferenceRank };
      }
    }

    // If we can't satisfy preferences, try random allocation
    return this.allocateStudentRandomly(student, capacity);
  }

  private allocateStudentRandomly(
    student: Student, 
    capacity: { [key: string]: { slot1: number; slot2: number } }
  ): { success: boolean; allocations: AllocationResult[]; preferenceRank: number | null } {
    // Find available lecturers for each slot
    const availableSlot1 = this.lecturers.filter(l => capacity[l].slot1 < this.maxCapacity);
    const availableSlot2 = this.lecturers.filter(l => capacity[l].slot2 < this.maxCapacity);

    // Try to find a valid combination
    for (const lecturer1 of availableSlot1) {
      for (const lecturer2 of availableSlot2) {
        if (lecturer1 !== lecturer2) {
          const allocations: AllocationResult[] = [
            { studentId: student.studentId, timeSlot: 1, lecturer: lecturer1 },
            { studentId: student.studentId, timeSlot: 2, lecturer: lecturer2 }
          ];

          // Update capacity
          capacity[lecturer1].slot1++;
          capacity[lecturer2].slot2++;

          return { success: true, allocations, preferenceRank: null };
        }
      }
    }

    return { success: false, allocations: [], preferenceRank: null };
  }

  private generateCombinations(preferences: string[]): Array<{ lecturers: [string, string]; maxRank: number }> {
    const combinations: Array<{ lecturers: [string, string]; maxRank: number }> = [];

    // Generate all possible combinations
    for (let i = 0; i < preferences.length; i++) {
      for (let j = 0; j < preferences.length; j++) {
        if (i !== j && preferences[i] !== preferences[j]) {
          combinations.push({
            lecturers: [preferences[i], preferences[j]],
            maxRank: Math.max(i, j)
          });
        }
      }
    }

    // Sort by preference priority (lower maxRank is better)
    combinations.sort((a, b) => a.maxRank - b.maxRank);

    return combinations;
  }

  private generateStats(
    students: Student[], 
    allocation: AllocationResult[], 
    capacity: { [key: string]: { slot1: number; slot2: number } },
    preferenceSatisfaction: AllocationStats['preference_satisfaction']
  ): AllocationStats {
    const lecturerDistribution: { [key: string]: { slot1: number; slot2: number; total: number } } = {};
    const capacityUtilization: { [key: string]: { slot1: number; slot2: number } } = {};

    // Initialize lecturer distribution and capacity utilization
    this.lecturers.forEach(lecturer => {
      lecturerDistribution[lecturer] = { slot1: 0, slot2: 0, total: 0 };
      capacityUtilization[lecturer] = { 
        slot1: Math.round((capacity[lecturer].slot1 / this.maxCapacity) * 100),
        slot2: Math.round((capacity[lecturer].slot2 / this.maxCapacity) * 100)
      };
    });

    // Count allocations per lecturer
    allocation.forEach(alloc => {
      const lecturer = alloc.lecturer;
      if (alloc.timeSlot === 1) {
        lecturerDistribution[lecturer].slot1++;
      } else {
        lecturerDistribution[lecturer].slot2++;
      }
      lecturerDistribution[lecturer].total++;
    });

    const allocatedStudents = new Set(allocation.map(a => a.studentId)).size;

    return {
      total_students: students.length,
      allocated_students: allocatedStudents,
      unallocated_students: students.length - allocatedStudents,
      lecturer_distribution: lecturerDistribution,
      capacity_utilization: capacityUtilization,
      preference_satisfaction: preferenceSatisfaction
    };
  }
}