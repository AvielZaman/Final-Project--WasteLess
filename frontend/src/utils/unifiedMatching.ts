// frontend/src/utils/unifiedMatching.ts

interface IngredientMatch {
  ingredient: string | null;
  quality: number;
  matchType: 'exact' | 'stemmed' | 'synonym' | 'partial' | 'fuzzy' | 'common';
  confidence: number;
}

class UnifiedIngredientMatcher {
  // EXACTLY matching backend common ingredients
  private static commonIngredients = new Set([
    'water', 'salt', 'black pepper', 'pepper', 'table salt', 'sea salt', 
    'kosher salt', 'ground black pepper', 'freshly ground black pepper',
    'black peppercorns', 'white pepper', 'tap water', 'filtered water',
    'ice', 'ice cubes', 'cold water', 'warm water', 'hot water',
    'garlic powder', 'onion powder', 'paprika', 'oregano', 'basil',
    'thyme', 'rosemary', 'parsley', 'bay leaves', 'cinnamon',
    'nutmeg', 'vanilla extract', 'baking soda', 'baking powder',
    'cooking oil', 'vegetable oil',
    'sugar', 'white sugar', 'flour', 'all purpose flour'
  ]);

  // EXACTLY matching backend synonym map - MORE REASONABLE
  private static synonymMap: Record<string, string[]> = {
    'chicken': ['chicken breast', 'chicken thigh', 'chicken leg', 'poultry', 'chicken meat', 'chicken fillet'],
    'beef': ['ground beef', 'beef steak', 'steak', 'ground meat', 'beef chuck', 'beef roast', 'beef mince'],
    'pork': ['pork chop', 'pork tenderloin', 'pork shoulder', 'bacon', 'ham'],
    'fish': ['salmon', 'tuna', 'cod', 'tilapia', 'seafood', 'white fish'],
    
    'milk': ['whole milk', 'skim milk', '2% milk', 'dairy milk', 'cow milk', 'fresh milk'],
    'cheese': ['cheddar cheese', 'mozzarella cheese', 'parmesan cheese', 'swiss cheese'],
    'yogurt': ['greek yogurt', 'plain yogurt', 'natural yogurt'],
    'butter': ['unsalted butter', 'salted butter', 'dairy butter'],
    'cream': ['heavy cream', 'whipping cream', 'double cream', 'cooking cream'],
    
    'olive oil': ['extra virgin olive oil', 'virgin olive oil', 'light olive oil'],
    'vegetable oil': ['canola oil', 'sunflower oil', 'corn oil', 'soybean oil'],
    'coconut oil': ['virgin coconut oil', 'refined coconut oil'],
    
    'tomato': ['tomatoes', 'fresh tomatoes', 'roma tomato', 'cherry tomato'],
    'onion': ['onions', 'yellow onion', 'white onion', 'red onion', 'sweet onion'],
    'potato': ['potatoes', 'red potato', 'russet potato'],
    'carrot': ['carrots', 'baby carrot'],
    'pepper': ['bell pepper', 'red pepper', 'green pepper', 'yellow pepper'],
    
    'apple': ['apples', 'green apple', 'red apple'],
    'banana': ['bananas', 'ripe banana'],
    'orange': ['oranges', 'navel orange'],
    'lemon': ['lemons', 'fresh lemon'],
    'lime': ['limes', 'fresh lime'],
    
    'rice': ['white rice', 'brown rice', 'jasmine rice', 'basmati rice'],
    'pasta': ['spaghetti', 'penne', 'linguine', 'macaroni'],
    'bread': ['white bread', 'wheat bread', 'whole grain bread'],
    'flour': ['all purpose flour', 'wheat flour', 'bread flour', 'plain flour'],
    
    'black pepper': ['pepper', 'ground black pepper'],
    'garlic': ['fresh garlic', 'garlic cloves'],
    'ginger': ['fresh ginger', 'ginger root'],
  };

  // REASONABLE stop words
  private static stopWords = new Set([
    'fresh', 'organic', 'free-range', 'natural', 'raw', 'cooked', 'frozen',
    'canned', 'dried', 'whole', 'sliced', 'diced', 'chopped', 'minced',
    'large', 'small', 'medium', 'extra', 'premium', 'grade', 'quality',
    'lean', 'fat-free', 'low-fat', 'reduced', 'sodium', 'unsalted',
    'white', 'red', 'green', 'yellow', 'brown', 'black', 'blue', 'purple',
    'soft', 'hard', 'light', 'dark', 'sweet', 'sour', 'hot', 'mild',
    'flavoured', 'flavored', 'scented', 'mixed', 'blended', 'instant',
    'powdered', 'ground', 'crushed', 'fine', 'coarse', 'pure'
  ]);

  // MORE SPECIFIC food categories
  private static foodCategories: Record<string, string[]> = {
    'proteins': [
      'chicken', 'beef', 'pork', 'fish', 'turkey', 'lamb', 'egg', 'tofu', 
      'meat', 'salmon', 'tuna', 'cod', 'shrimp', 'bacon', 'ham'
    ],
    'dairy': [
      'milk', 'cheese', 'yogurt', 'cream', 'sour cream', 'butter',
      'cottage cheese', 'mozzarella', 'cheddar', 'parmesan'
    ],
    'vegetables': [
      'tomato', 'onion', 'carrot', 'potato', 'pepper', 'lettuce', 'spinach',
      'broccoli', 'cauliflower', 'celery', 'garlic', 'ginger', 'mushroom'
    ],
    'fruits': [
      'apple', 'banana', 'orange', 'grape', 'berry', 'lemon', 'lime',
      'strawberry', 'blueberry', 'raspberry', 'peach', 'pear'
    ],
    'grains': [
      'bread', 'rice', 'pasta', 'flour', 'oat', 'wheat', 'quinoa',
      'barley', 'cereal', 'noodle', 'spaghetti', 'macaroni'
    ],
    'condiments_seasonings': [
      'vinegar', 'sauce', 'ketchup', 'mustard', 'mayo', 'dressing',
      'seasoning', 'spice', 'herb', 'salt', 'pepper'
    ],
    'oils_fats': [
      'oil', 'butter', 'margarine', 'lard', 'shortening'
    ],
    'processed_foods': [
      'cookies', 'crackers', 'chips', 'snacks', 'cereal', 'granola', 'cake', 'muffin'
    ]
  };

  // ENHANCED: Base ingredients that should NOT match with compound foods
  private static baseIngredients = new Set([
    'butter', 'chocolate', 'vanilla', 'strawberry', 'lemon', 'orange',
    'coconut', 'peanut', 'almond', 'walnut', 'honey', 'maple',
    'cinnamon', 'ginger', 'mint', 'coffee', 'tea', 'corn', 'flour',
    'cheese', 'cream', 'milk', 'oil', 'salt', 'pepper', 'sugar'
  ]);

  // ENHANCED: Compound food indicators
  private static compoundFoodIndicators = new Set([
    'cookies', 'cookie', 'cake', 'muffin', 'pie', 'tart', 'bread', 'loaf',
    'chips', 'crackers', 'snacks', 'cereal', 'granola', 'bar', 'balls',
    'candies', 'candy', 'gum', 'chocolate', 'ice', 'cream', 'frozen',
    'flavored', 'flavoured', 'scented', 'infused', 'marinated', 'glazed', 
    'coated', 'stuffed', 'filled', 'topped', 'covered', 'wrapped',
    'schnitzel', 'burger', 'pizza', 'pasta', 'noodles', 'sauce', 'soup',
    'stew', 'casserole', 'salad', 'sandwich', 'wrap', 'roll'
  ]);

  // NEW: Specific problematic patterns to avoid
  private static problematicPatterns = [
    { base: 'butter', avoid: ['flavored', 'flavoured', 'scented', 'infused', 'cookies', 'cake', 'bread', 'onion', 'onions'] },
    { base: 'chocolate', avoid: ['chip', 'chips', 'cookies', 'cake', 'milk', 'ice', 'bar'] },
    { base: 'vanilla', avoid: ['flavored', 'flavoured', 'ice', 'cream', 'cookies', 'cake'] },
    { base: 'corn', avoid: ['schnitzel', 'chips', 'flakes', 'syrup', 'starch', 'meal'] },
    { base: 'flour', avoid: ['tortilla', 'bread', 'cake', 'cookies', 'pasta'] },
    { base: 'cheese', avoid: ['crackers', 'chips', 'sauce', 'soup', 'cake'] },
    { base: 'cream', avoid: ['ice', 'soup', 'sauce', 'cheese', 'cookies'] },
    { base: 'milk', avoid: ['chocolate', 'powder', 'shake', 'ice', 'cake'] },
    { base: 'oil', avoid: ['spray', 'chips', 'fried', 'cooked'] },
    { base: 'sugar', avoid: ['cookies', 'cake', 'candy', 'syrup', 'caramel'] },
    { base: 'lemon', avoid: ['cake', 'cookies', 'pie', 'candy', 'drops'] },
    { base: 'orange', avoid: ['juice', 'cake', 'cookies', 'candy', 'peel'] }
  ];

  private static coreIngredientWords = new Set([
    'chicken', 'beef', 'pork', 'fish', 'milk', 'cheese', 'bread', 'rice',
    'pasta', 'tomato', 'onion', 'potato', 'carrot', 'apple', 'banana',
    'flour', 'egg', 'lime', 'lemon', 'orange', 'garlic', 'ginger'
  ]);

  private static normalizeIngredient(ingredient: string): string {
    return ingredient
      .toLowerCase()
      .replace(/[.,;:!?'"()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static extractCoreWords(ingredient: string): string[] {
    const normalized = this.normalizeIngredient(ingredient);
    const words = normalized.split(' ');
    
    const coreWords = words.filter(word => 
      word.length > 2 && 
      !this.stopWords.has(word) &&
      !word.match(/^\d+$/)
    );

    return coreWords.sort((a, b) => {
      const aIsCore = this.coreIngredientWords.has(a) ? 1 : 0;
      const bIsCore = this.coreIngredientWords.has(b) ? 1 : 0;
      return bIsCore - aIsCore;
    });
  }

  private static getIngredientCategory(ingredient: string): string | null {
    const coreWords = this.extractCoreWords(ingredient);
    
    for (const [category, items] of Object.entries(this.foodCategories)) {
      for (const item of items) {
        if (coreWords.some(word => word === item)) {
          return category;
        }
      }
    }
    return null;
  }

  // BALANCED: Allow same category matches plus some cross-category
  private static areCategoriesCompatible(ing1: string, ing2: string): boolean {
    const cat1 = this.getIngredientCategory(ing1);
    const cat2 = this.getIngredientCategory(ing2);
    
    if (!cat1 || !cat2) return true; // Allow if we can't determine category
    if (cat1 === cat2) return true; // Same category is always fine
    
    // REASONABLE: Some cross-category matches
    const compatiblePairs = [
      ['dairy', 'proteins'], // cheese with meat
      ['condiments_seasonings', 'vegetables'], // spices with vegetables
      ['condiments_seasonings', 'proteins'], // spices with meat
    ];
    
    return compatiblePairs.some(([c1, c2]) => 
      (cat1 === c1 && cat2 === c2) || (cat1 === c2 && cat2 === c1)
    );
  }

  // COMPLETELY REWRITTEN: Enhanced base ingredient mismatch detection
  private static isBaseIngredientMismatch(inventoryIng: string, recipeIng: string): boolean {
    const invWords = this.extractCoreWords(inventoryIng);
    const recWords = this.extractCoreWords(recipeIng);
    
    // Check for specific problematic patterns
    for (const pattern of this.problematicPatterns) {
      const invHasBase = invWords.includes(pattern.base);
      const recHasBase = recWords.includes(pattern.base);
      
      if (invHasBase || recHasBase) {
        // If one has the base and the other has avoided terms
        const invHasAvoid = invWords.some(word => pattern.avoid.includes(word));
        const recHasAvoid = recWords.some(word => pattern.avoid.includes(word));
        
        if ((invHasBase && recHasAvoid) || (recHasBase && invHasAvoid)) {
          return true; // This is a problematic match
        }
      }
    }

    // Enhanced compound food detection
    if (this.isCompoundFoodMismatch(inventoryIng, recipeIng)) {
      return true;
    }

    // Oil type mismatches (but allow canola = rapeseed)
    const oilTypes = ['olive', 'canola', 'rapeseed', 'coconut', 'sunflower', 'corn', 'sesame', 'vegetable'];
    const invOilType = invWords.find(word => oilTypes.includes(word));
    const recOilType = recWords.find(word => oilTypes.includes(word));
    
    if (invOilType && recOilType && invOilType !== recOilType) {
      // Allow canola = rapeseed
      if ((invOilType === 'rapeseed' && recOilType === 'canola') ||
          (invOilType === 'canola' && recOilType === 'rapeseed')) {
        return false;
      }
      return true; // Different oil types
    }

    return false;
  }

  // NEW: Compound food mismatch detection
  private static isCompoundFoodMismatch(inventoryIng: string, recipeIng: string): boolean {
    const invWords = this.extractCoreWords(inventoryIng);
    const recWords = this.extractCoreWords(recipeIng);
    
    // Check if one is a base ingredient and the other is a compound food
    const invIsBase = invWords.some(word => this.baseIngredients.has(word));
    const recIsBase = recWords.some(word => this.baseIngredients.has(word));
    
    const invIsCompound = invWords.some(word => this.compoundFoodIndicators.has(word));
    const recIsCompound = recWords.some(word => this.compoundFoodIndicators.has(word));
    
    // If one is clearly a base ingredient and the other is a compound food
    if ((invIsBase && recIsCompound) || (recIsBase && invIsCompound)) {
      // Additional check: they share a base ingredient word
      const sharedBaseWords = invWords.filter(word => 
        this.baseIngredients.has(word) && recWords.includes(word)
      );
      
      if (sharedBaseWords.length > 0) {
        return true; // This is a problematic match
      }
    }

    // Pattern-based detection for specific cases
    const problematicCombinations = [
      // Ingredient appears in different contexts
      ['butter', 'onion'],     // butter + onion = butter flavored onions
      ['corn', 'schnitzel'],   // corn + schnitzel = corn schnitzel  
      ['chocolate', 'chip'],   // chocolate + chip = chocolate chips
      ['vanilla', 'ice'],      // vanilla + ice = vanilla ice cream
      ['cheese', 'cracker'],   // cheese + cracker = cheese crackers
      ['lemon', 'cake'],       // lemon + cake = lemon cake
    ];

    for (const [base, modifier] of problematicCombinations) {
      const invHasBase = invWords.includes(base);
      const recHasBase = recWords.includes(base);
      const invHasModifier = invWords.includes(modifier);
      const recHasModifier = recWords.includes(modifier);
      
      // If one has just the base and the other has base + modifier
      if ((invHasBase && !invHasModifier && recHasBase && recHasModifier) ||
          (recHasBase && !recHasModifier && invHasBase && invHasModifier)) {
        return true;
      }
    }

    return false;
  }

  // IMPROVED: Core word matching with better thresholds
  private static calculateCoreWordMatch(inventoryWords: string[], recipeWords: string[]): number {
    if (inventoryWords.length === 0 || recipeWords.length === 0) return 0;
    
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    for (const invWord of inventoryWords) {
      const wordImportance = this.coreIngredientWords.has(invWord) ? 2.0 : 1.0;
      maxPossibleScore += wordImportance;
      
      let bestWordScore = 0;
      for (const recWord of recipeWords) {
        if (invWord === recWord) {
          bestWordScore = wordImportance; // Exact match
        } else if (invWord.length >= 4 && recWord.length >= 4) {
          // More restrictive partial matching
          if (invWord.includes(recWord) && recWord.length >= invWord.length * 0.8) {
            bestWordScore = Math.max(bestWordScore, wordImportance * 0.8);
          } else if (recWord.includes(invWord) && invWord.length >= recWord.length * 0.8) {
            bestWordScore = Math.max(bestWordScore, wordImportance * 0.8);
          }
        }
      }
      totalScore += bestWordScore;
    }
    
    return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
  }

  // Synonym matching
  private static checkSynonymMatch(inventoryWords: string[], recipeWords: string[]): boolean {
    for (const [baseWord, synonyms] of Object.entries(this.synonymMap)) {
      const inventoryHasBase = inventoryWords.includes(baseWord) || 
        synonyms.some(syn => this.extractCoreWords(syn).some(word => inventoryWords.includes(word)));
      const recipeHasBase = recipeWords.includes(baseWord) || 
        synonyms.some(syn => this.extractCoreWords(syn).some(word => recipeWords.includes(word)));
      
      if (inventoryHasBase && recipeHasBase) {
        return true;
      }
    }
    return false;
  }

  private static isCommonIngredient(ingredient: string): boolean {
    const normalized = this.normalizeIngredient(ingredient);
    return this.commonIngredients.has(normalized);
  }

  // MAIN MATCHING FUNCTION: Enhanced with improved logic and better thresholds
  static findBestMatch(recipeIngredient: string, inventoryIngredients: any[]): IngredientMatch {
    const recipeNormalized = this.normalizeIngredient(recipeIngredient);
    const recipeCoreWords = this.extractCoreWords(recipeIngredient);
    
    let bestMatch: IngredientMatch = {
      ingredient: null,
      quality: 0,
      matchType: 'exact',
      confidence: 0
    };

    // First check if it's a common ingredient
    if (this.isCommonIngredient(recipeIngredient)) {
      return {
        ingredient: recipeIngredient,
        quality: 1.0,
        matchType: 'common',
        confidence: 1.0
      };
    }

    for (const invItem of inventoryIngredients) {
      const inventoryName = invItem.name;
      const inventoryNormalized = this.normalizeIngredient(inventoryName);
      const inventoryCoreWords = this.extractCoreWords(inventoryName);
      
      let matchQuality = 0;
      let matchType: IngredientMatch['matchType'] = 'exact';
      let confidence = 0;

      // EARLY REJECTION: Check for base ingredient mismatch first
      if (this.isBaseIngredientMismatch(inventoryName, recipeIngredient)) {
        continue;
      }

      // 1. Exact match
      if (recipeNormalized === inventoryNormalized) {
        matchQuality = 1.0;
        confidence = 1.0;
        matchType = 'exact';
      }
      // 2. Synonym match
      else if (this.checkSynonymMatch(inventoryCoreWords, recipeCoreWords)) {
        matchQuality = 0.92;
        confidence = 0.9;
        matchType = 'synonym';
      }
      // 3. Core word match with category validation
      else if (this.areCategoriesCompatible(inventoryName, recipeIngredient)) {
        const coreWordMatch = this.calculateCoreWordMatch(inventoryCoreWords, recipeCoreWords);
        // IMPROVED threshold - 0.75 instead of 0.7
        if (coreWordMatch >= 0.75) {
          matchQuality = 0.72 + (coreWordMatch - 0.75) * 0.16; // 0.72 to 0.76 range
          confidence = coreWordMatch;
          matchType = 'partial';
        }
      }

      if (matchQuality > bestMatch.quality) {
        bestMatch = {
          ingredient: inventoryName,
          quality: matchQuality,
          matchType,
          confidence
        };
      }
    }

    return bestMatch;
  }
}

// Updated helper functions for React components
export const isIngredientInInventory = (recipeIngredient: string, ingredients: any[]): boolean => {
  if (!ingredients) return false;
  
  const availableIngredients = ingredients.filter(
    (ing) => !ing.status || ing.status === 'available'
  );

  const match = UnifiedIngredientMatcher.findBestMatch(recipeIngredient, availableIngredients);
  // Use 0.75 threshold to match backend improvements
  return match.quality >= 0.75;
};

export const getIngredientDetails = (recipeIngredient: string, ingredients: any[]) => {
  if (!ingredients) return null;
  
  const availableIngredients = ingredients.filter(
    (ing) => !ing.status || ing.status === 'available'
  );

  const match = UnifiedIngredientMatcher.findBestMatch(recipeIngredient, availableIngredients);
  
  // Use 0.75 threshold to match backend improvements
  if (match.quality >= 0.75 && match.ingredient) {
    const matchedItem = availableIngredients.find(ing => ing.name === match.ingredient);
    if (matchedItem) {
      return {
        ...matchedItem,
        matchQuality: match.quality,
        matchType: match.matchType
      };
    }
  }

  return null;
};

export const getMatchQuality = (recipeIngredient: string, ingredients: any[]): number => {
  if (!ingredients) return 0;
  
  const availableIngredients = ingredients.filter(
    (ing) => !ing.status || ing.status === 'available'
  );

  const match = UnifiedIngredientMatcher.findBestMatch(recipeIngredient, availableIngredients);
  return match.quality;
};