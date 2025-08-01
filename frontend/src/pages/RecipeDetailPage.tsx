// frontend/src/pages/RecipeDetailPage.tsx - FIXED VERSION

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetRecipeById, useAcceptRecipe } from '../api/RecipeApi';
import { useGetInventory } from '../api/InventoryApi';
import { useRecipeContext } from '../contexts/RecipeContext';
// IMPORTANT: Import the unified matching utility
import { isIngredientInInventory, getIngredientDetails } from '../utils/unifiedMatching';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  ArrowLeft,
  Check,
  ChefHat,
  Clock,
  CookingPot,
  ShoppingBag,
  XCircle,
} from 'lucide-react';

// Debug mode for troubleshooting
const DEBUG_MODE = true;

const RecipeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recommendations } = useRecipeContext();

  const { recipe, isLoading } = useGetRecipeById(id);
  const { ingredients, isLoading: isLoadingIngredients } = useGetInventory();
  const acceptRecipeMutation = useAcceptRecipe();

  const [activeTab, setActiveTab] = useState('ingredients');
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);

  // Check if we came from recommendations
  const canGoBackToRecommendations = recommendations.length > 0;

  if (isLoading || isLoadingIngredients) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/2">
            <Skeleton className="w-full h-80 rounded-lg mb-4" />
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-6" />

            <div className="flex gap-2 mb-6">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </div>

            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          <div className="md:w-1/2">
            <Skeleton className="h-8 w-1/2 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-6" />

            <Skeleton className="h-8 w-1/2 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <Card className="text-center p-6">
          <p className="text-muted-foreground mb-4">
            Recipe not found. The recipe may have been removed or you may have
            followed an invalid link.
          </p>
          <Button
            onClick={() => navigate('/recipes/recommended')}
            className="flex items-center gap-2"
          >
            <ChefHat className="h-4 w-4" />
            View Recommended Recipes
          </Button>
        </Card>
      </div>
    );
  }

  // FIXED: Use ONLY available ingredients (not consumed/expired/wasted)
  const availableIngredients = ingredients ? ingredients.filter(
    (ing) => !ing.status || ing.status === 'available'
  ) : [];

  console.log('FIXED: Total ingredients in inventory:', ingredients?.length || 0);
  console.log('FIXED: Available ingredients for matching:', availableIngredients.length);

  // FIXED: Calculate actual match counts using unified matching on available ingredients only
  const matchedIngredients = recipe.ingredients.filter(ingredient => 
    isIngredientInInventory(ingredient, availableIngredients)
  );
  const matchCount = matchedIngredients.length;
  const missingCount = recipe.ingredients.length - matchCount;

  if (DEBUG_MODE) {
    console.log(
      `FIXED: Recipe "${recipe.title}" has ${matchCount} matching AVAILABLE ingredients and ${missingCount} missing ingredients`
    );
    console.log('FIXED: Matched ingredients:', matchedIngredients);
    console.log('FIXED: Available inventory items:', availableIngredients.map(ing => `${ing.name} (${ing.status || 'no status'})`));
  }

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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // FIXED: Handle accepting the recipe with available ingredients only
  const handleAcceptRecipe = async () => {
    if (!recipe) return;

    // FIXED: Get the actual available inventory ingredient names using unified matching
    const inventoryIngredientNames = matchedIngredients
      .map((recipeIngredient) => {
        const details = getIngredientDetails(recipeIngredient, availableIngredients);
        return details ? details.name : recipeIngredient;
      })
      .filter((name, index, self) => self.indexOf(name) === index); // Remove duplicates

    if (DEBUG_MODE) {
      console.log(
        'FIXED: Sending available inventory ingredient names:',
        inventoryIngredientNames
      );
    }

    try {
      await acceptRecipeMutation.mutateAsync({
        recipeId: recipe._id,
        usedIngredients: inventoryIngredientNames,
        wasRecommended: canGoBackToRecommendations,
      });

      setShowAcceptDialog(false);

      // Navigate back to inventory or recommendations
      if (canGoBackToRecommendations) {
        navigate('/recipes/recommended');
      } else {
        navigate('/inventory');
      }
    } catch (error) {
      console.error('FIXED: Error accepting recipe:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Button
          onClick={() =>
            canGoBackToRecommendations
              ? navigate('/recipes/recommended')
              : navigate(-1)
          }
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {canGoBackToRecommendations ? 'Back to Recommendations' : 'Back'}
        </Button>

        {/* FIXED: Show button based on available ingredients only */}
        {availableIngredients && availableIngredients.length > 0 && (
          <div className="flex flex-col items-end gap-2">
            {matchCount > 0 ? (
              <Button
                onClick={() => setShowAcceptDialog(true)}
                className="bg-green-600 hover:bg-green-700"
                disabled={acceptRecipeMutation.isLoading}
              >
                <Check className="mr-2 h-4 w-4" />
                I Made This Recipe
              </Button>
            ) : (
              <div className="text-center">
                <Button
                  disabled
                  className="bg-gray-400 cursor-not-allowed mb-1"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Need More Ingredients
                </Button>
                <p className="text-xs text-gray-500">
                  You need {missingCount} more available ingredients
                </p>
              </div>
            )}
            <p className="text-sm text-gray-600">
              You have {matchCount} of {recipe.ingredients.length} ingredients available
            </p>
          </div>
        )}

        {/* FIXED: Show message if no available ingredients */}
        {availableIngredients && availableIngredients.length === 0 && (
          <div className="text-center">
            <Button
              disabled
              className="bg-gray-400 cursor-not-allowed mb-1"
            >
              <XCircle className="mr-2 h-4 w-4" />
              No Available Ingredients
            </Button>
            <p className="text-xs text-gray-500">
              All your ingredients are consumed or expired
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left column - Image and Info */}
        <div className="md:w-1/2">
          {recipe.image && (
            <img
              src={recipe.image}
              alt={recipe.title}
              className="w-full rounded-lg mb-4 max-h-80 object-cover"
            />
          )}

          <h1 className="text-3xl font-bold mb-2">{recipe.title}</h1>

          <div className="flex gap-2 mb-4">
            <Badge className="bg-gray-600 hover:bg-gray-700">
              {recipe.mealType.charAt(0).toUpperCase() +
                recipe.mealType.slice(1)}
            </Badge>
            <Badge className={matchCount > 0 ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}>
              {matchCount} / {recipe.ingredients.length} available ingredients in your
              inventory
            </Badge>
          </div>

          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === 'ingredients' ? 'default' : 'outline'}
              onClick={() => setActiveTab('ingredients')}
              className="flex items-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Ingredients
            </Button>
            <Button
              variant={activeTab === 'instructions' ? 'default' : 'outline'}
              onClick={() => setActiveTab('instructions')}
              className="flex items-center gap-2"
            >
              <CookingPot className="h-4 w-4" />
              Instructions
            </Button>
          </div>

          {/* Tabs content */}
          {activeTab === 'ingredients' ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Ingredients</h2>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient, index) => {
                  const inInventory = isIngredientInInventory(ingredient, availableIngredients);
                  const details = getIngredientDetails(ingredient, availableIngredients);

                  return (
                    <li key={index} className="flex items-center gap-2">
                      {inInventory ? (
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      )}
                      <span
                        className={
                          inInventory ? 'font-medium' : 'text-gray-600'
                        }
                      >
                        {ingredient}
                      </span>

                      {details && (
                        <div className="flex items-center ml-auto">
                          <Badge
                            variant="outline"
                            className={getCategoryColor(details.category)}
                          >
                            {details.category}
                          </Badge>

                          {details.aboutToExpire && (
                            <Badge className="ml-2 bg-yellow-100 text-yellow-800 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expiring soon
                            </Badge>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {missingCount > 0 && (
                <Card className="bg-yellow-50 border-yellow-100 mt-4">
                  <CardContent className="pt-6">
                    <p className="text-yellow-800">
                      <strong>Missing ingredients:</strong> You're missing{' '}
                      {missingCount} out of {recipe.ingredients.length}{' '}
                      ingredients for this recipe from your available inventory.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Instructions</h2>
              <ol className="space-y-4 list-decimal list-inside">
                {recipe.instructions.map((step, index) => (
                  <li key={index} className="pl-2">
                    <span className="ml-2">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Right column - Available Inventory Matches */}
        <div className="md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>Your Available Inventory Matches</CardTitle>
              <CardDescription>
                See which available ingredients you have and what you might need
                to buy (excluding consumed items)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Available ingredients in inventory */}
                <div>
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600" />
                    Available Ingredients You Have ({matchCount})
                  </h3>

                  {matchCount > 0 ? (
                    <div className="space-y-3">
                      {matchedIngredients.map((ingredient, index) => {
                        const details = getIngredientDetails(ingredient, availableIngredients);

                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              {details && (
                                <Badge
                                  variant="outline"
                                  className={getCategoryColor(details.category)}
                                >
                                  {details.category}
                                </Badge>
                              )}
                              <span>{ingredient}</span>
                              {details && details.name !== ingredient && (
                                <span className="text-xs text-gray-500">
                                  (matched with "{details.name}")
                                </span>
                              )}
                            </div>

                            {details?.aboutToExpire && (
                              <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Expiring soon
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">
                      You don't have any available ingredients for this recipe in your
                      inventory.
                    </p>
                  )}
                </div>

                {/* Missing ingredients */}
                {missingCount > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      Ingredients To Buy ({missingCount})
                    </h3>

                    <div className="space-y-2">
                      {recipe.ingredients
                        .filter((ing) => !isIngredientInInventory(ing, availableIngredients))
                        .map((ingredient, index) => (
                          <div key={index} className="flex items-center">
                            <span>{ingredient}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* FIXED: Tips section with available ingredient context */}
                <Card className="bg-green-50 border-green-100">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <ChefHat className="h-6 w-6 text-green-700 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-medium text-green-800 mb-1">
                          Recipe Tips
                        </h4>
                        <p className="text-sm text-green-700">
                          {matchCount === recipe.ingredients.length
                            ? 'Great choice! You have all the available ingredients for this recipe.'
                            : matchCount > recipe.ingredients.length / 2
                            ? `You have most of the available ingredients for this recipe. Just need to get ${missingCount} more!`
                            : matchCount > 0
                            ? `This recipe requires several ingredients you don't have available in your inventory.`
                            : availableIngredients.length === 0
                            ? 'You need to buy all ingredients for this recipe since you have no available ingredients.'
                            : 'You need to buy all ingredients for this recipe.'}
                        </p>

                        {recipe.ingredients.some((ing) => {
                          const details = getIngredientDetails(ing, availableIngredients);
                          return details?.aboutToExpire;
                        }) && (
                          <p className="text-sm text-green-700 mt-2">
                            This recipe uses available ingredients that will expire soon -
                            perfect for reducing food waste!
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FIXED: Accept Recipe Dialog with available ingredients context */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Recipe Completion</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Did you make "{recipe?.title}"? This will:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Remove {matchCount} available ingredients from your inventory</li>
                <li>Mark them as 'consumed' (they'll be hidden from the inventory UI)</li>
                <li>Update your consumption statistics</li>
                <li>Help improve future recipe recommendations</li>
              </ul>
              {matchedIngredients.some((ing) => {
                const details = getIngredientDetails(ing, availableIngredients);
                return details?.aboutToExpire;
              }) && (
                <div className="mt-3 p-2 bg-green-100 border border-green-200 rounded">
                  <p className="text-green-700 font-medium text-sm">
                    Great job! You're using available ingredients that were about to
                    expire!
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAcceptRecipe}
              className="bg-green-600 hover:bg-green-700"
              disabled={acceptRecipeMutation.isLoading}
            >
              {acceptRecipeMutation.isLoading
                ? 'Processing...'
                : 'Yes, I Made This Recipe'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RecipeDetailPage;