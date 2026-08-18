import { z } from 'zod'

// =========================================================
// EMPLOYEE PIN
// =========================================================

export const EmployeePinSchema =
  z.string()
    .regex(/^\d{4,6}$/)

export type EmployeePin =
  z.infer<
    typeof EmployeePinSchema
  >


// =========================================================
// SESSION TOKEN
//
// <session UUID>.<64-char random secret>
// =========================================================

export const SessionTokenSchema =
  z.string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[a-f0-9]{64}$/i
    )

export type SessionToken =
  z.infer<
    typeof SessionTokenSchema
  >


// =========================================================
// EMPLOYEE LIST
//
// Returned only after Device authentication.
// =========================================================

export const EmployeeSummarySchema =
  z.object({
    id:
      z.string().min(1),

    displayName:
      z.string().min(1),

    roleName:
      z.string().min(1),

    hasPin:
      z.boolean()
  })

export type EmployeeSummary =
  z.infer<
    typeof EmployeeSummarySchema
  >

export const EmployeeListResponseSchema =
  z.object({
    employees:
      z.array(
        EmployeeSummarySchema
      )
  })

export type EmployeeListResponse =
  z.infer<
    typeof EmployeeListResponseSchema
  >


// =========================================================
// PIN LOGIN REQUEST
//
// Trust boundary:
// - storeId MUST NOT come from client
// - deviceId MUST NOT come from client
// - actorId MUST NOT come from client
//
// employeeId is only the employee selected at the AuthGate.
// Worker resolves and validates it inside the trusted Store.
// =========================================================

export const PinLoginRequestSchema =
  z.object({
    employeeId:
      z.string().min(1),

    pin:
      EmployeePinSchema
  })
    .strict()

export type PinLoginRequest =
  z.infer<
    typeof PinLoginRequestSchema
  >


// =========================================================
// AUTHENTICATED ACTOR VIEW
//
// Safe metadata that may be returned to Desktop/UI.
// =========================================================

export const AuthenticatedActorSchema =
  z.object({
    id:
      z.string().min(1),

    displayName:
      z.string().min(1),

    membershipId:
      z.string().min(1),

    roleId:
      z.string().min(1),

    roleName:
      z.string().min(1)
  })

export type AuthenticatedActor =
  z.infer<
    typeof AuthenticatedActorSchema
  >


// =========================================================
// AUTH SESSION VIEW
//
// Does NOT contain the raw session secret.
// =========================================================

export const AuthSessionViewSchema =
  z.object({
    sessionId:
      z.string().uuid(),

    expiresAt:
      z.string().min(1),

    actor:
      AuthenticatedActorSchema
  })

export type AuthSessionView =
  z.infer<
    typeof AuthSessionViewSchema
  >


// =========================================================
// PIN LOGIN RESPONSE
//
// sessionToken contains the raw session secret and is returned
// only when the session is created.
// Desktop Main Process will own this credential.
// =========================================================

export const PinLoginResponseSchema =
  AuthSessionViewSchema
    .extend({
      sessionToken:
        SessionTokenSchema
    })

export type PinLoginResponse =
  z.infer<
    typeof PinLoginResponseSchema
  >


// =========================================================
// SESSION STATUS RESPONSE
//
// Used by GET /api/auth/session.
// Notice that it does NOT return sessionToken.
// =========================================================

export const AuthSessionResponseSchema =
  AuthSessionViewSchema

export type AuthSessionResponse =
  z.infer<
    typeof AuthSessionResponseSchema
  >


// =========================================================
// LOGOUT
// =========================================================

export const LogoutResponseSchema =
  z.object({
    ok:
      z.literal(true)
  })

export type LogoutResponse =
  z.infer<
    typeof LogoutResponseSchema
  >