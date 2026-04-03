export type Role = 'user' | 'assistant' | 'correction'

export interface Message {
  id: string
  role: Role
  content: string
  pending?: boolean
}
