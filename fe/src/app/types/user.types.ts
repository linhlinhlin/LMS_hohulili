export interface User {
    id: string
    email: string
    name: string
    role: UserRole
    avatar?: string
    department?: string
    studentId?: string
    createdAt: Date
    updatedAt: Date
  }
  
  export enum UserRole {
    ADMIN = "admin",
    TEACHER = "teacher",
    STUDENT = "student",
  }
  
  export interface LoginRequest {
    email: string
    password: string
  }
  
  export interface RegisterRequest {
    email: string
    password: string
    name: string
    role: UserRole
    department?: string
    studentId?: string
  }
  