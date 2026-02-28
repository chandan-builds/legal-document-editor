export * from './document';

/** Matches backend UserRole enum: CLIENT, VENDOR, ADMIN */
export type UserRole = 'CLIENT' | 'VENDOR' | 'ADMIN';

/** Matches backend CollaboratorRole enum: OWNER, EDITOR, REVIEWER, VIEWER */
export type CollaboratorRole = 'OWNER' | 'EDITOR' | 'REVIEWER' | 'VIEWER';

export type User = {
  userId?: string;
  email?: string;
  name: string;
  color: string;
  role: UserRole;
  collaboratorRole?: CollaboratorRole;
};

export type DocumentState = {
  id: string;
  title: string;
  users: User[];
  status: 'connected' | 'connecting' | 'disconnected';
};
