import { defineStore } from "pinia";
import { ref } from "vue";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  description?: string;
  timeoutMs?: number;
}

export const useToastStore = defineStore("toast", () => {
  const toasts = ref<ToastMessage[]>([]);

  function show(toast: Omit<ToastMessage, "id">): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const entry: ToastMessage = { ...toast, id };
    toasts.value.push(entry);

    const duration = toast.timeoutMs ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }
    return id;
  }

  function success(title: string, description?: string) {
    return show({ type: "success", title, description });
  }

  function error(title: string, description?: string) {
    return show({ type: "error", title, description });
  }

  function info(title: string, description?: string) {
    return show({ type: "info", title, description });
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter((item) => item.id !== id);
  }

  return {
    toasts,
    show,
    success,
    error,
    info,
    dismiss,
  };
});
