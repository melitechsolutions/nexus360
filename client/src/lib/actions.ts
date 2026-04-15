import { toast } from "sonner";
import { maybeDelay } from "@/lib/delay";

export interface ActionHandlers {
  onView?: (id: string | number) => void;
  onEdit?: (id: string | number) => void;
  onDelete?: (id: string | number) => void;
  onDownload?: (id: string | number) => void;
  onEmail?: (id: string | number) => void;
  onDuplicate?: (id: string | number) => void;
}

export const handleView = (id: string | number, type: string, navigate?: (path: string) => void) => {
  if (navigate) {
    // Convert type to plural form for routes
    const pluralType = type.endsWith('s') ? type : `${type}s`;
    navigate(`/${pluralType}/${id}`);
  } else {
    toast.info(`Viewing ${type} #${id}`);
  }
};

export const handleEdit = (id: string | number, type: string, navigate?: (path: string) => void) => {
  if (navigate) {
    // Convert type to plural form for routes
    const pluralType = type.endsWith('s') ? type : `${type}s`;
    navigate(`/${pluralType}/${id}/edit`);
  } else {
    toast.info(`Opening editor for ${type} #${id}`);
  }
};

export const handleDelete = async (
  id: string | number,
  type: string,
  onConfirm?: () => void | Promise<void>
) => {
  const confirmed = window.confirm(
    `Are you sure you want to delete this ${type}? This action cannot be undone.`
  );

  if (confirmed) {
    try {
      // If a real delete handler was provided, call it (e.g., a TRPC mutate wrapper).
      if (onConfirm) {
        await onConfirm();
      } else {
        // Fallback simulated delay for callers that don't provide a real handler.
        await maybeDelay(500);
      }
      toast.success(`${type} deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete ${type}`);
    }
  }
};

export const handleDownload = async (
  id: string | number,
  type: string,
  format: "pdf" | "excel" | "csv" = "pdf",
  data?: any
  ,
  downloadHandler?: (id: string | number, type: string, format: "pdf" | "excel" | "csv", data?: any) => Promise<Blob | string>
) => {
  const toastId = toast.loading(`Generating ${format.toUpperCase()} for ${type} #${id}...`);

  try {
    // If a custom download handler is provided (e.g., server-generated PDF), use it.
    let blobOrString: Blob | string;
    if (downloadHandler) {
      blobOrString = await downloadHandler(id, type, format, data);
    } else {
      // Simulate document generation
      await maybeDelay(1500);

      // Generate document content based on type
      const content = generateDocumentContent(type, id, data);

      // Default to string content (will be turned into a blob)
      blobOrString = content;
    }

    // Create and trigger download
    const blob = blobOrString instanceof Blob ? blobOrString : new Blob([blobOrString], {
      type: format === "pdf" ? "application/pdf" : "text/csv",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${type}-${id}-${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(`${type} downloaded successfully`, { id: toastId });
  } catch (error) {
    toast.error(`Failed to download ${type}`, { id: toastId });
  }
};

export const handleEmail = async (
  id: string | number,
  type: string,
  recipientEmail?: string,
  data?: any
  ,
  sendHandler?: (id: string | number, type: string, email: string, data?: any) => Promise<void>
) => {
  let email = recipientEmail;

  if (!email) {
    const promptResult = prompt(`Enter recipient email for ${type} #${id}:`);
    if (!promptResult) {
      toast.error("Email address is required");
      return;
    }
    email = promptResult;
  }

  if (!email) {
    toast.error("Email address is required");
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    toast.error("Please enter a valid email address");
    return;
  }

  const toastId = toast.loading(`Sending ${type} to ${email}...`);

  try {
    // If a send handler is provided (calls server/email service), use it.
    if (sendHandler) {
      await sendHandler(id, type, email, data);
    } else {
      // Simulate API call to send email
      await maybeDelay(2000);
    }

    toast.success(`${type} sent successfully to ${email}`, { id: toastId });
  } catch (error) {
    toast.error(`Failed to send ${type}`, { id: toastId });
  }
};

export const handleDuplicate = async (
  id: string | number,
  type: string,
  onSuccess?: () => void,
  duplicateHandler?: (id: string | number, type: string) => Promise<void>
) => {
  const toastId = toast.loading(`Duplicating ${type} #${id}...`);

  try {
    if (duplicateHandler) {
      await duplicateHandler(id, type);
      } else {
      // Simulate API call
      await maybeDelay(1000);
    }
    toast.success(`${type} duplicated successfully`, { id: toastId });
    onSuccess?.();
  } catch (error) {
    toast.error(`Failed to duplicate ${type}`, { id: toastId });
  }
};

// Generate document content for download
const generateDocumentContent = (type: string, id: string | number, data?: any): string => {
  const timestamp = new Date().toLocaleString();
  const company = data?.companyName || import.meta.env.VITE_APP_TITLE || 'Your Company';
  const email = data?.companyEmail || '';
  const phone = data?.companyPhone || '';

  switch (type.toLowerCase()) {
    case "invoice":
      return `
INVOICE #${id}
Generated: ${timestamp}

${company}
${email ? 'Email: ' + email : ''}
${phone ? 'Phone: ' + phone : ''}

Bill To: ${data?.clientName || "Client Name"}
Invoice Date: ${data?.date || new Date().toLocaleDateString()}
Due Date: ${data?.dueDate || "N/A"}

Description: ${data?.description || "Services rendered"}
Amount: Ksh ${data?.amount?.toLocaleString() || "0"}

Thank you for your business!
      `.trim();

    case "receipt":
      return `
PAYMENT RECEIPT #${id}
Generated: ${timestamp}

${company}
${email ? 'Email: ' + email : ''}

Received From: ${data?.clientName || "Client Name"}
Amount: Ksh ${data?.amount?.toLocaleString() || "0"}
Payment Method: ${data?.method || "N/A"}
Date: ${data?.date || new Date().toLocaleDateString()}

Thank you for your payment!
      `.trim();

    case "estimate":
    case "quotation":
      return `
QUOTATION #${id}
Generated: ${timestamp}

${company}
${email ? 'Email: ' + email : ''}

Prepared For: ${data?.clientName || "Client Name"}
Date: ${data?.date || new Date().toLocaleDateString()}
Valid Until: ${data?.validUntil || "N/A"}

Description: ${data?.description || "Services"}
Total Amount: Ksh ${data?.amount?.toLocaleString() || "0"}

This quotation is valid for 30 days from the date of issue.
      `.trim();

    case "proposal":
      return `
BUSINESS PROPOSAL #${id}
Generated: ${timestamp}

${company}

Proposal For: ${data?.clientName || "Client Name"}
Title: ${data?.title || "Project Proposal"}
Date: ${data?.date || new Date().toLocaleDateString()}

${data?.description || "Proposal details..."}

Total Value: Ksh ${data?.amount?.toLocaleString() || "0"}
      `.trim();

    default:
      return `
${type.toUpperCase()} #${id}
Generated: ${timestamp}

${company}
Document generated from CRM system.
      `.trim();
  }
};

// Email template generator
export const generateEmailTemplate = (type: string, data: any) => {
  const companyName = data.companyName || import.meta.env.VITE_APP_TITLE || 'Your Company';
  const templates: Record<string, string> = {
    invoice: `
      <h2>Invoice #${data.number}</h2>
      <p>Dear ${data.clientName},</p>
      <p>Please find attached your invoice for ${data.description}.</p>
      <p>Amount Due: Ksh ${data.amount?.toLocaleString()}</p>
      <p>Due Date: ${data.dueDate}</p>
      <p>Thank you for your business!</p>
      <br/>
      <p>Best regards,<br/>${companyName}</p>
    `,
    receipt: `
      <h2>Payment Receipt #${data.number}</h2>
      <p>Dear ${data.clientName},</p>
      <p>Thank you for your payment of Ksh ${data.amount?.toLocaleString()}.</p>
      <p>Payment Date: ${data.date}</p>
      <p>Payment Method: ${data.method}</p>
      <br/>
      <p>Best regards,<br/>${companyName}</p>
    `,
    estimate: `
      <h2>Quotation #${data.number}</h2>
      <p>Dear ${data.clientName},</p>
      <p>Please find attached our quotation for ${data.description}.</p>
      <p>Total Amount: Ksh ${data.amount?.toLocaleString()}</p>
      <p>Valid Until: ${data.validUntil}</p>
      <br/>
      <p>Best regards,<br/>${companyName}</p>
    `,
    proposal: `
      <h2>Business Proposal #${data.number}</h2>
      <p>Dear ${data.clientName},</p>
      <p>We are pleased to submit our proposal for ${data.title}.</p>
      <p>Please review the attached document and let us know if you have any questions.</p>
      <br/>
      <p>Best regards,<br/>${companyName}</p>
    `,
  };

  return templates[type] || `<p>${type} document attached.</p>`;
};

