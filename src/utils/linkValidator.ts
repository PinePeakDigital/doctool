import * as fs from 'fs';
import * as path from 'path';
import { DocumentationLocation, ValidationIssue } from './fileSystemValidator';

export interface LinkReference {
  url: string;
  type: 'http' | 'https' | 'ftp' | 'mailto' | 'internal' | 'anchor';
  mentioned_in: DocumentationLocation;
  status: 'unknown' | 'valid' | 'broken' | 'unreachable';
  response_code?: number;
  error_message?: string;
  target_file?: string;
  anchor?: string;
}

export interface LinkValidationResult {
  link: LinkReference;
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * Validates links and URLs in documentation files
 */
export class LinkValidator {
  private basePath: string;
  private timeoutMs: number;
  private userAgent: string;

  constructor(basePath: string = process.cwd(), timeoutMs: number = 5000) {
    this.basePath = basePath;
    this.timeoutMs = timeoutMs;
    this.userAgent = 'DocTool Link Validator';
  }

  /**
   * Validates all links in a documentation file
   */
  public async validateDocumentationFile(docFilePath: string): Promise<ValidationIssue[]> {
    try {
      const content = fs.readFileSync(docFilePath, 'utf8');
      const links = this.extractLinks(content, docFilePath);
      const issues: ValidationIssue[] = [];

      for (const link of links) {
        const result = await this.validateLink(link, docFilePath);
        issues.push(...result.issues);
      }

      return issues;
    } catch (error) {
      return [{
        type: 'invalid_path',
        severity: 'error',
        message: `Could not read documentation file: ${error}`,
        location: {
          file: docFilePath,
          line: 1,
          context: 'File reading error'
        },
        file_reference: {
          path: docFilePath,
          type: 'file',
          mentioned_in: { file: docFilePath, line: 1, context: 'File reading error' },
          exists: false
        }
      }];
    }
  }

  /**
   * Extracts all links from markdown content
   */
  public extractLinks(content: string, sourceFile: string): LinkReference[] {
    const links: LinkReference[] = [];
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // 1. Markdown links: [text](url) or [text](url "title")
      const markdownLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
      let match;
      while ((match = markdownLinkRegex.exec(line)) !== null) {
        const url = match[2].split(' ')[0].trim(); // Remove title if present
        const linkType = this.determineLinkType(url);
        
        links.push({
          url,
          type: linkType,
          mentioned_in: {
            file: sourceFile,
            line: lineIndex + 1,
            column: match.index,
            context: line.trim()
          },
          status: 'unknown',
          target_file: linkType === 'internal' ? url : undefined,
          anchor: this.extractAnchor(url)
        });
      }

      // 2. Reference-style links: [text][ref] (we'll skip the definition for now)
      const refLinkRegex = /\[([^\]]+)\]\[([^\]]+)\]/g;
      while ((match = refLinkRegex.exec(line)) !== null) {
        // For now, we'll note these but not validate them
        // In a full implementation, we'd need to find the reference definition
      }

      // 3. Autolinks: <url>
      const autolinkRegex = /<(https?:\/\/[^>]+)>/g;
      while ((match = autolinkRegex.exec(line)) !== null) {
        const url = match[1];
        
        links.push({
          url,
          type: this.determineLinkType(url),
          mentioned_in: {
            file: sourceFile,
            line: lineIndex + 1,
            column: match.index,
            context: line.trim()
          },
          status: 'unknown'
        });
      }

      // 4. Plain URLs (basic detection)
      const plainUrlRegex = /(?:^|\s)(https?:\/\/[^\s]+)/g;
      while ((match = plainUrlRegex.exec(line)) !== null) {
        const url = match[1];
        
        links.push({
          url,
          type: this.determineLinkType(url),
          mentioned_in: {
            file: sourceFile,
            line: lineIndex + 1,
            column: match.index,
            context: line.trim()
          },
          status: 'unknown'
        });
      }
    });

    return this.deduplicateLinks(links);
  }

  /**
   * Validates a single link
   */
  public async validateLink(link: LinkReference, docFilePath: string): Promise<LinkValidationResult> {
    const issues: ValidationIssue[] = [];
    let valid = true;

    try {
      switch (link.type) {
        case 'http':
        case 'https':
          const httpResult = await this.validateHttpUrl(link);
          if (!httpResult.valid) {
            valid = false;
            issues.push({
              type: 'missing_file', // Reusing existing type
              severity: httpResult.permanent ? 'error' : 'warning',
              message: `${link.type.toUpperCase()} link is broken: ${link.url} (${httpResult.error})`,
              location: link.mentioned_in,
              suggestion: this.suggestUrlFix(link.url, httpResult.response_code),
              file_reference: {
                path: link.url,
                type: 'file',
                mentioned_in: link.mentioned_in,
                exists: false
              }
            });
          }
          break;

        case 'internal':
          const internalResult = this.validateInternalLink(link, docFilePath);
          if (!internalResult.valid) {
            valid = false;
            issues.push({
              type: 'missing_file',
              severity: 'error',
              message: `Internal link target not found: ${link.url}`,
              location: link.mentioned_in,
              suggestion: internalResult.suggestion || 'Check if the target file exists and the path is correct',
              file_reference: {
                path: link.target_file || link.url,
                type: 'file',
                mentioned_in: link.mentioned_in,
                exists: false
              }
            });
          }
          break;

        case 'anchor':
          const anchorResult = this.validateAnchorLink(link, docFilePath);
          if (!anchorResult.valid) {
            valid = false;
            issues.push({
              type: 'missing_file',
              severity: 'warning',
              message: `Anchor link target not found: ${link.url}`,
              location: link.mentioned_in,
              suggestion: anchorResult.suggestion || 'Check if the heading exists in the target file',
              file_reference: {
                path: link.url,
                type: 'file',
                mentioned_in: link.mentioned_in,
                exists: false
              }
            });
          }
          break;

        case 'mailto':
          const emailResult = this.validateEmailAddress(link);
          if (!emailResult.valid) {
            valid = false;
            issues.push({
              type: 'invalid_path',
              severity: 'warning',
              message: `Invalid email address: ${link.url}`,
              location: link.mentioned_in,
              suggestion: 'Check email address format',
              file_reference: {
                path: link.url,
                type: 'file',
                mentioned_in: link.mentioned_in,
                exists: false
              }
            });
          }
          break;

        case 'ftp':
          // For now, we'll just mark FTP as valid since validation is complex
          // In a full implementation, we could attempt FTP connections
          break;
      }
    } catch (error) {
      valid = false;
      issues.push({
        type: 'invalid_path',
        severity: 'error',
        message: `Error validating link ${link.url}: ${error}`,
        location: link.mentioned_in,
        file_reference: {
          path: link.url,
          type: 'file',
          mentioned_in: link.mentioned_in,
          exists: false
        }
      });
    }

    link.status = valid ? 'valid' : 'broken';
    return { link, valid, issues };
  }

  /**
   * Validates HTTP/HTTPS URLs
   */
  private async validateHttpUrl(link: LinkReference): Promise<{ valid: boolean; error?: string; response_code?: number; permanent?: boolean }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(link.url, {
        method: 'HEAD', // Use HEAD to avoid downloading content
        signal: controller.signal,
        headers: {
          'User-Agent': this.userAgent
        }
      });

      clearTimeout(timeoutId);
      link.response_code = response.status;

      if (response.ok) {
        link.status = 'valid';
        return { valid: true };
      } else {
        const permanent = response.status >= 400 && response.status < 500;
        link.status = 'broken';
        return { 
          valid: false, 
          error: `HTTP ${response.status} ${response.statusText}`,
          response_code: response.status,
          permanent
        };
      }
    } catch (error) {
      link.status = 'unreachable';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { valid: false, error: 'Request timeout', permanent: false };
        }
        return { valid: false, error: error.message, permanent: false };
      }
      return { valid: false, error: 'Unknown error', permanent: false };
    }
  }

  /**
   * Validates internal file links
   */
  private validateInternalLink(link: LinkReference, docFilePath: string): { valid: boolean; suggestion?: string } {
    const basePath = path.dirname(docFilePath);
    const targetPath = path.resolve(basePath, link.url.split('#')[0]); // Remove anchor

    try {
      const stats = fs.statSync(targetPath);
      return { valid: true };
    } catch (error) {
      // Try to suggest similar files
      const suggestion = this.suggestSimilarFiles(link.url, basePath);
      return { valid: false, suggestion };
    }
  }

  /**
   * Validates anchor links (#heading)
   */
  private validateAnchorLink(link: LinkReference, docFilePath: string): { valid: boolean; suggestion?: string } {
    const [filePart, anchor] = link.url.split('#');
    
    if (!anchor) {
      return { valid: false, suggestion: 'Anchor link missing fragment identifier' };
    }

    // Determine target file
    let targetFile: string;
    if (filePart) {
      // Link to another file with anchor
      const basePath = path.dirname(docFilePath);
      targetFile = path.resolve(basePath, filePart);
    } else {
      // Link within same file
      targetFile = docFilePath;
    }

    try {
      const content = fs.readFileSync(targetFile, 'utf8');
      const headings = this.extractHeadings(content);
      const normalizedAnchor = this.normalizeAnchor(anchor);
      
      const headingExists = headings.some(heading => 
        this.normalizeAnchor(heading) === normalizedAnchor
      );

      if (headingExists) {
        return { valid: true };
      } else {
        const similarHeadings = headings
          .filter(h => h.toLowerCase().includes(anchor.toLowerCase()))
          .slice(0, 3);
        
        const suggestion = similarHeadings.length > 0
          ? `Similar headings found: ${similarHeadings.join(', ')}`
          : 'Check if the heading exists in the target file';
        
        return { valid: false, suggestion };
      }
    } catch (error) {
      return { valid: false, suggestion: 'Could not read target file' };
    }
  }

  /**
   * Validates email addresses
   */
  private validateEmailAddress(link: LinkReference): { valid: boolean } {
    const email = link.url.replace('mailto:', '');
    // Basic email regex - not perfect but good enough for most cases
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return { valid: emailRegex.test(email) };
  }

  // Helper methods

  private determineLinkType(url: string): LinkReference['type'] {
    if (url.startsWith('http://')) return 'http';
    if (url.startsWith('https://')) return 'https';
    if (url.startsWith('ftp://')) return 'ftp';
    if (url.startsWith('mailto:')) return 'mailto';
    if (url.includes('#')) return 'anchor';
    return 'internal';
  }

  private extractAnchor(url: string): string | undefined {
    const parts = url.split('#');
    return parts.length > 1 ? parts[1] : undefined;
  }

  private deduplicateLinks(links: LinkReference[]): LinkReference[] {
    const seen = new Set<string>();
    return links.filter(link => {
      const key = `${link.url}:${link.mentioned_in.line}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private extractHeadings(content: string): string[] {
    const headings: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        // Extract heading text
        const heading = trimmed.replace(/^#+\s*/, '').replace(/\s*#+$/, '');
        headings.push(heading);
      }
    }
    
    return headings;
  }

  private normalizeAnchor(anchor: string): string {
    // GitHub-style anchor normalization
    return anchor
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  private suggestSimilarFiles(missingPath: string, basePath: string): string {
    try {
      const targetDir = path.dirname(path.resolve(basePath, missingPath));
      const files = fs.readdirSync(targetDir);
      const fileName = path.basename(missingPath, path.extname(missingPath));
      
      const similar = files.filter(file => {
        const fileBaseName = path.basename(file, path.extname(file));
        return fileBaseName.toLowerCase().includes(fileName.toLowerCase()) ||
               fileName.toLowerCase().includes(fileBaseName.toLowerCase());
      });

      if (similar.length > 0) {
        return `Similar files found: ${similar.slice(0, 3).join(', ')}`;
      }
    } catch (error) {
      // Directory doesn't exist
    }
    return 'Check if the file path is correct and the file exists';
  }

  private suggestUrlFix(url: string, responseCode?: number): string {
    if (responseCode === 404) {
      return 'URL not found - check if the page has moved or been deleted';
    }
    if (responseCode === 403) {
      return 'Access forbidden - the URL might require authentication';
    }
    if (responseCode === 500) {
      return 'Server error - try again later or contact the website administrator';
    }
    if (responseCode && responseCode >= 300 && responseCode < 400) {
      return 'URL redirects - consider updating to the final destination';
    }
    return 'Check if the URL is correct and the website is accessible';
  }
}
