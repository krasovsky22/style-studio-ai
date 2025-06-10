import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    // Add any additional middleware logic here
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if user is authenticated for protected routes
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token;
        }
        if (req.nextUrl.pathname.startsWith("/generate")) {
          return !!token;
        }
        if (req.nextUrl.pathname.startsWith("/api/protected")) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/generate/:path*", "/api/protected/:path*"],
};
