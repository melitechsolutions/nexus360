import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  htmlFor?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standardized form field wrapper component
 * Handles consistent error display, label formatting, and helper text
 * Reduces boilerplate across all form components
 */
export function FormField({
  label,
  error,
  required = false,
  helperText,
  htmlFor,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      {children}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 mt-1">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

/**
 * Text input with built-in validation and error display
 */
export function FormTextInput({
  label,
  error,
  required = false,
  helperText,
  htmlFor,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  htmlFor?: string;
}) {
  const id = htmlFor || props.id;
  return (
    <FormField label={label} error={error} required={required} helperText={helperText} htmlFor={id} className={className}>
      <Input id={id} {...props} />
    </FormField>
  );
}

/**
 * Textarea with built-in validation and error display
 */
export function FormTextarea({
  label,
  error,
  required = false,
  helperText,
  htmlFor,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  htmlFor?: string;
}) {
  const id = htmlFor || props.id;
  return (
    <FormField label={label} error={error} required={required} helperText={helperText} htmlFor={id} className={className}>
      <Textarea id={id} {...props} />
    </FormField>
  );
}

/**
 * Select dropdown with built-in validation and error display
 */
export function FormSelect({
  label,
  error,
  required = false,
  helperText,
  htmlFor,
  value,
  onValueChange,
  placeholder,
  children,
  disabled = false,
  className = "",
}: {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  htmlFor?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <FormField label={label} error={error} required={required} helperText={helperText} htmlFor={htmlFor} className={className}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </FormField>
  );
}

/**
 * Validation error message (can be used standalone)
 */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-red-600 p-3 bg-red-50 border border-red-200 rounded">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
