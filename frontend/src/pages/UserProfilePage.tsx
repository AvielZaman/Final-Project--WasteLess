// frontend/src/pages/UserProfilePage.tsx
import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useGetInventoryStatistics } from '../api/InventoryStatisticsApi';
import { useGetInventoryStats } from '../api/InventoryApi';
import { useGetMyUser, useDeleteMyUser } from '../api/MyUserApi';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Progress } from '../components/ui/progress';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  User,
  Trophy,
  TrendingDown,
  ChefHat,
  Package,
  Trash2,
  Target,
  Award,
  Mail,
  Shield,
} from 'lucide-react';

const PrivacyPolicyDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Privacy Policy</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            WasteLess Privacy Policy
          </DialogTitle>
          <DialogDescription>
            Last updated: {new Date().toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 w-full rounded-md border p-4">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-base mb-2">1. Information We Collect</h3>
              <p className="text-gray-600 mb-2">
                WasteLess collects information you provide directly to us, such as when you create an account, 
                add ingredients to your inventory, upload receipts, or use our recipe recommendations.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                <li>Account information (email, name)</li>
                <li>Food inventory data (ingredients, quantities, expiry dates)</li>
                <li>Receipt images and extracted data</li>
                <li>Recipe usage and preferences</li>
                <li>Application usage statistics</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">2. How We Use Your Information</h3>
              <p className="text-gray-600 mb-2">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                <li>Provide and improve our food waste reduction services</li>
                <li>Generate personalized recipe recommendations</li>
                <li>Track your food waste reduction progress</li>
                <li>Process and analyze receipt data</li>
                <li>Send notifications about expiring ingredients</li>
                <li>Provide customer support</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">3. Information Sharing</h3>
              <p className="text-gray-600 mb-2">
                We do not sell, trade, or rent your personal information to third parties. We may share 
                your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
                <li>With service providers who assist in our operations</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">4. Data Security</h3>
              <p className="text-gray-600">
                We implement appropriate technical and organizational measures to protect your personal 
                information against unauthorized access, alteration, disclosure, or destruction. All data 
                is encrypted in transit and at rest.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">5. Data Retention</h3>
              <p className="text-gray-600">
                We retain your information for as long as necessary to provide our services and fulfill 
                the purposes outlined in this policy, unless a longer retention period is required by law.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">6. Your Rights</h3>
              <p className="text-gray-600 mb-2">You have the right to:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and associated data</li>
                <li>Withdraw consent for data processing</li>
                <li>Data portability</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">7. Contact Us</h3>
              <p className="text-gray-600">
                If you have any questions about this privacy policy or our data practices, please contact 
                us through the application or at our support channels.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

const UserProfilePage = () => {
  const { user, isAuthenticated } = useAuth0();
  const { currentUser, isLoading: isLoadingUser } = useGetMyUser();
  const { statistics, refetch: refetchStatistics } = useGetInventoryStatistics('alltime');
  const { stats } = useGetInventoryStats();
  const { deleteUser, isLoading: isDeleting } = useDeleteMyUser();

  // Calculate achievements
  const achievements = [
    {
      id: 'waste_master',
      name: 'Waste Master',
      description: 'Achieve less than 20% food waste',
      icon: '🏆',
      unlocked: (statistics?.summaryStats.wastePercentage || 100) < 20,
      progress: Math.max(0, 100 - (statistics?.summaryStats.wastePercentage || 100)),
      target: 80,
    },
    {
      id: 'recipe_chef',
      name: 'Recipe Chef',
      description: 'Use 10+ recipes',
      icon: '👨‍🍳',
      unlocked: (statistics?.summaryStats.recipesUsed || 0) >= 10,
      progress: statistics?.summaryStats.recipesUsed || 0,
      target: 10,
    },
    {
      id: 'expiry_expert',
      name: 'Expiry Expert',
      description: 'Use 80%+ of items before expiry',
      icon: '⏰',
      unlocked: (statistics?.summaryStats.itemsUsedBeforeExpiry || 0) >= 
        (statistics?.summaryStats.consumedItems || 1) * 0.8,
      progress: Math.round(
        ((statistics?.summaryStats.itemsUsedBeforeExpiry || 0) / 
        Math.max(1, statistics?.summaryStats.consumedItems || 1)) * 100
      ),
      target: 80,
    },
    {
      id: 'inventory_tracker',
      name: 'Inventory Tracker',
      description: 'Track 50+ items',
      icon: '📦',
      unlocked: (statistics?.summaryStats.totalItems || 0) >= 50,
      progress: statistics?.summaryStats.totalItems || 0,
      target: 50,
    },
  ];

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const totalAchievements = achievements.length;

  const handleDeleteAccount = async () => {
    try {
      await deleteUser();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  // Refresh statistics when component mounts or when user changes
  useEffect(() => {
    if (currentUser) {
      refetchStatistics();
    }
  }, [currentUser, refetchStatistics]);

  if (!isAuthenticated || isLoadingUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          {isLoadingUser ? (
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          ) : (
            <p className="text-lg">Please log in to view your profile.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header Section */}
      <div className="mb-8">
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <User className="h-10 w-10 text-green-700" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  {currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
                </h1>
                <div className="flex items-center gap-4 text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{currentUser?.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Total Items Tracked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {statistics?.summaryStats.totalItems || 0}
                </div>
                <p className="text-sm text-gray-500">items in your inventory</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Waste Reduction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {100 - (statistics?.summaryStats.wastePercentage || 0)}%
                </div>
                <p className="text-sm text-gray-500">efficiency rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <ChefHat className="h-4 w-4" />
                  Recipes Made
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {statistics?.summaryStats.recipesUsed || 0}
                </div>
                <p className="text-sm text-gray-500">total recipes completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Achievement Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {Math.round((unlockedAchievements.length / totalAchievements) * 100)}%
                </div>
                <p className="text-sm text-gray-500">completion rate</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Food Waste Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Food Waste Performance</CardTitle>
                <CardDescription>Your efficiency in reducing food waste</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Waste Reduction Rate</span>
                    <span className="text-sm text-gray-500">
                      {100 - (statistics?.summaryStats.wastePercentage || 0)}%
                    </span>
                  </div>
                  <Progress value={100 - (statistics?.summaryStats.wastePercentage || 0)} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Items Used Before Expiry</span>
                    <span className="text-sm text-gray-500">
                      {Math.round(
                        ((statistics?.summaryStats.itemsUsedBeforeExpiry || 0) / 
                        Math.max(1, statistics?.summaryStats.consumedItems || 1)) * 100
                      )}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.round(
                      ((statistics?.summaryStats.itemsUsedBeforeExpiry || 0) / 
                      Math.max(1, statistics?.summaryStats.consumedItems || 1)) * 100
                    )} 
                    className="h-2" 
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Food Utilization Rate</span>
                    <span className="text-sm text-gray-500">
                      {statistics?.summaryStats.foodUtilizationRate || 0}%
                    </span>
                  </div>
                  <Progress value={statistics?.summaryStats.foodUtilizationRate || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Current Inventory Status */}
            <Card>
              <CardHeader>
                <CardTitle>Current Inventory Status</CardTitle>
                <CardDescription>Overview of your current food inventory</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {stats?.totalItems || 0}
                    </div>
                    <p className="text-sm text-green-700">Total Items</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {stats?.expiringItems || 0}
                    </div>
                    <p className="text-sm text-yellow-700">Expiring Soon</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {stats?.expiredItems || 0}
                    </div>
                    <p className="text-sm text-red-700">Expired</p>
                  </div>
                </div>

                {/* Delete Account Section */}
                <Separator />
                
                <div className="pt-4">
                  <h3 className="text-lg font-medium mb-4 text-red-600">Danger Zone</h3>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account
                          and remove all your data from our servers, including:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>All inventory data</li>
                            <li>Purchase history</li>
                            <li>Recipe usage data</li>
                            <li>Survey responses</li>
                            <li>Profile information</li>
                          </ul>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          disabled={isDeleting}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Your Achievements
              </CardTitle>
              <CardDescription>
                Track your progress and unlock new badges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement) => (
                  <Card key={achievement.id} className={
                    achievement.unlocked 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <h3 className="font-semibold flex items-center gap-2">
                            {achievement.name}
                            {achievement.unlocked && (
                              <Badge className="bg-green-600">Unlocked!</Badge>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">
                            {achievement.description}
                          </p>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{achievement.progress}/{achievement.target}</span>
                            </div>
                            <Progress 
                              value={(achievement.progress / achievement.target) * 100} 
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Achievement Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Achievement Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Award className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    {unlockedAchievements.length}
                  </div>
                  <p className="text-sm text-green-700">Achievements Unlocked</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">
                    {totalAchievements - unlockedAchievements.length}
                  </div>
                  <p className="text-sm text-blue-700">Achievements Remaining</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Trophy className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((unlockedAchievements.length / totalAchievements) * 100)}%
                  </div>
                  <p className="text-sm text-purple-700">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-green-800">Data Privacy</p>
                  <p className="text-sm text-green-600">
                    Your data is encrypted and never shared with third parties
                  </p>
                </div>
                <Shield className="h-6 w-6 text-green-600" />
              </div>

              <div className="flex gap-4">
                <PrivacyPolicyDialog />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserProfilePage;