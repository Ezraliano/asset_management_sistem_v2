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
