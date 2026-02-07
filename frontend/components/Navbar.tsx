'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { LogOut, Upload, Video, Menu, X, User as UserIcon } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg-dark)]/95 backdrop-blur-md">
      <div className="container mx-auto">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Video className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              VaultStream
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    <Video className="mr-2 h-4 w-4" />
                    My Videos
                  </Button>
                </Link>
                
                <Link href="/upload">
                  <Button variant="primary" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </Link>

                {/* User Dropdown */}
                <div className="flex items-center space-x-3 border-l border-[var(--color-border)] pl-4 ml-2">
                  <div className="text-right hidden lg:block">
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{user?.username}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{user?.email}</div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-white" />
                    </div>
                    
                    <Button variant="ghost" size="sm" onClick={logout} title="Logout">
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="primary">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--color-border)] py-4 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="px-4 py-3 border-b border-[var(--color-border)] mb-2">
                  <div className="font-medium">{user?.username}</div>
                  <div className="text-sm text-[var(--color-text-secondary)]">{user?.email}</div>
                </div>
                
                <Link href="/dashboard" className="block">
                  <Button variant="ghost" className="w-full justify-start">
                    <Video className="mr-2 h-4 w-4" />
                    My Videos
                  </Button>
                </Link>
                
                <Link href="/upload" className="block">
                  <Button variant="primary" className="w-full justify-start">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                </Link>
                
                <Button variant="ghost" onClick={logout} className="w-full justify-start text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block">
                  <Button variant="ghost" className="w-full">Login</Button>
                </Link>
                <Link href="/auth/register" className="block">
                  <Button variant="primary" className="w-full">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
