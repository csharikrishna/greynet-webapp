import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import MotivationSection from "@/components/MotivationSection";
import LeakageSection from "@/components/LeakageSection";
import ArchitectureWalkthrough from "@/components/ArchitectureWalkthrough";
import CompressionLadder from "@/components/CompressionLadder";
import BenchmarkTable from "@/components/BenchmarkTable";
import CtaFooter from "@/components/CtaFooter";

export default function HomePage() {
  return (
    <main>
      <Nav />
      <Hero />
      <MotivationSection />
      <ArchitectureWalkthrough />
      <LeakageSection />
      <CompressionLadder />
      <BenchmarkTable />
      <CtaFooter />
    </main>
  );
}
