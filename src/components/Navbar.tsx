import { useState, useEffect } from "react";
import { Menu, X, User, FileText, LogOut, Shield, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { connectMetaMask, checkConnection } from "@/lib/metamask";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const [isConnected, setIsConnected] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Initialize and monitor connection state
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        const connected = await checkConnection();
        setIsConnected(connected);

        // Set up MetaMask event listeners
        if (window.ethereum) {
          window.ethereum.on('accountsChanged', handleAccountsChanged);
          window.ethereum.on('chainChanged', () => window.location.reload());
          
          // Check connection status periodically
          const interval = setInterval(async () => {
            const stillConnected = await checkConnection();
            setIsConnected(stillConnected);
          }, 5000);

          return () => {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', () => {});
            clearInterval(interval);
          };
        }
      } catch (error) {
        console.error('Error initializing connection:', error);
    }
    };

    initializeConnection();
  }, []);

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      setIsConnected(false);
      localStorage.removeItem('auth');
      localStorage.clear();
      navigate('/');
    } else {
      const connected = await checkConnection();
      setIsConnected(connected);
    }
  };

  const handleConnectWallet = async () => {
    try {
      await connectMetaMask();
      setIsConnected(true);
      navigate('/login');
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to MetaMask",
        variant: "destructive"
      });
    }
  };

  const handleLogout = () => {
    setIsConnected(false);
    localStorage.removeItem('auth');
    localStorage.clear();
    navigate('/');
  };

  const handleFAQClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (location.pathname === '/') {
      document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/?scrollTo=faqs');
    }
    setIsMenuOpen(false);
  };

  const navItems = [
    { label: "Vote", href: "/login" },
    { label: "Results", href: "/results" },
    { label: "Verify Vote", href: "/verify-vote" },
    { label: "FAQs", href: "#faqs", onClick: handleFAQClick },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-background shadow-md z-50">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="E-Matdaan Logo" className="h-10 w-auto" />
            <span className="text-xl font-bold text-foreground">eMatdaan</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              item.onClick ? (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={item.onClick}
                  className="text-foreground hover:text-[#6B21E8] transition-colors font-medium"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  to={item.href}
                  className="text-foreground hover:text-[#6B21E8] transition-colors font-medium"
                >
                  {item.label}
                </Link>
              )
            ))}
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center gap-4">
            {!isConnected ? (
              <Button 
                onClick={handleConnectWallet} 
                className="bg-[#6B21E8] hover:bg-[#6B21E8]/90 text-white"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Connect MetaMask
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48" title="User Menu">
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/vote-receipt')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Vote Receipt
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72" title="Menu">
              <div className="flex flex-col gap-4 mt-8">
                {navItems.map((item) => (
                  item.onClick ? (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={(e) => {
                        item.onClick?.(e);
                      }}
                      className="text-foreground hover:text-[#6B21E8] transition-colors px-4 py-2"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="text-foreground hover:text-[#6B21E8] transition-colors px-4 py-2"
                    >
                      {item.label}
                    </Link>
                  )
                ))}
                  {!isConnected ? (
                    <Button 
                    onClick={handleConnectWallet}
                    className="bg-[#6B21E8] hover:bg-[#6B21E8]/90 text-white mt-4 mx-4"
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      Connect MetaMask
                    </Button>
                  ) : (
                      <Button 
                    onClick={handleLogout}
                        variant="outline" 
                    className="mt-4 mx-4"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                  )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
