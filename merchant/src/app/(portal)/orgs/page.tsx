import { getOrgs } from '@/lib/db'
import { OrgsClient } from './OrgsClient'

export default async function OrgsPage() {
  const orgs = await getOrgs()
  return <OrgsClient orgs={orgs} />
}
