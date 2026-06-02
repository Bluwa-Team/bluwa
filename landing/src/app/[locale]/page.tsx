import { Header } from '@/components/landing/Header'
import { Hero } from '@/components/landing/Hero'
import { ProblemSolution } from '@/components/landing/ProblemSolution'
import { Features } from '@/components/landing/Features'
import { Pricing } from '@/components/landing/Pricing'
import { Stats } from '@/components/landing/Stats'
import { Presence } from '@/components/landing/Presence'
import { PilotProgram } from '@/components/landing/PilotProgram'
import { Faq } from '@/components/landing/Faq'
import { Contact } from '@/components/landing/Contact'
import { CtaBanner } from '@/components/landing/CtaBanner'
import { Footer } from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ProblemSolution />
        <Features />
        <Pricing />
        <Stats />
        <Presence />
        <PilotProgram />
        <Faq />
        <Contact />
      </main>
      <CtaBanner />
      <Footer />
    </>
  )
}
