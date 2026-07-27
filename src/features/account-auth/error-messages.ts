export type AccountAuthClientError = {
  code?: string | undefined;
  message?: string | undefined;
};

export function otpErrorMessage(
  error: AccountAuthClientError,
  fallback: string,
) {
  if (error.code === "OTP_EXPIRED" || error.code === "INVALID_OTP") {
    return "The verification code is incorrect or has expired.";
  }

  return error.message ?? fallback;
}
