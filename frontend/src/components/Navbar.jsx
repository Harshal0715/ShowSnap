import React, { useContext, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { HiMenu, HiX } from 'react-icons/hi';
import { LocationContext } from '../context/LocationContext';

function Navbar() {
  const navigate = useNavigate();
  const {
    user = null,
    setUser = () => {},
    setIsAuthenticated = () => {}
  } = useContext(AuthContext) || {};

  const { location, setLocation } = useContext(LocationContext); // ✅ Use context
  const [menuOpen, setMenuOpen] = useState(false);

  // 🔄 Sync localStorage with context (already handled in LocationContext)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setIsAuthenticated(true);
    }
  }, [setUser, setIsAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';
  const firstName = user?.name?.split(' ')[0] || 'User';

  const menuItems = [
    { name: 'Browse Movies', path: '/movies' },
    ...(user ? [
      { name: 'My Bookings', path: '/my-bookings' },
      { name: 'Edit Profile', path: '/profile/edit' }
    ] : []),
    ...(isAdmin ? [{ name: 'Admin Dashboard', path: '/admin' }] : [])
  ];

  return (
    <nav className="bg-[#121212] text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-3 md:py-4">
        {/* Logo */}
        <NavLink
          to="/"
          className="text-3xl font-bold text-red-500 hover:text-red-400 transition"
          aria-label="ShowSnap Home"
        >
          ShowSnap
        </NavLink>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          {/* 🌍 Location Selector */}
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="px-3 py-1 rounded bg-white text-black text-sm"
            aria-label="Select Location"
          >
            <option value="">Location</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Thane">Thane</option>
            <option value="Navi Mumbai">Navi Mumbai</option>
          </select>

          {menuItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive
                  ? 'text-red-400 font-semibold'
                  : 'hover:text-red-400 transition'
              }
              aria-label={item.name}
            >
              {item.name}
            </NavLink>
          ))}

          {user ? (
            <>
              <span className="text-gray-400">
                Hi, {firstName}
                {isAdmin && <span className="text-yellow-400 ml-1 text-sm">(Admin)</span>}
              </span>
              <button
                onClick={handleLogout}
                aria-label="Logout"
                className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                aria-label="Login"
                className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition"
              >
                Login
              </NavLink>
              <NavLink
                to="/signup"
                aria-label="Sign Up"
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                Sign Up
              </NavLink>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="text-2xl focus:outline-none"
          >
            {menuOpen ? <HiX /> : <HiMenu />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-[#121212] px-4 py-3 flex flex-col gap-3 border-t border-gray-800 transition-all duration-300 ease-in-out">
          {/* 🌍 Location Selector */}
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="px-3 py-2 rounded bg-white text-black text-sm"
            aria-label="Select Location"
          >
            <option value="">Location</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Thane">Thane</option>
            <option value="Navi Mumbai">Navi Mumbai</option>
          </select>

          {menuItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className="hover:text-red-400 transition"
              aria-label={item.name}
            >
              {item.name}
            </NavLink>
          ))}

          {user ? (
            <button
              onClick={() => {
                handleLogout();
                setMenuOpen(false);
              }}
              aria-label="Logout"
              className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 transition"
            >
              Logout
            </button>
          ) : (
            <>
              <NavLink
                to="/login"
                onClick={() => setMenuOpen(false)}
                aria-label="Login"
                className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition"
              >
                Login
              </NavLink>
              <NavLink
                to="/signup"
                onClick={() => setMenuOpen(false)}
                aria-label="Sign Up"
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                Sign Up
              </NavLink>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
