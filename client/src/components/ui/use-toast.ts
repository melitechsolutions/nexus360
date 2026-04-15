import { toast as sonnerToast } from "sonner";

export function useToast() {
  return {
    toast: (message: string, options?: any) => {
      return sonnerToast(message, options);
    },
  };
}
