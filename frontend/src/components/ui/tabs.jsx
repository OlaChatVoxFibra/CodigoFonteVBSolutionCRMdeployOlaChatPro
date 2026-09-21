/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "brain-tabs-list inline-flex h-9 max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-zinc-800 bg-zinc-900/60 p-1",
      "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "brain-tabs-trigger inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-[12px] font-medium text-zinc-400 transition-colors sm:px-3 sm:text-[13px]",
      "hover:text-zinc-200 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("brain-tabs-content outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
