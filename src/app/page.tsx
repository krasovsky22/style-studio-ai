"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowRight,
  Sparkles,
  Image as ImageIcon,
  Video,
  Star,
  RefreshCw,
} from "lucide-react";
import React from "react";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <React.Fragment>
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20" />
        <div className="container mx-auto px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-8 flex items-center justify-center space-x-2">
              <Sparkles className="h-8 w-8 text-purple-400" />
              <span className="text-lg font-semibold text-purple-400">
                Style Studio AI
              </span>
            </div>

            <h1 className="mb-8 text-5xl font-bold tracking-tight text-white sm:text-7xl">
              Generate Stunning
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {" "}
                Fashion Art
              </span>
            </h1>

            <p className="mx-auto mb-12 max-w-3xl text-xl text-gray-300">
              Unleash Your Boundless Creativity with Advanced AI Technology -
              Generate Unique, High-Quality Fashion Images in Seconds.
            </p>

            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
              {!isAuthenticated && !isLoading ? (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-lg font-semibold hover:from-purple-700 hover:to-pink-700"
                  >
                    <Link href="/signup">
                      Generate
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    asChild
                    className="border-purple-400 px-8 py-4 text-lg text-purple-400 hover:bg-purple-400/10"
                  >
                    <Link href="/signin">Sign In</Link>
                  </Button>
                </>
              ) : (
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-lg font-semibold hover:from-purple-700 hover:to-pink-700"
                >
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              )}
            </div>

            <div className="mt-16 flex items-center justify-center space-x-2 text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-current" />
              ))}
              <span className="ml-2 text-white">5000+ True Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-white">
              Mesmerising Features
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-300">
              Explore the powerful features designed to bring your creative
              visions to life effortlessly.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Text to Image */}
            <Card className="border-purple-500/20 bg-slate-800/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="mb-6 h-48 overflow-hidden rounded-lg bg-gradient-to-br from-purple-600/20 to-pink-600/20">
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-16 w-16 text-purple-400" />
                  </div>
                </div>
                <h3 className="mb-4 text-2xl font-bold text-white">
                  Text to Image Generator
                </h3>
                <p className="mb-6 text-gray-300">
                  Produce impressive graphics from basic textual portrayals.
                  Construct exclusive, superior-standard illustrations
                  customized to your creative thought.
                </p>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Try now
                </Button>
              </CardContent>
            </Card>

            {/* Image to Video */}
            <Card className="border-purple-500/20 bg-slate-800/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="mb-6 h-48 overflow-hidden rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20">
                  <div className="flex h-full items-center justify-center">
                    <Video className="h-16 w-16 text-blue-400" />
                  </div>
                </div>
                <h3 className="mb-4 text-2xl font-bold text-white">
                  Image to Video
                </h3>
                <p className="mb-6 text-gray-300">
                  Transform static images into dynamic, animated videos. Bring
                  your visuals to life with seamless motion and effects.
                </p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Make Video
                </Button>
              </CardContent>
            </Card>

            {/* Character Swapper */}
            <Card className="border-purple-500/20 bg-slate-800/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="mb-6 h-48 overflow-hidden rounded-lg bg-gradient-to-br from-pink-600/20 to-red-600/20">
                  <div className="flex h-full items-center justify-center">
                    <RefreshCw className="h-16 w-16 text-pink-400" />
                  </div>
                </div>
                <h3 className="mb-4 text-2xl font-bold text-white">
                  Character Swapper
                </h3>
                <p className="mb-6 text-gray-300">
                  Replace and customize characters in images. Easy swapping for
                  endless creative possibilities with AI precision.
                </p>
                <Button className="w-full bg-pink-600 hover:bg-pink-700">
                  Swap Character
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-white">
              User Feedback
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-300">
              Hear from our amazing users and discover how Style Studio AI has
              transformed their creative journeys.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                name: "John D.",
                role: "Designer",
                text: "Effortless image creation with stunning results. Highly recommend this app to bring their creative ideas to life.",
              },
              {
                name: "Sophia L.",
                role: "Media Manager",
                text: "Easy to use and perfect for generating unique visuals for social media. Saves time and boosts creativity.",
              },
              {
                name: "Mike T.",
                role: "Content Creator",
                text: "The character swapper is a game changer so much fun and incredibly accurate. It adds a whole new level to.",
              },
              {
                name: "Emily R.",
                role: "Digital Artist",
                text: "Seamless experience on mobile. Quick, powerful, and easy to navigate. Ideal for on-the-go creators!",
              },
            ].map((testimonial, index) => (
              <Card
                key={index}
                className="border-purple-500/20 bg-slate-800/50 backdrop-blur-sm"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="mb-4 text-gray-300">{testimonial.text}</p>
                  <div>
                    <p className="font-semibold text-white">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-purple-400">
                      {testimonial.role}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-6 text-5xl font-bold text-white">
              Unleash Imagination
            </h2>
            <p className="mb-8 text-xl text-gray-300">
              Transform your ideas into stunning visuals effortlessly. Your
              creative journey starts here!
            </p>
            {!isAuthenticated && !isLoading && (
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-lg font-semibold hover:from-purple-700 hover:to-pink-700"
              >
                <Link href="/signup">
                  Launch App
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </React.Fragment>
  );
}
