// frontend\src\pages\HomePage.tsx
import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '../components/ui/carousel';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../components/ui/drawer';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '../components/ui/navigation-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import SurveyComponent from '../components/SurveyComponent';
import {
  ArrowRight,
  ShoppingBag,
  Check,
  Clock,
  Package,
  ScanLine,
  Info,
} from 'lucide-react';

import step1 from '../assets/step1.png';
import step2 from '../assets/step2.png';
import step3 from '../assets/step3.png';
import step4 from '../assets/step4.png';

const HomePage = () => {
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleLogin = async () => {
    await loginWithRedirect({
      appState: {
        returnTo: '/auth-callback',
      },
    });
  };

  return (
    <div className="flex flex-col gap-12 -mt-10">
      {/* Hero Section */}
      <section className="relative bg-white border-2 border-green-100 rounded-lg overflow-hidden">
        <div className="container mx-auto px-6 py-16 flex flex-col items-center gap-8 text-center">
          <Badge
            variant="outline"
            className="px-3 py-1 border-green-800 text-green-800 bg-green-50 mb-2"
          >
            Reduce food waste. Save money.
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight text-gray-800">
            Never let food go to waste again
          </h1>
          <p className="text-xl max-w-2xl text-gray-600">
            WasteLess helps you track your groceries, monitor expiration dates,
            and make the most of your ingredients.
          </p>
          <div className="flex gap-4">
            {isAuthenticated ? (
              <Button
                size="lg"
                className="bg-green-700 hover:bg-green-800 text-white"
                onClick={handleLogin}
              >
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="lg"
                className="bg-green-700 hover:bg-green-800 text-white"
                onClick={handleLogin}
              >
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              className="border-green-700 text-green-700 hover:bg-green-50"
              onClick={() => setIsDrawerOpen(true)}
            >
              How it works <Info className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="h-4 w-4 text-green-700" />
            <span>No credit card required</span>
            <Check className="h-4 w-4 ml-4 text-green-700" />
            <span>Free for personal use</span>
          </div>
        </div>
      </section>

      {/* How It Works Section with Carousel */}
      <section className="py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            How WasteLess Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Four simple steps to reduce food waste and save money on groceries
          </p>
        </div>

        <Carousel className="w-full max-w-5xl mx-auto">
          <CarouselContent>
            <CarouselItem className="md:basis-1/2 lg:basis-1/1">
              <Card className="border-2 border-green-100">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-gray-800">
                    <Badge className="mr-2 bg-green-100 text-green-800 w-6 h-6 flex items-center justify-center rounded-full p-0">
                      1
                    </Badge>
                    Scan Your Receipt
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <img
                    src={step1}
                    alt="Scan receipt"
                    className="rounded-lg w-full h-64 object-cover"
                  />
                  <p className="text-gray-600">
                    Just take a photo of your grocery receipt. Our AI identifies
                    all food items automatically.
                  </p>
                </CardContent>
              </Card>
            </CarouselItem>
            <CarouselItem className="md:basis-1/2 lg:basis-1/1">
              <Card className="border-2 border-green-100">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-gray-800">
                    <Badge className="mr-2 bg-green-100 text-green-800 w-6 h-6 flex items-center justify-center rounded-full p-0">
                      2
                    </Badge>
                    Review & Add to Inventory
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <img
                    src={step2}
                    alt="Add to inventory"
                    className="rounded-lg w-full h-64 object-cover"
                  />
                  <p className="text-gray-600">
                    Review detected items, make any adjustments, and add
                    everything to your inventory with one click.
                  </p>
                </CardContent>
              </Card>
            </CarouselItem>
            <CarouselItem className="md:basis-1/2 lg:basis-1/1">
              <Card className="border-2 border-green-100">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-gray-800">
                    <Badge className="mr-2 bg-green-100 text-green-800 w-6 h-6 flex items-center justify-center rounded-full p-0">
                      3
                    </Badge>
                    Track Expiration Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <img
                    src={step3}
                    alt="Track expiration"
                    className="rounded-lg w-full h-64 object-cover"
                  />
                  <p className="text-gray-600">
                    Get notified when ingredients are about to expire so you can
                    use them before they go bad.
                  </p>
                </CardContent>
              </Card>
            </CarouselItem>
            <CarouselItem className="md:basis-1/2 lg:basis-1/1">
              <Card className="border-2 border-green-100">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-gray-800">
                    <Badge className="mr-2 bg-green-100 text-green-800 w-6 h-6 flex items-center justify-center rounded-full p-0">
                      4
                    </Badge>
                    Manage Your Food Effectively
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <img
                    src={step4}
                    alt="Manage food"
                    className="rounded-lg w-full h-64 object-cover"
                  />
                  <p className="text-gray-600">
                    Filter by category, sort by expiration date, and keep your
                    kitchen organized effortlessly.
                  </p>
                </CardContent>
              </Card>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </section>

      {/* Features Navigation Menu */}
      <section className="py-12 bg-white border-2 border-green-100 rounded-xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Key Features</h2>
          <p className="text-gray-600 mt-2">
            Everything you need to manage your food inventory
          </p>
        </div>

        <div className="flex justify-center">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-white text-green-700 hover:bg-green-50">
                  Smart Scanning
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[400px] p-4">
                    <div className="flex items-start gap-4">
                      <ScanLine className="h-8 w-8 text-green-700 mt-1" />
                      <div>
                        <h3 className="text-lg font-medium mb-1">
                          AI-Powered Receipt Scanning
                        </h3>
                        <p className="text-sm text-gray-500">
                          Our advanced AI technology automatically extracts and
                          categorizes food items from your grocery receipts,
                          saving you time and effort.
                        </p>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-white text-green-700 hover:bg-green-50">
                  Expiry Tracking
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[400px] p-4">
                    <div className="flex items-start gap-4">
                      <Clock className="h-8 w-8 text-green-700 mt-1" />
                      <div>
                        <h3 className="text-lg font-medium mb-1">
                          Smart Expiration Management
                        </h3>
                        <p className="text-sm text-gray-500">
                          WasteLess automatically calculates expiration dates
                          based on food categories and alerts you when items are
                          about to expire.
                        </p>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-white text-green-700 hover:bg-green-50">
                  Inventory Organization
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[400px] p-4">
                    <div className="flex items-start gap-4">
                      <Package className="h-8 w-8 text-green-700 mt-1" />
                      <div>
                        <h3 className="text-lg font-medium mb-1">
                          Organized Food Inventory
                        </h3>
                        <p className="text-sm text-gray-500">
                          Sort, filter, and organize your food inventory by
                          category, expiration date, or purchase date to easily
                          find what you need.
                        </p>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-white text-green-700 hover:bg-green-50">
                  Purchase History
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[400px] p-4">
                    <div className="flex items-start gap-4">
                      <ShoppingBag className="h-8 w-8 text-green-700 mt-1" />
                      <div>
                        <h3 className="text-lg font-medium mb-1">
                          Purchase Tracking
                        </h3>
                        <p className="text-sm text-gray-500">
                          Keep track of all your grocery purchases, see spending
                          patterns, and maintain a history of what you've
                          bought.
                        </p>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800">
            What Our Users Say
          </h2>
          <p className="text-gray-600 mt-2">
            See how WasteLess is helping people reduce food waste
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="bg-white shadow-sm border-2 border-green-50 hover:border-green-100 transition-all">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src="https://i.pravatar.cc/150?img=32" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg text-gray-800">
                    Jessica D.
                  </CardTitle>
                  <CardDescription>Busy Parent</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                "I used to throw away so much food every week. With WasteLess,
                I've reduced my food waste by 70% and save about $50 weekly on
                groceries!"
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-2 border-green-50 hover:border-green-100 transition-all">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src="https://i.pravatar.cc/150?img=68" />
                  <AvatarFallback>MR</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg text-gray-800">
                    Mark R.
                  </CardTitle>
                  <CardDescription>Budget Conscious</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                "The receipt scanning feature is amazing! It saves me so much
                time, and I love how it automatically categorizes everything and
                predicts expiration dates."
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-2 border-green-50 hover:border-green-100 transition-all">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src="https://i.pravatar.cc/150?img=47" />
                  <AvatarFallback>SL</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg text-gray-800">
                    Sarah L.
                  </CardTitle>
                  <CardDescription>Environmentalist</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                "As someone who cares deeply about reducing waste, WasteLess has
                been a game-changer. Now I use everything I buy before it goes
                bad!"
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* NEW: Survey Section - Added here! */}
      <section className="py-16 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border-2 border-blue-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">
            Help Us Improve WasteLess
          </h2>
          <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
            Your feedback is invaluable to us. Take a moment to share your experience 
            and help us make WasteLess even better for everyone.
          </p>
        </div>
        
        <div className="flex justify-center">
          <SurveyComponent className="max-w-lg w-full mx-4" />
        </div>
      </section>

      {/* FAQ Section with Accordion */}
      <section className="py-12 bg-white border-2 border-green-100 rounded-xl">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 mt-2">
              Everything you need to know about WasteLess
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-gray-200">
                <AccordionTrigger className="text-gray-800">
                  How accurate is the receipt scanning?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Our receipt scanning uses advanced AI from Claude to extract
                  food items with high accuracy. For most standard grocery
                  receipts, it identifies over 95% of food items correctly. You
                  can always review and adjust items before adding them to your
                  inventory.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-gray-200">
                <AccordionTrigger className="text-gray-800">
                  Do I need to scan every receipt?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  No, scanning receipts is just one way to add items. You can
                  also manually add items one by one, which is useful for items
                  without receipts or from farmers markets.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border-gray-200">
                <AccordionTrigger className="text-gray-800">
                  How does WasteLess determine expiration dates?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  WasteLess assigns default expiration periods based on food
                  categories: vegetables and fruits (7 days), dairy (14 days),
                  meat (5 days), frozen (90 days), bakery (5 days), and dry
                  goods (no expiration). These are general guidelines, and you
                  can always adjust them.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border-gray-200">
                <AccordionTrigger className="text-gray-800">
                  Is WasteLess free to use?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Yes, WasteLess is free for personal use. We have premium
                  features planned for the future, but our core functionality
                  will always remain free.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border-gray-200">
                <AccordionTrigger className="text-gray-800">
                  Is my data secure?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Absolutely. We use industry-standard security practices to
                  protect your data. Your receipts and inventory information are
                  encrypted and never shared with third parties.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-green-50 rounded-xl text-center border-2 border-green-100">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold mb-4 text-gray-800">
            Ready to reduce food waste?
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto text-gray-600">
            Join thousands of users who are saving money and helping the
            environment by reducing food waste.
          </p>
          <Button
            size="lg"
            className="bg-green-700 hover:bg-green-800 text-white"
            onClick={handleLogin}
          >
            Get Started for Free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Drawer for How It Works */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-4xl">
            <DrawerHeader>
              <DrawerTitle className="text-gray-800">
                How WasteLess Works
              </DrawerTitle>
              <DrawerDescription className="text-gray-600">
                A step-by-step guide to using WasteLess to reduce food waste
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-6 space-y-6">
              <div className="flex gap-4 items-start">
                <div className="bg-green-50 rounded-full p-2 border border-green-100">
                  <ScanLine className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-800">
                    Step 1: Scan Your Receipt
                  </h3>
                  <p className="text-gray-600">
                    After shopping, take a photo of your grocery receipt. Our AI
                    will automatically identify and categorize all food items.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="bg-green-50 rounded-full p-2 border border-green-100">
                  <ShoppingBag className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-800">
                    Step 2: Review Your Purchase
                  </h3>
                  <p className="text-gray-600">
                    Review the items detected from your receipt. You can adjust
                    quantities, categories, or add additional information.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="bg-green-50 rounded-full p-2 border border-green-100">
                  <Package className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-800">
                    Step 3: Add to Inventory
                  </h3>
                  <p className="text-gray-600">
                    With one click, add all items to your inventory. WasteLess
                    automatically assigns expiration dates based on food
                    categories.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="bg-green-50 rounded-full p-2 border border-green-100">
                  <Clock className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-800">
                    Step 4: Track Expiration Dates
                  </h3>
                  <p className="text-gray-600">
                    WasteLess alerts you when items are about to expire, helping
                    you use them before they go bad. You'll see notifications
                    for items expiring within the next 3 days.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="bg-green-50 rounded-full p-2 border border-green-100">
                  <Check className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-800">
                    Step 5: Reduce Food Waste
                  </h3>
                  <p className="text-gray-600">
                    By knowing what you have and when it expires, you can make
                    smarter meal decisions, reduce food waste, and save money on
                    groceries.
                  </p>
                </div>
              </div>
            </div>
            <DrawerFooter>
              <Button
                onClick={() => setIsDrawerOpen(false)}
                className="bg-green-700 hover:bg-green-800 text-white"
              >
                Got it
              </Button>
              <DrawerClose asChild>
                <Button
                  variant="outline"
                  className="text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  Close
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default HomePage;