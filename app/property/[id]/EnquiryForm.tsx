"use client";

import { FormEvent, useState } from "react";
import { Check, CircleAlert, Loader2, Send } from "lucide-react";
import { supabase } from "../../../lib/supabase";

export default function EnquiryForm({listingId}:{listingId:string}) {
  const [busy,setBusy]=useState(false);const [sent,setSent]=useState(false);const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");const form=new FormData(event.currentTarget);const {error}=await supabase.functions.invoke("submit-property-enquiry",{body:{listing_id:listingId,name:form.get("name"),phone:form.get("phone"),email:form.get("email"),message:form.get("message"),preferred_visit_date:form.get("visit_date"),website:form.get("website")}});setBusy(false);if(error)setError("Your enquiry could not be sent. Please try again.");else setSent(true);}
  if(sent)return <div className="enquiry-success"><Check/><h2>Enquiry sent</h2><p>The property owner will receive your details in their ReelEstate dashboard.</p></div>;
  return <form className="property-enquiry-form" onSubmit={submit}><span className="eyebrow">Interested in this property?</span><h2>Request a callback or visit</h2><div className="form-grid two"><label>Your name<input name="name" autoComplete="name" minLength={2} maxLength={120} required/></label><label>Mobile number<input name="phone" inputMode="tel" autoComplete="tel" required/></label><label>Email (optional)<input name="email" type="email" autoComplete="email"/></label><label>Preferred visit date<input name="visit_date" type="date" min={new Date().toISOString().slice(0,10)}/></label></div><label>Message<textarea name="message" maxLength={1000} placeholder="I would like more information about this property."/></label><label className="website-trap" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>{error&&<div className="form-error"><CircleAlert/>{error}</div>}<button className="primary full" disabled={busy}>{busy?<Loader2 className="spin"/>:<Send/>}{busy?"Sending…":"Send enquiry"}</button></form>;
}
