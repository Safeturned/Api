export const createBearerToken = (token: string): string => {
    return `Bearer ${token}`;
};

export const createAuthHeaders = (
    token: string,
    additionalHeaders?: Record<string, string>
): Record<string, string> => {
    return {
        Authorization: createBearerToken(token),
        ...additionalHeaders,
    };
};

export const createJsonAuthHeaders = (
    token: string,
    additionalHeaders?: Record<string, string>
): Record<string, string> => {
    return {
        Authorization: createBearerToken(token),
        'Content-Type': 'application/json',
        ...additionalHeaders,
    };
};
