import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PHONE_COUNTRY_CODES } from "@/data/locations";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

function parsePhone(value: string): { code: string; number: string } {
  if (!value) return { code: "+254", number: "" };
  const trimmed = value.trim();
  // Try to match a known country code prefix
  for (const pc of PHONE_COUNTRY_CODES) {
    if (trimmed.startsWith(pc.code + " ") || trimmed.startsWith(pc.code)) {
      const num = trimmed.slice(pc.code.length).trim();
      return { code: pc.code, number: num };
    }
  }
  // If starts with +, try to extract code
  if (trimmed.startsWith("+")) {
    const match = trimmed.match(/^(\+\d{1,4})\s*(.*)/);
    if (match) return { code: match[1], number: match[2] };
  }
  return { code: "+254", number: trimmed };
}

export function PhoneInput({
  value,
  onChange,
  label,
  placeholder = "700 000 000",
  required,
  className,
  id,
}: PhoneInputProps) {
  const parsed = parsePhone(value);
  const [code, setCode] = useState(parsed.code);
  const [number, setNumber] = useState(parsed.number);

  useEffect(() => {
    const p = parsePhone(value);
    setCode(p.code);
    setNumber(p.number);
  }, [value]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onChange(number ? `${newCode} ${number}` : "");
  };

  const handleNumberChange = (newNumber: string) => {
    setNumber(newNumber);
    onChange(newNumber ? `${code} ${newNumber}` : "");
  };

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <div className="flex gap-2">
        <Select value={code} onValueChange={handleCodeChange}>
          <SelectTrigger className="w-[130px] shrink-0">
            <SelectValue placeholder="+254" />
          </SelectTrigger>
          <SelectContent>
            {PHONE_COUNTRY_CODES.map((pc, i) => (
              <SelectItem key={`${pc.code}-${pc.country}-${i}`} value={pc.code}>
                {pc.flag} {pc.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={id}
          value={number}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
      </div>
    </div>
  );
}
