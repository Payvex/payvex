export class PayvexApiError extends Error {
  readonly status: number;
  readonly response: unknown;

  constructor(message: string, status: number, response: unknown) {
    super(message);
    this.name = "PayvexApiError";
    this.status = status;
    this.response = response;
  }
}
