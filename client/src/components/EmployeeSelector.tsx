import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

interface EmployeeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  filter?: (employee: any) => boolean;
  label?: string;
  required?: boolean;
}

/**
 * Reusable Employee Selector Component
 * Fetches employees from database and provides a searchable select dropdown
 */
export function EmployeeSelector({
  value,
  onChange,
  placeholder = "Select employee...",
  disabled = false,
  filter,
  label,
  required = false,
}: EmployeeSelectorProps) {
  // Fetch employees from backend
  const { data: employees = [], isLoading } = trpc.employees.list.useQuery({});

  // Filter employees based on provided filter function
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return filter ? employees.filter(filter) : employees;
  }, [employees, filter]);

  // Get the display name for selected employee
  const selectedEmployee = employees.find((e) => e.id === value);
  const displayValue = selectedEmployee
    ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
    : undefined;

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Spinner className="h-4 w-4" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground text-sm">
              No employees found
            </div>
          ) : (
            filteredEmployees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
                {employee.department && ` - ${employee.department}`}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default EmployeeSelector;
