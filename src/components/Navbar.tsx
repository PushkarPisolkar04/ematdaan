import { useState, useEffect } from "react";
import { Menu, X, User, FileText, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const sessionToken = localStorage.getItem('session_token');
      const isAuth = localStorage.getItem('isAuthenticated');
      
      if (sessionToken && isAuth === 'true') {
        setIsAuthenticated(true);
        // Get user data from localStorage
        const userEmail = localStorage.getItem('user_email');
        const userName = localStorage.getItem('user_name');
        setUserData({
          email: userEmail,
          name: userName
        });
      } else {
        setIsAuthenticated(false);
        setUserData(null);
      }
    };

    checkAuth();
    // Check auth status periodically
    const interval = setInterval(checkAuth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
      navigate('/auth');
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUserData(null);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out"
    });
    navigate('/');
  };

  const handleAccessCodeSubmit = () => {
    if (!accessCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an access code",
        variant: "destructive"
      });
      return;
    }

    // Navigate to auth page with access code
    navigate('/auth', { 
      state: { 
        accessCode: accessCode,
        mode: 'access_code'
      }
    });
    setShowAccessCodeModal(false);
    setAccessCode('');
  };

  const handleCreateOrg = () => {
    navigate('/?createOrg=true');
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
    { label: "Home", href: "/" },
    { label: "Vote", href: "/auth" },
    { label: "Results", href: "/results" },
    { label: "Verify Vote", href: "/verify-vote" },
    { label: "FAQs", href: "#faqs", onClick: handleFAQClick },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <img src="/logo.png" alt="E-Matdaan" className="h-12 w-auto transition-transform group-hover:scale-105" />
              <span className="text-2xl font-bold text-gray-900 tracking-tight">E-Matdaan</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link 
                  key={item.label}
                  to={item.href}
                  onClick={item.onClick}
                  className="px-4 py-2 text-gray-700 hover:text-[#6B21E8] hover:bg-[#6B21E8]/5 rounded-lg transition-all duration-200 font-medium"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden lg:flex items-center space-x-3">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center space-x-2 border-gray-300 hover:border-[#6B21E8] hover:bg-[#6B21E8]/5">
                      <User className="h-4 w-4" />
                      <span className="text-gray-700">{userData?.name || userData?.email || 'User'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56" title="User Menu">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="h-4 w-4 mr-2" />
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => setShowAccessCodeModal(true)}
                    className="border-gray-300 hover:border-[#6B21E8] hover:bg-[#6B21E8]/5"
                  >
                    Enter Access Code
                  </Button>
                  <Button 
                    onClick={handleLogin}
                    className="bg-[#6B21E8] hover:bg-[#6B21E8]/90 text-white px-6 py-2 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Sign In
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleCreateOrg}
                    className="border-[#6B21E8] text-[#6B21E8] hover:bg-[#6B21E8] hover:text-white"
                  >
                    Create Organization
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]" title="Mobile Menu">
                  <div className="flex flex-col h-full">
                    {/* Mobile Logo */}
                    <div className="flex items-center space-x-3 mb-8">
                      <img src="/logo.png" alt="E-Matdaan" className="h-10 w-auto" />
                      <span className="text-xl font-bold text-gray-900">E-Matdaan</span>
                    </div>

                    {/* Mobile Navigation */}
                    <nav className="flex-1 space-y-2">
                      {navItems.map((item) => (
                        <Link 
                          key={item.label}
                          to={item.href}
                          onClick={item.onClick}
                          className="block px-4 py-3 text-lg font-medium text-gray-700 hover:text-[#6B21E8] hover:bg-[#6B21E8]/5 rounded-lg transition-all duration-200"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </nav>

                    {/* Mobile Auth */}
                    <div className="border-t border-gray-200 pt-6">
                      {isAuthenticated ? (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                            <User className="h-6 w-6 text-gray-600" />
                            <div>
                              <p className="font-medium text-gray-900">{userData?.name || 'User'}</p>
                              <p className="text-sm text-gray-600">{userData?.email}</p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => {
                              navigate('/dashboard');
                              setIsMenuOpen(false);
                            }}
                            variant="outline"
                            className="w-full border-gray-300 hover:border-[#6B21E8] hover:bg-[#6B21E8]/5"
                          >
                            Dashboard
                          </Button>
                          <Button 
                            onClick={() => {
                              handleLogout();
                              setIsMenuOpen(false);
                            }}
                            variant="destructive"
                            className="w-full"
                          >
                            Logout
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setShowAccessCodeModal(true);
                              setIsMenuOpen(false);
                            }}
                            className="w-full border-gray-300 hover:border-[#6B21E8] hover:bg-[#6B21E8]/5"
                          >
                            Enter Access Code
                          </Button>
                          <Button 
                            onClick={() => {
                              handleLogin();
                              setIsMenuOpen(false);
                            }}
                            className="w-full bg-[#6B21E8] hover:bg-[#6B21E8]/90 text-white font-medium"
                          >
                            Sign In
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              handleCreateOrg();
                              setIsMenuOpen(false);
                            }}
                            className="w-full border-[#6B21E8] text-[#6B21E8] hover:bg-[#6B21E8] hover:text-white"
                          >
                            Create Organization
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Access Code Modal - Outside nav element */}
      {showAccessCodeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Enter Access Code</span>
              </CardTitle>
              <CardDescription>
                Enter your organization's access code to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Code
                </label>
                <Input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter your access code"
                  onKeyPress={(e) => e.key === 'Enter' && handleAccessCodeSubmit()}
                />
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleAccessCodeSubmit}
                  className="flex-1"
                >
                  Continue
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowAccessCodeModal(false);
                    setAccessCode('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
