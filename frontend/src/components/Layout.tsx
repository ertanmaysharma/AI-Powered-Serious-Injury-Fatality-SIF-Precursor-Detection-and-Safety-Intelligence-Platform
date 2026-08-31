import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/analyze', label: 'Analyze Report' },
  { path: '/reports', label: 'Reports' },
  { path: '/hse-review', label: 'HSE Review' },
  { path: '/safety-rules', label: 'Safety Rules' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}>
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-900 text-lg">
            &#9776;
          </button>
          {sidebarOpen && (
            <div>
              <h1 className="text-lg font-bold text-amber-600">SIF-GUARD</h1>
              <p className="text-[10px] text-gray-400">Safety Intelligence Platform</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-amber-50 text-amber-700 border-l-2 border-amber-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200">
          {sidebarOpen && (
            <div className="text-xs text-gray-500 mb-2">
              {user?.username} ({user?.role?.replace('_', ' ')})
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
          >
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-gray-200 text-xs text-gray-400 space-y-1">
          <p>SIF-GUARD v1.0 — AI-Powered SIF Precursor Detection & Safety Intelligence Platform</p>
          <p>This prototype uses synthetic demonstration data unless an authorized OIL dataset is connected. It does not represent actual OIL incident records, official OIL classifications, or certified safety decisions.</p>
          <p>AI-generated classifications are decision-support outputs and must be validated by qualified HSE personnel. A low AI score does not imply that an event is risk-free.</p>
        </footer>
      </main>
    </div>
  );
}
