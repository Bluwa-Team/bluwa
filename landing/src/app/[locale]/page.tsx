import { Header } from '@/components/landing/Header'
import { Hero } from '@/components/landing/Hero'
import { ProblemSolution } from '@/components/landing/ProblemSolution'
import { Features } from '@/components/landing/Features'
import { PilotProgram } from '@/components/landing/PilotProgram'
import { Pricing } from '@/components/landing/Pricing'
import { Faq } from '@/components/landing/Faq'
import { Contact } from '@/components/landing/Contact'
import { Footer } from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ProblemSolution />
        <Features />
        <PilotProgram />
        <Pricing />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
