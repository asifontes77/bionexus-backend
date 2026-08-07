import { User } from '../users.entity';

export interface SafeUserResponse {
  id: number;
  name: string;
  user_name: string;
  college_number: string | null;
  telephone: string;
  url_photo: string | null;
  url_signature: string | null;
  direction: string | null;
  position: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
  roles: string;
  hide_user: boolean;
}

export function toSafeUserResponse(
  user: User,
): SafeUserResponse {
  return {
    id: user.id,
    name: user.name,
    user_name: user.user_name,
    college_number: user.college_number ?? null,
    telephone: user.telephone,
    url_photo: user.url_photo ?? null,
    url_signature: user.url_signature ?? null,
    direction: user.direction ?? null,
    position: user.position ?? null,
    email: user.email ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roles: user.roles,
    hide_user: user.hide_user,
  };
}

export function toSafeUserResponses(
  users: User[],
): SafeUserResponse[] {
  return users.map(toSafeUserResponse);
}
