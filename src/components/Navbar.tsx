import { useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, organization, userRole, isAuthenticated, logout } = useAuth();

  const handleLogin = () => {
      navigate('/auth');
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out"
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCreateOrg = () => {
    navigate('/?createOrg=true');
  };

  const handleFAQClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (location.pathname === '/') {
      // If already on home page, scroll directly
      const faqsElement = document.getElementById('faqs');
      if (faqsElement) {
        // Add offset for fixed navbar
        const navbarHeight = 80;
        const elementPosition = faqsElement.offsetTop - navbarHeight;
        window.scrollTo({
          top: elementPosition,
          behavior: 'smooth'
        });
      }
    } else {
      // If on another page, navigate to home with scroll parameter
      navigate('/?scrollTo=faqs');
    }
    setIsMenuOpen(false);
  };

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === '/') {
      // If already on home page, scroll to top
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    // If on another page, let the Link component handle navigation
    setIsMenuOpen(false);
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === '/') {
      // If already on home page, scroll to top
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    // If on another page, let the Link component handle navigation
    setIsMenuOpen(false);
  };

  const navItems = [
    { label: "Home", href: "/", onClick: handleHomeClick },
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
            <Link to="/" onClick={handleLogoClick} className="flex items-center space-x-3 group">
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
                      <span className="text-gray-700">{user?.name || user?.email || 'User'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56" title="User Menu">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    {userRole === 'admin' && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
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

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80" title="Menu">
                  <div className="flex flex-col h-full">
                    {/* Mobile Logo */}
                    <div className="flex items-center space-x-3 mb-8">
                      <img src="/logo.png" alt="E-Matdaan" className="h-8 w-auto" />
                      <span className="text-xl font-bold text-gray-900">E-Matdaan</span>
                    </div>

                    {/* Mobile Navigation */}
                    <nav className="flex-1 space-y-2">
                      {navItems.map((item) => (
                        <Link 
                          key={item.label}
                          to={item.href}
                          onClick={() => {
                            if (item.onClick) item.onClick({} as React.MouseEvent<HTMLAnchorElement>);
                            setIsMenuOpen(false);
                          }}
                          className="block px-4 py-3 text-gray-700 hover:text-[#6B21E8] hover:bg-[#6B21E8]/5 rounded-lg transition-all duration-200 font-medium"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </nav>

                    {/* Mobile Auth Section */}
                    <div className="border-t border-gray-200 pt-6 space-y-3">
                      {isAuthenticated ? (
                        <>
                          <div className="px-4 py-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-900">{user?.name || user?.email}</p>
                            <p className="text-xs text-gray-500">{organization?.name}</p>
                          </div>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => {
                              navigate('/dashboard');
                              setIsMenuOpen(false);
                            }}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Dashboard
                          </Button>
                          {userRole === 'admin' && (
                            <Button 
                              variant="outline" 
                              className="w-full justify-start"
                              onClick={() => {
                                navigate('/admin');
                                setIsMenuOpen(false);
                              }}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Admin Panel
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => {
                              navigate('/profile');
                              setIsMenuOpen(false);
                            }}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Profile Settings
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start text-red-600 hover:text-red-700"
                            onClick={() => {
                              handleLogout();
                              setIsMenuOpen(false);
                            }}
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                          </Button>
                        </>
                      ) : (
                        <>

                          <Button 
                            className="w-full bg-[#6B21E8] hover:bg-[#6B21E8]/90 text-white"
                            onClick={() => {
                              handleLogin();
                              setIsMenuOpen(false);
                            }}
                          >
                            Sign In
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full border-[#6B21E8] text-[#6B21E8] hover:bg-[#6B21E8] hover:text-white"
                            onClick={() => {
                              handleCreateOrg();
                              setIsMenuOpen(false);
                            }}
                          >
                            Create Organization
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>


    </>
  );
}
