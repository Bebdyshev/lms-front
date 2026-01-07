import { Badge } from '../ui/badge';
import { CheckCircle, Clock, AlertCircle, MinusCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  score: number | null;
  maxScore: number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, score, maxScore }) => {
  if (status === 'graded' && score !== null) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        {score}/{maxScore}
      </Badge>
    );
  }
  
  if (status === 'submitted') {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        Pending Review
      </Badge>
    );
  }
  
  if (status === 'overdue') {
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <AlertCircle className="w-3 h-3 mr-1" />
        Overdue
      </Badge>
    );
  }
  
  return (
    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
      <MinusCircle className="w-3 h-3 mr-1" />
      Not Submitted
    </Badge>
  );
};
