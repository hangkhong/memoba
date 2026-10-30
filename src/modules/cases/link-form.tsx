"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { relationTypeSchema } from "./schema";
import { inputLimits } from "@/lib/contracts/limits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/option-select";
const schema=z.object({target:z.uuid(),relation:relationTypeSchema,reason:z.string().trim().min(1).max(inputLimits.text),archiveTarget:z.boolean()}).refine((input)=>!input.archiveTarget||input.relation==="supersedes");
const relations=[{value:"related_to" as const,label:"Related to"},{value:"contrasts_with" as const,label:"Contrasts with"},{value:"supersedes" as const,label:"Supersedes"}];
export function LinkForm({caseId,cases}:{caseId:string;cases:{id:string;title:string}[]}) {
 const router=useRouter();const[message,setMessage]=useState("");const form=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema),defaultValues:{target:"",relation:"related_to",reason:"",archiveTarget:false}});
 async function submit(input:z.infer<typeof schema>){try{const result=await fetch(`/api/cases/${caseId}/links`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});setMessage(result.ok?"Link saved.":"Cannot save link. Check the selected relation and access.");if(result.ok){form.reset();router.refresh();}}catch{setMessage("Connection unavailable.");}}
 const field="space-y-1.5";
 return <form onSubmit={form.handleSubmit(submit)} className="mt-4 space-y-3 border-t pt-4"><h3 className="text-sm font-medium">Link a case</h3>
  <div className={field}><Label htmlFor="linked-case">Case</Label><Controller control={form.control} name="target" render={({field})=><OptionSelect id="linked-case" items={cases.map((item)=>({value:item.id,label:item.title}))} value={field.value||null} placeholder="Choose a case" className="w-full" invalid={!!form.formState.errors.target} onValueChange={field.onChange}/>}/></div>
  <div className={field}><Label htmlFor="relation">Relation</Label><Controller control={form.control} name="relation" render={({field})=><OptionSelect id="relation" items={relations} value={field.value} className="w-full" onValueChange={field.onChange}/>}/></div>
  <div className={field}><Label htmlFor="link-reason">Reason</Label><Input id="link-reason" required maxLength={inputLimits.text} {...form.register("reason")}/></div>
  <div className="flex items-start gap-2"><Controller control={form.control} name="archiveTarget" render={({field})=><Checkbox id="archive-target" className="mt-0.5" checked={field.value} onCheckedChange={field.onChange}/>}/><Label htmlFor="archive-target" className="font-normal leading-5">Also archive the selected case when this case supersedes it</Label></div>
  {Object.keys(form.formState.errors).length>0&&<p role="alert" className="text-xs text-destructive">Choose a case and reason. Archiving requires a supersedes relation.</p>}
  <Button size="sm" variant="outline" disabled={form.formState.isSubmitting}>Save link</Button>{message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}</form>;
}
