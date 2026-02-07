/**
 * Form Service
 * Provides reusable form handling utilities and components
 */

import React, { useState, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  Typography,
  Chip,
  Stack
} from '@mui/material';

// Form field types
export type FieldType = 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'multiselect' | 'date' | 'file';

// Form field configuration
export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  options?: { value: string; label: string; disabled?: boolean }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
  rows?: number;
  accept?: string;
}

// Form data type
export type FormData = Record<string, any>;

// Form errors type
export type FormErrors = Record<string, string>;

// Form validation result
export interface ValidationResult {
  isValid: boolean;
  errors: FormErrors;
}

// Form service hook
export const useFormService = (initialData: FormData = {}) => {
  const [data, setData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update field value
  const updateField = useCallback((name: string, value: any) => {
    setData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  // Mark field as touched
  const touchField = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  // Validate single field
  const validateField = useCallback((field: FormField, value: any): string | null => {
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${field.label} is required`;
    }

    if (!value || !field.validation) return null;

    const { min, max, pattern, custom } = field.validation;

    if (min !== undefined && value < min) {
      return `${field.label} must be at least ${min}`;
    }

    if (max !== undefined && value > max) {
      return `${field.label} must be at most ${max}`;
    }

    if (pattern && typeof value === 'string' && !pattern.test(value)) {
      return `${field.label} format is invalid`;
    }

    if (custom) {
      return custom(value);
    }

    return null;
  }, []);

  // Validate all fields
  const validateForm = useCallback((fields: FormField[]): ValidationResult => {
    const newErrors: FormErrors = {};
    let isValid = true;

    fields.forEach(field => {
      const error = validateField(field, data[field.name]);
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return { isValid, errors: newErrors };
  }, [data, validateField]);

  // Debounced validation
  const debouncedValidate = useMemo(
    () => debounce((field: FormField, value: any) => {
      const error = validateField(field, value);
      setErrors(prev => {
        if (error) {
          return { ...prev, [field.name]: error };
        } else {
          const newErrors = { ...prev };
          delete newErrors[field.name];
          return newErrors;
        }
      });
    }, 300),
    [validateField]
  );

  // Reset form
  const resetForm = useCallback(() => {
    setData(initialData);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialData]);

  // Submit form
  const submitForm = useCallback(async (
    fields: FormField[],
    onSubmit: (data: FormData) => Promise<void> | void
  ) => {
    setIsSubmitting(true);
    
    try {
      const validation = validateForm(fields);
      if (!validation.isValid) {
        // Mark all fields as touched to show errors
        const allTouched: Record<string, boolean> = {};
        fields.forEach(field => {
          allTouched[field.name] = true;
        });
        setTouched(allTouched);
        return;
      }

      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [data, validateForm]);

  return {
    data,
    errors,
    touched,
    isSubmitting,
    updateField,
    touchField,
    validateField,
    validateForm,
    debouncedValidate,
    resetForm,
    submitForm
  };
};

// Form field renderer component
interface FormFieldRendererProps {
  field: FormField;
  value: any;
  error?: string;
  touched?: boolean;
  disabled?: boolean;
  onChange: (value: any) => void;
  onBlur?: () => void;
}

export const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({
  field,
  value,
  error,
  touched = false,
  disabled = false,
  onChange,
  onBlur
}) => {
  const showError = touched && error;

  const commonProps = {
    id: field.name,
    name: field.name,
    label: field.label,
    value: value || '',
    onChange: (e: any) => onChange(e.target.value),
    onBlur,
    error: !!showError,
    disabled: disabled || field.disabled,
    required: field.required,
    placeholder: field.placeholder,
    helperText: showError ? error : field.helperText,
    fullWidth: true
  };

  switch (field.type) {
    case 'textarea':
      return (
        <TextField
          {...commonProps}
          multiline
          rows={field.rows || 3}
        />
      );

    case 'select':
      return (
        <FormControl fullWidth error={!!showError} required={field.required} disabled={disabled || field.disabled}>
          <InputLabel id={`${field.name}-label`}>{field.label}</InputLabel>
          <Select
            id={field.name}
            name={field.name}
            labelId={`${field.name}-label`}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || field.disabled}
            label={field.label}
          >
            {field.options?.map(option => (
              <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {showError && <FormHelperText>{error}</FormHelperText>}
        </FormControl>
      );

    case 'multiselect':
      return (
        <FormControl fullWidth error={!!showError} required={field.required} disabled={disabled || field.disabled}>
          <InputLabel id={`${field.name}-label`}>{field.label}</InputLabel>
          <Select
            id={field.name}
            name={field.name}
            labelId={`${field.name}-label`}
            multiple
            value={value || []}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || field.disabled}
            label={field.label}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value: string) => {
                  const option = field.options?.find(opt => opt.value === value);
                  return (
                    <Chip key={value} label={option?.label || value} size="small" />
                  );
                })}
              </Box>
            )}
          >
            {field.options?.map(option => (
              <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {showError && <FormHelperText>{error}</FormHelperText>}
        </FormControl>
      );

    case 'file':
      return (
        <TextField
          {...commonProps}
          type="file"
          InputLabelProps={{ shrink: true }}
          inputProps={{ accept: field.accept }}
        />
      );

    case 'date':
      return (
        <TextField
          {...commonProps}
          type="date"
          InputLabelProps={{ shrink: true }}
        />
      );

    case 'number':
      return (
        <TextField
          {...commonProps}
          type="number"
          inputProps={{ 
            min: field.validation?.min,
            max: field.validation?.max
          }}
        />
      );

    default:
      return (
        <TextField
          {...commonProps}
          type={field.type}
        />
      );
  }
};

// Form component
interface FormProps {
  fields: FormField[];
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void> | void;
  children?: React.ReactNode;
  className?: string;
}

export const Form: React.FC<FormProps> = ({
  fields,
  initialData = {},
  onSubmit,
  children,
  className
}) => {
  const {
    data,
    errors,
    touched,
    isSubmitting,
    updateField,
    touchField,
    submitForm
  } = useFormService(initialData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm(fields, onSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <Stack spacing={3}>
        {fields.map(field => (
          <FormFieldRenderer
            key={field.name}
            field={field}
            value={data[field.name]}
            error={errors[field.name]}
            touched={touched[field.name]}
            onChange={(value) => updateField(field.name, value)}
            onBlur={() => touchField(field.name)}
          />
        ))}
        {children}
      </Stack>
    </form>
  );
};

// Form validation utilities
export const formValidators = {
  required: (message: string = 'This field is required') => (value: any) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return message;
    }
    return null;
  },

  email: (message: string = 'Please enter a valid email address') => (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return message;
    }
    return null;
  },

  minLength: (min: number, message?: string) => (value: string) => {
    if (value && value.length < min) {
      return message || `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max: number, message?: string) => (value: string) => {
    if (value && value.length > max) {
      return message || `Must be no more than ${max} characters`;
    }
    return null;
  },

  pattern: (regex: RegExp, message: string) => (value: string) => {
    if (value && !regex.test(value)) {
      return message;
    }
    return null;
  },

  number: (message: string = 'Please enter a valid number') => (value: any) => {
    if (value && isNaN(Number(value))) {
      return message;
    }
    return null;
  },

  min: (min: number, message?: string) => (value: number) => {
    if (value !== undefined && value < min) {
      return message || `Must be at least ${min}`;
    }
    return null;
  },

  max: (max: number, message?: string) => (value: number) => {
    if (value !== undefined && value > max) {
      return message || `Must be no more than ${max}`;
    }
    return null;
  }
};

export default {
  useFormService,
  FormFieldRenderer,
  Form,
  formValidators
};