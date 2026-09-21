/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md font-medium",
  {
    variants: {
      variant: {
        default:
          "bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-zinc-300",
        accent:
          "bg-stone-200/80 text-stone-700 dark:bg-zinc-700 dark:text-zinc-200",
      },
      size: {
        sm: "h-4 px-1.5 text-[8.5px] font-semibold uppercase tracking-wide",
        md: "h-[18px] px-1.5 text-[9.5px] font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

function Badge({ className, variant, size, ...props }) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />;
}

export { Badge, badgeVariants };
