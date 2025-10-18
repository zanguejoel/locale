export const getErrorMessage = (err: any): string => {
    let errorMessage = "An error occurred";
    if (err?.detail) {
        if (Array.isArray(err.detail)) {
            errorMessage = err.detail.map((error: any) => error.msg).join('\n');
        } else if (typeof err.detail === "string") {
            errorMessage = err.detail;
        }
    }
    return errorMessage;
};

// Password validation pattern - matches web implementation
export const VALIDATION_PATTERNS = {
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s])[^\s]{8,}$/,
  EMAIL: /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/,
};

export const VALIDATION_MESSAGES = {
  PASSWORD: 'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character',
  EMAIL: 'Please enter a valid email address',
  PASSWORDS_MATCH: 'Passwords do not match',
  PASSWORD_SAME_AS_OLD: 'New password must be different from current password',
};