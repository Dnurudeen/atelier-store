"use client";

import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="container-atelier py-12 md:py-16">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-crimson uppercase">Get in touch</p>
          <h1 className="mt-2 font-display text-4xl">Contact us</h1>
          <p className="mt-4 text-muted leading-relaxed">
            Questions about an order, a maker, or selling on Atelier? Send a note. Our team responds within
            two business days.
          </p>
          <dl className="mt-8 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-foreground">Email</dt>
              <dd className="text-muted">hello@atelierstore.studio</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Studio hours</dt>
              <dd className="text-muted">Monday to Friday, 9:00 to 18:00 WAT</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Address</dt>
              <dd className="text-muted">Lagos, Nigeria</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-surface/40 p-6 md:p-8">
          {submitted ? (
            <div className="py-8 text-center">
              <p className="font-display text-2xl">Message received</p>
              <p className="mt-2 text-sm text-muted">Thanks for reaching out. We&apos;ll be in touch shortly.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Name</label>
                <Input name="name" required placeholder="Your name" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Email</label>
                <Input name="email" type="email" required placeholder="you@example.com" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Subject</label>
                <Input name="subject" required placeholder="How can we help?" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Message</label>
                <Textarea name="message" required rows={5} placeholder="Tell us more…" />
              </div>
              <Button type="submit" className="w-full">
                Send message
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
