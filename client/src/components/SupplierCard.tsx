import { Star, MapPin, Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SupplierCardProps {
  id: string;
  companyName: string;
  city?: string;
  email?: string;
  phone?: string;
  rating?: number;
  qualificationStatus: string;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function SupplierCard({
  id,
  companyName,
  city,
  email,
  phone,
  rating = 0,
  qualificationStatus,
  onView,
  onEdit,
}: SupplierCardProps) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      pre_qualified: "bg-blue-100 text-blue-800",
      qualified: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      inactive: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending",
      pre_qualified: "Pre-Qualified",
      qualified: "Qualified",
      rejected: "Rejected",
      inactive: "Inactive",
    };
    return labels[status] || status;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg mb-1">
                {companyName}
              </h3>
              <Badge className={getStatusColor(qualificationStatus)}>
                {getStatusLabel(qualificationStatus)}
              </Badge>
            </div>
            {rating > 0 && (
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-amber-500" />
                <span className="text-sm font-medium">{rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-2 text-sm">
            {city && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>{city}</span>
              </div>
            )}
            {email && (
              <div className="flex items-center gap-2 text-gray-600 truncate">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <a href={`mailto:${email}`} className="truncate hover:text-blue-600">
                  {email}
                </a>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <a href={`tel:${phone}`} className="hover:text-blue-600">
                  {phone}
                </a>
              </div>
            )}
          </div>

          {/* Actions */}
          {(onView || onEdit) && (
            <div className="flex gap-2 pt-4 border-t">
              {onView && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(id)}
                  className="flex-1"
                >
                  View
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(id)}
                  className="flex-1"
                >
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
