/**
 * Utility to resolve Wikipedia / Wikimedia media pages, Special:FilePath,
 * and direct image URLs to real high-resolution raw image URLs.
 */

export interface ResolvedImageResult {
  imageUrl: string;
  sourceType: 'wikipedia' | 'wikimedia' | 'direct' | 'unknown';
  suggestedTitle?: string;
}

/**
 * Checks if a URL is a Wikipedia or Wikimedia media page, e.g.:
 * - https://es.wikipedia.org/wiki/Los_cazafantasmas#/media/Archivo:Vitoria_-_Graffiti_&_Murals_0995.JPG
 * - https://en.wikipedia.org/wiki/Ghostbusters#/media/File:Ghostbusters_logo.png
 * - https://commons.wikimedia.org/wiki/File:Example.jpg
 * - https://es.wikipedia.org/wiki/Archivo:Example.jpg
 */
export function isWikiMediaUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('wikipedia.org') ||
    url.includes('wikimedia.org') ||
    url.includes('/media/Archivo:') ||
    url.includes('/media/File:') ||
    url.includes('Special:FilePath')
  );
}

/**
 * Extracts the file name and language from a Wikipedia / Wikimedia URL
 */
export function extractWikiFileName(url: string): { fileName: string; lang: string } | null {
  try {
    let cleanUrl = url.trim();
    // Get language subdomain (e.g. "es", "en", "commons")
    let lang = 'commons';
    const langMatch = cleanUrl.match(/https?:\/\/([a-z]{2,8})\.wikipedia\.org/i);
    if (langMatch) {
      lang = langMatch[1];
    } else if (cleanUrl.includes('commons.wikimedia.org')) {
      lang = 'commons';
    }

    let fileName = '';

    // Case 1: #/media/Archivo:FILENAME or #/media/File:FILENAME
    const hashMediaMatch = cleanUrl.match(/#\/media\/(?:Archivo|File):([^?#]+)/i);
    if (hashMediaMatch) {
      fileName = hashMediaMatch[1];
    }

    // Case 2: /wiki/Archivo:FILENAME or /wiki/File:FILENAME
    if (!fileName) {
      const wikiFileMatch = cleanUrl.match(/\/wiki\/(?:Archivo|File):([^?#]+)/i);
      if (wikiFileMatch) {
        fileName = wikiFileMatch[1];
      }
    }

    // Case 3: Special:FilePath/FILENAME
    if (!fileName) {
      const filePathMatch = cleanUrl.match(/Special:FilePath\/([^?#]+)/i);
      if (filePathMatch) {
        fileName = filePathMatch[1];
      }
    }

    if (!fileName) {
      return null;
    }

    // Decode and normalize
    fileName = decodeURIComponent(fileName.replace(/\+/g, ' '));
    return { fileName, lang };
  } catch {
    return null;
  }
}

/**
 * Queries Wikimedia API or Wikipedia API to retrieve direct imageinfo URL
 */
export async function resolveWikiImage(url: string): Promise<ResolvedImageResult | null> {
  const extracted = extractWikiFileName(url);
  if (!extracted) return null;

  const { fileName, lang } = extracted;
  const normalizedFileTitle = `File:${fileName.replace(/\s+/g, '_')}`;

  // 1. Try Commons API first (most files live on Wikimedia Commons)
  try {
    const commonsApi = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      normalizedFileTitle
    )}&prop=imageinfo&iiprop=url&format=json&origin=*`;

    const res = await fetch(commonsApi);
    if (res.ok) {
      const data = await res.json();
      const pages = data?.query?.pages;
      if (pages) {
        for (const pageId in pages) {
          const page = pages[pageId];
          const imgInfo = page?.imageinfo?.[0];
          if (imgInfo?.url) {
            return {
              imageUrl: imgInfo.url,
              sourceType: 'wikimedia',
              suggestedTitle: formatFileNameToTitle(fileName),
            };
          }
        }
      }
    }
  } catch {
    // Continue to language Wikipedia fallback
  }

  // 2. Try language Wikipedia API if not on Commons
  if (lang && lang !== 'commons') {
    try {
      const langApi = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        normalizedFileTitle
      )}&prop=imageinfo&iiprop=url&format=json&origin=*`;

      const res = await fetch(langApi);
      if (res.ok) {
        const data = await res.json();
        const pages = data?.query?.pages;
        if (pages) {
          for (const pageId in pages) {
            const page = pages[pageId];
            const imgInfo = page?.imageinfo?.[0];
            if (imgInfo?.url) {
              return {
                imageUrl: imgInfo.url,
                sourceType: 'wikipedia',
                suggestedTitle: formatFileNameToTitle(fileName),
              };
            }
          }
        }
      }
    } catch {
      // Continue to Special:FilePath
    }
  }

  // 3. Fallback to Wikimedia Commons Special:FilePath direct file redirection
  const fallbackUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    fileName.replace(/\s+/g, '_')
  )}`;

  return {
    imageUrl: fallbackUrl,
    sourceType: 'wikimedia',
    suggestedTitle: formatFileNameToTitle(fileName),
  };
}

/**
 * Universal resolver: handles direct image URLs, Wikipedia links, and backend resolver
 */
export async function resolveAnyImageUrl(rawUrl: string): Promise<ResolvedImageResult> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { imageUrl: '', sourceType: 'unknown' };
  }

  // If it's a data URL, return directly
  if (trimmed.startsWith('data:image/')) {
    return { imageUrl: trimmed, sourceType: 'direct' };
  }

  // If it's a Wikipedia / Wikimedia page
  if (isWikiMediaUrl(trimmed)) {
    const wikiResult = await resolveWikiImage(trimmed);
    if (wikiResult && wikiResult.imageUrl) {
      return wikiResult;
    }
  }

  // Otherwise, if it ends in an image extension or has image mime
  return {
    imageUrl: trimmed,
    sourceType: 'direct',
  };
}

function formatFileNameToTitle(fileName: string): string {
  // Strip extension
  const withoutExt = fileName.replace(/\.[a-zA-Z0-9]+$/i, '');
  // Replace underscores and dashes with spaces
  return withoutExt.replace(/[_-]+/g, ' ').trim();
}
