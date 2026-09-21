/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Plus,
  Globe,
  BookOpen,
  Link2,
  Mic,
  ArrowUp,
  X,
  Settings2,
  Image as ImageIcon,
  Video,
  FileText,
  FileAudio,
} from "lucide-react";
import { cn } from "../../lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef(({ className, sideOffset = 4, showArrow = false, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "relative z-50 max-w-[280px] rounded-md bg-popover text-popover-foreground px-1.5 py-1 text-xs animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    >
      {props.children}
      {showArrow && <TooltipPrimitive.Arrow className="-my-px fill-popover" />}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-64 rounded-xl bg-popover dark:bg-[#303030] p-2 text-popover-foreground dark:text-white shadow-md outline-none animate-in data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] md:max-w-[800px] translate-x-[-50%] translate-y-[-50%] gap-4 border-none bg-transparent p-0 shadow-none duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    >
      <div className="relative bg-card dark:bg-[#303030] rounded-[28px] overflow-hidden shadow-2xl p-1">
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 z-10 rounded-full bg-background/50 dark:bg-[#303030] p-1 hover:bg-accent dark:hover:bg-[#515151] transition-all">
          <X className="h-5 w-5 text-muted-foreground dark:text-gray-200 hover:text-foreground dark:hover:text-white" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const BRAIN_PROMPT_ATTACH_TYPES = [
  { id: "image", label: "Imagem", icon: ImageIcon, accept: "image/*" },
  { id: "video", label: "Vídeo", icon: Video, accept: "video/*" },
  { id: "audio", label: "Áudio", icon: FileAudio, accept: "audio/*" },
  {
    id: "document",
    label: "Documento",
    icon: FileText,
    accept:
      ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.json,.xml,.zip,.rar,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
];

export const BRAIN_PROMPT_TOOLS = [
  { id: "searchWeb", name: "Buscar na web", shortName: "Web", icon: Globe },
  { id: "searchDocs", name: "Buscar em documentos", shortName: "Docs", icon: BookOpen },
];

export const PromptBox = React.forwardRef(
  (
    {
      className,
      value: controlledValue,
      onValueChange,
      onSend,
      onAttachPick,
      onConnectorsClick,
      onMicClick,
      loading = false,
      connectorsCount = 0,
      selectedTool = null,
      onToolChange,
      attachedFiles = [],
      onRemoveFile,
      voiceRecording = false,
      voiceRecordingBar,
      footerLeftExtra,
      sendDisabled,
      placeholder = "Pergunte algo ao Brain...",
      disabled,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const internalTextareaRef = React.useRef(null);
    const [internalValue, setInternalValue] = React.useState("");
    const [imagePreview, setImagePreview] = React.useState(null);
    const [isToolsPopoverOpen, setIsToolsPopoverOpen] = React.useState(false);
    const [isAttachPopoverOpen, setIsAttachPopoverOpen] = React.useState(false);
    const [isImageDialogOpen, setIsImageDialogOpen] = React.useState(false);

    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const setValue = (next) => {
      if (controlledValue === undefined) setInternalValue(next);
      onValueChange?.(next);
    };

    React.useImperativeHandle(ref, () => internalTextareaRef.current, []);

    React.useLayoutEffect(() => {
      const textarea = internalTextareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = `${newHeight}px`;
      }
    }, [value]);

    const handleInputChange = (e) => {
      setValue(e.target.value);
      props.onInput?.(e);
    };

    const handleKeyDownInternal = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!loading && !sendDisabled && (value.trim() || attachedFiles.length > 0)) {
          onSend?.();
        }
        return;
      }
      onKeyDown?.(e);
    };

    const hasValue = value.trim().length > 0 || attachedFiles.length > 0 || imagePreview;
    const activeTool = selectedTool
      ? BRAIN_PROMPT_TOOLS.find((t) => t.id === selectedTool)
      : null;
    const ActiveToolIcon = activeTool?.icon;

    return (
      <div
        className={cn(
          "flex flex-col rounded-[28px] p-2 shadow-sm transition-colors bg-white/95 backdrop-blur-sm border border-black/[0.06] dark:bg-[#303030]/95 dark:border-transparent cursor-text",
          className
        )}
      >
        {(attachedFiles.length > 0 || imagePreview) && (
          <div className="mb-1 flex flex-wrap gap-1.5 px-1">
            {attachedFiles.map((file, i) => {
              const isImage = file.type.startsWith("image/");
              if (isImage) {
                const url = URL.createObjectURL(file);
                return (
                  <div key={`${file.name}-${i}`} className="relative w-fit rounded-[1rem] px-1 pt-1">
                    <button
                      type="button"
                      className="transition-transform"
                      onClick={() => {
                        setImagePreview(url);
                        setIsImageDialogOpen(true);
                      }}
                    >
                      <img
                        src={url}
                        alt={file.name}
                        className="h-14 w-14 rounded-[1rem] object-cover"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveFile?.(i)}
                      className="absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-white/80 text-black transition-colors hover:bg-accent"
                      aria-label="Remover imagem"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              }
              return (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-[#404040] dark:text-gray-200"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveFile?.(i)}
                    className="rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-[#515151]"
                    aria-label="Remover arquivo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {imagePreview && (
          <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
            <DialogContent>
              <img
                src={imagePreview}
                alt="Visualização"
                className="w-full max-h-[95vh] object-contain rounded-[24px]"
              />
            </DialogContent>
          </Dialog>
        )}

        {voiceRecording && voiceRecordingBar ? (
          <div className="px-3 pb-1">{voiceRecordingBar}</div>
        ) : null}

        <textarea
          ref={internalTextareaRef}
          rows={1}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDownInternal}
          placeholder={placeholder}
          disabled={disabled || voiceRecording}
          className="w-full resize-none border-0 bg-transparent p-3 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-300 focus:ring-0 focus-visible:outline-none min-h-12 text-sm leading-relaxed"
          {...props}
        />

        <div className="mt-0.5 p-1 pt-0">
          <TooltipProvider delayDuration={100}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Popover open={isAttachPopoverOpen} onOpenChange={setIsAttachPopoverOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={disabled || voiceRecording}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-foreground dark:text-white transition-colors hover:bg-accent dark:hover:bg-[#515151] focus-visible:outline-none disabled:opacity-40"
                      >
                        <Plus className="h-5 w-5" />
                        <span className="sr-only">Anexar</span>
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow>
                    <p>Anexar arquivo</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent side="top" align="start" className="w-52">
                  <div className="flex flex-col gap-0.5">
                    {BRAIN_PROMPT_ATTACH_TYPES.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          onAttachPick?.(type.accept);
                          setIsAttachPopoverOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left text-sm hover:bg-accent dark:hover:bg-[#515151]"
                      >
                        <type.icon className="h-4 w-4 shrink-0" />
                        <span>{type.label}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onConnectorsClick}
                    disabled={disabled || voiceRecording}
                    className="relative flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm text-foreground dark:text-white transition-colors hover:bg-accent dark:hover:bg-[#515151] focus-visible:outline-none disabled:opacity-40"
                  >
                    <Link2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Conectores</span>
                    {connectorsCount > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-100 px-1 text-[10px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                        {connectorsCount}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" showArrow>
                  <p>Conectores MCP</p>
                </TooltipContent>
              </Tooltip>

              <Popover open={isToolsPopoverOpen} onOpenChange={setIsToolsPopoverOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={disabled || voiceRecording}
                        className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm text-foreground dark:text-white transition-colors hover:bg-accent dark:hover:bg-[#515151] focus-visible:outline-none disabled:opacity-40"
                      >
                        <Settings2 className="h-4 w-4" />
                        {!selectedTool && <span className="hidden sm:inline">Ferramentas</span>}
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow>
                    <p>Busca e ferramentas</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent side="top" align="start" className="w-56">
                  <div className="flex flex-col gap-0.5">
                    {BRAIN_PROMPT_TOOLS.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => {
                          onToolChange?.(tool.id);
                          setIsToolsPopoverOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left text-sm hover:bg-accent dark:hover:bg-[#515151]"
                      >
                        <tool.icon className="h-4 w-4 shrink-0" />
                        <span>{tool.name}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {activeTool && (
                <>
                  <div className="h-4 w-px bg-border dark:bg-gray-600" />
                  <button
                    type="button"
                    onClick={() => onToolChange?.(null)}
                    className="flex h-8 items-center gap-1.5 rounded-full px-2 text-sm text-[#2294ff] dark:text-[#99ceff] transition-colors hover:bg-accent dark:hover:bg-[#3b4045]"
                  >
                    {ActiveToolIcon && <ActiveToolIcon className="h-4 w-4" />}
                    {activeTool.shortName}
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}

              {footerLeftExtra}

              <div className="ml-auto flex items-center gap-1.5">
                {onMicClick ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={onMicClick}
                        disabled={disabled || loading}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-foreground dark:text-white transition-colors hover:bg-accent dark:hover:bg-[#515151] focus-visible:outline-none disabled:opacity-40",
                          voiceRecording && "text-red-500 bg-red-50 dark:bg-red-900/20"
                        )}
                      >
                        <Mic className="h-4 w-4" />
                        <span className="sr-only">Gravar voz</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" showArrow>
                      <p>{voiceRecording ? "Cancelar ditado" : "Ditado por voz"}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : null}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onSend}
                      disabled={!hasValue || loading || sendDisabled || voiceRecording}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80 disabled:bg-black/40 dark:disabled:bg-[#515151]"
                    >
                      <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                      <span className="sr-only">Enviar</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow>
                    <p>{loading ? "Gerando..." : "Enviar"}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </div>
    );
  }
);
PromptBox.displayName = "PromptBox";
