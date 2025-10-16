/**
 * Formats a number into Indonesian Rupiah (IDR) currency format.
 * Example: 10000 -> "Rp10.000"
 * @param amount The number to format.
 * @returns The formatted currency string.
 */
export const formatToRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace(/\s/g, ''); // Remove non-breaking space after 'Rp'
};

/**
 * Converts a formatted Indonesian Rupiah (IDR) string back to a number.
 * Example: "Rp10.000" -> 10000
 * @param formattedAmount The formatted currency string.
 * @returns The parsed number.
 */
export const unformatRupiah = (formattedAmount: string): number => {
  if (!formattedAmount) return 0;
  // Remove "Rp" prefix and any thousand separators (dots)
  const numericString = String(formattedAmount).replace(/[^\d]/g, '');
  return parseInt(numericString, 10) || 0;
};
