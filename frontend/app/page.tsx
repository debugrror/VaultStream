'use client';

import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/Button';
import { Video } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Secure Video Streaming
            <span className="block text-blue-600">Simplified</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Upload, manage, and stream your videos with enterprise-grade security.
            Private, unlisted, and public visibility controls with passphrase protection.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/auth/register">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="ghost" size="lg">
                Sign In <span aria-hidden="true">→</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 flow-root sm:mt-24">
          <div className="relative rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
            <div className="rounded-md bg-white p-8 shadow-2xl ring-1 ring-gray-900/10 flex items-center justify-center h-64 sm:h-96">
              <div className="text-center">
                <Video className="mx-auto h-20 w-20 text-gray-300" />
                <p className="mt-4 text-gray-500">Video preview placeholder</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
