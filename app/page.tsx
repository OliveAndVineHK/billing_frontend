import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
  description: "Home",
};

export default function Home() {
  return (
    <div className="min-h-dvh min-h-screen bg-white">
      <main className="flex min-h-dvh min-h-screen flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-semibold text-black">Home</h1>
      </main>
    </div>
  );
}
