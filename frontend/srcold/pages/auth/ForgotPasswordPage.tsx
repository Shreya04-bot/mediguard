import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Mail, Loader2, ArrowLeft, CheckCircle2, Clock, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import {
  sendPasswordResetOtpApi, verifyPasswordResetOtpApi, resetPasswordApi,
} from "@/services/authService";
import { toast } from "sonner";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

type Step = "email" | "otp" | "newPassword" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await sendPasswordResetOtpApi(email);
      setOtp("");
      setOtpError(null);
      setStep("otp");
      startCooldown();
      toast.success(`Verification code sent to ${email}`);
    } catch (err) {
      const message = (err as { message?: string })?.message || "Could not send verification code.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      await sendPasswordResetOtpApi(email);
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

  const handleVerifyOtp = async () => {
    if (otp.length !== OTP_LENGTH) return;
    setLoading(true);
    setOtpError(null);
    try {
      const { resetToken: token } = await verifyPasswordResetOtpApi(email, otp);
      setResetToken(token);
      setStep("newPassword");
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (!resetToken) return;
    setLoading(true);
    try {
      await resetPasswordApi(email, resetToken, newPassword);
      setStep("done");
      toast.success("Password updated successfully!");
    } catch (err) {
      const message = (err as { message?: string })?.message || "Could not reset password. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="size-9 rounded-xl gradient-primary flex items-center justify-center">
              <Shield className="size-4 text-white" />
            </div>
            <span className="font-bold text-lg">MediGuard AI</span>
          </Link>
        </div>

        {step === "email" && (
          <>
            <div className="text-center mb-8">
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="size-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Forgot your password?</h1>
              <p className="text-muted-foreground text-sm">Enter your email and we'll send you a verification code.</p>
            </div>
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fp-email">Email address</Label>
                <Input id="fp-email" type="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full gradient-primary text-white border-0 hover:opacity-90 h-11" disabled={loading}>
                {loading ? <><Loader2 className="size-4 animate-spin mr-2" />Sending...</> : "Send Verification Code"}
              </Button>
            </form>
            <div className="text-center mt-6">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5">
                <ArrowLeft className="size-3.5" /> Back to Sign In
              </Link>
            </div>
          </>
        )}

        {step === "otp" && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="size-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Enter verification code</h1>
              <p className="text-muted-foreground text-sm">
                We sent a {OTP_LENGTH}-digit code to <strong className="text-foreground">{email}</strong>
              </p>
            </div>

            <div className="flex justify-center">
              <InputOTP maxLength={OTP_LENGTH} value={otp}
                onChange={(value) => { setOtp(value); setOtpError(null); }} disabled={loading}>
                <InputOTPGroup>
                  {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} aria-invalid={!!otpError} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            {otpError && <p className="text-xs text-destructive">{otpError}</p>}

            <Button className="w-full gradient-primary text-white border-0 hover:opacity-90 h-11"
              disabled={loading || otp.length !== OTP_LENGTH} onClick={handleVerifyOtp}>
              {loading ? <><Loader2 className="size-4 animate-spin mr-2" />Verifying...</> : "Verify Code"}
            </Button>

            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={() => setStep("email")} className="text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ArrowLeft className="size-3.5" /> Change email
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

        {step === "newPassword" && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="text-center mb-8">
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <KeyRound className="size-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Set a new password</h1>
              <p className="text-muted-foreground text-sm">Choose a strong password for <strong className="text-foreground">{email}</strong></p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input id="new-password" type={showPassword ? "text" : "password"} placeholder="Min 8 characters"
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10" required />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-new-password">Confirm new password</Label>
                <Input id="confirm-new-password" type="password" placeholder="Repeat password"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(passwordError && "border-destructive")} required />
                {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
              </div>
              <Button type="submit" className="w-full gradient-primary text-white border-0 hover:opacity-90 h-11" disabled={loading}>
                {loading ? <><Loader2 className="size-4 animate-spin mr-2" />Updating...</> : "Update Password"}
              </Button>
            </form>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div className="text-center space-y-4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="size-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold">Password updated</h1>
            <p className="text-muted-foreground">You can now sign in with your new password.</p>
            <Button asChild className="w-full mt-4"><Link to="/login">Back to Sign In</Link></Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
