import { API_ERROR_CODES } from "@/constants/api-errors";
import { NextResponse } from "next/server";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ErrorResponseParams {
  error?: string;
  statusCode?: number;
  code?: keyof typeof API_ERROR_CODES;
  validationErrors?: ValidationError[];
}
export function createErrorResponse({
  statusCode = 500,
  validationErrors = [],
  error = "An error occurred",
  code = API_ERROR_CODES.SERVER_ERROR,
}: ErrorResponseParams): NextResponse {
  return NextResponse.json(
    {
      code,
      error,
      success: false,
      validationErrors,
    },
    { status: statusCode }
  );
}
