// frontend/src/components/SurveyComponent.tsx
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Star, Users, TrendingUp } from 'lucide-react';
import {
  useSubmitSurveyResponse,
  useGetUserSurveyResponse,
  useGetSurveyStatistics,
} from '../api/SurveyApi';
import { useAuth0 } from '@auth0/auth0-react';

type SurveyComponentProps = {
  surveyType?: string;
  className?: string;
};

// Simple Star Rating Component
const StarRating = ({ 
  rating, 
  onRatingChange, 
  readonly = false 
}: { 
  rating: number; 
  onRatingChange?: (rating: number) => void; 
  readonly?: boolean;
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-8 w-8 cursor-pointer transition-colors ${
            star <= (hoverRating || rating)
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300'
          } ${readonly ? 'cursor-default' : 'hover:text-yellow-400'}`}
          onClick={() => !readonly && onRatingChange?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
        />
      ))}
    </div>
  );
};

const SurveyComponent = ({ 
  surveyType = 'app_satisfaction', 
  className = '' 
}: SurveyComponentProps) => {
  const { isAuthenticated } = useAuth0();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { userResponse, isLoading: userLoading, refetch: refetchUser } = 
    useGetUserSurveyResponse(surveyType);
  const { statistics, isLoading: statsLoading } = useGetSurveyStatistics(surveyType);
  const submitSurvey = useSubmitSurveyResponse();

  // Check if user has already responded
  useEffect(() => {
    if (userResponse && !userLoading) {
      if (userResponse.hasResponded) {
        setRating(userResponse.response.rating);
        setFeedback(userResponse.response.feedback || '');
        setShowForm(false);
      } else {
        setShowForm(true);
      }
    }
  }, [userResponse, userLoading]);

  const handleSubmit = async () => {
    if (rating === 0) return;

    try {
      await submitSurvey.mutateAsync({
        rating,
        feedback,
        surveyType,
      });
      
      setShowForm(false);
      refetchUser();
    } catch (error) {
      console.error('Failed to submit survey:', error);
    }
  };

  const handleEditResponse = () => {
    setShowForm(true);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (userLoading || statsLoading) {
    return (
      <Card className={`${className}`}>
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} border-blue-100 bg-blue-50`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-blue-600" />
          Rate Your Experience
        </CardTitle>
        <CardDescription>
          Help us improve WasteLess by sharing your feedback
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Show current statistics */}
        {statistics && (
          <div className="flex items-center gap-4 p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-2">
              <div className="flex">
                <StarRating rating={Math.round(statistics.averageRating)} readonly />
              </div>
              <span className="font-semibold text-lg">
                {statistics.averageRating.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{statistics.totalResponses} responses</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>{statistics.satisfactionRate}% satisfied</span>
            </div>
          </div>
        )}

        {/* User's response or form */}
        {!showForm && userResponse?.hasResponded ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Your rating:</p>
                <StarRating rating={rating} readonly />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditResponse}
              >
                Edit Response
              </Button>
            </div>
            
            {feedback && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Your feedback:</p>
                <p className="text-sm bg-white p-2 rounded border">
                  {feedback}
                </p>
              </div>
            )}
            
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Thank you for your feedback!
            </Badge>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">
                How would you rate WasteLess overall?
              </p>
              <StarRating rating={rating} onRatingChange={setRating} />
              {rating > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  {rating === 5 && "Excellent! 🌟"}
                  {rating === 4 && "Very good! 👍"}
                  {rating === 3 && "Good 👌"}
                  {rating === 2 && "Could be better 😐"}
                  {rating === 1 && "Needs improvement 👎"}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium mb-2">
                Tell us more (optional):
              </p>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What do you like most? What could we improve?"
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {feedback.length}/1000 characters
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {showForm && (
        <CardFooter>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitSurvey.isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {submitSurvey.isLoading ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default SurveyComponent;