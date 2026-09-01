import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Shield, Brain, Heart, Activity, FileText, Users, TrendingUp, Zap,
  ChevronRight, Star, ArrowRight, Check, Play, Sparkles, Lock,
  Globe, Award, BarChart3, Stethoscope, MessageSquare, Leaf,
  Menu, X, Moon, Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const STATS = [
  { label: "Patients Served", value: "2.4M+", icon: Users },
  { label: "AI Accuracy", value: "94.2%", icon: Brain },
  { label: "Diseases Detected", value: "50+", icon: Activity },
  { label: "Hospitals Partnered", value: "340+", icon: Award },
];

const FEATURES = [
  {
    icon: Brain, title: "AI Disease Prediction",
    description: "Advanced ML models predict 50+ diseases with up to 94% accuracy using multi-modal patient data.",
    gradient: "from-blue-500/20 to-indigo-500/20", iconColor: "text-blue-500",
  },
  {
    icon: FileText, title: "Smart OCR Reports",
    description: "Automatically extract and analyze data from lab reports, prescriptions, and medical documents.",
    gradient: "from-violet-500/20 to-purple-500/20", iconColor: "text-violet-500",
  },
  {
    icon: MessageSquare, title: "AI Health Chatbot",
    description: "24/7 intelligent assistant that answers health queries, explains symptoms, and guides patients.",
    gradient: "from-emerald-500/20 to-teal-500/20", iconColor: "text-emerald-500",
  },
  {
    icon: Leaf, title: "Ayurveda Integration",
    description: "Personalized Ayurvedic wellness plans including Prakriti analysis, diet, yoga, and herbal guidance.",
    gradient: "from-green-500/20 to-lime-500/20", iconColor: "text-green-500",
  },
  {
    icon: Activity, title: "Real-Time Monitoring",
    description: "Track vital signs, lab values, and health trends with interactive dashboards and alerts.",
    gradient: "from-orange-500/20 to-amber-500/20", iconColor: "text-orange-500",
  },
  {
    icon: Lock, title: "HIPAA Compliant",
    description: "Enterprise-grade security with end-to-end encryption, role-based access, and full audit trails.",
    gradient: "from-rose-500/20 to-pink-500/20", iconColor: "text-rose-500",
  },
];

const TESTIMONIALS = [
  {
    name: "Dr. Priya Sharma", role: "Cardiologist, Apollo Hospitals",
    text: "MediGuard AI has transformed how I diagnose and monitor my patients. The predictive accuracy is remarkable.",
    rating: 5, avatar: "PS",
  },
  {
    name: "James Rodriguez", role: "Patient, New York",
    text: "Early detection of my pre-diabetic condition gave me time to make lifestyle changes. MediGuard literally saved my life.",
    rating: 5, avatar: "JR",
  },
  {
    name: "Dr. Chen Wei", role: "Chief Medical Officer, HealthFirst",
    text: "The ML Ops monitoring and model governance features are best-in-class. Our clinical outcomes improved by 23%.",
    rating: 5, avatar: "CW",
  },
];

const FAQS = [
  { q: "How accurate are the AI predictions?", a: "Our AI models achieve 88–94% accuracy depending on the disease, trained on millions of de-identified patient records and continuously improved via MLOps pipelines." },
  { q: "Is my health data secure?", a: "Absolutely. MediGuard AI is fully HIPAA-compliant with AES-256 encryption, zero-knowledge architecture, and strict role-based access controls." },
  { q: "Which diseases can MediGuard AI predict?", a: "We support 50+ conditions including Diabetes, Heart Disease, Hypertension, Cancer risk, Kidney Disease, COPD, and more." },
  { q: "Can it integrate with existing EHR systems?", a: "Yes. Our FHIR-compliant API layer integrates with Epic, Cerner, Meditech, and all major EHR/EMR systems." },
  { q: "What is the Ayurveda module?", a: "It's an AI-powered wellness module that analyses your Prakriti (body constitution) and provides personalised diet, yoga, and herbal recommendations." },
];

const PRICING = [
  {
    name: "Patient", price: "$9", period: "/mo",
    features: ["Disease Prediction", "Report Upload & OCR", "AI Chatbot", "Health Timeline", "Ayurveda Basics"],
    cta: "Start Free Trial", highlight: false,
  },
  {
    name: "Doctor", price: "$49", period: "/mo",
    features: ["All Patient Features", "Multi-Patient Dashboard", "AI Clinical Assistant", "Risk Analytics", "Family Clusters", "Priority Support"],
    cta: "Start Free Trial", highlight: true,
  },
  {
    name: "Enterprise", price: "Custom", period: "",
    features: ["All Doctor Features", "Admin Portal", "MLOps Monitor", "Custom AI Models", "EHR Integration", "Dedicated Support"],
    cta: "Contact Sales", highlight: false,
  },
];

function CountUp({ target, suffix = "" }: { target: string; suffix?: string }) {
  return <span>{target}{suffix}</span>;
}

function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-background/90 backdrop-blur-xl border-b shadow-sm" : "bg-transparent"
      )}
      initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl gradient-primary flex items-center justify-center">
            <Shield className="size-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">MediGuard <span className="text-gradient">AI</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {["Features", "How It Works", "Pricing", "Testimonials", "FAQ"].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`}
              className="text-muted-foreground hover:text-foreground transition-colors">
              {item}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          </Button>
          <Button variant="outline" size="sm" asChild><Link to="/login">Sign In</Link></Button>
          <Button size="sm" asChild className="gradient-primary text-white border-0 hover:opacity-90">
            <Link to="/register">Get Started Free</Link>
          </Button>
        </div>

        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b px-4 py-4 space-y-3">
            {["Features", "Pricing", "FAQ"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="block text-sm py-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>{item}</a>
            ))}
            <Separator />
            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="sm" asChild className="flex-1"><Link to="/login">Sign In</Link></Button>
              <Button size="sm" asChild className="flex-1 gradient-primary text-white border-0"><Link to="/register">Get Started</Link></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

export default function LandingPage() {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, -80]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavBar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div className="absolute -top-40 -right-40 size-[600px] rounded-full bg-primary/10 blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity }} />
          <motion.div className="absolute -bottom-40 -left-40 size-[500px] rounded-full bg-health/10 blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 10, repeat: Infinity }} />
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[700px] rounded-full bg-violet-500/5 blur-3xl"
            animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, oklch(0.5 0.1 254 / 0.08) 1px, transparent 0)`,
          backgroundSize: "40px 40px"
        }} />

        <motion.div style={{ y: heroY }} className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="outline" className="mb-6 gap-2 py-1.5 px-4 text-sm border-primary/30 bg-primary/5">
              <Sparkles className="size-3.5 text-primary" />
              AI-Powered Healthcare Platform
            </Badge>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-balance mb-6"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          >
            Predict. Protect.{" "}
            <span className="text-gradient-health">Heal Better.</span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          >
            MediGuard AI combines cutting-edge machine learning, real-time health monitoring, and Ayurvedic wisdom to deliver personalised healthcare intelligence for patients, doctors, and hospitals.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Button size="lg" asChild className="gradient-primary text-white border-0 hover:opacity-90 h-12 px-8 gap-2 shadow-lg shadow-primary/25">
              <Link to="/register">Start Free Trial <ArrowRight className="size-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 gap-2">
              <Play className="size-4" /> Watch Demo
            </Button>
          </motion.div>

          {/* Floating dashboard preview */}
          <motion.div
            className="mt-16 relative"
            initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="relative mx-auto max-w-4xl">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary via-violet-500 to-health opacity-20 blur-xl" />
              <div className="relative rounded-2xl border bg-card/80 backdrop-blur-sm p-6 shadow-2xl">
                {/* Mock dashboard preview */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Health Score", val: "74/100", color: "text-health" },
                    { label: "Risk Level", val: "Medium", color: "text-warning" },
                    { label: "AI Accuracy", val: "94.2%", color: "text-primary" },
                    { label: "Reports", val: "12", color: "text-violet-500" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-muted/50 p-3 text-center">
                      <div className={`text-xl font-bold ${item.color}`}>{item.val}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
                    </div>
                  ))}
                </div>
                {/* Mock chart bars */}
                <div className="h-24 flex items-end gap-2 px-2">
                  {[60, 75, 55, 80, 70, 90, 65, 85, 75, 88, 72, 94].map((h, i) => (
                    <motion.div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-primary to-primary/40"
                      initial={{ height: 0 }} animate={{ height: `${h}%` }}
                      transition={{ duration: 0.5, delay: 0.8 + i * 0.05 }} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-20 border-y bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <motion.div key={stat.label} className="text-center"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="text-4xl font-extrabold text-gradient mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">Features</Badge>
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">Everything healthcare needs</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A complete AI healthcare platform built for patients, doctors, and administrators — all in one place.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Card className="h-full hover:shadow-lg transition-all duration-300 group border-border/50 hover:border-primary/20">
                <CardContent className="p-6 space-y-4">
                  <div className={cn("size-12 rounded-2xl flex items-center justify-center bg-gradient-to-br", f.gradient)}>
                    <f.icon className={cn("size-6", f.iconColor)} />
                  </div>
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">How It Works</Badge>
            <h2 className="text-4xl font-extrabold tracking-tight mb-4">Simple, intelligent, effective</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create Your Profile", desc: "Sign up and complete your health profile with medical history, medications, and lifestyle data.", icon: Users },
              { step: "02", title: "Run AI Analysis", desc: "Our models analyse your data, identify risk factors, and generate personalised health predictions.", icon: Brain },
              { step: "03", title: "Get Actionable Insights", desc: "Receive detailed reports, doctor recommendations, and personalised wellness plans.", icon: TrendingUp },
            ].map((item, i) => (
              <motion.div key={item.step} className="text-center relative"
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.2 }}>
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-2/3 right-0 h-0.5 border-t-2 border-dashed border-primary/30" />
                )}
                <div className="size-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                  <item.icon className="size-7 text-white" />
                </div>
                <div className="text-xs font-bold text-primary mb-2">{item.step}</div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">Testimonials</Badge>
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">Trusted by healthcare leaders</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Card className="h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-1">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="size-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-2 border-t">
                    <div className="size-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm">
                      {t.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">Pricing</Badge>
            <h2 className="text-4xl font-extrabold tracking-tight mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">Start free, scale as you grow. No hidden fees.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PRICING.map((plan, i) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Card className={cn("relative h-full", plan.highlight && "border-primary shadow-xl shadow-primary/10")}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="gradient-primary text-white border-0 px-4">Most Popular</Badge>
                    </div>
                  )}
                  <CardContent className="p-6 flex flex-col gap-6">
                    <div>
                      <div className="font-bold text-lg">{plan.name}</div>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-4xl font-extrabold">{plan.price}</span>
                        <span className="text-muted-foreground">{plan.period}</span>
                      </div>
                    </div>
                    <ul className="space-y-2.5 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <Check className="size-4 text-success shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button className={cn("w-full", plan.highlight ? "gradient-primary text-white border-0 hover:opacity-90" : "")}
                      variant={plan.highlight ? "default" : "outline"} asChild>
                      <Link to="/register">{plan.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 max-w-3xl mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">FAQ</Badge>
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">Frequently asked questions</h2>
        </div>
        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="relative rounded-3xl overflow-hidden p-12 shadow-2xl">
              <div className="absolute inset-0 gradient-health opacity-90" />
              <div className="relative z-10 text-white space-y-6">
                <h2 className="text-4xl font-extrabold tracking-tight">Ready to transform healthcare?</h2>
                <p className="text-white/80 text-lg">Join 2.4M+ patients and 5,000+ doctors already using MediGuard AI.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" asChild className="h-12 px-8 gap-2">
                    <Link to="/register">Get Started Free <ArrowRight className="size-4" /></Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="h-12 px-8 border-white/30 text-white hover:bg-white/10">
                    <Link to="/login">Sign In</Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="size-8 rounded-xl gradient-primary flex items-center justify-center">
                  <Shield className="size-4 text-white" />
                </div>
                <span className="font-bold text-lg">MediGuard AI</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI-powered healthcare intelligence for better patient outcomes.
              </p>
            </div>
            {[
              { title: "Product", links: ["Features", "Pricing", "Security", "Roadmap"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
              { title: "Legal", links: ["Privacy Policy", "Terms of Service", "HIPAA Compliance", "Cookie Policy"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold mb-3 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Separator className="mb-6" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <span>© 2024 MediGuard AI. All rights reserved.</span>
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-health" />
              <span>HIPAA Compliant · SOC 2 Certified · ISO 27001</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
