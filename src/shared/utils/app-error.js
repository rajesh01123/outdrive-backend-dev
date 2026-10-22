export class AppError extends Error {
  constructor(message, status = 400, data = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.data = data;
  }
}
