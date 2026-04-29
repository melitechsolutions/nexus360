/**
 * Payment Gateway Component
 * Unified payment form supporting Stripe and M-Pesa payment methods
 * Handles payment processing, error handling, and success confirmation
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getGradientCard, animations } from "@/lib/designSystem";

export interface PaymentFormData {
  amount: number;
  currency: "KES" | "USD";
  paymentMethod: "stripe" | "mpesa";
  email: string;
  phone?: string;
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
}

interface PaymentGatewayProps {
  amount: number;
  currency?: "KES" | "USD";
  description?: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function PaymentGateway({
  amount,
  currency = "KES",
  description = "Payment",
  onSuccess,
  onError,
  disabled = false,
}: PaymentGatewayProps) {
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "mpesa">("stripe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [showCVV, setShowCVV] = useState(false);

  const [formData, setFormData] = useState<PaymentFormData>({
    amount,
    currency,
    paymentMethod: "stripe",
    email: "",
    phone: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  });

  // Payment mutations
  const stripePaymentMutation = trpc.payments.stripe.createPaymentIntent.useMutation({
    onSuccess: (data: any) => {
      setTransactionId(data.clientSecret || data.id);
      setSuccess(true);
      toast.success("Payment processed successfully");
      onSuccess?.(transactionId);
    },
    onError: (error) => {
      const errorMsg = error.message || "Payment failed";
      setError(errorMsg);
      toast.error(errorMsg);
      onError?.(errorMsg);
    },
  });

  const mpesaPaymentMutation = trpc.payments.mpesa.initiateSTKPush.useMutation({
    onSuccess: (data: any) => {
      setTransactionId(data.checkoutRequestID || data.id);
      setSuccess(true);
      toast.success("M-Pesa prompt sent to your phone");
      onSuccess?.(transactionId);
    },
    onError: (error) => {
      const errorMsg = error.message || "M-Pesa payment failed";
      setError(errorMsg);
      toast.error(errorMsg);
      onError?.(errorMsg);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? parseFloat(value) || 0 : value,
    }));
  };

  const validateForm = (): boolean => {
    setError("");

    if (!formData.email) {
      setError("Email is required");
      return false;
    }

    if (!formData.email.includes("@")) {
      setError("Valid email is required");
      return false;
    }

    if (paymentMethod === "mpesa" && !formData.phone) {
      setError("Phone number is required for M-Pesa");
      return false;
    }

    if (paymentMethod === "mpesa" && formData.phone.length < 10) {
      setError("Valid phone number is required");
      return false;
    }

    if (paymentMethod === "stripe" && !formData.cardNumber) {
      setError("Card number is required");
      return false;
    }

    if (paymentMethod === "stripe" && formData.cardNumber.length < 13) {
      setError("Valid card number is required");
      return false;
    }

    if (paymentMethod === "stripe" && !formData.expiryDate) {
      setError("Card expiry date is required");
      return false;
    }

    if (paymentMethod === "stripe" && !formData.cvv) {
      setError("CVV is required");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (paymentMethod === "stripe") {
        stripePaymentMutation.mutate({
          amount: Math.round(amount * 100),
          currency,
          email: formData.email,
          cardNumber: formData.cardNumber || "",
          expiryDate: formData.expiryDate || "",
          cvv: formData.cvv || "",
          description,
        });
      } else {
        mpesaPaymentMutation.mutate({
          amount: Math.round(amount * 100),
          phone: formData.phone || "",
          email: formData.email,
          accountReference: description,
        });
      }
    } catch (err: any) {
      setError(err.message || "Payment processing failed");
      toast.error(err.message || "Payment processing failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className={`${getGradientCard("emerald")} border-2`}>
        <CardHeader className="text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
          <CardTitle className={animations.fadeIn}>Payment Successful</CardTitle>
          <CardDescription>Your transaction has been completed</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4">
            <div className="p-4 bg-white/50 dark:bg-black/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Transaction ID</p>
              <p className="text-lg font-mono font-semibold break-all">{transactionId}</p>
            </div>
            <div>
              <Badge variant="default" className="bg-emerald-600">
                PAID
              </Badge>
            </div>
            <Button
              onClick={() => {
                setSuccess(false);
                setFormData({
                  amount,
                  currency,
                  paymentMethod: "stripe",
                  email: "",
                  phone: "",
                  cardNumber: "",
                  expiryDate: "",
                  cvv: "",
                });
              }}
            >
              Make Another Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={getGradientCard("blue")}>
      <CardHeader>
        <CardTitle className={animations.fadeIn}>Payment Gateway</CardTitle>
        <CardDescription>
          {description} - {currency} {amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === "stripe"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                <input
                  type="radio"
                  value="stripe"
                  checked={paymentMethod === "stripe"}
                  onChange={(e) => setPaymentMethod(e.target.value as "stripe" | "mpesa")}
                  className="mr-2"
                />
                <CreditCard className="h-5 w-5 inline mr-2" />
                <span className="font-medium">Stripe Card</span>
              </label>

              <label
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === "mpesa"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                <input
                  type="radio"
                  value="mpesa"
                  checked={paymentMethod === "mpesa"}
                  onChange={(e) => setPaymentMethod(e.target.value as "stripe" | "mpesa")}
                  className="mr-2"
                />
                <Smartphone className="h-5 w-5 inline mr-2" />
                <span className="font-medium">M-Pesa</span>
              </label>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={loading || disabled}
            />
          </div>

          {/* Stripe Fields */}
          {paymentMethod === "stripe" && (
            <>
              {/* Card Number */}
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number *</Label>
                <div className="relative">
                  <Input
                    id="cardNumber"
                    name="cardNumber"
                    type={showCardDetails ? "text" : "password"}
                    placeholder="4242 4242 4242 4242"
                    value={formData.cardNumber}
                    onChange={handleInputChange}
                    maxLength={19}
                    required
                    disabled={loading || disabled}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCardDetails(!showCardDetails)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={loading || disabled}
                  >
                    {showCardDetails ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expiry and CVV */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date *</Label>
                  <Input
                    id="expiryDate"
                    name="expiryDate"
                    type="text"
                    placeholder="MM/YY"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    maxLength={5}
                    required
                    disabled={loading || disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV *</Label>
                  <div className="relative">
                    <Input
                      id="cvv"
                      name="cvv"
                      type={showCVV ? "text" : "password"}
                      placeholder="123"
                      value={formData.cvv}
                      onChange={handleInputChange}
                      maxLength={4}
                      required
                      disabled={loading || disabled}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCVV(!showCVV)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={loading || disabled}
                    >
                      {showCVV ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-sm">
                <p>
                  <strong>Test Card:</strong> 4242 4242 4242 4242 | Any Future Date | Any CVV
                </p>
              </div>
            </>
          )}

          {/* M-Pesa Phone */}
          {paymentMethod === "mpesa" && (
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (M-Pesa) *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+254XXXXXXXXX or 0XXXXXXXXX"
                value={formData.phone}
                onChange={handleInputChange}
                required
                disabled={loading || disabled}
              />
              <p className="text-xs text-muted-foreground">
                You will receive a payment prompt on your phone
              </p>
            </div>
          )}

          {/* Amount Display */}
          <div className="p-4 bg-white/50 dark:bg-black/20 border rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount to Pay</span>
              <span className="text-2xl font-bold">
                {currency} {amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || disabled}
            className="w-full gap-2 h-12 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Pay {currency} {amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Your payment information is secure and encrypted
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default PaymentGateway;
