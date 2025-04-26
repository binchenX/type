import { LevelBasedPlanParams, AssessmentBasedPlanParams } from '@/services/llmService';

/**
 * Interface for the stored learning plan
 */
export interface StoredLearningPlan {
    modules: Array<{
        name: string;
        description: string;
        lessons: Array<{
            title: string;
            description: string;
            content: string;
            targetWpm: number;
        }>;
    }>;
    planParams: LevelBasedPlanParams | AssessmentBasedPlanParams;
    progress: {
        currentModuleIndex: number;
        currentLessonIndex: number;
        completedLessons: number;
        totalLessons: number;
    };
    lastUpdated: number; // Timestamp
}

const STORAGE_KEY = 'typing-practice-learning-plan';

/**
 * Helper function to safely calculate the total number of lessons
 * @param modules The modules array to count lessons from
 * @returns The total number of lessons
 */
function calculateTotalLessons(modules: StoredLearningPlan['modules']): number {
    if (!modules || !Array.isArray(modules)) return 0;
    return modules.reduce((sum, module) => {
        return sum + (Array.isArray(module.lessons) ? module.lessons.length : 0);
    }, 0);
}

/**
 * Save learning plan data to localStorage
 * @param plan The learning plan data to save
 */
export function saveLearningPlan(plan: StoredLearningPlan): void {
    if (typeof window === 'undefined') return; // Check if running in browser

    try {
        // Validate the plan object has required fields before saving
        if (!plan.modules || !Array.isArray(plan.modules) || !plan.planParams || !plan.progress) {
            console.error('Failed to save learning plan: Invalid plan structure', plan);
            return;
        }

        // Ensure the total lesson count is correct and consistent
        const actualLessonCount = calculateTotalLessons(plan.modules);
        if (plan.progress.totalLessons !== actualLessonCount) {
            console.log(`Correcting inconsistent lesson count: ${plan.progress.totalLessons} → ${actualLessonCount}`);
            plan.progress.totalLessons = actualLessonCount;
        }

        // Serialize and save
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
        console.log('Learning plan saved to localStorage', {
            moduleCount: plan.modules.length,
            lessonCount: actualLessonCount,
            progress: `${plan.progress.completedLessons}/${plan.progress.totalLessons}`,
            planType: plan.planParams.type
        });
    } catch (error) {
        console.error('Failed to save learning plan to localStorage:', error);
    }
}

/**
 * Load learning plan data from localStorage
 * @returns The saved learning plan data or null if not found
 */
export function loadLearningPlan(): StoredLearningPlan | null {
    if (typeof window === 'undefined') return null; // Check if running in browser

    try {
        const savedPlan = localStorage.getItem(STORAGE_KEY);
        if (!savedPlan) {
            console.log('No learning plan found in localStorage');
            return null;
        }

        const parsedPlan = JSON.parse(savedPlan) as StoredLearningPlan;

        // Validate the loaded plan
        if (!parsedPlan.modules || !Array.isArray(parsedPlan.modules) ||
            !parsedPlan.planParams || !parsedPlan.progress) {
            console.error('Invalid learning plan structure in localStorage, removing it');
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }

        console.log('Successfully loaded learning plan from localStorage', {
            moduleCount: parsedPlan.modules.length,
            lessonCount: parsedPlan.modules.reduce((sum, m) => sum + m.lessons.length, 0),
            progress: `${parsedPlan.progress.completedLessons}/${parsedPlan.progress.totalLessons}`,
            planType: parsedPlan.planParams.type
        });

        return parsedPlan;
    } catch (error) {
        console.error('Failed to load learning plan from localStorage:', error);
        // If the saved plan is corrupted, remove it to prevent future errors
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.log('Removed corrupted learning plan from localStorage');
        } catch {
            // Ignore errors when removing
        }
        return null;
    }
}

/**
 * Update learning plan progress in localStorage
 * @param progress The current progress data to save
 */
export function updateLearningProgress(progress: {
    currentModuleIndex: number;
    currentLessonIndex: number;
    completedLessons: number;
    totalLessons: number;
}): void {
    if (typeof window === 'undefined') return; // Check if running in browser

    try {
        const savedPlan = loadLearningPlan();
        if (!savedPlan) return;

        savedPlan.progress = progress;
        savedPlan.lastUpdated = Date.now();

        console.log('update learning progress');
        saveLearningPlan(savedPlan);
    } catch (error) {
        console.error('Failed to update learning progress:', error);
    }
}

/**
 * Clear learning plan data from localStorage
 */
export function clearLearningPlan(): void {
    if (typeof window === 'undefined') return; // Check if running in browser

    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('Learning plan cleared from localStorage');
    } catch (error) {
        console.error('Failed to clear learning plan from localStorage:', error);
    }
} 
