import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  
  // Routes where navbar should not be shown
  const noNavbarRoutes = ['/vote', '/admin'];
  
  // Check if current route should show navbar
  const shouldShowNavbar = !noNavbarRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen w-full bg-background">
      {shouldShowNavbar && <Navbar />}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
};

export default Layout; 