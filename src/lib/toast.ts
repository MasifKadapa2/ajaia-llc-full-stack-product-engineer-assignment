import { toast } from "sonner";

const defaultDuration = 4000;

export const appToast = {
  success(title: string, description?: string) {
    toast.success(title, { description, duration: defaultDuration });
  },
  error(title: string, description?: string) {
    toast.error(title, { description, duration: 6000 });
  },
  message(title: string, description?: string) {
    toast(title, { description, duration: defaultDuration });
  },
};
