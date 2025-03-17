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