export type AccountAuthClientError = {
  code?: string | undefined;
  message?: string | undefined;
};

export function otpErrorMessage(
  error: AccountAuthClientError,
  fallback: string,
) {
  if (error.code === "OTP_EXPIRED" || error.code === "INVALID_OTP") {
    return "验证码不正确或已过期。";
  }

  return error.message ?? fallback;
}
