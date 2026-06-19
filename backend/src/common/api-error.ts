export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: Array<{
      field?: string;
      code: string;
      message: string;
    }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
