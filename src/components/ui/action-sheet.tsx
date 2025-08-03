import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const ActionSheet = DialogPrimitive.Root;

const ActionSheetTrigger = DialogPrimitive.Trigger;

const ActionSheetClose = DialogPrimitive.Close;

const ActionSheetPortal = DialogPrimitive.Portal;

const ActionSheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
ActionSheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const ActionSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <ActionSheetPortal>
    <ActionSheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 grid gap-4 border border-border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom rounded-t-2xl",
        "sm:max-w-md sm:left-1/2 sm:bottom-8 sm:right-auto sm:translate-x-[-50%] sm:rounded-2xl",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </ActionSheetPortal>
));
ActionSheetContent.displayName = DialogPrimitive.Content.displayName;

const ActionSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
ActionSheetHeader.displayName = "ActionSheetHeader";

const ActionSheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
ActionSheetFooter.displayName = "ActionSheetFooter";

const ActionSheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
ActionSheetTitle.displayName = DialogPrimitive.Title.displayName;

const ActionSheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
ActionSheetDescription.displayName = DialogPrimitive.Description.displayName;

const ActionSheetItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon?: React.ReactNode;
    variant?: "default" | "destructive";
  }
>(({ className, children, icon, variant = "default", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "flex w-full items-center justify-start gap-3 rounded-lg px-4 py-3 text-left transition-colors",
      "hover:bg-accent hover:text-accent-foreground",
      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      variant === "destructive" && "text-destructive hover:bg-destructive/10",
      className
    )}
    {...props}
  >
    {icon && <span className="flex-shrink-0">{icon}</span>}
    <span className="flex-1">{children}</span>
  </button>
));
ActionSheetItem.displayName = "ActionSheetItem";

export {
  ActionSheet,
  ActionSheetTrigger,
  ActionSheetClose,
  ActionSheetContent,
  ActionSheetHeader,
  ActionSheetFooter,
  ActionSheetTitle,
  ActionSheetDescription,
  ActionSheetItem,
};