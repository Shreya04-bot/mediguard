import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Shield, Loader2, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { validateInviteApi } from "@/services/authService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

type TokenState = "checking" | "valid" | "invalid";

export default function AcceptInvitePage() {
  const { acceptInvite } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [tokenState, setTokenState] = useState<TokenState>("checking");
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      return;
    }

    let mounted = true;
    validateInviteApi(token)
      .then((res) => {
        if (!mounted) return;
        if (res?.valid) {
          setInvitedEmail(res.email || null);
          setTokenState("valid");
        } else {
          setTokenState("invalid");
        }
      })
      .catch(() => {
        if (mounted) setTokenState("invalid");
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      await acceptInvite(token, data.name, data.password);
      toast.success("Your admin account is ready — welcome to MediGuard AI!");
      navigate("/dashboard/admin");
    } catch (err) {
      const message = (err as { message?: string })?.message;
      toast.error(message || "Could not complete your invite. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="size-10 rounded-xl gradient-primary flex items-center justify-center">
            <Shield className="size-5 text-white" />
          </div>
          <span className="font-bold text-xl">MediGuard AI</span>
        </div>

        <Card>
          {tokenState === "checking" && (
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Checking your invite...</p>
            </CardContent>
          )}

          {tokenState === "invalid" && (
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <XCircle className="size-10 text-destructive" />
              <CardTitle className="text-lg">Invite link invalid or expired</CardTitle>
              <p className="text-sm text-muted-foreground">
                This invite link is no longer valid. Ask the admin who invited
                you to send a new one.
              </p>
              <Link to="/login" className="text-primary text-sm font-medium hover:underline mt-2">
                Back to sign in
              </Link>
            </CardContent>
          )}

          {tokenState === "valid" && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CheckCircle2 className="size-5 text-emerald-500" />
                  Set up your admin account
                </CardTitle>
                <CardDescription>
                  {invitedEmail
                    ? `Creating an administrator account for ${invitedEmail}.`
                    : "Complete your details to finish setting up your account."}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      placeholder="Jane Doe"
                      {...register("name")}
                      aria-invalid={!!errors.name}
                      className={cn(errors.name && "border-destructive")}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        {...register("password")}
                        aria-invalid={!!errors.password}
                        className={cn("pr-10", errors.password && "border-destructive")}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      {...register("confirmPassword")}
                      aria-invalid={!!errors.confirmPassword}
                      className={cn(errors.confirmPassword && "border-destructive")}
                    />
                    {errors.confirmPassword && (
                      <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full gradient-primary text-white border-0 hover:opacity-90 h-11"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" />
                        Creating account...
                      </>
                    ) : (
                      "Accept invite & sign in"
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}