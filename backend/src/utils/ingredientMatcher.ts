// backend/src/utils/ingredientMatcher.ts - FIXED VERSION

interface IngredientMatch {
  ingredient: string | null;
  quality: number;
  matchType: 'exact' | 'stemmed' | 'synonym' | 'partial' | 'fuzzy' | 'common';
  confidence: number;
}

// Debug mode constant
const DEBUG_MODE = false; // Set to true for detailed matching logs

class IngredientMatcher {
  // CRITICALLY FIXED: Much more restrictive common ingredients - only truly universal ones
  private static commonIngredients = new Set([
    'water', 'tap water', 'filtered water', 'cold water', 'warm water', 'hot water',
    'ice', 'ice cubes'
  ]);

  // ENHANCED: More comprehensive synonym mappings for better matching
  private static synonymMap: Record<string, string[]> = {
    // Proteins - enhanced for better matching
    'chicken': ['chicken breast', 'chicken thigh', 'chicken leg', 'chicken meat', 'chicken fillet', 'poultry'],
    'beef': ['ground beef', 'beef steak', 'ground meat', 'beef mince', 'minced beef', 'steak', 'beef chuck'],
    'pork': ['pork chop', 'pork tenderloin', 'pork shoulder', 'bacon', 'ham'],
    'fish': ['white fish', 'fish fillet', 'salmon', 'tuna', 'cod', 'seafood'],
    
    // Dairy - more inclusive
    'milk': ['whole milk', 'skim milk', '2% milk', 'dairy milk', 'fresh milk', 'cow milk'],
    'cheese': ['cheddar cheese', 'mozzarella cheese', 'parmesan cheese', 'swiss cheese'],
    'yogurt': ['greek yogurt', 'plain yogurt', 'natural yogurt'],
    'butter': ['unsalted butter', 'salted butter', 'dairy butter'], 
    'cream': ['heavy cream', 'whipping cream', 'double cream', 'cooking cream'],
    
    // Oils - reasonable mappings
    'olive oil': ['extra virgin olive oil', 'virgin olive oil', 'light olive oil'],
    'vegetable oil': ['canola oil', 'sunflower oil', 'corn oil'],
    'canola oil': ['rapeseed oil'], // Only this specific equivalence
    'coconut oil': ['virgin coconut oil', 'refined coconut oil'],
    
    // Vegetables - basic forms
    'tomato': ['tomatoes', 'fresh tomatoes', 'roma tomato'],
    'onion': ['onions', 'yellow onion', 'white onion', 'red onion'],
    'potato': ['potatoes', 'red potato', 'russet potato'],
    'carrot': ['carrots', 'baby carrot'],
    'pepper': ['bell pepper', 'red pepper', 'green pepper'],
    
    // Fruits - basic forms
    'apple': ['apples', 'green apple', 'red apple'],
    'banana': ['bananas', 'ripe banana'],
    'lemon': ['lemons', 'fresh lemon'],
    'lime': ['limes', 'fresh lime'],
    'orange': ['oranges', 'navel orange'],
    
    // Grains - basic forms
    'rice': ['white rice', 'brown rice', 'jasmine rice'],
    'pasta': ['spaghetti', 'penne', 'linguine', 'macaroni'],
    'bread': ['white bread', 'wheat bread', 'whole grain bread'],
    'flour': ['all purpose flour', 'wheat flour', 'plain flour'],
    
    // Seasonings - basic forms
    'garlic': ['fresh garlic', 'garlic cloves'],
    'ginger': ['fresh ginger', 'ginger root'],
    'black pepper': ['pepper', 'ground black pepper'],
  };

  // REASONABLE stop words
  private static stopWords = new Set([
    'fresh', 'organic', 'natural', 'raw', 'cooked', 'frozen',
    'canned', 'dried', 'whole', 'sliced', 'diced', 'chopped', 'minced',
    'large', 'small', 'medium', 'extra',
    'lean', 'fat-free', 'low-fat', 'unsalted',
    'white', 'red', 'green', 'yellow', 'brown', 'black',
    'light', 'dark', 'sweet', 'mild',
    'ground', 'fine', 'coarse', 'pure'
  ]);

  // Food categories for compatibility checking
  private static foodCategories: Record<string, string[]> = {
    'proteins': ['chicken', 'beef', 'pork', 'fish', 'turkey', 'lamb', 'egg', 'tofu'],
    'dairy': ['milk', 'cheese', 'yogurt', 'cream', 'butter'],
    'vegetables': ['tomato', 'onion', 'carrot', 'potato', 'pepper', 'lettuce', 'spinach', 'garlic', 'ginger'],
    'fruits': ['apple', 'banana', 'orange', 'grape', 'lemon', 'lime'],
    'grains': ['bread', 'rice', 'pasta', 'flour', 'oat', 'wheat'],
    'oils': ['oil', 'olive oil', 'canola oil', 'coconut oil'],
    'seasonings': ['salt', 'pepper', 'garlic', 'ginger', 'herb', 'spice']
  };

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
    
    return words.filter(word => 
      word.length > 2 && 
      !this.stopWords.has(word) &&
      !word.match(/^\d+$/)
    );
  }

  private static getIngredientCategory(ingredient: string): string | null {
    const coreWords = this.extractCoreWords(ingredient);
    
    for (const [category, items] of Object.entries(this.foodCategories)) {
      for (const item of items) {
        if (coreWords.some(word => word === item || word.includes(item))) {
          return category;
        }
      }
    }
    return null;
  }

  // BALANCED: Allow same category matches plus some reasonable cross-category
  private static areCategoriesCompatible(ing1: string, ing2: string): boolean {
    const cat1 = this.getIngredientCategory(ing1);
    const cat2 = this.getIngredientCategory(ing2);
    
    if (!cat1 || !cat2) return true; // Allow if we can't determine category
    return cat1 === cat2; // Same category matches
  }

  // COMPLETELY FIXED: Enhanced problematic match detection
  private static isProblematicMatch(inventoryIng: string, recipeIng: string): boolean {
    const invWords = this.extractCoreWords(inventoryIng);
    const recWords = this.extractCoreWords(recipeIng);
    
    // CRITICAL FIX: Enhanced compound ingredient detection
    const problematicPatterns = [
      { 
        base: 'butter', 
        avoid: ['flavored', 'flavoured', 'onion', 'garlic', 'herb', 'seasoned', 'sliced', 'compound', 'spiced', 'herbed', 'mixed'] 
      },
      { 
        base: 'oil', 
        avoid: ['flavored', 'flavoured', 'infused', 'seasoned', 'spray', 'cooking', 'mixed', 'compound'] 
      },
      { 
        base: 'cheese', 
        avoid: ['flavored', 'flavoured', 'seasoned', 'processed', 'sauce', 'mixed', 'herb', 'garlic'] 
      },
      { 
        base: 'milk', 
        avoid: ['flavored', 'flavoured', 'chocolate', 'strawberry', 'condensed', 'powdered', 'mixed'] 
      },
      {
        base: 'cream',
        avoid: ['flavored', 'flavoured', 'whipped', 'sour', 'ice', 'mixed']
      },
      {
        base: 'salt',
        avoid: ['garlic', 'onion', 'herb', 'seasoned', 'flavored', 'flavoured']
      }
    ];

    // ENHANCED: Check for specific problematic patterns
    for (const pattern of problematicPatterns) {
      const invHasBase = invWords.includes(pattern.base);
      const recHasBase = recWords.includes(pattern.base);
      
      if (invHasBase || recHasBase) {
        const invHasAvoid = invWords.some(word => pattern.avoid.includes(word));
        const recHasAvoid = recWords.some(word => pattern.avoid.includes(word));
        
        // CRITICAL: If one is base ingredient and other has compound terms, reject
        if ((invHasBase && !invHasAvoid && recHasBase && recHasAvoid) ||
            (recHasBase && !recHasAvoid && invHasBase && invHasAvoid)) {
          if (DEBUG_MODE) {
            console.log(`🚫 COMPOUND MISMATCH: "${inventoryIng}" vs "${recipeIng}" - base ingredient vs compound`);
          }
          return true; // This is definitely a problematic match
        }
      }
    }
    
    // ENHANCED: Detect compound ingredients by word count and combinations
    const compoundIndicators = ['sliced', 'diced', 'chopped', 'mixed', 'seasoned', 'flavored', 'flavoured', 'herbed', 'spiced'];
    const invHasCompound = invWords.some(word => compoundIndicators.includes(word));
    const recHasCompound = recWords.some(word => compoundIndicators.includes(word));
    
    // If one has compound indicators and they share a base ingredient, it's problematic
    if (invHasCompound !== recHasCompound) {
      const sharedWords = invWords.filter(word => recWords.includes(word));
      if (sharedWords.length > 0) {
        if (DEBUG_MODE) {
          console.log(`🚫 COMPOUND DETECTION: "${inventoryIng}" vs "${recipeIng}" - compound vs simple mismatch`);
        }
        return true;
      }
    }
    
    // ENHANCED: Oil type mismatches (but allow reasonable equivalences)
    const oilTypes = ['olive', 'canola', 'coconut', 'sunflower', 'corn', 'sesame', 'vegetable'];
    const invOilType = invWords.find(word => oilTypes.includes(word));
    const recOilType = recWords.find(word => oilTypes.includes(word));
    
    if (invOilType && recOilType) {
      // Allow exact matches or known equivalences
      if (invOilType === recOilType) return false;
      if ((invOilType === 'canola' && recOilType === 'rapeseed') ||
          (invOilType === 'rapeseed' && recOilType === 'canola')) return false;
      if ((invOilType === 'vegetable' && ['canola', 'sunflower', 'corn'].includes(recOilType)) ||
          (recOilType === 'vegetable' && ['canola', 'sunflower', 'corn'].includes(invOilType))) return false;
      // Different specific oil types are problematic
      return true;
    }

    return false;
  }

  // IMPROVED: More reasonable core word matching
  private static calculateCoreWordMatch(inventoryWords: string[], recipeWords: string[]): number {
    if (inventoryWords.length === 0 || recipeWords.length === 0) return 0;
    
    let matchScore = 0;
    let totalPossible = recipeWords.length;
    
    for (const recWord of recipeWords) {
      let bestMatch = 0;
      
      for (const invWord of inventoryWords) {
        if (invWord === recWord) {
          bestMatch = 1.0; // Perfect exact match
          break;
        } else if (invWord.length >= 3 && recWord.length >= 3) {
          // IMPROVED: More reasonable partial matching requirements
          if (invWord.includes(recWord) && recWord.length >= invWord.length * 0.7) {
            bestMatch = Math.max(bestMatch, 0.85);
          } else if (recWord.includes(invWord) && invWord.length >= recWord.length * 0.7) {
            bestMatch = Math.max(bestMatch, 0.85);
          } else if (invWord.length >= 4 && recWord.length >= 4) {
            // Even more flexible for longer words
            if (invWord.includes(recWord) || recWord.includes(invWord)) {
              bestMatch = Math.max(bestMatch, 0.75);
            }
          }
        }
      }
      
      matchScore += bestMatch;
    }
    
    return matchScore / totalPossible;
  }

  // ENHANCED: Improved synonym matching
  private static checkSynonymMatch(inventoryWords: string[], recipeWords: string[]): { match: boolean; quality: number } {
    for (const [baseWord, synonyms] of Object.entries(this.synonymMap)) {
      const invHasBase = inventoryWords.includes(baseWord);
      const recHasBase = recipeWords.includes(baseWord);
      
      // Check if inventory has base word and recipe has synonym
      if (invHasBase) {
        for (const synonym of synonyms) {
          const synonymWords = this.extractCoreWords(synonym);
          const recHasSynonym = synonymWords.every(word => recipeWords.includes(word));
          if (recHasSynonym) {
            return { match: true, quality: 0.9 };
          }
        }
      }
      
      // Check if recipe has base word and inventory has synonym  
      if (recHasBase) {
        for (const synonym of synonyms) {
          const synonymWords = this.extractCoreWords(synonym);
          const invHasSynonym = synonymWords.every(word => inventoryWords.includes(word));
          if (invHasSynonym) {
            return { match: true, quality: 0.9 };
          }
        }
      }
      
      // Check synonym to synonym matches
      for (const synonym1 of synonyms) {
        const syn1Words = this.extractCoreWords(synonym1);
        const invHasSyn1 = syn1Words.every(word => inventoryWords.includes(word));
        
        if (invHasSyn1) {
          for (const synonym2 of synonyms) {
            const syn2Words = this.extractCoreWords(synonym2);
            const recHasSyn2 = syn2Words.every(word => recipeWords.includes(word));
            if (recHasSyn2) {
              return { match: true, quality: 0.85 };
            }
          }
        }
      }
    }
    return { match: false, quality: 0 };
  }

  private static isCommonIngredient(ingredient: string): boolean {
    const normalized = this.normalizeIngredient(ingredient);
    return this.commonIngredients.has(normalized);
  }

  // FIXED: Main matching function with enhanced debugging and reasonable thresholds
  static findBestMatch(
    inventoryIngredient: string,
    recipeIngredients: string[],
    debugMode = false
  ): IngredientMatch {
    const inventoryNormalized = this.normalizeIngredient(inventoryIngredient);
    const inventoryCoreWords = this.extractCoreWords(inventoryIngredient);
    
    let bestMatch: IngredientMatch = {
      ingredient: null,
      quality: 0,
      matchType: 'exact',
      confidence: 0
    };

    if (debugMode) {
      console.log(`\n🔍 === ENHANCED MATCHING "${inventoryIngredient}" ===`);
      console.log(`📝 Core words: [${inventoryCoreWords.join(', ')}]`);
      console.log(`🏷️ Category: ${this.getIngredientCategory(inventoryIngredient) || 'unknown'}`);
    }

    for (const recipeIngredient of recipeIngredients) {
      // PRIORITY 1: Check if it's a common ingredient (always matches)
      if (this.isCommonIngredient(recipeIngredient)) {
        if (debugMode) console.log(`  ✅ COMMON INGREDIENT: "${recipeIngredient}" -> Quality: 1.0`);
        bestMatch = {
          ingredient: recipeIngredient,
          quality: 1.0,
          matchType: 'common',
          confidence: 1.0
        };
        break; // Common ingredients take absolute priority
      }

      const recipeNormalized = this.normalizeIngredient(recipeIngredient);
      const recipeCoreWords = this.extractCoreWords(recipeIngredient);
      
      let matchQuality = 0;
      let matchType: IngredientMatch['matchType'] = 'exact';
      let confidence = 0;

      // PRIORITY 2: Early rejection for problematic matches
      if (this.isProblematicMatch(inventoryIngredient, recipeIngredient)) {
        if (debugMode) console.log(`  🚫 REJECTED (Problematic): "${recipeIngredient}" - compound/flavored mismatch detected`);
        continue;
      }

      // PRIORITY 3: Exact match check
      if (inventoryNormalized === recipeNormalized) {
        matchQuality = 1.0;
        confidence = 1.0;
        matchType = 'exact';
        if (debugMode) console.log(`  ✅ EXACT MATCH: "${recipeIngredient}" -> Quality: 1.0`);
      }
      
      // PRIORITY 4: Synonym match check
      else {
        const synonymResult = this.checkSynonymMatch(inventoryCoreWords, recipeCoreWords);
        if (synonymResult.match) {
          matchQuality = synonymResult.quality;
          confidence = 0.9;
          matchType = 'synonym';
          if (debugMode) console.log(`  ✅ SYNONYM MATCH: "${recipeIngredient}" -> Quality: ${matchQuality.toFixed(2)}`);
        }
        
        // PRIORITY 5: Core word match (FIXED: More reasonable threshold)
        else if (this.areCategoriesCompatible(inventoryIngredient, recipeIngredient)) {
          const coreWordMatch = this.calculateCoreWordMatch(inventoryCoreWords, recipeCoreWords);
          
          // FIXED: More reasonable threshold from 0.85 to 0.75
          if (coreWordMatch >= 0.75) {
            matchQuality = 0.7 + (coreWordMatch - 0.75) * 0.2; // 0.7 to 0.75 range
            confidence = coreWordMatch;
            matchType = 'partial';
            if (debugMode) console.log(`  ✅ CORE WORD MATCH: "${recipeIngredient}" -> Quality: ${matchQuality.toFixed(2)} (core: ${coreWordMatch.toFixed(2)})`);
          } else if (debugMode) {
            console.log(`  ❌ REJECTED (Low core): "${recipeIngredient}" -> Core score: ${coreWordMatch.toFixed(2)} (need 0.75+)`);
          }
        } else if (debugMode) {
          console.log(`  ❌ REJECTED (Category): "${recipeIngredient}" - categories incompatible`);
        }
      }

      // Update best match if this is significantly better
      if (matchQuality > bestMatch.quality) {
        bestMatch = {
          ingredient: recipeIngredient,
          quality: matchQuality,
          matchType,
          confidence
        };
      }
    }

    if (debugMode) {
      if (bestMatch.ingredient) {
        console.log(`  🎯 FINAL BEST: "${bestMatch.ingredient}" (${bestMatch.matchType}) -> Quality: ${bestMatch.quality.toFixed(2)}`);
      } else {
        console.log(`  ❌ NO SUITABLE MATCH FOUND for "${inventoryIngredient}"`);
      }
      console.log(`🔍 === END MATCHING ===\n`);
    }

    return bestMatch;
  }

  private static calculateFuzzyMatch(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }

  private static levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
      }
    }

    return matrix[b.length][a.length];
  }
}

export default IngredientMatcher;