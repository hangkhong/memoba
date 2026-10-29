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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
const schema=z.object({target:z.uuid(),relation:relationTypeSchema,reason:z.string().trim().min(1).max(inputLimits.text),archiveTarget:z.boolean()}).refine((input)=>!input.archiveTarget||input.relation==="supersedes");
export function LinkForm({caseId,cases}:{caseId:string;cases:{id:string;title:string}[]}) {
 const router=useRouter();const[message,setMessage]=useState("");const form=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema),defaultValues:{target:"",relation:"related_to",reason:"",archiveTarget:false}});
 async function submit(input:z.infer<typeof schema>){try{const result=await fetch(`/api/cases/${caseId}/links`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});setMessage(result.ok?"Link saved.":"Cannot save link. Check the selected relation and access.");if(result.ok)router.refresh();}catch{setMessage("Connection unavailable.");}}
 return <form onSubmit={form.handleSubmit(submit)} className="my-5 space-y-3 rounded border p-4"><h3 className="font-medium">Link a case</h3><Label htmlFor="linked-case">Case</Label><NativeSelect id="linked-case" required className="w-full" {...form.register("target")}><NativeSelectOption value="">Choose a case</NativeSelectOption>{cases.map((item)=><NativeSelectOption key={item.id} value={item.id}>{item.title}</NativeSelectOption>)}</NativeSelect><Label htmlFor="relation">Relation</Label><NativeSelect id="relation" className="w-full" {...form.register("relation")}><NativeSelectOption value="related_to">Related to</NativeSelectOption><NativeSelectOption value="contrasts_with">Contrasts with</NativeSelectOption><NativeSelectOption value="supersedes">Supersedes</NativeSelectOption></NativeSelect><Label htmlFor="link-reason">Reason</Label><Input id="link-reason" required maxLength={inputLimits.text} {...form.register("reason")}/><label className="flex gap-2"><input type="checkbox" {...form.register("archiveTarget")}/>Also archive the selected case when this case supersedes it</label>{Object.keys(form.formState.errors).length>0&&<p role="alert">Choose a case and reason. Archiving requires a supersedes relation.</p>}<Button disabled={form.formState.isSubmitting}>Save link</Button>{message && <p role="status">{message}</p>}</form>;
}
