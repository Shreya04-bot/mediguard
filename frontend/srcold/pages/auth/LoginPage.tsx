import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Shield, Loader2, Sparkles, Heart, Brain, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "doctor", "patient"] as const),
});

type FormData = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { role: "admin" as UserRole, email: "admin@mediguard.ai", label: "Admin Demo", color: "from-violet-500 to-purple-600" },
  { role: "doctor" as UserRole, email: "doctor@mediguard.ai", label: "Doctor Demo", color: "from-blue-500 to-cyan-600" },
  { role: "patient" as UserRole, email: "patient@mediguard.ai", label: "Patient Demo", color: "from-emerald-500 to-teal-600" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "patient" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password, data.role);
      toast.success("Welcome back to MediGuard AI!");
      navigate(`/dashboard/${data.role}`);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "DOCTOR_PENDING_APPROVAL") {
        toast.error("Your account is still pending admin verification. We'll notify you once it's approved.");
      } else {
        const message = (err as { message?: string })?.message;
        toast.error(message || "Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = async (account: typeof DEMO_ACCOUNTS[0]) => {
    setLoading(true);
    try {
      await login(account.email, "demo1234", account.role);
      toast.success(`Welcome! Logged in as ${account.label}`);
      navigate(`/dashboard/${account.role}`);
    } catch {
      toast.error("Demo login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-[480px] bg-gradient-to-br from-primary via-blue-600 to-health p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div key={i} className="absolute rounded-full bg-white/5"
              style={{ width: `${100 + i * 80}px`, height: `${100 + i * 80}px`, top: `${10 + i * 15}%`, left: `${5 + i * 10}%` }}
              animate={{ y: [0, -20, 0], rotate: [0, 180, 360] }}
              transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "linear" }} />
          ))}
        </div>
        <div className="relative z-10 flex flex-col h-full">
          <Link to="/" className="flex items-center gap-2.5 mb-16">
            <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Shield className="size-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">MediGuard AI</span>
          </Link>
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight">
              Your AI health guardian awaits
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-10">
              Access personalised predictions, smart reports, and AI-powered health insights.
            </p>
            {[
              { icon: Brain, text: "AI-powered disease prediction with 94% accuracy" },
              { icon: Heart, text: "Real-time health monitoring and risk alerts" },
              { icon: Activity, text: "Personalised wellness plans and Ayurvedic guidance" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 mb-4">
                <div className="size-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <item.icon className="size-4 text-white" />
                </div>
                <span className="text-white/80 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs">© 2024 MediGuard AI · HIPAA Compliant</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
              <div className="size-10 rounded-xl gradient-primary flex items-center justify-center">
                <Shield className="size-5 text-white" />
              </div>
              <span className="font-bold text-xl">MediGuard AI</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          {/* Demo account buttons */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {DEMO_ACCOUNTS.map((acc) => (
              <Button key={acc.role} variant="outline" size="sm" className="text-xs gap-1.5 h-9"
                onClick={() => loginAsDemo(acc)} disabled={loading}>
                <div className={`size-2 rounded-full bg-gradient-to-r ${acc.color}`} />
                {acc.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or sign in manually</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register("email")}
                aria-invalid={!!errors.email} className={cn(errors.email && "border-destructive")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter password"
                  {...register("password")} aria-invalid={!!errors.password}
                  className={cn("pr-10", errors.password && "border-destructive")} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select defaultValue="patient" onValueChange={(v) => setValue("role", v as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
            </div>

            <Button type="submit" className="w-full gradient-primary text-white border-0 hover:opacity-90 h-11" disabled={loading}>
              {loading ? <><Loader2 className="size-4 animate-spin mr-2" />Signing in...</> : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">Create account</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
