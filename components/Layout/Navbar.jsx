"use client";

import Icon from "@/components/Icon";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { canSeeMenuItem } from "@/constants/roles";

const Navbar = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const isVendorPage = pathname === "/vendors";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  // Vendor section: no InvoiceFlow / VENDOR HUB / logo in navbar; page content has its own header
  if (isVendorPage && user) {
    return (
      <header className="navbar w-full p-0 min-h-[4rem] relative z-50">
        <div className="flex-1" />
      </header>
    );
  }

  return (
    <header className="navbar w-full p-0 min-h-[4rem] relative z-50">
      <div className="flex-1 lg:hidden">
        <div className="dropdown" ref={mobileMenuRef}>
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden" onClick={toggleMobileMenu}>
            <Icon name={isMobileMenuOpen ? "X" : "Menu"} size={24} />
          </div>
          {isMobileMenuOpen && (
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[100] p-2 shadow-xl bg-base-100 rounded-box w-64 border border-base-200 absolute left-0 top-full max-h-[80vh] overflow-y-auto">
              <li className="menu-title px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Menu</li>
              {/* Menu items consistent with Sidebar */}
              {canSeeMenuItem(user, "Dashboard") && <li><Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}><Icon name="LayoutDashboard" size={16} /> Dashboard</Link></li>}
              {canSeeMenuItem(user, "Digitization") && <li><Link href="/digitization" onClick={() => setIsMobileMenuOpen(false)}><Icon name="ScanLine" size={16} /> Digitization</Link></li>}
              {canSeeMenuItem(user, "Matching") && <li><Link href="/matching" onClick={() => setIsMobileMenuOpen(false)}><Icon name="GitMerge" size={16} /> Matching</Link></li>}
              {canSeeMenuItem(user, "Approvals") && <li><Link href="/approvals" onClick={() => setIsMobileMenuOpen(false)}><Icon name="CheckCircle" size={16} /> Approvals</Link></li>}
              {canSeeMenuItem(user, "Vendors") && <li><Link href="/vendors" onClick={() => setIsMobileMenuOpen(false)}><Icon name="Users" size={16} /> Vendors</Link></li>}
              {canSeeMenuItem(user, "Analytics") && <li><Link href="/analytics" onClick={() => setIsMobileMenuOpen(false)}><Icon name="BarChart3" size={16} /> Analytics</Link></li>}

              <div className="divider my-1"></div>

              {canSeeMenuItem(user, "Configuration") && <li><Link href="/config" onClick={() => setIsMobileMenuOpen(false)}><Icon name="Settings" size={16} /> Configuration</Link></li>}
              {canSeeMenuItem(user, "User Management") && <li><Link href="/users" onClick={() => setIsMobileMenuOpen(false)}><Icon name="Shield" size={16} /> User Management</Link></li>}
              {canSeeMenuItem(user, "Audit Logs") && <li><Link href="/audit" onClick={() => setIsMobileMenuOpen(false)}><Icon name="FileText" size={16} /> Audit Logs</Link></li>}
            </ul>
          )}
        </div>
        <Link href="/" className="btn btn-ghost text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">InvoiceFlow</Link>
      </div>
      <div className="flex-1 hidden lg:flex px-4" />
    </header>
  );
};

export default Navbar;