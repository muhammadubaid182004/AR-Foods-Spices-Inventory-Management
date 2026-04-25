import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();
  const brandName = "Al Rehman Foods & Spices";
  const brandLogoPath = "/al-rehman-logo.png";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          localStorage.setItem("auth_token", data.token);
          setLocation("/dashboard");
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : "Please check your credentials and try again.";
          toast({
            title: "Authentication Failed",
            description: message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background dark relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <img
              src={brandLogoPath}
              alt={brandName}
              className="w-20 h-20 rounded-2xl object-contain bg-black/25 p-2 ring-1 ring-border/60 shadow-lg mb-4"
            />
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-center">{brandName}</h1>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Sign in to access your inventory and sales management suite.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                System ID
              </Label>
              <Input
                id="email"
                type="text"
                name="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
                className="bg-background/50 border-white/10 h-12 focus-visible:ring-primary/50 transition-all duration-300"
                placeholder="Enter your system ID"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Passkey
              </Label>
              <Input
                id="password"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="bg-background/50 border-white/10 h-12 focus-visible:ring-primary/50 transition-all duration-300"
                placeholder="••••••••"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium group transition-all duration-300"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Authenticating..." : "Initialize Session"}
              {!loginMutation.isPending && (
                <ArrowRight className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
