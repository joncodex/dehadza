'use client'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Card, CardContent } from '@/components/ui/card'
import { Target, Users, Award, Heart } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">About Dehadza Store</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Your trusted partner in online shopping, delivering quality and value since day one.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
            <p className="text-lg text-slate-600 mb-4">
              Dehadza Store was founded with a simple mission: to make quality products accessible to everyone through a seamless online shopping experience. We believe that shopping should be convenient, secure, and enjoyable.
            </p>
            <p className="text-lg text-slate-600 mb-4">
              From our humble beginnings, we've grown into a trusted e-commerce platform serving thousands of happy customers. Our commitment to excellence, customer satisfaction, and innovation drives everything we do.
            </p>
            <p className="text-lg text-slate-600">
              Today, we offer a wide range of products, fast delivery options, secure payment processing, and exceptional customer service. We're not just a store – we're your shopping partner.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-bold text-xl mb-2">Quality First</h3>
                <p className="text-slate-600">We carefully select every product to ensure the highest quality standards</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-bold text-xl mb-2">Customer Focus</h3>
                <p className="text-slate-600">Your satisfaction is our top priority in everything we do</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="font-bold text-xl mb-2">Excellence</h3>
                <p className="text-slate-600">We strive for excellence in service, delivery, and support</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-bold text-xl mb-2">Integrity</h3>
                <p className="text-slate-600">Honest, transparent, and ethical in all our business practices</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Our Team</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
            Behind Dehadza Store is a dedicated team of professionals committed to providing you with the best shopping experience. From customer service to logistics, every team member plays a vital role in your satisfaction.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}