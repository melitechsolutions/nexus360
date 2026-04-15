import { CheckCircle, Circle, Clock, AlertCircle, XCircle } from "lucide-react";
import { formatDate } from "../utils/format";

type QuoteStatus = "draft" | "sent" | "accepted" | "expired" | "declined" | "converted";

interface StatusLog {
  action: string;
  description: string;
  createdAt: Date;
}

interface QuoteStatusTimelineProps {
  status: QuoteStatus;
  logs?: StatusLog[];
  sentDate?: Date;
  acceptedDate?: Date;
  declinedDate?: Date;
  expirationDate?: Date;
}

export function QuoteStatusTimeline({
  status,
  logs = [],
  sentDate,
  acceptedDate,
  declinedDate,
  expirationDate,
}: QuoteStatusTimelineProps) {
  const statusSteps = [
    { key: "draft", label: "Draft", date: null },
    { key: "sent", label: "Sent", date: sentDate },
    { key: "accepted", label: "Accepted", date: acceptedDate },
    { key: "converted", label: "Converted", date: null },
  ];

  const isTerminalStatus = ["declined", "expired", "converted"].includes(status);

  const getStatusIcon = (stepKey: string, stepDate?: Date) => {
    if (status === stepKey && stepDate) {
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    }

    const statusOrder = ["draft", "sent", "accepted", "converted"];
    const currentIndex = statusOrder.indexOf(status);
    const stepIndex = statusOrder.indexOf(stepKey);

    if (stepIndex < currentIndex) {
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    }

    if (stepIndex === currentIndex) {
      if (status === "sent") {
        return <Clock className="w-6 h-6 text-blue-600 animate-pulse" />;
      }
      return <Circle className="w-6 h-6 text-blue-600" />;
    }

    return <Circle className="w-6 h-6 text-gray-300" />;
  };

  return (
    <div className="space-y-6">
      {/* Main Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quote Status Timeline</h3>

        {/* Status Badge */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-3">
            {status === "draft" && (
              <>
                <Circle className="w-5 h-5 text-gray-500" />
                <span className="font-semibold text-gray-900">Draft</span>
                <span className="text-xs text-gray-600">Ready to send</span>
              </>
            )}
            {status === "sent" && (
              <>
                <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
                <span className="font-semibold text-blue-900">Sent</span>
                <span className="text-xs text-blue-700">Awaiting response</span>
              </>
            )}
            {status === "accepted" && (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900">Accepted</span>
                <span className="text-xs text-green-700">Ready to convert</span>
              </>
            )}
            {status === "declined" && (
              <>
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-900">Declined</span>
                <span className="text-xs text-red-700">Client rejected</span>
              </>
            )}
            {status === "expired" && (
              <>
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="font-semibold text-orange-900">Expired</span>
                <span className="text-xs text-orange-700">No longer valid</span>
              </>
            )}
            {status === "converted" && (
              <>
                <CheckCircle className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-purple-900">Converted</span>
                <span className="text-xs text-purple-700">Converted to invoice</span>
              </>
            )}
          </div>
        </div>

        {/* Timeline Steps */}
        <div className="space-y-4">
          {statusSteps.map((step, index) => (
            <div key={step.key} className="flex gap-4">
              {/* Icon */}
              <div className="flex flex-col items-center">
                {getStatusIcon(step.key, step.date)}
                {index < statusSteps.length - 1 && (
                  <div
                    className={`w-0.5 h-12 mt-2 ${
                      status === step.key || statusSteps.indexOf(statusSteps.find(s => status === s.key)) > index
                        ? "bg-green-600"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="pt-1">
                <p className="font-semibold text-gray-900">{step.label}</p>
                {step.date && (
                  <p className="text-xs text-gray-600">
                    {formatDate(new Date(step.date))}
                  </p>
                )}
                {status === step.key && !step.date && (
                  <p className="text-xs text-gray-600">Current status</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Terminal Status Message */}
        {isTerminalStatus && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-900">
                {status === "declined" && "This quote has been declined"}
                {status === "expired" && "This quote has expired"}
                {status === "converted" && "This quote has been converted to an invoice"}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                {status === "declined" && "You can duplicate this quote to create a new version."}
                {status === "expired" && "Expired quotes cannot be sent. Duplicate to create a fresh quote."}
                {status === "converted" && "View the associated invoice to continue with the order."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {logs && logs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {logs.slice(0, 5).map((log, index) => (
              <div
                key={index}
                className="flex items-start gap-3 pb-3 border-b border-gray-200 last:pb-0 last:border-0"
              >
                <div className="mt-1">
                  <Circle className="w-2 h-2 text-blue-600 mt-1" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {log.action.charAt(0).toUpperCase() +
                      log.action.slice(1)
                        .replace(/([A-Z])/g, " $1")
                        .toLowerCase()}
                  </p>
                  <p className="text-xs text-gray-600">{log.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(new Date(log.createdAt))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
