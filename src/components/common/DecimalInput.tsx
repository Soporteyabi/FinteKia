import React, { useState, useEffect } from 'react';
import { parseDecimal } from '../../utils/currencyUtils';

interface DecimalInputProps {
  value: number | string | undefined | null;
  onChange: (numericVal: number, rawText: string) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  step?: string | number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  title?: string;
  autoFocus?: boolean;
  prefix?: string;
  suffix?: string;
  maxDecimals?: number;
}

/**
 * Campo numérico universal optimizado para contabilidad y facturación colombiana.
 * Resuelve definitivamente el problema de navegadores donde presionar el punto decimal (.)
 * se borra en inputs de tipo "number" debido a la configuración regional de teclado (es-CO).
 * Permite digitar fluidamente con punto (.) o coma (,), preserva los decimales
 * en progreso de digitación (ej: "0.", "0.9", "0.916") y sincroniza con el modelo de datos.
 */
export const DecimalInput: React.FC<DecimalInputProps> = ({
  value,
  onChange,
  onBlur,
  min,
  max,
  placeholder = '0',
  className = '',
  disabled = false,
  required = false,
  id,
  name,
  title,
  autoFocus = false,
  prefix,
  suffix,
  maxDecimals = 4
}) => {
  // Convert initial value to string representation
  const formatInitial = (v: number | string | undefined | null): string => {
    if (v === undefined || v === null || v === '') return '';
    return String(v);
  };

  const [text, setText] = useState<string>(() => formatInitial(value));

  // Sync external changes (e.g. resets, product selection, etc.)
  useEffect(() => {
    const currentNum = parseDecimal(text);
    const incomingNum = parseDecimal(value);
    
    // Only update internal text if the incoming value meaningfully differs
    // This prevents wiping out trailing dots (like "0.") while typing
    if (value === '' || value === null || value === undefined) {
      if (text !== '') setText('');
    } else if (Math.abs(incomingNum - currentNum) > 0.000001 && text !== String(value)) {
      setText(String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Normalize comma to dot for internal standardization
    raw = raw.replace(',', '.');

    // Only allow numbers and at most one decimal point
    // Negative numbers only if min is undefined or < 0
    const allowNegative = min === undefined || min < 0;
    let filtered = '';
    let hasDot = false;

    for (let i = 0; i < raw.length; i++) {
      const char = raw[i];
      if (char >= '0' && char <= '9') {
        filtered += char;
      } else if (char === '.' && !hasDot) {
        filtered += '.';
        hasDot = true;
      } else if (char === '-' && allowNegative && i === 0) {
        filtered += '-';
      }
    }

    // Limit decimal places if specified
    if (maxDecimals !== undefined && filtered.includes('.')) {
      const [intPart, decPart] = filtered.split('.');
      if (decPart && decPart.length > maxDecimals) {
        filtered = `${intPart}.${decPart.slice(0, maxDecimals)}`;
      }
    }

    setText(filtered);

    // Calculate numeric value
    let numVal = parseDecimal(filtered);

    if (min !== undefined && !isNaN(numVal) && filtered !== '' && filtered !== '-' && filtered !== '.') {
      if (numVal < min) numVal = min;
    }
    if (max !== undefined && !isNaN(numVal) && filtered !== '' && filtered !== '-' && filtered !== '.') {
      if (numVal > max) numVal = max;
    }

    onChange(numVal, filtered);
  };

  const handleBlur = () => {
    // Clean up trailing dots on blur (e.g. "5." becomes "5")
    if (text.endsWith('.')) {
      const clean = text.slice(0, -1);
      setText(clean);
      onChange(parseDecimal(clean), clean);
    }
    if (onBlur) {
      onBlur();
    }
  };

  const inputElement = (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      autoFocus={autoFocus}
      id={id}
      name={name}
      title={title}
      placeholder={placeholder}
      value={text}
      disabled={disabled}
      required={required}
      onChange={handleChange}
      onBlur={handleBlur}
      className={prefix || suffix ? 'w-full bg-transparent outline-none' : className}
    />
  );

  if (prefix || suffix) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {prefix && <span className="opacity-60 select-none text-xs">{prefix}</span>}
        {inputElement}
        {suffix && <span className="opacity-60 select-none text-xs">{suffix}</span>}
      </div>
    );
  }

  return inputElement;
};

export default DecimalInput;
