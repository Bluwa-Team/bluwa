import { getOrgs, getPlans } from '@/lib/db'
import { OrgsClient } from './OrgsClient'

export default async function OrgsPage() {
  const [orgs, plans] = await Promise.all([getOrgs(), getPlans()])
  return <OrgsClient orgs={orgs} plans={plans} />
}
