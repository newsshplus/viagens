import type { FlightOffer } from '../types';

export async function fetchCalendarMonth(
  origin: string, dest: string, year: number, month: number, currency = 'eur'
): Promise<Record<string, { price: number; transfers: number }>> {
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  try {
    const resp = await fetch(`/api/flights-calendar?origin=${origin}&destination=${dest}&month=${monthStr}&currency=${currency}`);
    if (!resp.ok) return {};
    const data = await resp.json();
    return data;
  } catch {
    // Sem dado real disponível - devolve vazio, nunca preço inventado.
    return {};
  }
}

export function openBookingLink(offer: FlightOffer): void {
  if (offer.bookingLink) {
    window.open(offer.bookingLink, '_blank', 'noopener,noreferrer');
  }
}
