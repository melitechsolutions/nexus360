/**
 * Location Select Components
 * Provides scrollable dropdown selects for Country, County, and City/Town
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import {
  COUNTRIES,
  KENYAN_COUNTIES_NAMES,
  KENYAN_CITIES,
  getCitiesByCounty,
  INDUSTRIES,
} from "@/data/locations";
import { useEffect, useState } from "react";

interface LocationSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export function CountrySelect({
  value,
  onChange,
  placeholder = "Select a country",
  label,
  required,
}: LocationSelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country} value={country} className="cursor-pointer">
                {country}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CountySelect({
  value,
  onChange,
  placeholder = "Select a county",
  label,
  required,
}: LocationSelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
            {KENYAN_COUNTIES_NAMES.map((county) => (
              <SelectItem key={county} value={county} className="cursor-pointer">
                {county}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface CitySelectProps extends LocationSelectProps {
  county?: string;
}

export function CitySelect({
  value,
  onChange,
  county,
  placeholder = "Select a city/town",
  label,
  required,
}: CitySelectProps) {
  const [cities, setCities] = useState<string[]>(KENYAN_CITIES);

  useEffect(() => {
    if (county) {
      const countyCities = getCitiesByCounty(county);
      setCities(countyCities.length > 0 ? countyCities : KENYAN_CITIES);
    } else {
      setCities(KENYAN_CITIES);
    }
  }, [county]);

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
            {cities.map((city) => (
              <SelectItem key={city} value={city} className="cursor-pointer">
                {city}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface IndustrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export function IndustrySelect({
  value,
  onChange,
  placeholder = "Select industry",
  label,
  required,
}: IndustrySelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {INDUSTRIES.map((industry) => (
            <SelectItem key={industry} value={industry} className="cursor-pointer">
              {industry}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
