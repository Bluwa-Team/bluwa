import { getOnboardingItems } from '@/lib/db'
import { OnboardingBoard } from './OnboardingBoard'

export default async function OnboardingPage() {
  const items = await getOnboardingItems()
  return <OnboardingBoard initialItems={items} />
}
