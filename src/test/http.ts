/** A rejection in the plain `{ isAxiosError: true, response }` shape that `axios.isAxiosError` checks. */
export const axiosError = (status: number, message = 'boom') => ({
  isAxiosError: true,
  response: { status, data: { message } },
});
