// frontend/src/types.ts
export interface User {
  _id: string;
  auth0Id: string;
  email: string;
  name?: string;
}