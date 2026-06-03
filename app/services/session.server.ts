import { createCookieSessionStorage, redirect } from "react-router";
import { prisma } from "./prisma.server";
import type { User } from "../types";

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set in environment variables");
}

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "ponto_session",
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    httpOnly: true,
  },
});

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function getUserId(request: Request): Promise<string | undefined> {
  const session = await getSession(request);
  const userId = session.get("userId");
  return userId;
}

export async function getUser(request: Request): Promise<User | null> {
  const userId = await getUserId(request);
  if (!userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        goal: true,
        avatarUrl: true,
        teamId: true,
        userTeams: {
          select: {
            teamId: true,
            role: true,
            team: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as any,
      goal: user.goal || undefined,
      avatarUrl: user.avatarUrl || undefined,
      teamId: user.teamId || undefined,
      userTeams: user.userTeams.map(ut => ({
        teamId: ut.teamId,
        role: ut.role as any,
        teamName: ut.team.name
      }))
    };
  } catch {
    return null;
  }
}

export async function requireUserId(request: Request, redirectTo: string = new URL(request.url).pathname) {
  const userId = await getUserId(request);
  if (!userId) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function createUserSession({ userId, redirectTo }: { userId: string; redirectTo: string }) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function logout(request: Request) {
  const session = await getSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
