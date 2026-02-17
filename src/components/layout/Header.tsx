import React from 'react';
import { Menu, Search, Bell, User } from 'lucide-react';
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from '@/hooks/useTheme';
import { Link } from 'react-router-dom'; 

interface HeaderProps {
  toggleSidebar: () => void;
}

 

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = React.useState(false);


  // --- AJOUT : ref pour gérer le click en dehors ---
  const menuRef = React.useRef<HTMLDivElement>(null);

  // --- AJOUT : fermeture automatique si clic en dehors ---
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  // ------------------------------------------------------

  return (
    //<header className="bg-white shadow-sm sticky top-0 z-10">
    <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-10 transition-colors">  
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center">
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 md:hidden"
          >
            <Menu size={24} />
          </button>
          
          <div className="relative ml-4 md:ml-0">
            
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
           onClick={toggleTheme}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-300 ${
              theme === 'dark' ? 'bg-slate-700' : 'bg-gray-700'
            }`}
            aria-label="Basculer le thème"
          >
            <span
              className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                theme === 'dark' ? 'translate-x-8' : 'translate-x-0.5'
              }`}
            />
          </button>
          <button className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
            <Bell size={20} />
          </button>
          
          {/* AJOUT : application de la ref ici */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center">
                  <User size={16} />
                </div>
              )}
              <span className="hidden md:block text-sm font-medium">{user?.name}</span>
            </button>
            
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 transition-colors" >
                {/*  <div className="px-4 py-2 text-sm text-gray-700 border-b">*/}
                 <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 border-b dark:border-gray-700"> 
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Profil
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Paramètres
                </Link>
                <button 
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Se déconnecter
                </button>

              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
