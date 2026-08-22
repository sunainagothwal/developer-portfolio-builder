import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function exportPortfolioSiteToFile(html: string): Promise<string> {
  const filename = `portfolio-${new Date().toISOString().slice(0, 10)}.html`;
  const file = new FileSystem.File(FileSystem.Paths.document, filename);
  file.create({ overwrite: true });
  file.write(html);
  return file.uri;
}

export async function sharePortfolioSite(fileUri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(fileUri, { mimeType: 'text/html', dialogTitle: 'Share portfolio website' });
  }
}
