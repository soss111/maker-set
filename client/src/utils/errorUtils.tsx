// Utility function to safely render error messages
export const renderError = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    // Handle backend error objects with {message, statusCode, path, method}
    if (error.message) {
      return error.message;
    }
    
    // Handle Axios error objects
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    // Handle other error objects
    if (error.error) {
      return error.error;
    }
    
    // Fallback to string representation
    return String(error);
  }
  
  return 'An error occurred';
};

// React component to safely render errors
export const SafeErrorDisplay: React.FC<{ error: any }> = ({ error }) => {
  return <>{renderError(error)}</>;
};
