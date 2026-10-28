"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { relationTypeSchema } from "./schema";
import { inputLimits } from "@/lib/contracts/limits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const schema=z.object({target:z.uuid(),relation:relationTypeSchema,reason:z.string().trim().min(1).max(inputLimits.text),archiveTarget:z.boolean()}).refine((input)=>!input.archiveTarget||input.relation==="supersedes");
export function LinkForm({caseId,cases}:{caseId:string;cases:{id:string;title:string}[]}) {
 const router=useRouter();const[message,setMessage]=useState("");const form=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema),defaultValues:{target:"",relation:"related_to",reason:"",archiveTarget:false}});
 async function submit(input:z.infer<typeof schema>){try{const result=await fetch(`/api/cases/${caseId}/links`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});setMessage(result.ok?"Link saved.":"Cannot save link. Check the selected relation and access.");if(result.ok)router.refresh();}catch{setMessage("Connection unavailable.");}}
 return <form onSubmit={form.handleSubmit(submit)} className="my-5 space-y-3 rounded border p-4"><h3 className="font-medium">Link a case</h3><Label htmlFor="linked-case">Case</Label><select id="linked-case" required className="block w-full rounded border p-2" {...form.register("target")}><option value="">Choose a case</option>{cases.map((item)=><option key={item.id} value={item.id}>{item.title}</option>)}</select><Label htmlFor="relation">Relation</Label><select id="relation" className="block w-full rounded border p-2" {...form.register("relation")}><option value="related_to">Related to</option><option value="contrasts_with">Contrasts with</option><option value="supersedes">Supersedes</option></select><Label htmlFor="link-reason">Reason</Label><Input id="link-reason" required maxLength={inputLimits.text} {...form.register("reason")}/><label className="flex gap-2"><input type="checkbox" {...form.register("archiveTarget")}/>Also archive the selected case when this case supersedes it</label>{Object.keys(form.formState.errors).length>0&&<p role="alert">Choose a case and reason. Archiving requires a supersedes relation.</p>}<Button disabled={form.formState.isSubmitting}>Save link</Button>{message && <p role="status">{message}</p>}</form>;
}
