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
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52 absolute left-0 top-full">
              {canSeeMenuItem(user, "Dashboard") && <li><Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link></li>}
              {canSeeMenuItem(user, "Vendors") && <li><Link href="/vendors" onClick={() => setIsMobileMenuOpen(false)}>Vendors</Link></li>}
              {canSeeMenuItem(user, "Digitization") && <li><Link href="/digitization" onClick={() => setIsMobileMenuOpen(false)}>Digitization</Link></li>}
              {canSeeMenuItem(user, "Approvals") && <li><Link href="/approvals" onClick={() => setIsMobileMenuOpen(false)}>Approvals</Link></li>}
              {canSeeMenuItem(user, "Analytics") && <li><Link href="/analytics" onClick={() => setIsMobileMenuOpen(false)}>Analytics</Link></li>}
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