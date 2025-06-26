// frontend/src/pages/InventoryStatisticsPage.tsx
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { ArrowLeft, RefreshCw, Calendar, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGetInventoryStatistics, useGetAdditionalMetrics } from '../api/InventoryStatisticsApi';

const COLORS = [
  '#32936F', // Dark green
  '#26A96C', // Medium green
  '#2BC016', // Light green
  '#83E377', // Pale green
  '#16DB93', // Teal green
  '#9EF01A', // Yellow-green
  '#FFBF00', // Amber
];

const InventoryStatisticsPage = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('6months');

  // Use the real API hooks
  const { statistics, isLoading, refetch } = useGetInventoryStatistics(timeRange);
  const { additionalMetrics, isLoading: isLoadingAdditional } = useGetAdditionalMetrics(timeRange);

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
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
      case 'dry':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading || isLoadingAdditional) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <p>No statistics data available. Please try again later.</p>
        </div>
      </div>
    );
  }

  // Calculate total wasted/consumed for pie chart
  const pieChartData = statistics.categoryStats
    .filter(cat => cat.wastedCount > 0) // Only show categories with waste
    .map((cat) => ({
      name: cat._id.charAt(0).toUpperCase() + cat._id.slice(1),
      value: cat.wastedCount,
      color: COLORS[statistics.categoryStats.indexOf(cat) % COLORS.length],
    }));

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
          <h1 className="text-3xl font-bold">Inventory Statistics</h1>
        </div>

        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
              <SelectItem value="alltime">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => refetch()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Inventory Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statistics.summaryStats.totalItems}
            </div>
            <p className="text-sm text-gray-500">items tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Waste Percentage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statistics.summaryStats.wastePercentage}%
            </div>
            <div className="flex items-center text-sm text-green-600">
              {statistics.summaryStats.improvementFromLastMonth > 0 && (
                <span className="inline-block">
                  ↓ {statistics.summaryStats.improvementFromLastMonth}% from
                  last month
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Most Wasted Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                className={getCategoryColor(
                  statistics.summaryStats.mostWastedCategory
                )}
              >
                {statistics.summaryStats.mostWastedCategory
                  .charAt(0)
                  .toUpperCase() +
                  statistics.summaryStats.mostWastedCategory.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Consider buying less of these items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Most Consumed Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                className={getCategoryColor(
                  statistics.summaryStats.mostUsedCategory
                )}
              >
                {statistics.summaryStats.mostUsedCategory
                  .charAt(0)
                  .toUpperCase() +
                  statistics.summaryStats.mostUsedCategory.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-2">Your favorite foods</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Items Used Before Expiry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800">
              {statistics.summaryStats.itemsUsedBeforeExpiry || 0}
            </div>
            <p className="text-sm text-green-600">
              out of {statistics.summaryStats.consumedItems || 0} consumed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Food Utilization Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-800">
              {statistics.summaryStats.foodUtilizationRate || 0}%
            </div>
            <p className="text-sm text-blue-600">
              of food purchased is consumed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Recipes Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-800">
              {statistics.summaryStats.recipesUsed || 0}
            </div>
            <p className="text-sm text-purple-600">
              {statistics.summaryStats.recommendedRecipesUsed || 0} from recommendations
            </p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">
              Waste Reduction (6mo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-800">
              {statistics.summaryStats.wasteReductionSixMonths || 0}%
            </div>
            <p className="text-sm text-orange-600">
              improvement in waste reduction
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="waste" className="space-y-4">
        <TabsList>
          <TabsTrigger value="waste">Waste Analysis</TabsTrigger>
          <TabsTrigger value="usage">Usage Patterns</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="metrics">Food Waste Metrics</TabsTrigger>
        </TabsList>

        {/* Waste Analysis Tab */}
        <TabsContent value="waste" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Waste Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Wasted Items by Category</CardTitle>
                <CardDescription>
                  See which food categories are wasted most frequently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {pieChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <p className="text-lg mb-2">🎉 No Food Waste!</p>
                        <p className="text-sm">You haven't wasted any food in this time period.</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Most Wasted Ingredients */}
            <Card>
              <CardHeader>
                <CardTitle>Most Frequently Wasted Ingredients</CardTitle>
                <CardDescription>
                  These ingredients frequently expire or get wasted
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statistics.mostWastedIngredients.length > 0 ? (
                    statistics.mostWastedIngredients.map((ingredient, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{ingredient.name}</span>
                            <Badge className={getCategoryColor(ingredient.category)}>
                              {ingredient.category}
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-500">
                            {ingredient.wastedCount} wasted
                          </span>
                        </div>
                        <Progress
                          value={ingredient.wastePercentage}
                          className="h-2 bg-gray-200 [--progress-fill:theme(colors.red.500)]"
                        />
                        <p className="text-xs text-gray-500">
                          {Math.round(ingredient.wastePercentage || 0)}% waste rate
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-lg mb-2">🎉 Excellent!</p>
                      <p>No wasted ingredients found in this time period</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usage Patterns Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Consumption vs Waste by Category</CardTitle>
                <CardDescription>
                  How well you use items in each category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statistics.categoryStats}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="_id" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="usedCount"
                        name="Consumed"
                        stackId="a"
                        fill="#32936F"
                      />
                      <Bar
                        dataKey="wastedCount"
                        name="Wasted"
                        stackId="a"
                        fill="#F87171"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Most Consumed Ingredients */}
            <Card>
              <CardHeader>
                <CardTitle>Most Consumed Ingredients</CardTitle>
                <CardDescription>
                  These are your most frequently used ingredients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statistics.mostUsedIngredients.length > 0 ? (
                    statistics.mostUsedIngredients.map((ingredient, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{ingredient.name}</span>
                            <Badge className={getCategoryColor(ingredient.category)}>
                              {ingredient.category}
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-500">
                            {ingredient.consumedCount || ingredient.usedCount || 0} consumed
                          </span>
                        </div>
                        <Progress
                          value={ingredient.consumedPercentage || ingredient.usagePercentage || 0}
                          className="h-2"
                        />
                        <p className="text-xs text-gray-500">
                          {Math.round(ingredient.consumedPercentage || ingredient.usagePercentage || 0)}% consumption rate
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <p>No consumed ingredients found in this time period</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Waste Trend</CardTitle>
              <CardDescription>
                Track your waste reduction progress over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={statistics.monthlyTrends}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="wastePercentage"
                      name="Waste %"
                      stroke="#F87171"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items Added vs Wasted Over Time</CardTitle>
              <CardDescription>
                Compare your inventory additions with waste
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statistics.monthlyTrends}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" orientation="left" stroke="#32936F" />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#F87171"
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="totalItems"
                      name="Total Items"
                      fill="#32936F"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="wastedItems"
                      name="Wasted Items"
                      fill="#F87171"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <p className="text-center text-sm text-gray-600">
                  {statistics.summaryStats.improvementFromLastMonth > 0 ? (
                    <>
                      Your food waste has decreased by{' '}
                      {statistics.summaryStats.improvementFromLastMonth}% in the
                      last month. Keep up the good work!
                    </>
                  ) : (
                    'Track your progress over time to reduce food waste'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Food Waste Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Food Waste Reduction Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Food Waste Reduction Performance</CardTitle>
                <CardDescription>
                  Track how effectively you're using food before it expires
                </CardDescription>
              </CardHeader>
              <CardContent>
                {additionalMetrics ? (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {additionalMetrics.wasteReductionMetrics?.percentageUsedBeforeExpiry ?? 0}%
                      </div>
                      <p className="text-gray-600">
                        of consumed items were used before their expiry date
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-700">
                          {additionalMetrics.wasteReductionMetrics?.itemsUsedBeforeExpiry ?? 0}
                        </div>
                        <p className="text-sm text-green-600">Used before expiry</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-700">
                          {additionalMetrics.wasteReductionMetrics?.totalItemsUsed ?? 0}
                        </div>
                        <p className="text-sm text-blue-600">Total items consumed</p>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="font-medium text-yellow-800 mb-2">💡 Goal: 80% Usage Before Expiry</h4>
                      <div className="w-full bg-yellow-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-600 h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(100, ((additionalMetrics.wasteReductionMetrics?.percentageUsedBeforeExpiry ?? 0) / 80) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      <p className="text-sm text-yellow-700 mt-2">
                        You're {(additionalMetrics.wasteReductionMetrics?.percentageUsedBeforeExpiry ?? 0) >= 80 ? 'exceeding' : 'progressing towards'} the target!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Loading metrics...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recipe Engagement Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Recipe Engagement</CardTitle>
                <CardDescription>
                  How often you use recipe recommendations to reduce waste
                </CardDescription>
              </CardHeader>
              <CardContent>
                {additionalMetrics ? (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-purple-600 mb-2">
                        {additionalMetrics.engagementMetrics?.recipeSuggestionsUsed ?? 0}
                      </div>
                      <p className="text-gray-600">
                        recipe recommendations used in this period
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-700">
                          {additionalMetrics.engagementMetrics?.recipeSuggestionsUsed ?? 0}
                        </div>
                        <p className="text-sm text-purple-600">From suggestions</p>
                      </div>
                      <div className="p-4 bg-indigo-50 rounded-lg">
                        <div className="text-2xl font-bold text-indigo-700">
                          {additionalMetrics.engagementMetrics?.totalRecipesUsed ?? 0}
                        </div>
                        <p className="text-sm text-indigo-600">Total recipes used</p>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-800 mb-2">
                        🎯 Using recipe suggestions helps reduce food waste!
                      </h4>
                      <p className="text-sm text-green-700">
                        {(additionalMetrics.engagementMetrics?.recipeSuggestionsUsed ?? 0) > 0
                          ? "Great job using our recipe recommendations! This helps you consume ingredients before they expire."
                          : "Try using our recipe recommendations to make the most of your expiring ingredients."
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Loading engagement metrics...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Achievement Badges */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardHeader>
              <CardTitle>🏆 Food Waste Reduction Achievements</CardTitle>
              <CardDescription>
                Unlock badges based on your food waste reduction performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg border-2 text-center ${
                  (statistics.summaryStats.foodUtilizationRate ?? 0) >= 70 
                    ? 'bg-green-100 border-green-300' 
                    : 'bg-gray-100 border-gray-300'
                }`}>
                  <div className="text-3xl mb-2">🌟</div>
                  <h4 className="font-medium">Food Utilization Master</h4>
                  <p className="text-sm text-gray-600">70%+ utilization rate</p>
                  {(statistics.summaryStats.foodUtilizationRate ?? 0) >= 70 && (
                    <Badge className="mt-2 bg-green-600">Unlocked!</Badge>
                  )}
                </div>

                <div className={`p-4 rounded-lg border-2 text-center ${
                  (additionalMetrics?.wasteReductionMetrics?.percentageUsedBeforeExpiry ?? 0) >= 80
                    ? 'bg-yellow-100 border-yellow-300' 
                    : 'bg-gray-100 border-gray-300'
                }`}>
                  <div className="text-3xl mb-2">⏰</div>
                  <h4 className="font-medium">Expiry Expert</h4>
                  <p className="text-sm text-gray-600">80%+ used before expiry</p>
                  {(additionalMetrics?.wasteReductionMetrics?.percentageUsedBeforeExpiry ?? 0) >= 80 && (
                    <Badge className="mt-2 bg-yellow-600">Unlocked!</Badge>
                  )}
                </div>

                <div className={`p-4 rounded-lg border-2 text-center ${
                  (additionalMetrics?.engagementMetrics?.recipeSuggestionsUsed ?? 0) >= 5
                    ? 'bg-purple-100 border-purple-300' 
                    : 'bg-gray-100 border-gray-300'
                }`}>
                  <div className="text-3xl mb-2">👨‍🍳</div>
                  <h4 className="font-medium">Recipe Champion</h4>
                  <p className="text-sm text-gray-600">5+ recipe suggestions used</p>
                  {(additionalMetrics?.engagementMetrics?.recipeSuggestionsUsed ?? 0) >= 5 && (
                    <Badge className="mt-2 bg-purple-600">Unlocked!</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Smart Recommendations */}
      <Card className="mt-8 bg-blue-50 border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-600" />
            Smart Recommendations
          </CardTitle>
          <CardDescription>
            Personalized suggestions based on your real usage patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statistics.smartRecommendations && statistics.smartRecommendations.length > 0 ? (
            <ul className="space-y-3">
              {statistics.smartRecommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <span className="text-gray-700">{recommendation}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Start tracking your food inventory to get personalized recommendations.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Use the recipe recommendation feature to make the most of your ingredients.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Check your inventory regularly to see what's expiring soon.</span>
              </li>
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryStatisticsPage;