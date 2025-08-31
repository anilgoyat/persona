import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PersonaList from "../components/persona/PersonaList";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold mb-2 text-purple-600">
          AI Persona Chat
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Choose your favorite tech educator and start learning
        </p>
        <PersonaList />
      </main>
      <Footer />
    </div>
  );
}
