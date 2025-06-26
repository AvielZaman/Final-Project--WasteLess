// frontend\src\pages\RecommendedRecipesPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetInventory, useGetInventoryStats } from '../api/InventoryApi';
import { useRecipeContext } from '../contexts/RecipeContext';
import { isIngredientInInventory, getIngredientDetails } from '../utils/unifiedMatching';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChefHat,
  Clock,
  CookingPot,
  Filter,
  RefreshCw,
  Search,
  ShoppingBag,
  Timer,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { useAuth0 } from '@auth0/auth0-react';
import { RecommendedRecipe } from '../api/RecipeApi';

const RecommendedRecipesPage = () => {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  const { ingredients, isLoading: isLoadingIngredients } = useGetInventory();
  const { stats, isLoading: isLoadingStats } = useGetInventoryStats();

  // Use the recipe context
  const {
    recommendations,
    setRecommendations,
    preferences: savedPreferences,
    setPreferences: savePreferences,
  } = useRecipeContext();

  // State for the multi-step recommendation process
  const [currentStep, setCurrentStep] = useState(1);
  const [preferences, setPreferences] = useState(savedPreferences);
  const [recommendedRecipes, setRecommendedRecipes] =
    useState<RecommendedRecipe[]>(recommendations);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);

  // State for ingredient filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Check if we have recommendations in context on mount
  useEffect(() => {
    if (recommendations.length > 0) {
      setRecommendedRecipes(recommendations);
      setPreferences(savedPreferences);
      setCurrentStep(3); // Go directly to results
    }
  }, []);

  // Update context when preferences change
  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  // Get expiring ingredients
  const expiringIngredients = ingredients
    ? ingredients.filter((ing) => ing.aboutToExpire)
    : [];

  // Filter ingredients based on search and category
  const filteredIngredients = ingredients
    ? ingredients.filter((ing) => {
        const matchesSearch = ing.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchesFilter =
          selectedFilter === 'all' ||
          (selectedFilter === 'expiring' && ing.aboutToExpire) ||
          ing.category === selectedFilter;
        return matchesSearch && matchesFilter;
      })
    : [];

  // Get unique categories
  const categories = ingredients
    ? ['all', 'expiring', ...new Set(ingredients.map((ing) => ing.category))]
    : ['all', 'expiring'];

  // Function to generate recommendations from the backend with optional specific ingredients
  const generateRecommendations = async (specificIngredients?: string[]) => {
    setIsLoadingRecommendations(true);
    try {
      const accessToken = await getAccessTokenSilently();

      // Prepare query parameters
      const { mealType, prioritizeExpiring } = preferences;
      const selectedIngredients =
        specificIngredients || preferences.selectedIngredients;

      let url = `${
        import.meta.env.VITE_API_BASE_URL
      }/api/recipes/recommended/for-me?mealType=${mealType}&prioritizeExpiring=${prioritizeExpiring}`;

      // Only add the includeIngredients parameter if there are selected ingredients
      if (selectedIngredients.length > 0) {
        url += `&includeIngredients=${encodeURIComponent(
          selectedIngredients.join(',')
        )}`;
      }

      console.log('Calling API with URL:', url);

      // Call the backend API
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      // Get the recommended recipes from the response
      const data = await response.json();
      console.log('Received recommendations:', data);

      // Save to both local state and context
      setRecommendedRecipes(data);
      setRecommendations(data);

      return true;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error('Failed to generate recommendations. Please try again.');
      return false;
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Handler for "Find Recipes Using These Ingredients" button
  const handleFindRecipesWithExpiring = async () => {
    setIsLoadingRecommendations(true);
    try {
      // Pre-select all expiring ingredients
      const expiringIngredientNames = expiringIngredients.map(
        (ing) => ing.name
      );

      // Update preferences with just these ingredients and keep other preferences default
      setPreferences((prev) => ({
        ...prev,
        selectedIngredients: expiringIngredientNames,
        prioritizeExpiring: true, // Ensure this is true for expiring ingredients
      }));

      // Skip preferences step and go directly to API call
      const success = await generateRecommendations(expiringIngredientNames);

      // Move to results step directly if successful
      if (success) {
        setCurrentStep(3);
      }
    } catch (error) {
      console.error('Error finding recipes:', error);
      toast.error('Failed to find recipes. Please try again.');
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Helper function to get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'dry':
        return 'bg-amber-100 text-amber-800';
      case 'vegetable':
        return 'bg-green-100 text-green-800';
      case 'fruit':
        return 'bg-orange-100 text-orange-800';
      case 'dairy':
        return 'bg-blue-100 text-blue-800';
      case 'meat':
        return 'bg-red-100 text-red-800';
      case 'frozen':
        return 'bg-cyan-100 text-cyan-800';
      case 'bakery':
        return 'bg-yellow-100 text-yellow-800';
      case 'expiring':
        return 'bg-yellow-200 text-yellow-800 border-yellow-400 border-2';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle ingredient selection
  const toggleIngredientSelection = (ingredientName: string) => {
    setPreferences((prev) => {
      const isSelected = prev.selectedIngredients.includes(ingredientName);

      if (isSelected) {
        return {
          ...prev,
          selectedIngredients: prev.selectedIngredients.filter(
            (name) => name !== ingredientName
          ),
        };
      } else {
        return {
          ...prev,
          selectedIngredients: [...prev.selectedIngredients, ingredientName],
        };
      }
    });
  };

  // Handle meal type selection
  const handleMealTypeChange = (mealType: string) => {
    setPreferences((prev) => ({
      ...prev,
      mealType,
    }));
  };

  // Handle prioritization toggle
  const handlePrioritizeToggle = (prioritizeExpiring: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      prioritizeExpiring,
    }));
  };

  // Handle the "Continue to Preferences" button click
  const handleContinueToPreferences = () => {
    setCurrentStep(2);
  };

  // Handle the "Generate Recommendations" button click from preferences page
  const handleGenerateFromPreferences = async () => {
    const success = await generateRecommendations();
    if (success) {
      setCurrentStep(3);
    }
  };

  // Reset and start over
  const handleReset = () => {
    setPreferences({
      mealType: 'any',
      prioritizeExpiring: true,
      selectedIngredients: [],
    });
    setCurrentStep(1);
    setRecommendedRecipes([]);
    // Clear context
    setRecommendations([]);
    savePreferences({
      mealType: 'any',
      prioritizeExpiring: true,
      selectedIngredients: [],
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/inventory')}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </Button>
          <h1 className="text-3xl font-bold">Recipe Recommendations</h1>
        </div>
      </div>

      {/* Step 1: Inventory Overview */}
      {currentStep === 1 && (
        <>
          <Card className="mb-6 bg-green-50 border-green-100">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <ChefHat className="h-8 w-8 text-green-700 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    Let's Find the Perfect Recipe for Your Ingredients
                  </h3>
                  <p className="text-sm text-gray-600">
                    We'll help you discover recipes that use ingredients from
                    your inventory, with special focus on those that are about
                    to expire, to reduce food waste.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Total Inventory Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-bold">
                    {stats?.totalItems || 0}
                  </div>
                )}
                <p className="text-sm text-gray-500">items available</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  Expiring Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-bold text-yellow-600">
                    {stats?.expiringItems || 0}
                  </div>
                )}
                <p className="text-sm text-gray-500">
                  items expiring within 3 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Expired Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-bold text-red-600">
                    {stats?.expiredItems || 0}
                  </div>
                )}
                <p className="text-sm text-gray-500">items already expired</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Recipe Potential
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingIngredients ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-bold text-green-600">High</div>
                )}
                <p className="text-sm text-gray-500">
                  {expiringIngredients.length > 0
                    ? `${expiringIngredients.length} expiring items to use`
                    : 'Based on your inventory'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Expiring Ingredients Highlight */}
          {expiringIngredients.length > 0 && (
            <Card className="mb-6 border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Ingredients Expiring Soon
                </CardTitle>
                <CardDescription>
                  These ingredients should be used first to prevent waste
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {expiringIngredients.map((ingredient) => (
                    <Badge
                      key={ingredient._id}
                      variant="outline"
                      className="bg-yellow-100 text-yellow-800 border-yellow-400 border px-3 py-1 text-sm"
                    >
                      <Clock className="mr-1 h-3 w-3 inline" />
                      {ingredient.name} ({ingredient.quantity} {ingredient.unit}
                      )
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                  onClick={handleFindRecipesWithExpiring}
                  disabled={isLoadingRecommendations}
                >
                  {isLoadingRecommendations ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Finding Recipes...
                    </>
                  ) : (
                    <>
                      Find Recipes Using These Ingredients
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleContinueToPreferences}
              className="bg-green-600 hover:bg-green-700"
              disabled={isLoadingIngredients || isLoadingStats}
            >
              Continue to Preferences
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Step 2: Recipe Preferences */}
      {currentStep === 2 && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Set Your Recipe Preferences</CardTitle>
              <CardDescription>
                Customize your recipe recommendations based on your preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Meal Type Selection */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Meal Type</h3>
                <p className="text-sm text-gray-500">
                  Select the type of meal you're looking to prepare
                </p>
                <Tabs
                  defaultValue={preferences.mealType}
                  onValueChange={handleMealTypeChange}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-5 w-full">
                    <TabsTrigger value="any">Any</TabsTrigger>
                    <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
                    <TabsTrigger value="lunch">Lunch</TabsTrigger>
                    <TabsTrigger value="dinner">Dinner</TabsTrigger>
                    <TabsTrigger value="dessert">Dessert</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Prioritization Options */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Prioritization</h3>
                <p className="text-sm text-gray-500">
                  Choose how to prioritize your ingredients
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id="prioritize-expiring"
                    checked={preferences.prioritizeExpiring}
                    onCheckedChange={handlePrioritizeToggle}
                  />
                  <label
                    htmlFor="prioritize-expiring"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Prioritize ingredients that are about to expire
                  </label>
                </div>
              </div>

              {/* Ingredient Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  Include Specific Ingredients
                </h3>
                <p className="text-sm text-gray-500">
                  Select ingredients you'd like to use in your recipe
                </p>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search ingredients..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <Select
                    value={selectedFilter}
                    onValueChange={setSelectedFilter}
                  >
                    <SelectTrigger className="w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filter by" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                getCategoryColor(category).split(' ')[0]
                              }`}
                            />
                            <span>
                              {category === 'all'
                                ? 'All Categories'
                                : category === 'expiring'
                                ? 'Expiring Soon'
                                : category.charAt(0).toUpperCase() +
                                  category.slice(1)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ingredient List with Checkboxes */}
                <Card className="border-gray-200">
                  <ScrollArea className="h-64 w-full rounded-md border p-4">
                    {isLoadingIngredients ? (
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Skeleton key={i} className="h-6 w-full" />
                        ))}
                      </div>
                    ) : filteredIngredients.length > 0 ? (
                      <div className="space-y-2">
                        {filteredIngredients.map((ingredient) => (
                          <div
                            key={ingredient._id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`ingredient-${ingredient._id}`}
                              checked={preferences.selectedIngredients.includes(
                                ingredient.name
                              )}
                              onCheckedChange={() =>
                                toggleIngredientSelection(ingredient.name)
                              }
                            />
                            <label
                              htmlFor={`ingredient-${ingredient._id}`}
                              className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              <Badge
                                variant="outline"
                                className={`${getCategoryColor(
                                  ingredient.category
                                )} ${
                                  ingredient.aboutToExpire
                                    ? 'border-2 border-yellow-400'
                                    : ''
                                }`}
                              >
                                {ingredient.category}
                                {ingredient.aboutToExpire && (
                                  <Clock className="ml-1 h-3 w-3 text-yellow-600" />
                                )}
                              </Badge>
                              <span>
                                {ingredient.name} ({ingredient.quantity}{' '}
                                {ingredient.unit})
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-4">
                        No ingredients found matching your search or filter.
                      </p>
                    )}
                  </ScrollArea>
                </Card>

                <div className="text-sm text-gray-500">
                  {preferences.selectedIngredients.length > 0 ? (
                    <span className="font-medium text-green-600">
                      {preferences.selectedIngredients.length} ingredients
                      selected
                    </span>
                  ) : (
                    <span>
                      If no ingredients are selected, we'll consider your entire
                      inventory.
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleGenerateFromPreferences}
                className="bg-green-600 hover:bg-green-700"
                disabled={isLoadingRecommendations}
              >
                {isLoadingRecommendations ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Recommendations
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </>
      )}

      {/* Step 3: Recipe Results */}
      {currentStep === 3 && (
        <>
          {/* Results Summary Card */}
          <Card className="mb-6 bg-green-50 border-green-100">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <ChefHat className="h-8 w-8 text-green-700 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    Your Recipe Recommendations
                  </h3>
                  <p className="text-sm text-gray-600">
                    Based on your{' '}
                    {preferences.selectedIngredients.length > 0
                      ? 'selected'
                      : 'inventory'}{' '}
                    ingredients
                    {preferences.mealType !== 'any'
                      ? ` for ${preferences.mealType}`
                      : ''}
                    .
                    {preferences.prioritizeExpiring &&
                      " We've prioritized ingredients that are about to expire."}
                  </p>
                  <div className="flex mt-2 gap-2">
                    <Badge
                      className={`${getCategoryColor(
                        preferences.mealType
                      )} capitalize`}
                    >
                      {preferences.mealType}
                    </Badge>
                    {preferences.prioritizeExpiring && (
                      <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Prioritizing expiring
                        items
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

         {recommendedRecipes.length > 0 ? (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
    {recommendedRecipes.map((recipe) => {
      // UNIFIED: Use the same matching logic as the detail page
      const availableIngredients = ingredients ? ingredients.filter(
        (ing) => !ing.status || ing.status === 'available'
      ) : [];
      
      // Calculate actual matched ingredients using unified matching
      const recipeIngredients = recipe.usedIngredients.concat(recipe.missedIngredients);
      const actuallyAvailableIngredients = recipeIngredients.filter(
        (ingredient) => isIngredientInInventory(ingredient, availableIngredients)
      );
      const actuallyMissingIngredients = recipeIngredients.filter(
        (ingredient) => !isIngredientInInventory(ingredient, availableIngredients)
      );

      // Count expiring ingredients among the actually available ones
      const expiringIngredientsCount = actuallyAvailableIngredients.filter((recipeIngredient) => {
        const details = getIngredientDetails(recipeIngredient, availableIngredients);
        return details && details.aboutToExpire;
      }).length;

      return (
        <Card key={recipe.id} className="overflow-hidden flex flex-col">
          <div className="relative">
            {recipe.image && (
              <img
                src={recipe.image}
                alt={recipe.title}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="absolute top-2 right-2">
              <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                <span className="text-lg font-bold">
                  {recipe.score}
                </span>
                <span className="text-xs">Score</span>
              </Badge>
            </div>
            <div className="absolute top-2 left-2">
              <Badge className="bg-gray-600 hover:bg-gray-700 capitalize">
                {recipe.mealType}
              </Badge>
            </div>
          </div>
          <CardHeader className="pb-2">
            <CardTitle>{recipe.title}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <span className="text-green-600">
                {actuallyAvailableIngredients.length} of{' '}
                {recipeIngredients.length}{' '}
                ingredients
              </span>
              {expiringIngredientsCount > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1 ml-2">
                  <Timer className="h-3 w-3" />
                  {expiringIngredientsCount} expiring
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Ingredients you have:
              </h4>
              <div className="flex flex-wrap gap-1">
                {actuallyAvailableIngredients.length > 0 ? (
                  actuallyAvailableIngredients.map((ingredient, idx) => {
                    const details = getIngredientDetails(ingredient, availableIngredients);
                    return (
                      <Badge
                        key={idx}
                        variant="outline"
                        className={`bg-green-100 text-green-800 ${
                          details?.aboutToExpire ? 'border-yellow-400 border-2' : ''
                        }`}
                      >
                        {ingredient}
                        {details?.aboutToExpire && (
                          <Timer className="ml-1 h-3 w-3 text-yellow-600" />
                        )}
                      </Badge>
                    );
                  })
                ) : (
                  <span className="text-gray-500 italic text-sm">
                    No matching ingredients found
                  </span>
                )}
              </div>
            </div>

            {actuallyMissingIngredients.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Missing ingredients:
                </h4>
                <div className="flex flex-wrap gap-1">
                  {actuallyMissingIngredients
                    .slice(0, 3)
                    .map((ingredient, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="bg-gray-100 text-gray-800"
                      >
                        {ingredient}
                      </Badge>
                    ))}
                  {actuallyMissingIngredients.length > 3 && (
                    <Badge
                      variant="outline"
                      className="bg-gray-100 text-gray-800"
                    >
                      +{actuallyMissingIngredients.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-2">
            <Button
              onClick={() => navigate(`/recipes/${recipe.id}`)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              View Recipe
            </Button>
          </CardFooter>
        </Card>
      );
    })}
  </div>
) : (
  <Card className="text-center p-6 mb-6">
    <CardContent className="pt-6">
      <p className="text-muted-foreground mb-4">
        No recipe recommendations found matching your criteria.
      </p>
      <p className="text-sm text-gray-500 mb-4">
        Try adjusting your preferences or selecting different
        ingredients.
      </p>
    </CardContent>
  </Card>
)}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Over
            </Button>

            <Button
              onClick={() => setCurrentStep(2)}
              variant="outline"
              className="border-green-600 text-green-700"
            >
              <Filter className="mr-2 h-4 w-4" />
              Adjust Preferences
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default RecommendedRecipesPage;
