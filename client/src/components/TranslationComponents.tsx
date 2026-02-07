/**
 * Translation Component
 * 
 * Reusable component for AI translation functionality
 * Provides consistent UI and behavior across all pages
 */

import React from 'react';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Typography,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent
} from '@mui/material';
import {
  Translate as TranslateIcon,
  AutoAwesome as AutoAwesomeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useTranslation, TranslationRequest } from '../services/translationService';

interface TranslationButtonProps {
  text: string | null | undefined;
  targetLanguage: string;
  context?: 'tool' | 'part' | 'set' | 'safety' | 'general';
  onTranslationComplete: (translatedText: string) => void;
  disabled?: boolean;
  variant?: 'button' | 'icon' | 'chip';
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
}

export const TranslationButton: React.FC<TranslationButtonProps> = ({
  text,
  targetLanguage,
  context = 'general',
  onTranslationComplete,
  disabled = false,
  variant = 'icon',
  size = 'small',
  showProgress = false
}) => {
  const { translateText, isTranslating, translationError, successMessage, clearMessages } = useTranslation();

  // Helper function to safely get text value
  const getTextValue = (): string => {
    if (text === null || text === undefined) return '';
    if (typeof text === 'string') return text;
    return String(text);
  };

  const textValue = getTextValue();

  const handleTranslate = async () => {
    if (!textValue.trim()) return;

    try {
      const result = await translateText({
        text: textValue,
        targetLanguage,
        context
      });

      if (result.success) {
        onTranslationComplete(result.translatedText);
      }
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };

  const renderButton = () => {
    const buttonProps = {
      onClick: handleTranslate,
      disabled: disabled || isTranslating || !textValue.trim(),
      size: size === 'large' ? 'medium' : size
    };

    switch (variant) {
      case 'button':
        return (
          <Button
            {...buttonProps}
            startIcon={isTranslating ? <CircularProgress size={16} /> : <TranslateIcon />}
            variant="outlined"
            color="primary"
          >
            {isTranslating ? 'Translating...' : `Translate to ${targetLanguage.toUpperCase()}`}
          </Button>
        );

      case 'chip':
        return (
          <Chip
            {...buttonProps}
            icon={isTranslating ? <CircularProgress size={16} /> : <TranslateIcon />}
            label={isTranslating ? 'Translating...' : `Translate to ${targetLanguage.toUpperCase()}`}
            variant="outlined"
            color="primary"
            clickable
          />
        );

      case 'icon':
      default:
        const iconButton = (
          <IconButton {...buttonProps} color="primary">
            {isTranslating ? <CircularProgress size={20} /> : <TranslateIcon />}
          </IconButton>
        );

        // Wrap disabled button in span to fix Tooltip warning
        if (buttonProps.disabled) {
          return (
            <Tooltip title={`Translate to ${targetLanguage.toUpperCase()}`}>
              <span>{iconButton}</span>
            </Tooltip>
          );
        }

        return (
          <Tooltip title={`Translate to ${targetLanguage.toUpperCase()}`}>
            {iconButton}
          </Tooltip>
        );
    }
  };

  return (
    <>
      {renderButton()}
      
      {showProgress && isTranslating && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary">
            Translating to {targetLanguage.toUpperCase()}...
          </Typography>
        </Box>
      )}

      <Snackbar
        open={!!translationError}
        autoHideDuration={6000}
        onClose={clearMessages}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={clearMessages}>
          {translationError}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={clearMessages}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={clearMessages}>
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

interface BatchTranslationProps {
  texts: (string | null | undefined)[];
  targetLanguages: string[];
  context?: 'tool' | 'part' | 'set' | 'safety' | 'general';
  onTranslationComplete: (translations: Record<string, Record<string, string>>) => void;
  disabled?: boolean;
  showProgress?: boolean;
  progressText?: string;
}

export const BatchTranslationButton: React.FC<BatchTranslationProps> = ({
  texts,
  targetLanguages,
  context = 'general',
  onTranslationComplete,
  disabled = false,
  showProgress = false,
  progressText
}) => {
  const { translateFormFields, isTranslating, translationError, successMessage, clearMessages } = useTranslation();

  // Helper function to safely get text value
  const getTextValue = (text: string | null | undefined): string => {
    if (text === null || text === undefined) return '';
    if (typeof text === 'string') return text;
    return String(text);
  };

  const handleBatchTranslate = async () => {
    const safeTexts = texts.map(getTextValue);
    
    if (!safeTexts.some(text => text.trim())) return;

    try {
      // Convert texts array to object format
      const englishData: Record<string, string> = {};
      safeTexts.forEach((text, index) => {
        if (text.trim()) {
          englishData[`field_${index}`] = text;
        }
      });

      const translations = await translateFormFields(
        englishData,
        targetLanguages,
        context
      );
      
      console.log(`🔍 translateFormFields returned:`, { 
        englishData, 
        targetLanguages, 
        translations 
      });

      // Convert back to expected format
      const result: Record<string, Record<string, string>> = {};
      targetLanguages.forEach(lang => {
        result[lang] = {};
        safeTexts.forEach((text, index) => {
          if (text.trim()) {
            // Use the actual translated text from the API response
            const fieldKey = `field_${index}`;
            const translatedText = translations[lang]?.[fieldKey] || text;
            result[lang][fieldKey] = translatedText;
            console.log(`🔍 Batch translation result:`, { 
              language: lang, 
              field: fieldKey, 
              original: text, 
              translated: translatedText 
            });
          }
        });
      });

      onTranslationComplete(result);
    } catch (error) {
      console.error('Batch translation failed:', error);
    }
  };

  return (
    <>
      <Button
        onClick={handleBatchTranslate}
        disabled={disabled || isTranslating || !texts.map(getTextValue).some(text => text.trim())}
        startIcon={isTranslating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
        variant="contained"
        color="primary"
        size="large"
      >
        {isTranslating ? 'Translating All...' : 'AI Translate All'}
      </Button>

      {showProgress && isTranslating && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {progressText || `Translating ${texts.length} texts to ${targetLanguages.length} languages...`}
          </Typography>
        </Box>
      )}

      <Snackbar
        open={!!translationError}
        autoHideDuration={6000}
        onClose={clearMessages}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={clearMessages}>
          {translationError}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={clearMessages}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={clearMessages}>
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

interface TranslationStatusProps {
  isTranslating: boolean;
  error?: string | null;
  success?: string | null;
  onClearMessages?: () => void;
}

export const TranslationStatus: React.FC<TranslationStatusProps> = ({
  isTranslating,
  error,
  success,
  onClearMessages
}) => {
  if (!isTranslating && !error && !success) return null;

  return (
    <Box sx={{ mt: 2 }}>
      {isTranslating && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            🌐 Using External Translation Service...
          </Typography>
        </Box>
      )}

      {error && (
        <Alert 
          severity="error" 
          onClose={onClearMessages}
          sx={{ mt: 1 }}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert 
          severity="success" 
          onClose={onClearMessages}
          sx={{ mt: 1 }}
        >
          ✅ {success}
        </Alert>
      )}
    </Box>
  );
};

interface DetailedProgressIndicatorProps {
  isTranslating: boolean;
  currentStep: number;
  totalSteps: number;
  currentText?: string;
  currentLanguage?: string;
  texts: (string | null | undefined)[];
  targetLanguages: string[];
}

export const DetailedProgressIndicator: React.FC<DetailedProgressIndicatorProps> = ({
  isTranslating,
  currentStep,
  totalSteps,
  currentText,
  currentLanguage,
  texts,
  targetLanguages
}) => {
  if (!isTranslating) return null;

  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
  const safeTexts = texts.filter(text => text && text.trim());
  const totalTranslations = safeTexts.length * targetLanguages.length;

  const steps = [
    'Preparing translation...',
    'Connecting to translation service...',
    'Processing translations...',
    'Finalizing results...'
  ];

  return (
    <Card sx={{ mt: 2, mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography variant="h6" color="primary">
            AI Translation in Progress
          </Typography>
        </Box>

        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Progress: {currentStep} of {totalSteps}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(progress)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {currentText && currentLanguage && (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              Currently translating:
            </Typography>
            <Typography variant="body1" sx={{ fontStyle: 'italic', mt: 0.5 }}>
              "{currentText}" → {currentLanguage.toUpperCase()}
            </Typography>
          </Box>
        )}

        <Stepper activeStep={Math.min(currentStep, steps.length - 1)} orientation="horizontal">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box mt={2}>
          <Typography variant="caption" color="text.secondary">
            Translating {safeTexts.length} texts to {targetLanguages.length} languages 
            ({totalTranslations} total translations)
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

// Export all components
export default {
  TranslationButton,
  BatchTranslationButton,
  TranslationStatus,
  DetailedProgressIndicator
};
