import { UserRole } from "../app/user-roles/UserRole.dtd";
import { User } from "../app/users/User.dtd";

export {};

declare global {
  interface filters {
    /** Please generate a seed of >8 chars */
    sxmp_labac_pepper_seed: (seed: string) => string,

		sxmp_labac_create_first_user_body: (body: User) => User,
		sxmp_labac_create_first_user_role_body: (body: UserRole) => UserRole,
  }
}
