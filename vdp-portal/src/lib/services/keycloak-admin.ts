const REALM = process.env.KEYCLOAK_REALM!
const BASE = `${process.env.KEYCLOAK_INTERNAL_URL}/admin/realms/${REALM}`

export interface KeycloakUser {
  id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  enabled: boolean
  createdTimestamp: number
}

export interface KeycloakRoleRepresentation {
  id: string
  name: string
}

async function getAdminToken(): Promise<string> {
  const response = await fetch(
    `${process.env.KEYCLOAK_INTERNAL_URL}/realms/master/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.KEYCLOAK_CLIENT_ID!,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
      }),
    }
  )
  if (!response.ok) {
    throw new Error(`Failed to get admin token: ${response.status}`)
  }
  const data = await response.json() as { access_token: string }
  return data.access_token
}

export async function listUsers(): Promise<KeycloakUser[]> {
  const token = await getAdminToken()
  const res = await fetch(`${BASE}/users?max=100`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Failed to list users: ${res.status}`)
  return res.json() as Promise<KeycloakUser[]>
}

export async function getUserRoles(userId: string): Promise<KeycloakRoleRepresentation[]> {
  const token = await getAdminToken()
  const res = await fetch(`${BASE}/users/${userId}/role-mappings/realm`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Failed to get user roles: ${res.status}`)
  return res.json() as Promise<KeycloakRoleRepresentation[]>
}

export async function listRealmRoles(): Promise<KeycloakRoleRepresentation[]> {
  const token = await getAdminToken()
  const res = await fetch(`${BASE}/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Failed to list realm roles: ${res.status}`)
  return res.json() as Promise<KeycloakRoleRepresentation[]>
}

export async function assignRole(
  userId: string,
  roleId: string,
  roleName: string
): Promise<void> {
  const token = await getAdminToken()
  const res = await fetch(`${BASE}/users/${userId}/role-mappings/realm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ id: roleId, name: roleName }]),
  })
  if (!res.ok) throw new Error(`Failed to assign role: ${res.status}`)
}

export async function removeRole(
  userId: string,
  roleId: string,
  roleName: string
): Promise<void> {
  const token = await getAdminToken()
  const res = await fetch(`${BASE}/users/${userId}/role-mappings/realm`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ id: roleId, name: roleName }]),
  })
  if (!res.ok) throw new Error(`Failed to remove role: ${res.status}`)
}
