import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Eye, EyeOff, Shield, Loader2, User, Stethoscope, CheckCircle2,
  Mail, ArrowLeft, Clock, BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  InputOTP, InputOTPGroup, InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import { useAuth, type UserRole } from "@/context/AuthContext";
import {
  sendRegistrationOtpApi, verifyRegistrationOtpApi,
} from "@/services/authService";
import { toast } from "sonner";

type RegisterableRole = Exclude<UserRole, "admin">;

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    role: z.enum(["doctor", "patient"] as const),
    medicalLicenseNumber: z.string().optional(),
    hospitalAffiliation: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match", path: ["confirmPassword"],
  })
  .refine((d) => d.role !== "doctor" || !!d.medicalLicenseNumber?.trim(), {
    message: "Medical license number is required for doctor accounts", path: ["medicalLicenseNumber"],
  })
  .refine((d) => d.role !== "doctor" || !!d.hospitalAffiliation?.trim(), {
    message: "Hospital affiliation is required for doctor accounts", path: ["hospitalAffiliation"],
  });

type FormData = z.infer<typeof schema>;

const ROLES: { value: RegisterableRole; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { value: "patient", label: "Patient", desc: "Personal health tracking", icon: User, color: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" },
  { value: "doctor", label: "Doctor", desc: "Clinical management", icon: Stethoscope, color: "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" },
];

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

type Step = "details" | "otp" | "pending" | "success";

export default function RegisterPage() {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RegisterableRole>("patient");
  const [step, setStep] = useState<Step>("details");
  const [pendingData, setPendingData] = useState<FormData | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "patient" },
  });

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // Step 1: validate the form, then send an OTP to the given email
  // before we ever create an account with it.
  const onDetailsSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await sendRegistrationOtpApi(data.email);
      setPendingData(data);
      setOtp("");
      setOtpError(null);
      setStep("otp");
      startCooldown();
      toast.success(`Verification code sent to ${data.email}`);
    } catch (err) {
      const message = (err as { message?: string })?.message || "Could not send verification code.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingData || cooldown > 0) return;
    setLoading(true);
    try {
      await sendRegistrationOtpApi(pendingData.email);
      setOtp("");
      setOtpError(null);
      startCooldown();
      toast.success("A new code has been sent.");
    } catch (err) {
      const message = (err as { message?: string })?.message || "Could not resend code.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify the OTP, then create the account with the returned
  // verification token so the backend knows the email was confirmed.
  const onVerifyOtp = async () => {
    if (!pendingData || otp.length !== OTP_LENGTH) return;
    setLoading(true);
    setOtpError(null);
    try {
      const { verificationToken } = await verifyRegistrationOtpApi(pendingData.email, otp);

      const result = await authRegister({
        name: pendingData.name,
        email: pendingData.email,
        password: pendingData.password,
        role: pendingData.role,
        verificationToken,
        ...(pendingData.role === "doctor"
          ? {
              medicalLicenseNumber: pendingData.medicalLicenseNumber,
              hospitalAffiliation: pendingData.hospitalAffiliation,
            }
          : {}),
      });

      if (result.pending) {
        setStep("pending");
        return;
      }

      setStep("success");
      toast.success("Account created! Welcome to MediGuard AI.");
      setTimeout(() => navigate(`/dashboard/${pendingData.role}`), 900);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      const message = (err as { message?: string })?.message || "Verification failed. Please try again.";
      if (code === "OTP_INCORRECT" || code === "OTP_EXPIRED") {
        setOtpError(message);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role: RegisterableRole) => {
    setSelectedRole(role);
    setValue("role", role);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <motion.div className="w-full max-w-lg" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="size-9 rounded-xl gradient-primary flex items-center justify-center">
              <Shield className="size-4 text-white" />
            </div>
            <span className="font-bold text-lg">MediGuard AI</span>
          </Link>
          {step === "details" && (
            <>
              <h1 className="text-3xl font-extrabold tracking-tight mb-2">Create your account</h1>
              <p className="text-muted-foreground">Start your AI health journey today — free forever</p>
            </>
          )}
        </div>

        {step === "details" && (
          <>
            <form onSubmit={handleSubmit(onDetailsSubmit)} className="space-y-5">
              {/* Role selector */}
              <div className="space-y-2">
                <Label>I am a...</Label>
                <div className="grid grid-cols-2 gap-3">
                  {ROLES.map((role) => (
                    <button key={role.value} type="button"
                      className={cn("rounded-xl border-2 p-3 text-center transition-all", selectedRole === role.value ? role.color + " border-current" : "border-border hover:border-primary/30 text-foreground")}
                      onClick={() => handleRoleSelect(role.value)}>
                      <role.icon className="size-5 mx-auto mb-1.5 text-current" />
                      <div className="text-xs font-semibold">{role.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{role.desc}</div>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Signing up as an administrator? Admin accounts are invite-only — ask your platform admin to add you.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Dr. Jane Smith" {...register("name")} aria-invalid={!!errors.name}
                  className={cn(errors.name && "border-destructive")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-email">Email</Label>
                <Input id="reg-email" type="email" placeholder="you@example.com" {...register("email")} aria-invalid={!!errors.email}
                  className={cn(errors.email && "border-destructive")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {selectedRole === "doctor" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-4 rounded-xl border border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-4"
                >
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <BadgeCheck className="size-4" />
                    <span className="text-xs font-semibold">Doctor verification details</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="medicalLicenseNumber">Medical License Number</Label>
                    <Input id="medicalLicenseNumber" placeholder="e.g. MCI-123456"
                      {...register("medicalLicenseNumber")} aria-invalid={!!errors.medicalLicenseNumber}
                      className={cn(errors.medicalLicenseNumber && "border-destructive")} />
                    {errors.medicalLicenseNumber && <p className="text-xs text-destructive">{errors.medicalLicenseNumber.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="hospitalAffiliation">Hospital / Clinic Affiliation</Label>
                    <Input id="hospitalAffiliation" placeholder="e.g. Apollo Hospitals, Lucknow"
                      {...register("hospitalAffiliation")} aria-invalid={!!errors.hospitalAffiliation}
                      className={cn(errors.hospitalAffiliation && "border-destructive")} />
                    {errors.hospitalAffiliation && <p className="text-xs text-destructive">{errors.hospitalAffiliation.message}</p>}
                  </div>
                  <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80">
                    Doctor accounts are reviewed by an admin before you can sign in. This usually takes 1–2 business days.
                  </p>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Input id="reg-password" type={showPassword ? "text" : "password"} placeholder="Min 8 characters"
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
                  <Label htmlFor="confirm-password">Confirm</Label>
                  <Input id="confirm-password" type="password" placeholder="Repeat password"
                    {...register("confirmPassword")} aria-invalid={!!errors.confirmPassword}
                    className={cn(errors.confirmPassword && "border-destructive")} />
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                </div>
              </div>

              <Button type="submit" className="w-full gradient-primary text-white border-0 hover:opacity-90 h-11" disabled={loading}>
                {loading ? <><Loader2 className="size-4 animate-spin mr-2" />Sending code...</> : "Continue"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By creating an account, you agree to our{" "}
                <a href="#" className="text-primary hover:underline">Terms of Service</a> and{" "}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
              </p>
            </form>

            <Separator className="my-6" />
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </>
        )}

        {step === "otp" && pendingData && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="size-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
              <p className="text-muted-foreground text-sm">
                Enter the {OTP_LENGTH}-digit code we sent to <strong className="text-foreground">{pendingData.email}</strong>
              </p>
            </div>

            <div className="flex justify-center">
              <InputOTP
                maxLength={OTP_LENGTH}
                value={otp}
                onChange={(value) => { setOtp(value); setOtpError(null); }}
                disabled={loading}
              >
                <InputOTPGroup>
                  {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} aria-invalid={!!otpError} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            {otpError && <p className="text-xs text-destructive">{otpError}</p>}

            <Button className="w-full gradient-primary text-white border-0 hover:opacity-90 h-11"
              disabled={loading || otp.length !== OTP_LENGTH} onClick={onVerifyOtp}>
              {loading ? <><Loader2 className="size-4 animate-spin mr-2" />Verifying...</> : "Verify & Create Account"}
            </Button>

            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={() => setStep("details")} className="text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ArrowLeft className="size-3.5" /> Edit details
              </button>
              {cooldown > 0 ? (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3.5" /> Resend in {cooldown}s
                </span>
              ) : (
                <button type="button" onClick={handleResend} disabled={loading} className="text-primary font-medium hover:underline">
                  Resend code
                </button>
              )}
            </div>
          </motion.div>
        )}

        {step === "pending" && pendingData && (
          <motion.div className="text-center space-y-4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="size-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
              <Clock className="size-8 text-warning" />
            </div>
            <h1 className="text-2xl font-bold">Verification submitted</h1>
            <p className="text-muted-foreground">
              Thanks, Dr. {pendingData.name.split(" ")[0]}. Your email is verified and your license details have been
              sent for admin review. We'll notify <strong className="text-foreground">{pendingData.email}</strong> once
              your account is approved and you can sign in.
            </p>
            <Button asChild className="w-full mt-4"><Link to="/login">Back to Sign In</Link></Button>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div className="text-center space-y-4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="size-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold">You're all set!</h1>
            <p className="text-muted-foreground">Taking you to your dashboard...</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
