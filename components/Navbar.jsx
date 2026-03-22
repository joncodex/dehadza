'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, ShoppingCart, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Navbar({ cartCount = 0 }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (path) => pathname === path

  return (
    <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-slate-900">Dehadza Store</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className={`font-medium transition-colors ${isActive('/') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>Home</Link>
            <Link href="/shop" className={`font-medium transition-colors ${isActive('/shop') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>Shop</Link>
            <Link href="/about" className={`font-medium transition-colors ${isActive('/about') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>About</Link>
            <Link href="/news" className={`font-medium transition-colors ${isActive('/news') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>News</Link>
            <Link href="/contact" className={`font-medium transition-colors ${isActive('/contact') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>Contact</Link>
            <Link href="/track" className={`font-medium transition-colors ${isActive('/track') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>Track Order</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/shop">
              <Button variant="outline" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{cartCount}</span>
                )}
              </Button>
            </Link>
            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            <Link href="/" className="block py-2 px-4 hover:bg-slate-50 rounded">Home</Link>
            <Link href="/shop" className="block py-2 px-4 hover:bg-slate-50 rounded">Shop</Link>
            <Link href="/about" className="block py-2 px-4 hover:bg-slate-50 rounded">About</Link>
            <Link href="/news" className="block py-2 px-4 hover:bg-slate-50 rounded">News</Link>
            <Link href="/contact" className="block py-2 px-4 hover:bg-slate-50 rounded">Contact</Link>
            <Link href="/track" className="block py-2 px-4 hover:bg-slate-50 rounded">Track Order</Link>
          </div>
        )}
      </div>
    </nav>
  )
}