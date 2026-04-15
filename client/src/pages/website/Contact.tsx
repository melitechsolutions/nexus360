import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WebsiteNav } from "./WebsiteNav";
import { WebsiteFooter } from "./WebsiteFooter";
import { ArrowRight, Zap, Mail, Phone, MapPin, Send, CheckCircle, Clock, MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc";

type FormState = "idle" | "submitting" | "success" | "error";

export default function Contact() {
  const [, navigate] = useLocation();
  const [formState, setFormState] = useState<FormState>("idle");
  const [form, setForm] = useState({ name: "", email: "", company: "", subject: "", message: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submitMutation = trpc.websiteContact.submit.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("submitting");
    try {
      await submitMutation.mutateAsync({
        name: form.name,
        email: form.email,
        company: form.company || undefined,
        subject: form.subject,
        message: form.message,
      });
      setFormState("success");
    } catch {
      setFormState("error");
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <WebsiteNav />

      {/* Hero */}
      <section className="relative pt-32 pb-16 lg:pt-44 lg:pb-24 overflow-hidden bg-gradient-to-b from-indigo-50/80 via-white to-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-indigo-100/60 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 bg-indigo-50 text-indigo-600 border border-indigo-200">
            <MessageSquare className="mr-1.5 h-3 w-3" /> We'd love to hear from you
          </Badge>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 leading-none">
            Let's start a{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              conversation
            </span>
          </h1>
          <p className="text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
            Whether you have a question, need a demo, or are ready to get started — our team is here to help.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="pb-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">

            {/* Sidebar info */}
            <div className="space-y-6">
              {[
                { icon: Mail, label: "Email us", value: "hello@nexus360.app", sub: "We respond within 4 business hours" },
                { icon: Phone, label: "Call us", value: "+254 700 000 000", sub: "Mon–Fri, 8am–6pm EAT" },
                { icon: MapPin, label: "Office", value: "Nairobi, Kenya", sub: "Westlands Business District" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                      <Icon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                      <p className="font-semibold text-sm">{item.value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-indigo-700">Response times</span>
                </div>
                <ul className="space-y-2 text-xs text-gray-500">
                  <li>Sales inquiries: within 2 business hours</li>
                  <li>Support tickets: within 4 hours (Pro) / 24h (Starter)</li>
                  <li>Enterprise: dedicated account manager</li>
                </ul>
              </div>
            </div>

            {/* Contact form */}
            <div className="lg:col-span-2">
              {formState === "success" ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center rounded-2xl border border-emerald-200 bg-emerald-50/50">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-6">
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-black mb-3">Message sent!</h3>
                  <p className="text-gray-500 mb-8 max-w-sm">
                    Thanks for reaching out. A member of our team will be in touch shortly.
                  </p>
                  <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => navigate("/")}>
                    Back to Home
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-8 space-y-5 shadow-sm">
                  <h2 className="text-xl font-bold mb-1">Send us a message</h2>
                  <p className="text-sm text-gray-400 mb-6">Fill out the form and we'll get back to you promptly.</p>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-600 text-sm">Full name *</Label>
                      <Input
                        id="name"
                        name="name"
                        required
                        placeholder="Jane Doe"
                        value={form.name}
                        onChange={handleChange}
                        className="border-gray-300 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-600 text-sm">Work email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="jane@company.com"
                        value={form.email}
                        onChange={handleChange}
                        className="border-gray-300 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-gray-600 text-sm">Company name</Label>
                      <Input
                        id="company"
                        name="company"
                        placeholder="Acme Corp"
                        value={form.company}
                        onChange={handleChange}
                        className="border-gray-300 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-gray-600 text-sm">Subject *</Label>
                      <select
                        id="subject"
                        name="subject"
                        required
                        value={form.subject}
                        onChange={handleChange}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">Select a topic…</option>
                        <option value="demo">Request a demo</option>
                        <option value="pricing">Pricing inquiry</option>
                        <option value="support">Technical support</option>
                        <option value="partnership">Partnership</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-gray-600 text-sm">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      placeholder="Tell us about your business and what you're looking for…"
                      value={form.message}
                      onChange={handleChange}
                      className="border-gray-300 focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={formState === "submitting"}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6"
                  >
                    {formState === "submitting" ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Sending…
                      </>
                    ) : (
                      <>
                        Send Message <Send className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-xs text-gray-400">
                    By submitting this form you agree to our Privacy Policy. We won't share your data.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}
