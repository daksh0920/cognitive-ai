
export function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  return (
    data?.errors?.[0]?.message ||
    data?.message ||
    fallback
  );
}
