
import { Recipe, MealType, UserPreferences, MealConfig } from "../types";
import { 
  BREAKFAST_RECIPES, 
  MEAT_RECIPES, 
  VEG_RECIPES, 
  SOUP_RECIPES,
  COMMON_INGREDIENTS 
} from "../data/recipes";

// Re-export common ingredients
export { COMMON_INGREDIENTS };

// --- Feature 1: Fuzzy Semantic Matching Mechanism Helpers ---

/**
 * Levenshtein Distance Algorithm
 * Calculates the number of single-character edits (insertions, deletions, or substitutions) 
 * required to change one word into the other.
 */
const levenshteinDistance = (a: string, b: string): number => {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

/**
 * Checks if a target string loosely matches the query using Fuzzy Logic.
 * Allows for minor typos or vague expressions.
 */
const isFuzzyMatch = (target: string, query: string): boolean => {
    const lowerTarget = target.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // 1. Exact Inclusion (Fast Semantic Match)
    if (lowerTarget.includes(lowerQuery)) return true;

    // 2. Fuzzy Distance Match (Typo Tolerance)
    // Only apply fuzzy logic if query is meaningful (len >= 2) to avoid false positives on single chars.
    if (lowerQuery.length >= 2) {
        const distance = levenshteinDistance(lowerTarget, lowerQuery);
        // Allow 1 edit for short words, proportionate tolerance could be added for longer phrases
        // Heuristic: If distance is 1 and query length is >= 2, we consider it a match (e.g. 西红士 -> 西红柿)
        if (distance <= 1) return true;
    }

    return false;
};

// --- Feature 2: Anthropomorphic Weighted Scoring Engine ---

const calculateScore = (recipe: Recipe, preferences: UserPreferences, searchTerm?: string): number => {
    // 1. Taboo Veto (禁忌一票否决)
    // If a dish contains a disliked ingredient, it is strictly rejected (-Infinity).
    const hasDisliked = preferences.dislikes.some(dislike => 
        recipe.ingredients.some(i => i.includes(dislike)) || recipe.dishName.includes(dislike)
    );
    if (hasDisliked) return -Infinity; 

    let score = 0;

    // 2. Search Boost (Context Awareness)
    if (searchTerm) {
        // Handled primarily by filtering, but we boost rank if exact name match
        const matchName = recipe.dishName.includes(searchTerm);
        if (matchName) score += 100;
    }

    // 3. Preference Weighting (偏好加权)
    // Simulates human tendency to stick to what they love.
    if (preferences.likes.length > 0) {
        preferences.likes.forEach(like => {
            if (recipe.ingredients.some(i => i.includes(like)) || recipe.dishName.includes(like)) {
                score += 40; // Base weighted boost
            }
        });
    }

    // 4. Anthropomorphic Novelty Factor (拟人化随机扰动)
    // Simulates the psychological trait of "occasionally wanting to try something fresh".
    // Score Composition:
    // - Liked Dish: Base 40 + Random(0~50) = Range [40, 90]
    // - Normal Dish: Base 0  + Random(0~50) = Range [0, 50]
    // Result: There is an "Overlap Zone" [40, 50]. 
    // This means a very lucky "Normal Dish" (High Novelty) can occasionally beat a "Liked Dish" (Low Desire at the moment).
    
    score += Math.random() * 50; 
    
    return score;
};

// Modified to pick N distinct recipes with exclusion support
const smartRecommendMultipleLocal = (
    recipes: Recipe[], 
    preferences: UserPreferences, 
    count: number, 
    excludedNames: string[] = []
): Recipe[] => {
    if (count <= 0) return [];
    
    // 1. Filter out excluded dishes first (Anti-repetition)
    let candidates = recipes.filter(r => !excludedNames.includes(r.dishName));

    // Fallback if exclusion leaves too few recipes
    if (candidates.length < count) {
        const missingCount = count - candidates.length;
        const oldItems = recipes.filter(r => excludedNames.includes(r.dishName)).sort(() => 0.5 - Math.random());
        candidates = [...candidates, ...oldItems.slice(0, missingCount)];
    }

    // 2. Score valid recipes using the Anthropomorphic Engine
    let scoredRecipes = candidates.map(r => ({
        recipe: r,
        score: calculateScore(r, preferences)
    })).filter(item => item.score > -100); // Filter out Vetoed items (-Infinity)

    // 3. Fallback
    if (scoredRecipes.length < count) {
         const shuffled = [...candidates].sort(() => 0.5 - Math.random());
         return shuffled.slice(0, count);
    }

    // 4. Sort by score (High to Low)
    scoredRecipes.sort((a, b) => b.score - a.score);

    // 5. Select from weighted pool
    // Threshold adjusted to 45 based on new scoring logic (Overlap zone starts at 40)
    const highScorers = scoredRecipes.filter(i => i.score > 45);
    let pool;
    
    if (highScorers.length >= count) {
        // High scorers include all "Liked" items + "Lucky Novelty" items
        pool = highScorers;
    } else {
        const poolSize = Math.max(count, Math.floor(scoredRecipes.length * 0.6));
        pool = scoredRecipes.slice(0, poolSize);
    }

    // 6. Shuffle pool and pick 'count' to add final layer of variety
    const finalSelection = pool.sort(() => 0.5 - Math.random()).slice(0, count).map(i => i.recipe);
    
    return finalSelection;
};

/**
 * Main Entry Point
 */
export const generateRecipe = async (
    mealType: MealType, 
    preferences: UserPreferences, 
    config?: MealConfig,
    excludedNames: string[] = []
): Promise<Recipe[]> => {
    
    // Simulate a small "AI Thinking" delay
    await new Promise(resolve => setTimeout(resolve, 600));

    if (mealType === MealType.BREAKFAST) {
        return smartRecommendMultipleLocal(BREAKFAST_RECIPES, preferences, 1, excludedNames);
    } else {
        const meatCount = config?.meatCount ?? 1;
        const vegCount = config?.vegCount ?? 1;
        const soupCount = config?.soupCount ?? 1;

        const meats = smartRecommendMultipleLocal(MEAT_RECIPES, preferences, meatCount, excludedNames);
        const vegs = smartRecommendMultipleLocal(VEG_RECIPES, preferences, vegCount, excludedNames);
        const soups = smartRecommendMultipleLocal(SOUP_RECIPES, preferences, soupCount, excludedNames);

        return [...meats, ...vegs, ...soups];
    }
};

/**
 * Single Dish Replacement
 */
export const generateSingleSideDish = async (
    category: 'meat' | 'veg' | 'soup' | 'breakfast', 
    preferences: UserPreferences,
    excludedNames: string[] = []
): Promise<Recipe> => {
    
    await new Promise(resolve => setTimeout(resolve, 400));

    let sourceList: Recipe[] = [];
    if (category === 'meat') sourceList = MEAT_RECIPES;
    else if (category === 'veg') sourceList = VEG_RECIPES;
    else if (category === 'soup') sourceList = SOUP_RECIPES;
    else if (category === 'breakfast') sourceList = BREAKFAST_RECIPES;

    const results = smartRecommendMultipleLocal(sourceList, preferences, 1, excludedNames);
    return results[0];
};

/**
 * Enhanced Fuzzy Search (Feature 1 Implementation)
 * Supports space-separated keywords and typo tolerance.
 */
export const searchRecipes = (query: string): Recipe[] => {
    const allRecipes = [...BREAKFAST_RECIPES, ...MEAT_RECIPES, ...VEG_RECIPES, ...SOUP_RECIPES];
    
    // Clean and split query into keywords
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.trim().length > 0);

    if (terms.length === 0) return [];

    return allRecipes.filter(r => {
        // Check if EVERY search term matches using Fuzzy Semantic Logic
        return terms.every(term => 
            isFuzzyMatch(r.dishName, term) || // Name match (Exact or Fuzzy)
            r.ingredients.some(i => isFuzzyMatch(i, term)) // Ingredient match (Exact or Fuzzy)
        );
    });
};
