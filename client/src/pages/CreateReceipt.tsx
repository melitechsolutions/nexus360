import { ModuleLayout } from "@/components/ModuleLayout";
import { Plus } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import DocumentForm from "@/components/forms/DocumentForm";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CreateReceipt() {
  // CALL ALL HOOKS UNCONDITIONALLY AT TOP LEVEL
  const { allowed, isLoading } = useRequireFeature("accounting:receipts:create");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [isLoadingNumber, setIsLoadingNumber] = useState(true);
  const getNextNumberMutation = trpc.settings.getNextDocumentNumber.useMutation();

  // Generate receipt number on component mount
  useEffect(() => {
    let isMounted = true;

    const generateNumber = () => {
      setIsLoadingNumber(true);
      getNextNumberMutation.mutate(
        { documentType: 'receipt' },
        {
          onSuccess: (result) => {
            if (isMounted) setReceiptNumber(result.documentNumber || `REC-${String(Math.random() * 1000000 | 0).padStart(6, '0')}`);
          },
          onError: () => {
            if (isMounted) {
              console.error('Failed to generate receipt number');
              setReceiptNumber(`REC-${String(Math.random() * 1000000 | 0).padStart(6, '0')}`);
            }
          },
          onSettled: () => {
            if (isMounted) setIsLoadingNumber(false);
          },
        }
      );
    };

    generateNumber();

    return () => {
      isMounted = false;
    };
  }, []);

  const createReceiptMutation = trpc.receipts.create.useMutation({
    onSuccess: (data) => {
      toast.success("Receipt created successfully!");
      utils.receipts.list.invalidate();
      setLocation("/receipts");
    },
    onError: (error: any) => {
      toast.error(`Failed to create receipt: ${error.message}`);
    },
  });

  const handleSave = useCallback((data: any) => {
    if (!data.documentNumber) {
      toast.error("Receipt number is required");
      return;
    }

    const amount = data.grandTotal || 0;

    const receiptData = {
      receiptNumber: data.documentNumber,
      clientId: data.clientId || `guest_${Date.now()}`,
      paymentId: undefined,
      amount: Math.round(amount * 100),
      paymentMethod: (data.paymentMethod || "cash") as "cash" | "bank_transfer" | "cheque" | "mpesa" | "card" | "other",
      receiptDate: new Date(data.date),
      notes: data.notes || "",
      lineItems: data.lineItems?.map((item: any) => ({
        description: item.description,
        quantity: item.qty,
        unitPrice: Math.round(item.unitPrice * 100),
        taxRate: item.tax || 0,
        total: Math.round(item.total * 100),
      })),
    };
    createReceiptMutation.mutate(receiptData);
  }, [createReceiptMutation]);

  const handleSend = useCallback((data: any) => {
    if (!data.documentNumber) {
      toast.error("Receipt number is required");
      return;
    }

    if (!data.clientEmail) {
      toast.error("Client email is required to send receipt");
      return;
    }

    const amount = data.grandTotal || 0;

    const receiptData = {
      receiptNumber: data.documentNumber,
      clientId: data.clientId || `guest_${Date.now()}`,
      paymentId: undefined,
      amount: Math.round(amount * 100),
      paymentMethod: (data.paymentMethod || "cash") as "cash" | "bank_transfer" | "cheque" | "mpesa" | "card" | "other",
      receiptDate: new Date(data.date),
      notes: data.notes || "",
      lineItems: data.lineItems?.map((item: any) => ({
        description: item.description,
        quantity: item.qty,
        unitPrice: Math.round(item.unitPrice * 100),
        taxRate: item.tax || 0,
        total: Math.round(item.total * 100),
      })),
    };
    
    
    createReceiptMutation.mutate(receiptData);
    toast.info(`Receipt will be sent to ${data.clientEmail}`);
  }, [createReceiptMutation]);

  // NOW SAFE TO CHECK CONDITIONAL RETURNS (ALL HOOKS ALREADY CALLED)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <ModuleLayout
      title="Create Receipt"
      description="Create a new receipt"
      icon={<Plus className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Receipts", href: "/receipts" },
        { label: "Create" },
      ]}
      backLink={{ label: "Receipts", href: "/receipts" }}
    >
      <DocumentForm 
        type="receipt"
        mode="create"
        initialData={{ documentNumber: receiptNumber }}
        onSave={handleSave}
        onSend={handleSend}
        isLoading={isLoadingNumber}
        isSaving={createReceiptMutation.isPending}
      />
    </ModuleLayout>
  );
}
