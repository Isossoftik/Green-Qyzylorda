import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const variants = cva("button", {
  variants: { variant: { default: "button-default", ghost: "button-ghost" } },
  defaultVariants: { variant: "default" },
});
type Props = React.ComponentProps<"button"> &
  VariantProps<typeof variants> & { asChild?: boolean };
export function Button({ asChild, className, variant, ...props }: Props) {
  const Component = asChild ? Slot : "button";
  return (
    <Component className={cn(variants({ variant }), className)} {...props} />
  );
}
