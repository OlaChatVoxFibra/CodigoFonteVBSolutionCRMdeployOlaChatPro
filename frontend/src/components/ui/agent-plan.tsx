"use client";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


import React, { useMemo, useState } from "react";
import { CheckCircle2, Circle, CircleAlert, CircleDotDashed, CircleX } from "lucide-react";
 
 type Subtask = {
   id: string;
   title: string;
   description: string;
   status: "pending" | "in-progress" | "completed" | "need-help" | "cancelled";
   priority: "low" | "medium" | "high";
   tools?: string[];
 };
 
 type Task = {
   id: string;
   title: string;
   description: string;
   status: "pending" | "in-progress" | "completed" | "need-help" | "cancelled";
   priority: "low" | "medium" | "high";
   level: number;
   dependencies: string[];
   subtasks: Subtask[];
 };
 
 const initialTasks: Task[] = [
   {
     id: "1",
     title: "Research Project Requirements",
     description: "Gather all necessary information about project scope and requirements",
     status: "in-progress",
     priority: "high",
     level: 0,
     dependencies: [],
     subtasks: [
       {
         id: "1.1",
         title: "Interview stakeholders",
         description: "Conduct interviews with key stakeholders to understand needs",
         status: "completed",
         priority: "high",
         tools: ["communication-agent", "meeting-scheduler"]
       },
       {
         id: "1.2",
         title: "Review existing documentation",
         description: "Go through all available documentation and extract requirements",
         status: "in-progress",
         priority: "medium",
         tools: ["file-system", "browser"]
       },
       {
         id: "1.3",
         title: "Compile findings report",
         description: "Create a comprehensive report of all gathered information",
         status: "need-help",
         priority: "medium",
         tools: ["file-system", "markdown-processor"]
       }
     ]
   },
   {
     id: "2",
     title: "Design System Architecture",
     description: "Create the overall system architecture based on requirements",
     status: "in-progress",
     priority: "high",
     level: 0,
     dependencies: [],
     subtasks: [
       {
         id: "2.1",
         title: "Define component structure",
         description: "Map out all required components and their interactions",
         status: "pending",
         priority: "high",
         tools: ["architecture-planner", "diagramming-tool"]
       },
       {
         id: "2.2",
         title: "Create data flow diagrams",
         description: "Design diagrams showing how data will flow through the system",
         status: "pending",
         priority: "medium",
         tools: ["diagramming-tool", "file-system"]
       },
       {
         id: "2.3",
         title: "Document API specifications",
         description: "Write detailed specifications for all APIs in the system",
         status: "pending",
         priority: "high",
         tools: ["api-designer", "openapi-generator"]
       }
     ]
   },
   {
     id: "3",
     title: "Implementation Planning",
     description: "Create a detailed plan for implementing the system",
     status: "pending",
     priority: "medium",
     level: 1,
     dependencies: ["1", "2"],
     subtasks: [
       {
         id: "3.1",
         title: "Resource allocation",
         description: "Determine required resources and allocate them to tasks",
         status: "pending",
         priority: "medium",
         tools: ["project-manager", "resource-calculator"]
       },
       {
         id: "3.2",
         title: "Timeline development",
         description: "Create a timeline with milestones and deadlines",
         status: "pending",
         priority: "high",
         tools: ["timeline-generator", "gantt-chart-creator"]
       },
       {
         id: "3.3",
         title: "Risk assessment",
         description: "Identify potential risks and develop mitigation strategies",
         status: "pending",
         priority: "medium",
         tools: ["risk-analyzer"]
       }
     ]
   }
 ];
 
 function StatusIcon({ status }: { status: Task["status"] | Subtask["status"] }) {
   const cls = "w-4 h-4";
   if (status === "completed") return <CheckCircle2 className={`${cls} text-emerald-600`} />;
   if (status === "in-progress") return <CircleDotDashed className={`${cls} text-indigo-600`} />;
   if (status === "need-help") return <CircleAlert className={`${cls} text-amber-600`} />;
   if (status === "cancelled") return <CircleX className={`${cls} text-rose-600`} />;
   return <Circle className={`${cls} text-slate-400`} />;
 }
 
 function PriorityBadge({ priority }: { priority: Task["priority"] }) {
   const map: Record<Task["priority"], string> = {
     high: "bg-rose-50 text-rose-700 border-rose-200",
     medium: "bg-amber-50 text-amber-700 border-amber-200",
     low: "bg-slate-50 text-slate-700 border-slate-200"
   };
   return (
     <span className={`text-xs px-2 py-1 rounded-full border ${map[priority]}`}>
       {priority}
     </span>
   );
 }
 
 export default function AgentPlan() {
   const [tasks, setTasks] = useState<Task[]>(initialTasks);
   const [openTaskId, setOpenTaskId] = useState<string | null>(null);
   const [filter, setFilter] = useState<"all" | "pending" | "in-progress" | "completed" | "need-help" | "cancelled">("all");
 
   const filtered = useMemo(() => {
     if (filter === "all") return tasks;
     return tasks.filter(t => t.status === filter);
   }, [tasks, filter]);
 
   const toggleSubtask = (taskId: string, subId: string) => {
     setTasks(prev =>
       prev.map(t => {
         if (t.id !== taskId) return t;
         const subtasks = t.subtasks.map(s => {
           if (s.id !== subId) return s;
           const next = s.status === "completed" ? "pending" : "completed";
           return { ...s, status: next };
         });
         const allDone = subtasks.every(s => s.status === "completed");
         const nextStatus: Task["status"] = allDone ? "completed" : t.status === "completed" ? "in-progress" : t.status;
         return { ...t, subtasks, status: nextStatus };
       })
     );
   };
 
   return (
     <div className="w-full">
       <div className="mb-3 flex items-center justify-between">
         <h3 className="text-sm font-semibold text-slate-700">Plano do Agente</h3>
         <div className="flex gap-1">
           {["all", "pending", "in-progress", "completed"].map(k => (
             <button
               key={k}
               onClick={() => setFilter(k as any)}
               className={`text-xs px-2 py-1 rounded border ${
                 filter === k ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
               }`}
             >
               {k}
             </button>
           ))}
         </div>
       </div>
 
       <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
             {filtered.map(task => (
               <div key={task.id} className="border-b last:border-b-0 border-slate-100">
                 <button
                   onClick={() => setOpenTaskId(prev => (prev === task.id ? null : task.id))}
                   className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50"
                 >
                   <StatusIcon status={task.status} />
                   <div className="flex-1">
                     <div className="flex items-center gap-2">
                       <span className="text-sm font-medium text-slate-800">{task.title}</span>
                       <PriorityBadge priority={task.priority} />
                     </div>
                     <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                   </div>
                 </button>
                 {openTaskId === task.id && (
                   <div className="px-6 pb-4">
                     <ul className="space-y-2">
                       {task.subtasks.map(st => (
                         <li key={st.id} className="flex items-start gap-3">
                           <button
                             onClick={() => toggleSubtask(task.id, st.id)}
                             className="mt-0.5"
                             aria-label="toggle-subtask"
                           >
                             <StatusIcon status={st.status} />
                           </button>
                           <div className="flex-1">
                             <div className="flex items-center gap-2">
                               <span className="text-sm text-slate-800">{st.title}</span>
                               <PriorityBadge priority={st.priority} />
                             </div>
                             <p className="text-xs text-slate-500">{st.description}</p>
                             {st.tools && st.tools.length > 0 && (
                               <div className="mt-1 flex flex-wrap gap-1">
                                 {st.tools.map(t => (
                                   <span
                                     key={t}
                                     className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                                   >
                                     {t}
                                   </span>
                                 ))}
                               </div>
                             )}
                           </div>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
               </div>
             ))}
       </div>
     </div>
   );
 }
 
