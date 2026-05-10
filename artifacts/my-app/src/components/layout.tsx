import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Building2, Package, ReceiptText, LogOut } from "lucide-react";
import { motion } from "framer-motion";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const brandName = "Al Rehman Foods & Spices";
  const brandLogoPath = "/al-rehman-logo.png";

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    setLocation("/login");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/invoices", label: "Invoices", icon: ReceiptText },
    { href: "/management", label: "Management", icon: Building2 },
    { href: "/items", label: "Items", icon: Package },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden dark">

      {/* ── Desktop Sidebar (hidden on mobile) ── */}
      <motion.aside
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="hidden md:flex w-64 border-r border-border bg-sidebar flex-col justify-between shrink-0"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <img
              src={brandLogoPath}
              alt={brandName}
              className="w-12 h-12 rounded-full object-cover ring-1 ring-border/60 shadow-sm"
            />
            <h1 className="text-sm font-bold tracking-tight text-foreground leading-tight">
              {brandName}
            </h1>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className="block">
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </motion.aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto relative pb-20 md:pb-0">

        {/* Mobile top bar — logo only, shown instead of sidebar */}
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar/80 backdrop-blur-md">
          <img
            src={brandLogoPath}
            alt={brandName}
            className="w-9 h-9 rounded-full object-cover ring-1 ring-border/60"
          />
          <h1 className="text-sm font-bold tracking-tight text-foreground leading-tight">{brandName}</h1>
        </div>

        {children}
      </main>

      {/* ── Mobile Bottom Navigation Bar (hidden on desktop) ── */}
      <motion.nav
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-border bg-sidebar/95 backdrop-blur-md safe-area-pb"
      >
        {navItems.map((item) => {
          const isActive = location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <div
                className={`flex flex-col items-center gap-1 py-3 transition-all duration-200 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? "scale-110" : ""
                  }`}
                />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full"
                  />
                )}
              </div>
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">Logout</span>
        </button>
      </motion.nav>

    </div>
  );
}
