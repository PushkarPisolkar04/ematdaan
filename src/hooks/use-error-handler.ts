import { useToast } from './use-toast';

interface ErrorResponse {
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  'auth/unauthorized': 'Please login to continue.',
  'auth/forbidden': 'You do not have permission to perform this action.',
  'validation/invalid': 'Please check your input and try again.',
  'election/not-found': 'The requested election could not be found.',
  'election/ended': 'This election has already ended.',
  'vote/already-cast': 'You have already cast your vote in this election.',
  'vote/invalid': 'Your vote could not be processed. Please try again.',
  'metamask/not-installed': 'Please install MetaMask to use this application.',
  'metamask/wrong-network': 'Please switch to the correct network in MetaMask.',
  'metamask/rejected': 'You rejected the MetaMask connection request.',
  'otp/invalid': 'The OTP you entered is invalid. Please try again.',
  'otp/expired': 'The OTP has expired. Please request a new one.',
  'network/error': 'Network error. Please check your connection and try again.',
  'server/error': 'Server error. Please try again later.',
  'default': 'An unexpected error occurred. Please try again.'
};

export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = (error: unknown) => {
    console.error('Error:', error);

    let title = 'Error';
    let description = ERROR_MESSAGES.default;

    if (error instanceof Error) {
      const errorResponse = error as ErrorResponse;
      
      if (errorResponse.error?.code) {
        description = ERROR_MESSAGES[errorResponse.error.code] || errorResponse.error.message;
      } else if (errorResponse.message) {
        description = errorResponse.message;
      }

      // Special handling for MetaMask errors
      if (error.message.includes('MetaMask')) {
        if (error.message.includes('User rejected')) {
          description = ERROR_MESSAGES['metamask/rejected'];
        } else if (error.message.includes('not installed')) {
          description = ERROR_MESSAGES['metamask/not-installed'];
        } else if (error.message.includes('network')) {
          description = ERROR_MESSAGES['metamask/wrong-network'];
        }
      }

      // Network errors
      if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
        description = ERROR_MESSAGES['network/error'];
      }
    }

    toast({
      title,
      description,
      variant: 'destructive',
      duration: 5000,
    });

    // Return the error message for optional chaining
    return description;
  };

  return handleError;
}; 