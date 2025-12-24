import { Dashboard } from "@/components/Dashboard";
import { Footer } from "@/components/Footer";
import { getDataset } from "../lib/getDataset";

export default async function HomePage() {
  const dataset = await getDataset();

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 pb-16 pt-8 md:px-8">
      <Dashboard dataset={dataset} />
      <Footer />
    </main>
  );
}
