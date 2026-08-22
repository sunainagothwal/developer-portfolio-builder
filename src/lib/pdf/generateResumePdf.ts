import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/** Renders an HTML string to a PDF file and returns its local URI. */
export async function generatePdfFromHtml(html: string): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}

/** Opens the native share sheet for a generated PDF (or any file). */
export async function sharePdf(uri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share resume' });
  }
}
