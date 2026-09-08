import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "sport";
}

export type ConfirmFn = (options: string | ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

let globalConfirm: ConfirmFn | null = null;

export function confirmAction(options: string | ConfirmOptions): Promise<boolean> {
  if (globalConfirm) return globalConfirm(options);
  return Promise.resolve(false);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    variant: "default" | "destructive" | "sport";
  }>({
    open: false,
    title: "Xác nhận thao tác",
    description: "",
    confirmText: "Xác nhận",
    cancelText: "Hủy",
    variant: "default",
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    let title = "Xác nhận thao tác";
    let description = "";
    let confirmText = "Xác nhận";
    let cancelText = "Hủy";
    let variant: "default" | "destructive" | "sport" = "default";

    if (typeof options === "string") {
      description = options;
    } else if (options && typeof options === "object") {
      const opts = options as ConfirmOptions;
      title = opts.title ?? title;
      description =
        typeof opts.description === "string"
          ? opts.description
          : String(opts.description ?? "");
      confirmText = opts.confirmText ?? confirmText;
      cancelText = opts.cancelText ?? cancelText;
      variant = opts.variant ?? variant;
    } else {
      description = String(options ?? "");
    }

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({
        open: true,
        title,
        description,
        confirmText,
        cancelText,
        variant,
      });
    });
  }, []);

  useEffect(() => {
    globalConfirm = confirm;

    // Ghi đè window.confirm của trình duyệt để không bao giờ hiện popup mặc định
    if (typeof window !== "undefined") {
      const originalConfirm = window.confirm;
      window.confirm = (message?: string): boolean => {
        const text =
          typeof message === "string"
            ? message
            : typeof message === "object" && message !== null
              ? (message as { description?: string }).description || JSON.stringify(message)
              : String(message ?? "");

        void confirm({
          title: "Xác nhận thao tác",
          description: text,
          confirmText: "Xác nhận",
          cancelText: "Hủy",
          variant: "destructive",
        });
        return false;
      };

      return () => {
        globalConfirm = null;
        window.confirm = originalConfirm;
      };
    }

    return () => {
      globalConfirm = null;
    };
  }, [confirm]);

  const handleAction = () => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setState((prev) => ({ ...prev, open: false }));
    resolver?.(true);
  };

  const handleCancel = () => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setState((prev) => ({ ...prev, open: false }));
    resolver?.(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={state.open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            if (resolverRef.current) {
              const resolver = resolverRef.current;
              resolverRef.current = null;
              resolver(false);
            }
            setState((prev) => ({ ...prev, open: false }));
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-extrabold uppercase italic tracking-wide">
              {state.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {state.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="mt-2 sm:mt-0"
            >
              {state.cancelText}
            </Button>
            <Button
              type="button"
              variant={
                state.variant === "destructive"
                  ? "destructive"
                  : state.variant === "sport"
                    ? "sport"
                    : "default"
              }
              onClick={handleAction}
            >
              {state.confirmText}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) {
    return confirmAction;
  }
  return context;
}
